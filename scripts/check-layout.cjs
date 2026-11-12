#!/usr/bin/env node
'use strict';

// Exercise visitor behavior against docs/ (default) or PV_BASE_URL (live).
// Dependencies belong in the runner's temporary directory, not this repository.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const docs = path.resolve(__dirname, '../docs');
const output = path.resolve(process.env.PV_ARTIFACT_DIR || 'artifacts/layout');
const widths = [320, 390, 600, 1280];
const captures = new Set(['/', '/esa-park/', '/five-ways/', '/map-access/', '/contact/', '/charles-polson-history/']);
const report = { started: new Date().toISOString(), widths, checks: [], errors: [], externalRequests: [] };
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
let browser;
let server;

async function localServer() {
  server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = path.resolve(docs, '.' + pathname);
      if (path.relative(docs, file).startsWith('..')) {
        response.writeHead(403).end();
        return;
      }
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await fs.readFile(file);
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return new URL(`http://127.0.0.1:${server.address().port}/`);
}

const slug = value => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
async function check(name, page, width, task) {
  const result = { name, width };
  try {
    result.details = await task();
    result.passed = true;
  } catch (error) {
    result.passed = false;
    result.error = error.message;
    if (page && !page.isClosed()) {
      result.screenshot = `${width}-${slug(name)}-failure.png`;
      await page.screenshot({ path: path.join(output, result.screenshot), fullPage: true }).catch(() => {});
    }
  }
  report.checks.push(result);
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${width || ''} ${name}${result.error ? ': ' + result.error : ''}`);
}

async function visit(page, base, route) {
  const response = await page.goto(new URL(route, base).href, { waitUntil: 'load' });
  assert.equal(response.status(), 200, `${route} returned ${response.status()}`);
  assert.equal(new URL(page.url()).pathname, route, 'Unexpected navigation destination');
}

async function privacy(page, base) {
  await visit(page, base, '/');
  const banner = page.locator('[data-privacy-banner]');
  await banner.waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await banner.waitFor({ state: 'hidden' });
  await page.reload({ waitUntil: 'load' });
  assert.equal(await banner.isVisible(), false, 'Decline was not remembered after reload');
  await page.getByRole('button', { name: 'Privacy settings', exact: true }).click();
  await banner.waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-analytics-allow]').evaluate(button => button === document.activeElement), true, 'Privacy settings did not move focus into the choices');
  await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await banner.waitFor({ state: 'hidden' });
  assert.equal(await page.locator('script[data-point-vernon-analytics]').count(), 0, 'Analytics loaded after declining');
}

async function layout(page, base, route, width) {
  await visit(page, base, route);
  // Scroll real image elements into view so lazy photographs are checked too.
  for (const image of await page.locator('img:visible').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(image => image.decode());
  }
  const loadedFont = await page.evaluate(async () => {
    await document.fonts.ready;
    return (await document.fonts.load('16px "Libre Baskerville"')).length > 0;
  });
  const data = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const badImages = [...document.images].filter(image => image.getClientRects().length && (!image.complete || !image.naturalWidth)).map(image => image.currentSrc || image.src);
    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth;
    return {
      overflow, badImages,
      h1: h1 && { size: parseFloat(getComputedStyle(h1).fontSize), family: getComputedStyle(h1).fontFamily },
      loadedFont: document.fonts.check('16px "Libre Baskerville"'),
      offenders: overflow > 1 ? [...document.querySelectorAll('main *')].filter(element => {
        const box = element.getBoundingClientRect();
        return box.width && (box.right > innerWidth + 1 || box.left < -1);
      }).slice(0, 8).map(element => ({ tag: element.tagName, class: element.className })) : [],
      images: document.images.length
    };
  });
  assert(data.h1, 'Missing page heading');
  assert(loadedFont && data.loadedFont && data.h1.family.includes('Libre Baskerville'), 'Self-hosted heading font did not load');
  assert(data.overflow <= 1, `Horizontal overflow ${data.overflow}px: ${JSON.stringify(data.offenders)}`);
  assert.deepEqual(data.badImages, [], 'Broken images');
  if (width <= 600) assert(data.h1.size <= 44.1, `Phone H1 is ${data.h1.size}px; maximum is 44px`);
  if (route === '/') {
    const intro = page.locator('.home-intro');
    const textColor = await intro.evaluate(p => getComputedStyle(p).color);
    const link = intro.getByRole('link', { name: 'local map', exact: true });
    assert.equal(await link.evaluate(a => getComputedStyle(a).color), textColor, 'Hero map link must remain as readable as its white surrounding text');
  }
  if (route === '/' && width <= 600) {
    const links = page.locator('[aria-labelledby="home-questions"] article > a');
    assert.equal(await links.count(), 3, 'Expected the three visitor FAQ links');
    data.faqLinks = await links.evaluateAll(links => links.map(link => ({ text: link.textContent.trim(), height: link.getBoundingClientRect().height })));
    for (const link of data.faqLinks) assert(link.height >= 43.9, `FAQ target is only ${link.height}px: ${link.text}`);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  if ((width === 390 || width === 1280) && captures.has(route)) {
    data.screenshot = `${width}-${slug(route)}.png`;
    await page.screenshot({ path: path.join(output, data.screenshot), fullPage: true });
  }
  return data;
}

async function navigation(page, base, width) {
  await visit(page, base, '/');
  const toggle = page.locator('[data-menu-toggle]');
  const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  if (width <= 600) {
    assert(await toggle.isVisible(), 'Phone menu button is not visible');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert(await nav.isVisible(), 'Opening the menu did not expose navigation');
    const targets = await nav.getByRole('link').evaluateAll(links => links.map(link => {
      const box = link.getBoundingClientRect();
      return { text: link.textContent.trim(), left: box.left, right: box.right, height: box.height };
    }));
    assert(targets.length >= 6, 'Navigation links are missing');
    for (const target of targets) assert(target.height >= 43.9 && target.left >= -1 && target.right <= width + 1, `Unusable menu link: ${JSON.stringify(target)}`);
    assert(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth + 1), 'Open phone menu overflows the viewport');
    await page.keyboard.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await nav.isVisible(), false, 'Escape did not close navigation');
    assert(await toggle.evaluate(button => button === document.activeElement), 'Escape did not restore menu focus');
    await toggle.click();
  }
  await nav.getByRole('link', { name: 'Find a guide', exact: true }).click();
  await page.waitForURL(new URL('/guides/', base).href);
  assert(await page.getByRole('heading', { level: 1, name: 'Find your Point Vernon guide', exact: true }).isVisible());
}

async function search(page, base, home) {
  await visit(page, base, home ? '/' : '/guides/');
  for (const [query, route] of [['ESA Park', '/esa-park/'], ['Five Ways', '/five-ways/']]) {
    await page.locator('#guide-search').fill(query);
    if (home) await page.getByRole('button', { name: 'Search guides', exact: true }).click();
    await page.waitForFunction(({ route, query }) => {
      const link = document.querySelector(`#guide-results a[href="${route}"]`);
      const status = document.querySelector('#guide-results-count');
      return document.querySelector('#guide-search').value === query && /guides? found|matching guides/.test(status.textContent)
        && link && !link.closest('[data-guide-card]').hidden && !document.querySelector('#home-search-results[hidden]');
    }, { route, query });
    const link = page.locator(`#guide-results a[href="${route}"]`);
    assert(await link.isVisible(), `${query} search did not expose its guide`);
    assert.equal(new URL(page.url()).search, '', 'Search query was sent in the URL');
    await link.click();
    await page.waitForURL(new URL(route, base).href);
    assert(await page.getByRole('heading', { level: 1 }).isVisible());
    await visit(page, base, home ? '/' : '/guides/');
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const base = process.env.PV_BASE_URL ? new URL(process.env.PV_BASE_URL) : await localServer();
  assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password && base.pathname === '/', 'PV_BASE_URL must be an HTTP(S) origin without credentials or a path');
  report.baseURL = base.href;
  const sitemap = await fetch(new URL('/sitemap.xml', base));
  assert(sitemap.ok, 'Sitemap is unavailable');
  const locations = [...(await sitemap.text()).matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(match => new URL(match[1]));
  const routes = locations.map(url => url.pathname);
  assert(routes.length >= 40, `Expected at least the current 40 sitemap pages, found ${routes.length}`);
  assert.equal(new Set(routes).size, routes.length, 'Sitemap contains duplicate routes');
  report.routes = routes;
  browser = await chromium.launch();
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    // Never contact unrelated services while testing. Record attempted external
    // dependencies separately; analytics attempts after Decline still fail below.
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === base.origin) return route.continue();
      report.externalRequests.push({ width, url: url.href });
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const record = (type, message) => report.errors.push({ width, url: page.url(), type, message });
    page.on('pageerror', error => record('javascript', error.message));
    page.on('console', message => { if (message.type() === 'error') record('console', message.text()); });
    page.on('requestfailed', request => {
      const error = request.failure()?.errorText;
      // Navigation can cancel an in-flight lazy image normally; image decoding
      // during layout checks still catches actual broken resources.
      if (error !== 'net::ERR_ABORTED') record('request', `${request.url()}: ${error}`);
    });
    await check('privacy decline and settings', page, width, () => privacy(page, base));
    for (const route of routes) await check(`layout ${route}`, page, width, () => layout(page, base, route, width));
    await check('navigation and menu', page, width, () => navigation(page, base, width));
    await check('directory searches for new guides', page, width, () => search(page, base, false));
    await check('homepage searches for new guides', page, width, () => search(page, base, true));
    await context.close();
  }
  const analytics = report.externalRequests.filter(request => /(^|\.)(google-analytics\.com|googletagmanager\.com)$/.test(new URL(request.url).hostname));
  assert.equal(analytics.length, 0, 'Analytics was requested despite declining');
}

main().catch(error => report.errors.push({ type: 'runner', message: error.stack })).finally(async () => {
  if (browser) await browser.close().catch(() => {});
  if (server) await new Promise(resolve => server.close(resolve));
  report.finished = new Date().toISOString();
  report.passed = report.errors.length === 0 && report.checks.length > 0 && report.checks.every(check => check.passed);
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed ? 'PASS' : 'FAIL'}: ${report.checks.length} browser checks; ${report.errors.length} browser/runner errors. Evidence: ${output}`);
  process.exitCode = report.passed ? 0 : 1;
});
