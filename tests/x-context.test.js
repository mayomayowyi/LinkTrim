"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const inline = readFileSync(require.resolve("../src/inline-buttons.js"), "utf8");
const background = readFileSync(require.resolve("../src/background.js"), "utf8");

function xContext() {
  let onContext, onMessage;
  const document = {
    addEventListener(type, fn) { if (type === "contextmenu") onContext = fn; },
    head: { append() {} }, documentElement: {},
    createElement() { return { style: {} }; }
  };
  vm.runInNewContext(inline, {
    document, location: { hostname: "x.com" }, URL, Date,
    chrome: { runtime: { onMessage: { addListener(fn) { onMessage = fn; } } } },
    MutationObserver: class { observe() {} },
    setTimeout() { return 1; }, clearTimeout() {}
  });
  function capture(attributes, text = "", shortened = "https://t.co/5U9qazSw7w") {
    const anchor = {
      href: shortened,
      getAttribute: key => attributes[key] ?? null,
      textContent: text
    };
    onContext({ target: { closest: selector => selector === "a[href]" ? anchor : null } });
  }
  function resolve(shortened = "https://t.co/5U9qazSw7w") {
    let answer;
    onMessage({ type: "expand-context-link", linkUrl: shortened }, null, value => { answer = value; });
    return answer?.url;
  }
  return { capture, resolve };
}

test("X: right-clicking displayed full URL expands t.co without fetching", () => {
  const x = xContext();
  x.capture({}, "mayoel.pages.dev/memoi/");
  assert.equal(x.resolve(), "https://mayoel.pages.dev/memoi/");
});
test("X: title is preferred when visible link text is shortened", () => {
  const x = xContext();
  x.capture({ title: "https://mayoel.pages.dev/memoi/?utm_source=x" }, "mayoel.pages.dev/memo…");
  assert.equal(x.resolve(), "https://mayoel.pages.dev/memoi/?utm_source=x");
});
test("X: truncated or invalid destination doesn't invent URL", () => {
  const x = xContext();
  x.capture({}, "mayoel.pages.dev/memo…");
  assert.equal(x.resolve(), null);
  x.capture({}, "some link");
  assert.equal(x.resolve(), null);
});
test("X: context expansion applies only to exactly clicked t.co URL", () => {
  const x = xContext();
  x.capture({}, "mayoel.pages.dev/memoi/");
  assert.equal(x.resolve("https://t.co/OTHER"), null);
  x.capture({}, "https://mayoel.pages.dev/memoi/", "https://somewhere.example/link");
  assert.equal(x.resolve(), null);
});

function backgroundContext({ expanded, site = "https://x.com/example/status/100" }) {
  let click;
  const copied = [];
  const queried = [];
  const ext = {
    runtime: { onInstalled: { addListener() {} }, onMessage: { addListener() {} } },
    contextMenus: { onClicked: { addListener(fn) { click = fn; } } },
    action: {
      onClicked: { addListener() {} },
      async setBadgeText() {}, async setBadgeBackgroundColor() {}, async setBadgeTextColor() {}
    },
    tabs: { async sendMessage(tabId, msg) { queried.push({ tabId, ...msg }); return { url: expanded }; } }
  };
  vm.runInNewContext(background, {
    chrome: ext, URL, Map, console,
    cleanUrl: url => url.replace(/\?utm_source=.+$/, ""),
    document: {}, navigator: { clipboard: { async writeText(url) { copied.push(url); } } },
    setTimeout() { return 1; }, clearTimeout() {}
  });
  return { copied, queried, click: () => click({
    menuItemId: "copy-single-url", linkUrl: "https://t.co/5U9qazSw7w", pageUrl: site
  }, { id: 5, url: site }) };
}

async function flushAsync() {
  for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
}
test("Context menu copies expanded X URL and applies ordinary cleaner", async () => {
  const t = backgroundContext({ expanded: "https://mayoel.pages.dev/memoi/?utm_source=x" });
  t.click(); await flushAsync();
  assert.deepEqual(t.copied, ["https://mayoel.pages.dev/memoi/"]);
  assert.equal(t.queried[0].type, "expand-context-link");
});
test("Context menu keeps original t.co if the site cannot provide a reliable destination", async () => {
  const t = backgroundContext({ expanded: null });
  t.click(); await flushAsync();
  assert.deepEqual(t.copied, ["https://t.co/5U9qazSw7w"]);
});
test("Context menu doesn't query expansion outside X", async () => {
  const t = backgroundContext({ expanded: "https://mayoel.pages.dev/memoi/", site: "https://example.org" });
  t.click(); await flushAsync();
  assert.equal(t.queried.length, 0);
  assert.deepEqual(t.copied, ["https://t.co/5U9qazSw7w"]);
});
