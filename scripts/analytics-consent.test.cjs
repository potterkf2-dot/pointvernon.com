"use strict";

// Offline regression checks. This executes the actual site script in a mocked
// DOM without loading Google's tag or sending anything to Analytics.
// Usage: node scripts/analytics-consent.test.cjs [path/to/privacy.js]
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const scriptPath = path.resolve(process.argv[2] || path.join(__dirname, "../docs/assets/js/privacy.js"));
const source = fs.readFileSync(scriptPath, "utf8");
const consentKey = "point-vernon-analytics-choice-v2";
const legacyKey = "point-vernon-analytics-choice";
const measurementId = "G-003LRJYP3K";
const disableKey = "ga-disable-" + measurementId;

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) || []).filter(item => item !== listener));
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
      return !event.defaultPrevented;
    }
  };
}

function createPage({savedChoice = null, legacyChoice = null, storageBlocked = false, pathname = "/walks/"} = {}) {
  const values = new Map();
  if (savedChoice !== null) values.set(consentKey, savedChoice);
  if (legacyChoice !== null) values.set(legacyKey, legacyChoice);
  const localStorage = {
    getItem(key) {
      if (storageBlocked) throw new Error("Browser storage is blocked");
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (storageBlocked) throw new Error("Browser storage is blocked");
      values.set(key, String(value));
    },
    removeItem(key) {
      if (storageBlocked) throw new Error("Browser storage is blocked");
      values.delete(key);
    },
    clear() {
      if (storageBlocked) throw new Error("Browser storage is blocked");
      values.clear();
    }
  };
  const scripts = [];
  const injections = [];
  const controls = {};
  for (const name of ["allow", "decline", "settings"]) {
    controls[name] = Object.assign(eventTarget(), {
      focus() {},
      click() { this.dispatchEvent({type: "click", target: this}); }
    });
  }
  const banner = {
    hidden: true,
    querySelector(selector) {
      if (selector === "[data-analytics-allow]") return controls.allow;
      if (selector === "[data-analytics-decline]") return controls.decline;
      return null;
    }
  };
  const location = new URL("https://pointvernon.com" + pathname);
  const window = Object.assign(eventTarget(), {localStorage, location});
  const commands = () => Array.from(window.dataLayer || [], entry => Array.from(entry));
  const document = Object.assign(eventTarget(), {
    visibilityState: "visible",
    querySelector(selector) {
      if (selector === "[data-privacy-banner]") return banner;
      if (selector === "script[data-point-vernon-analytics]") {
        return scripts.find(script => script.dataset.pointVernonAnalytics) || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      return selector === "[data-privacy-settings]" ? [controls.settings] : [];
    },
    createElement(tagName) {
      assert.equal(tagName, "script", "Only the Analytics script element is expected");
      return Object.assign(eventTarget(), {dataset: {}, tagName: "SCRIPT"});
    },
    head: {
      appendChild(script) {
        scripts.push(script);
        injections.push(commands());
        return script;
      }
    }
  });
  vm.runInNewContext(source, {window, document, URL, Date}, {filename: scriptPath});

  function clickLink(href, dataset = {}, textContent = "Example link") {
    const destination = new URL(href, location.href);
    const link = {
      nodeType: 1,
      tagName: "A",
      dataset,
      textContent,
      getAttribute(name) { return name === "href" ? href : null; },
      closest(selector) { return selector === "a[href]" ? link : null; }
    };
    for (const key of ["href", "pathname", "hostname", "protocol", "origin", "hash", "search"]) link[key] = destination[key];
    document.dispatchEvent({type: "click", target: link, button: 0, defaultPrevented: false});
  }

  function externalStorageChange(newValue, key = consentKey) {
    const oldValue = key === null ? null : (values.get(key) || null);
    if (key === null) values.clear();
    else if (newValue === null) values.delete(key);
    else values.set(key, String(newValue));
    window.dispatchEvent({type: "storage", key, oldValue, newValue, storageArea: localStorage, url: "https://pointvernon.com/privacy/"});
  }

  return {
    window, banner, controls, scripts, injections, values, commands, clickLink, externalStorageChange,
    configs: () => commands().filter(command => command[0] === "config"),
    events: () => commands().filter(command => command[0] === "event"),
    consentUpdates: () => commands().filter(command => command[0] === "consent" && command[1] === "update")
  };
}

function clickGuide(page) {
  page.clickLink("/gatakers-bay/", {analyticsEvent: "select_guide", guideSlug: "gatakers-bay", position: "hero"});
}

function assertAdvertisingDenied(page) {
  for (const command of page.commands().filter(item => item[0] === "consent")) {
    for (const field of ["ad_storage", "ad_user_data", "ad_personalization"]) {
      assert.equal(command[2][field], "denied", field + " must remain denied");
    }
  }
  for (const config of page.configs()) {
    assert.equal(config[1], measurementId);
    assert.equal(config[2].allow_google_signals, false);
    assert.equal(config[2].allow_ad_personalization_signals, false);
  }
}

test("a fresh visit does not load or emit Analytics before consent", () => {
  const page = createPage();
  clickGuide(page);
  assert.equal(page.scripts.length, 0);
  assert.equal(page.commands().length, 0);
  assert.equal(page.banner.hidden, false);
});

test("fresh decline keeps Analytics unloaded and persists refusal", () => {
  const page = createPage();
  page.controls.decline.click();
  clickGuide(page);
  assert.equal(page.scripts.length, 0);
  assert.equal(page.commands().length, 0);
  assert.equal(page.window[disableKey], true);
  assert.equal(page.values.get(consentKey), "decline");
});

test("saved opt-in grants Analytics before its single initial page-view configuration", () => {
  const page = createPage({savedChoice: "allow"});
  assert.equal(page.scripts.length, 1);
  assert.equal(page.configs().length, 1);
  assert.equal(page.configs()[0][2].send_page_view, true);
  assert.equal(page.window[disableKey], false);
  const queuedBeforeInjection = page.injections[0];
  const defaultIndex = queuedBeforeInjection.findIndex(item => item[0] === "consent" && item[1] === "default");
  const grantIndex = queuedBeforeInjection.findIndex(item => item[0] === "consent" && item[1] === "update" && item[2].analytics_storage === "granted");
  const configIndex = queuedBeforeInjection.findIndex(item => item[0] === "config");
  assert.ok(defaultIndex >= 0 && defaultIndex < grantIndex && grantIndex < configIndex, "Consent must be queued before initial config and script injection");
  assert.equal(queuedBeforeInjection[defaultIndex][2].analytics_storage, "denied");
  assertAdvertisingDenied(page);
});

test("saved refusal and legacy refusal never load the tag", () => {
  for (const options of [{savedChoice: "decline"}, {legacyChoice: "decline"}]) {
    const page = createPage(options);
    assert.equal(page.scripts.length, 0);
    assert.equal(page.window[disableKey], true);
    assert.equal(page.values.get(consentKey), "decline");
  }
});

test("legacy cookieless allowance does not imply current cookie consent", () => {
  const page = createPage({legacyChoice: "allow"});
  assert.equal(page.scripts.length, 0);
  assert.equal(page.banner.hidden, false);
});

test("allow, decline, and reallow configure once and gate custom events", () => {
  const page = createPage();
  page.controls.allow.click();
  clickGuide(page);
  assert.equal(page.events().length, 1);
  page.controls.settings.click();
  page.controls.decline.click();
  clickGuide(page);
  assert.equal(page.events().length, 1, "Decline must suppress custom event queuing");
  assert.equal(page.window[disableKey], true);
  assert.equal(page.consentUpdates().at(-1)[2].analytics_storage, "denied");
  page.controls.settings.click();
  page.controls.allow.click();
  clickGuide(page);
  assert.equal(page.events().length, 2);
  assert.equal(page.scripts.length, 1);
  assert.equal(page.configs().length, 1);
  assert.equal(page.window[disableKey], false);
  assertAdvertisingDenied(page);
});

test("explicit opt-in works for current-page events when browser storage is blocked", () => {
  const page = createPage({storageBlocked: true});
  assert.equal(page.scripts.length, 0);
  page.controls.allow.click();
  clickGuide(page);
  assert.equal(page.scripts.length, 1);
  assert.equal(page.events().length, 1, "In-memory explicit consent must permit the selected guide event");
  page.controls.decline.click();
  clickGuide(page);
  assert.equal(page.events().length, 1, "Decline must still work without storage");
  assert.equal(page.window[disableKey], true);
  assert.equal(createPage({storageBlocked: true}).scripts.length, 0, "A new page must ask again when consent could not be saved");
  assertAdvertisingDenied(page);
});

for (const [name, newValue, key] of [
  ["cross-tab decline", "decline", consentKey],
  ["cross-tab consent removal", null, consentKey],
  ["cross-tab storage clear", null, null]
]) {
  test(name + " revokes already-loaded Analytics and suppresses custom events", () => {
    const page = createPage({savedChoice: "allow"});
    clickGuide(page);
    page.externalStorageChange(newValue, key);
    assert.equal(page.window[disableKey], true, "Already-loaded automatic Analytics must be disabled");
    assert.equal(page.consentUpdates().at(-1)[2].analytics_storage, "denied");
    clickGuide(page);
    assert.equal(page.events().length, 1);
    assert.equal(page.scripts.length, 1);
    assert.equal(page.configs().length, 1);
    assertAdvertisingDenied(page);
  });
}

test("unrelated cross-tab storage changes do not revoke valid consent", () => {
  const page = createPage({savedChoice: "allow"});
  page.externalStorageChange("decline", "unrelated-site-preference");
  clickGuide(page);
  assert.equal(page.window[disableKey], false);
  assert.equal(page.events().length, 1);
});

test("cross-tab opt-in loads once and reallow restores consent without another configuration", () => {
  const page = createPage();
  page.externalStorageChange("allow");
  assert.equal(page.scripts.length, 1);
  clickGuide(page);
  assert.equal(page.events().length, 1);
  page.externalStorageChange("decline");
  page.externalStorageChange("allow");
  clickGuide(page);
  assert.equal(page.events().length, 2);
  assert.equal(page.window[disableKey], false);
  assert.equal(page.scripts.length, 1);
  assert.equal(page.configs().length, 1);
  assertAdvertisingDenied(page);
});

test("automatic page views include their content group in initial configuration", () => {
  for (const [pathname, expectedGroup] of [["/", "home"], ["/walks/", "coast"], ["/visiting/", "visit"], ["/history/", "history"], ["/things-to-do/", "explore"]]) {
    const page = createPage({savedChoice: "allow", pathname});
    assert.equal(page.configs()[0][2].content_group, expectedGroup, pathname + " page-view content group");
    assert.equal(page.configs()[0][2].send_page_view, true);
  }
});

test("Beachsafe .com.au and its subdomains are classified as water-safety sources", () => {
  for (const hostname of ["beachsafe.com.au", "www.beachsafe.com.au"]) {
    const page = createPage({savedChoice: "allow"});
    page.clickLink("https://" + hostname + "/beach/qld/fraser-coast/point-vernon/gatakers-bay");
    assert.equal(page.events().length, 1, hostname + " must emit an official-source click");
    const event = page.events()[0];
    assert.equal(event[1], "outbound_official_source");
    assert.equal(event[2].source_type, "water_safety");
    assert.equal(event[2].destination_domain, hostname);
  }
});

test("lookalike Beachsafe domains are not classified as official sources", () => {
  for (const hostname of ["notbeachsafe.com.au", "beachsafe.com.au.example.com"]) {
    const page = createPage({savedChoice: "allow"});
    page.clickLink("https://" + hostname + "/");
    assert.equal(page.events().length, 0, hostname + " must not match the official-source domain");
  }
});
