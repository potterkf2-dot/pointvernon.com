#!/usr/bin/env node
'use strict';

// Official API: github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright
// A zero-violation scan is not a complete WCAG or screen-reader assessment.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const docs = path.resolve(__dirname, '../docs');
const output = path.resolve(process.env.PV_A11Y_ARTIFACT_DIR || 'artifacts/accessibility');
const widths = [390, 1280];
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const report = { started: new Date().toISOString(), widths, tags, scans: [], keyboardChecks: [], errors: [], externalRequests: [] };
const evidence = new Set();
let screenshots = 0;
let browser;
let server;
let base;
let width;
let page;

async function serveDocs() {
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };
  server = http.createServer(async (request, response) => {
    try {
      let file = path.resolve(docs, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
      if (path.relative(docs, file).startsWith('..')) return response.writeHead(403).end();
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await fs.readFile(file);
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
    } catch { response.writeHead(404).end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return new URL(`http://127.0.0.1:${server.address().port}/`);
}

const slug = value => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
async function visit(route) {
  const response = await page.goto(new URL(route, base).href, { waitUntil: 'load' });
  assert.equal(response.status(), 200, `${route} did not return HTTP 200`);
  assert.equal(new URL(page.url()).pathname, route, 'Unexpected navigation destination');
  await documentReady();
}
async function documentReady() {
  await page.evaluate(() => document.fonts.ready.then(() => true));
  for (const image of await page.locator('img:visible').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(image => image.decode());
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
async function tabTo(locator) {
  assert(await locator.isVisible(), 'Keyboard target is not visible');
  for (let i = 0; i < 260; i++) {
    if (await locator.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard target was not reachable in 260 Tab presses');
}
async function keyboard(name, task) {
  try { await task(); report.keyboardChecks.push({ width, route: new URL(page.url()).pathname, name, passed: true }); }
  catch (error) { report.keyboardChecks.push({ width, route: new URL(page.url()).pathname, name, passed: false, error: error.message }); }
}
async function skipLink() {
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const element = document.activeElement;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { href: element.getAttribute('href'), text: element.textContent.trim(), top: box.top, bottom: box.bottom, outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), shadow: style.boxShadow };
  });
  assert.equal(focused.href, '#main-content', 'First Tab did not reach the skip link');
  assert(focused.text && focused.top >= 0 && focused.bottom <= 900, 'Focused skip link is not visible');
  assert((focused.outline !== 'none' && focused.outlineWidth > 0) || focused.shadow !== 'none', 'Skip link has no visible focus indicator');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.querySelector('main').contains(document.activeElement)), 'Skip link did not bypass header navigation');
}

async function scan(route, state) {
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  const item = { width, route, state, timestamp: results.timestamp, testEngine: results.testEngine, testEnvironment: results.testEnvironment, violations: results.violations, incomplete: results.incomplete, passedRuleIds: results.passes.map(rule => rule.id), inapplicableRuleIds: results.inapplicable.map(rule => rule.id) };
  // Preserve every finding; deduplicate only representative screenshots.
  const keys = ['violations', 'incomplete'].flatMap(type => item[type].flatMap(rule => rule.nodes.map(node => `${width}:${type}:${rule.id}:${JSON.stringify(node.target)}`)));
  if (screenshots < 16 && keys.some(key => !evidence.has(key))) {
    item.screenshot = `${width}-${slug(route)}-${slug(state)}.jpg`;
    await page.screenshot({ path: path.join(output, item.screenshot), fullPage: true, type: 'jpeg', quality: 82 });
    screenshots++;
    keys.forEach(key => evidence.add(key));
  }
  report.scans.push(item);
  console.log(`${width} ${route} [${state}]: ${item.violations.length} violations; ${item.incomplete.length} review items`);
  // Write after each scan so interruption still leaves useful evidence.
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
async function scenario(route, state, task) {
  try { await visit(route); await task(); }
  catch (error) {
    const item = { width, route, state, error: error.stack };
    item.screenshot = `${width}-${slug(route)}-${slug(state)}-error.jpg`;
    await page.screenshot({ path: path.join(output, item.screenshot), fullPage: true, type: 'jpeg', quality: 82 }).catch(() => {});
    report.errors.push(item);
    console.error(`ERROR ${width} ${route} [${state}]: ${error.message}`);
  }
}

async function interactiveStates() {
  if (width === 390) await scenario('/', 'navigation-open', async () => {
    const menu = page.locator('[data-menu-toggle]');
    await tabTo(menu);
    await page.keyboard.press('Enter');
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    await page.getByRole('navigation', { name: 'Main navigation', exact: true }).waitFor({ state: 'visible' });
    await scan('/', 'navigation-open');
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    assert(await menu.evaluate(element => element === document.activeElement), 'Escape did not restore menu focus');
  });
  await scenario('/', 'privacy-settings-open', async () => {
    await tabTo(page.getByRole('button', { name: 'Privacy settings', exact: true }));
    await page.keyboard.press('Enter');
    await page.locator('[data-privacy-banner]').waitFor({ state: 'visible' });
    assert(await page.locator('[data-analytics-allow]').evaluate(element => element === document.activeElement), 'Privacy settings did not focus the choices');
    await scan('/', 'privacy-settings-open');
    await page.keyboard.press('Tab');
    assert(await page.getByRole('button', { name: 'Decline', exact: true }).evaluate(element => element === document.activeElement), 'Decline is not the next keyboard choice');
    await page.keyboard.press('Enter');
    await page.locator('[data-privacy-banner]').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('script[data-point-vernon-analytics]').count(), 0, 'Decline loaded analytics');
  });
  for (const [query, route] of [['ESA Park', '/esa-park/'], ['Five Ways', '/five-ways/']]) await scenario('/guides/', `search-${slug(query)}`, async () => {
    await tabTo(page.getByRole('searchbox', { name: 'Search by place or topic', exact: true }));
    await page.keyboard.type(query);
    await page.waitForFunction(route => {
      const link = document.querySelector(`#guide-results a[href="${route}"]`);
      return /guides? found/.test(document.querySelector('#guide-results-count').textContent) && link && !link.closest('[data-guide-card]').hidden;
    }, route);
    await scan('/guides/', `search-${slug(query)}`);
    await tabTo(page.locator(`#guide-results a[href="${route}"]`));
    await page.keyboard.press('Enter');
    await page.waitForURL(new URL(route, base).href);
  });
  await scenario('/', 'all-guides-open', async () => {
    const summary = page.locator('.footer-all-guides > summary');
    await tabTo(summary);
    await page.keyboard.press('Enter');
    assert(await summary.evaluate(element => element.parentElement.open), 'All guides disclosure did not open');
    await scan('/', 'all-guides-open');
  });
  if (width === 390) for (const route of ['/esa-park/', '/map-access/']) await scenario(route, 'contents-open', async () => {
    const contents = page.locator('.in-page-toggle');
    await tabTo(contents);
    await page.keyboard.press('Enter');
    assert.equal(await contents.getAttribute('aria-expanded'), 'true');
    await scan(route, 'contents-open');
    await page.keyboard.press('Escape');
    assert.equal(await contents.getAttribute('aria-expanded'), 'false');
    assert(await contents.evaluate(element => element === document.activeElement), 'Escape did not restore contents focus');
  });
}

function aggregate(type) {
  const grouped = new Map();
  for (const item of report.scans) for (const rule of item[type]) {
    if (!grouped.has(rule.id)) grouped.set(rule.id, { id: rule.id, impact: rule.impact, help: rule.help, helpUrl: rule.helpUrl, affectedScans: 0, affectedNodes: 0, routes: new Set(), examples: [] });
    const row = grouped.get(rule.id);
    row.affectedScans++; row.affectedNodes += rule.nodes.length; row.routes.add(item.route);
    if (row.examples.length < 4) row.examples.push({ width: item.width, route: item.route, state: item.state, targets: rule.nodes.map(node => node.target) });
  }
  return [...grouped.values()].map(row => ({ ...row, routes: [...row.routes] }));
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  base = process.env.PV_BASE_URL ? new URL(process.env.PV_BASE_URL) : await serveDocs();
  assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password && base.pathname === '/', 'PV_BASE_URL must be an HTTP(S) origin without credentials or a path');
  report.baseURL = base.href;
  const sitemap = await fetch(new URL('/sitemap.xml', base));
  assert(sitemap.ok, 'Sitemap is unavailable');
  const routes = [...(await sitemap.text()).matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(match => new URL(match[1]).pathname);
  assert(routes.length >= 40 && new Set(routes).size === routes.length, 'Expected at least 40 unique sitemap routes');
  report.routes = routes;
  browser = await chromium.launch();
  report.browserVersion = browser.version();
  for (width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    // Keep optional live checks read-only and prevent unrelated service traffic.
    await context.route('**/*', async route => {
      if (new URL(route.request().url()).origin === base.origin) return route.continue();
      report.externalRequests.push({ width, url: route.request().url() });
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    await scenario('/', 'privacy-initial-open', async () => {
      await page.locator('[data-privacy-banner]').waitFor({ state: 'visible' });
      await scan('/', 'privacy-initial-open');
      await page.getByRole('button', { name: 'Decline', exact: true }).click();
      await page.locator('[data-privacy-banner]').waitFor({ state: 'hidden' });
    });
    for (const route of routes) await scenario(route, 'page', async () => {
      await keyboard('skip link and visible focus', skipLink);
      await scan(route, 'page');
    });
    await interactiveStates();
    await context.close();
  }
}
main().catch(error => report.errors.push({ error: error.stack })).finally(async () => {
  if (browser) await browser.close().catch(() => {});
  if (server) await new Promise(resolve => server.close(resolve));
  report.finished = new Date().toISOString();
  report.confirmedViolations = aggregate('violations');
  report.manualReviewItems = aggregate('incomplete');
  report.manualReviewNote = 'Incomplete results are inconclusive, not confirmed failures. Automation does not establish WCAG conformance; human review must also assess meaningful alternatives, reading order, screen-reader announcements, zoom and contrast over photographs.';
  report.passed = report.errors.length === 0 && report.confirmedViolations.length === 0 && report.keyboardChecks.every(item => item.passed) && report.scans.filter(item => item.state === 'page').length === (report.routes?.length || 0) * widths.length;
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed ? 'PASS' : 'FAIL'}: ${report.scans.length} scans, ${report.confirmedViolations.length} confirmed rule violations, ${report.manualReviewItems.length} rule types requiring review, ${report.errors.length} execution errors. Evidence: ${output}`);
  process.exitCode = report.passed ? 0 : 1;
});
