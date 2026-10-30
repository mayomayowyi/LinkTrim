"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const script = readFileSync(require.resolve("../src/inline-buttons.js"), "utf8");

function renderX({ withShare = true, withVideo = false, withTime = true } = {}) {
  const pending = [];
  const messages = [];
  let observer;
  const group = makeElement();
  const article = makeElement();
  const share = makeElement();
  const link = {
    href: "https://x.com/example/status/123456789",
    closest: selector => selector.startsWith('[data-testid="tweetText"]') ? null : article,
    querySelector: selector => (selector === "time" && withTime ? {} : null)
  };
  const video = { currentTime: 17.8, duration: 120, closest: () => article };
  share.closest = selector => selector === '[role="group"]' ? group : article;
  group.closest = () => article;
  article.querySelectorAll = selector => ({
    'a[href*="/status/"]': [link],
    '[data-testid="share"]': withShare ? [share] : [],
    '[role="group"]': withShare ? [group] : [],
    "video": withVideo ? [video] : [],
    '[data-testid="videoPlayer"]': []
  }[selector] || []);
  const document = {
    head: { append() {} },
    addEventListener() {},
    documentElement: {},
    createElement: () => makeElement(),
    createElementNS: (_ns, tag) => Object.assign(makeElement(), { tag }),
    querySelectorAll: selector => selector === 'article[data-testid="tweet"]' ? [article] : []
  };
  class Observer {
    constructor(callback) { observer = callback; }
    observe() {}
  }
  vm.runInNewContext(script, {
    document, location: { hostname: "x.com" }, MutationObserver: Observer,
    setTimeout: callback => { pending.push(callback); return pending.length; },
    clearTimeout() {}, URL,
    chrome: { runtime: { onMessage: { addListener() {} }, sendMessage: async message => { messages.push(message); return { ok: true }; } } }
  });
  const flush = () => { const next = pending.shift(); if (next) next(); };
  flush();
  return { article, group, messages, observer, flush };
}

function makeElement() {
  const element = {
    children: [], dataset: {}, handlers: {}, attributes: {},
    append(node) { this.children.push(node); },
    remove() {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, callback) { this.handlers[type] = callback; },
    querySelector(selector) {
      if (selector === ':scope > .linktrim-controls') return this.children.find(x => x.className === "linktrim-controls") || null;
      if (selector === '[data-kind="time"]') return this.children.find(x => x.dataset.kind === "time") || null;
      return null;
    }
  };
  return element;
}

test("X ordinary post displays one link button", () => {
  const { group } = renderX();
  assert.deepEqual(group.children[0].children.map(x => x.dataset.kind), ["link"]);
});

test("X post with video displays both buttons", () => {
  const { group } = renderX({ withVideo: true });
  assert.deepEqual(group.children[0].children.map(x => x.dataset.kind), ["link", "time"]);
});

test("X falls back to the post itself when the action bar is unavailable", () => {
  const { article } = renderX({ withShare: false });
  assert.deepEqual(article.children[0].children.map(x => x.dataset.kind), ["link"]);
});

test("X recognizes a sole permalink without a time element", () => {
  const { group } = renderX({ withTime: false });
  assert.equal(group.children.length, 1);
});

test("X does not add buttons twice when scanning again", () => {
  const { group, observer, flush } = renderX();
  observer();
  flush();
  assert.equal(group.children.length, 1);
});


test("YouTube places link and timestamp buttons without duplicates", () => {
  const pending = [];
  let observer;
  const actions = makeElement();
  actions.querySelector = selector => selector === ".linktrim-controls"
    ? actions.children.find(x => x.className === "linktrim-controls") || null : null;
  actions.querySelectorAll = () => [];
  actions.prepend = node => actions.children.unshift(node);
  const document = {
    head: { append() {} }, documentElement: {},
    createElement: () => makeElement(),
    createElementNS: (_ns, tag) => Object.assign(makeElement(), { tag }),
    querySelector: selector => selector === "ytd-watch-metadata #actions" ? actions : null,
    querySelectorAll: () => []
  };
  class Observer { constructor(callback) { observer = callback; } observe() {} }
  vm.runInNewContext(script, {
    document, location: { hostname: "www.youtube.com", pathname: "/watch", href: "https://www.youtube.com/watch?v=44lW4WTZZjM" },
    MutationObserver: Observer, setTimeout: callback => { pending.push(callback); return pending.length; },
    clearTimeout() {}, URL, chrome: { runtime: { sendMessage: async () => ({ ok: true }) } }
  });
  pending.shift()();
  assert.deepEqual(actions.children[0].children.map(x => x.dataset.kind), ["link", "time"]);
  observer();
  pending.shift()();
  assert.equal(actions.children.length, 1);
});

// Keep small controls legible: the time button is a clock, not a link/clock overlay.
test("Time button uses a single clock glyph", () => {
  const { group } = renderX({ withVideo: true });
  const [link, time] = group.children[0].children;
  const linkPath = link.children[0].children[0];
  const [clockFace, clockHand] = time.children[0].children;
  assert.match(linkPath.attributes.d, /M10 13a5/);
  assert.equal(clockFace.tag, "circle");
  assert.deepEqual({ ...clockFace.attributes }, { cx: "12", cy: "12", r: "9" });
  assert.equal(clockHand.tag, "path");
  assert.equal(time.title, "再生位置付きURLをコピー");
});

test("Inline icons use native tone with subdued default and visible feedback", () => {
  assert.match(script, /"stroke-width": "2"/);
  assert.match(script, /width: "18", height: "18"/);
  assert.match(script, /flex: 0 0 36px; width: 36px; height: 36px; padding: 0/);
  assert.match(script, /width: 18px; height: 18px; flex: none/);
  assert.match(script, /gap: 0; flex: 0 0 auto/);
  assert.match(script, /opacity: \.62; transition:/);
  assert.match(script, /\[data-status\] \{ opacity: 1; \}/);
});
