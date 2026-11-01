"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { cleanUrl, getAmazonAsin, getYouTubePlaylistId } = require("../src/cleaner.js");
const { youtubeCard, amazonCard } = require("../src/card-links.js");
const root = require("node:path").resolve(__dirname, "..");

const amazonAsin = "B0DNDXMLR7";
const amazonCanonical = `https://www.amazon.co.jp/dp/${amazonAsin}/`;
const amazonSamples = [
  ["Wishlist", `https://www.amazon.co.jp/dp/${amazonAsin}/?coliid=IF5T964EI4Y42&colid=AL8U6D2GSVT4&psc=1&ref_=list_c_wl_lv_ov_lig_dp_it`],
  ["Long search result path", `https://www.amazon.co.jp/%E3%80%90Amazon-co-jp%E9%99%90%E5%AE%9A%E3%80%91ASUS%E3%83%A2%E3%83%8B%E3%82%BF%E3%83%BC/dp/${amazonAsin}?pd_rd_w=qQltW&content-id=amzn1.sym.xxx&pf_rd_p=308c03cc&pf_rd_r=EMVGHVP3Z906P5NS8FHY&pd_rd_i=${amazonAsin}`],
  ["gp product", `https://www.amazon.co.jp/gp/product/${amazonAsin}/ref=something?tag=affiliate-22`],
  ["Mobile product", `https://m.amazon.co.jp/gp/aw/d/${amazonAsin}?th=1&psc=1`]
];
for (const [name, input] of amazonSamples) {
  test(`Amazon ${name} is canonicalized`, () => assert.equal(cleanUrl(input), amazonCanonical));
  test(`Amazon ${name} ASIN extraction`, () => assert.equal(getAmazonAsin(new URL(input)), amazonAsin));
}

test("Amazon invalid or spoofed hosts are not canonicalized", () => {
  for (const input of [
    `https://www.amazon.co.jp.evil.example/dp/${amazonAsin}/?tag=x`,
    `https://other.example/dp/${amazonAsin}/?item=x`,
    "https://www.amazon.co.jp/s?k=headphones&page=3",
    "https://www.amazon.co.jp/gp/your-account/order-history?orderFilter=year-2026",
    "https://www.amazon.co.jp/dp/SHORT/?a=1"
  ]) assert.equal(cleanUrl(input), input);
});
test("Amazon list images resolve to canonical product without opening page", () => {
  assert.equal(amazonCard([`/ASUS-Example/dp/${amazonAsin}?pd_rd_i=x`], "https://www.amazon.co.jp/s?k=monitor", null), amazonCanonical);
  assert.equal(amazonCard([], "https://www.amazon.co.jp/hz/wishlist/ls/ABC", amazonAsin), amazonCanonical);
  assert.equal(amazonCard([], "https://www.amazon.co.jp/s?k=test", "wrong"), null);
  assert.equal(amazonCard([], "https://evil.example", amazonAsin), null);
});

test("YouTube list-only mode strips video, timestamp and index", () => {
  assert.equal(cleanUrl("https://www.youtube.com/watch?v=44lW4WTZZjM&list=RD44lW4WTZZjM&index=3&t=50s", { playlistOnly: true }), "https://www.youtube.com/playlist?list=RD44lW4WTZZjM");
  assert.equal(cleanUrl("https://www.youtube.com/watch?v=44lW4WTZZjM&list=PLplay123&index=3", { playlistOnly: true }), "https://www.youtube.com/playlist?list=PLplay123");
  assert.equal(cleanUrl("https://www.youtube.com/playlist?list=PLplay123&si=secret", { playlistOnly: true }), "https://www.youtube.com/playlist?list=PLplay123");
});
test("YouTube list-only mode refuses video without list", () => {
  const input = "https://www.youtube.com/watch?v=44lW4WTZZjM";
  assert.equal(cleanUrl(input, { playlistOnly: true }), input);
  assert.equal(getYouTubePlaylistId(new URL(input)), null);
});
test("YouTube listing video with a playlist offers two distinct URLs", () => {
  const out = youtubeCard(["/watch?v=44lW4WTZZjM&list=RD44lW4WTZZjM&index=2"], "https://www.youtube.com/");
  assert.deepEqual(out, {
    video: "https://www.youtube.com/watch?v=44lW4WTZZjM",
    list: "https://www.youtube.com/playlist?list=RD44lW4WTZZjM"
  });
});
test("YouTube video-only cards do not invent a playlist", () => {
  assert.deepEqual(youtubeCard(["/watch?v=44lW4WTZZjM"], "https://www.youtube.com/"), {
    video: "https://www.youtube.com/watch?v=44lW4WTZZjM", list: null
  });
});
test("YouTube playlist-only cards do not invent a video", () => {
  assert.deepEqual(youtubeCard(["/playlist?list=PLplay123"], "https://www.youtube.com/", true), {
    video: null, list: "https://www.youtube.com/playlist?list=PLplay123"
  });
  assert.deepEqual(youtubeCard(["/watch?v=44lW4WTZZjM&list=RD44lW4WTZZjM"], "https://www.youtube.com/", true), {
    video: null, list: "https://www.youtube.com/playlist?list=RD44lW4WTZZjM"
  });
});
test("YouTube playlist rows can use their actual parent list", () => {
  const out = youtubeCard(["/watch?v=44lW4WTZZjM"], "https://www.youtube.com/playlist?list=PLplay123", false, "PLplay123");
  assert.equal(out.list, "https://www.youtube.com/playlist?list=PLplay123");
});
test("YouTube spoofing and broken playlist IDs are rejected", () => {
  assert.deepEqual(youtubeCard(["https://youtube.com.evil.example/watch?v=44lW4WTZZjM&list=PLfake"], "https://www.youtube.com/"), {video:null,list:null});
  assert.deepEqual(youtubeCard(["/watch?v=44lW4WTZZjM&list=wrong%20list"], "https://www.youtube.com/"), {video:"https://www.youtube.com/watch?v=44lW4WTZZjM",list:null});
});

test("Manifest permissions and card scripts exist in both browser packages", () => {
  for (const browser of ["chrome", "firefox"]) {
    const manifest = JSON.parse(readFileSync(`${root}/manifests/${browser}.json`, "utf8"));
    assert.equal(manifest.version, browser === "firefox" ? "0.0.2.1" : "0.0.2");
    assert.deepEqual(manifest.content_scripts[0].js, ["card-links.js", "inline-buttons.js"]);
    assert.ok(manifest.content_scripts[0].matches.includes("*://www.amazon.co.jp/*"));
  }
});
test("Listing controls are portaled above native hover previews", () => {
  const code = readFileSync(`${root}/src/inline-buttons.js`, "utf8");
  assert.match(code, /className = "linktrim-card-portal"/);
  assert.match(code, /document\.body\.append\(cardOverlay\)/);
  assert.match(code, /z-index: 2147483647 !important/);
  assert.match(code, /pointermove/);
  assert.match(code, /title = kind === "time"/);
  assert.match(code, /kind === "playlist" \? "リストのみのURLをコピー"/);
});

test("Shorts cards keep native Shorts URL and no invented list", () => {
  assert.deepEqual(youtubeCard(["/shorts/44lW4WTZZjM?feature=share"], "https://www.youtube.com/"), {
    video: "https://www.youtube.com/shorts/44lW4WTZZjM", list: null
  });
  assert.equal(cleanUrl("https://www.youtube.com/shorts/44lW4WTZZjM?si=foo"), "https://www.youtube.com/shorts/44lW4WTZZjM");
  assert.equal(cleanUrl("https://www.youtube.com/shorts/44lW4WTZZjM?si=foo", {timeSeconds: 17}), "https://www.youtube.com/watch?v=44lW4WTZZjM&t=17s");
});

test("YouTube cards register a geometry-based target that is resilient to preview replacement", () => {
  const code = readFileSync(`${root}/src/inline-buttons.js`, "utf8");
  assert.match(code, /registerCard\(card, hit, getCurrent\)/);
  assert.match(code, /yt-shorts-lockup-view-model/);
  assert.match(code, /cardAt\(pointerX, pointerY\)/);
});

test("Amazon global page copy is offered on all Amazon Japan pages", () => {
  const code = readFileSync(`${root}/src/inline-buttons.js`, "utf8");
  assert.match(code, /function scanAmazonPage\(\)/);
  assert.match(code, /className = "linktrim-amazon-page-control"/);
  assert.match(code, /productSelector/);
});

const { wikipediaArticle } = require("../src/card-links.js");
test("Wikipedia search and article links resolve, preserving anchors and revision IDs", () => {
  assert.equal(wikipediaArticle("/wiki/%E6%9D%B1%E4%BA%AC?utm_source=social#%E6%AD%B4%E5%8F%B2", "https://ja.wikipedia.org/w/index.php?search=tokyo"),
    "https://ja.wikipedia.org/wiki/%E6%9D%B1%E4%BA%AC#%E6%AD%B4%E5%8F%B2");
  assert.equal(wikipediaArticle("/wiki/Japan?oldid=125#History", "https://en.wikipedia.org/wiki/History"),
    "https://en.wikipedia.org/wiki/Japan?oldid=125#History");
});
test("Wikipedia links reject spoofed hosts, search actions and external destinations", () => {
  const base = "https://ja.wikipedia.org/wiki/Test";
  for (const href of ["https://ja.wikipedia.org.evil.example/wiki/Test", "https://commons.wikimedia.org/wiki/Test", "/w/index.php?title=Test&action=edit", "javascript:alert(1)", "/wiki/"]) {
    assert.equal(wikipediaArticle(href, base), null);
  }
});
test("Wikipedia tracking parameter is removed but meaningful parameters survive", () => {
  assert.equal(cleanUrl("https://ja.wikipedia.org/wiki/東京?wprov=sfla1&oldid=123&utm_medium=test#歴史"),
    "https://ja.wikipedia.org/wiki/%E6%9D%B1%E4%BA%AC?oldid=123#%E6%AD%B4%E5%8F%B2");
});
test("Wikipedia content scripts replace Google and keep the site scope narrow", () => {
  for (const browser of ["chrome", "firefox"]) {
    const manifest = JSON.parse(readFileSync(`${root}/manifests/${browser}.json`, "utf8"));
    const matches = manifest.content_scripts[0].matches;
    assert.ok(matches.includes("*://*.wikipedia.org/*"));
    assert.ok(matches.every(x => !x.includes("google.com") && !x.includes("google.co.jp") && !x.includes("<all_urls>")));
  }
});
test("Amazon detail page control follows native share button instead of covering main image", () => {
  const code = readFileSync(`${root}/src/inline-buttons.js`, "utf8");
  assert.match(code, /function amazonShareAnchor\(\)/);
  assert.match(code, /#shareIcon/);
  assert.match(code, /share\.left - bounds\.left/);
  assert.match(code, /position: absolute; bottom: auto/);
  assert.doesNotMatch(code, /amazonFollowTimer/);
  assert.doesNotMatch(code, /const title = !share/);
  assert.match(code, /linktrim-amazon-detail-control/);
  assert.doesNotMatch(code, /registerCard\(hit, hit, getCurrent\)/);
});
test("Wikipedia has page copy and hover copy for search results and article links", () => {
  const code = readFileSync(`${root}/src/inline-buttons.js`, "utf8");
  assert.match(code, /function scanWikipedia\(\)/);
  assert.match(code, /\.mw-search-results/);
  assert.match(code, /className = "linktrim-wikipedia-title-control"/);
  assert.match(code, /#firstHeading, \.mw-first-heading/);
  assert.doesNotMatch(code, /linktrim-wikipedia-page-control/);
  assert.match(code, /document\.elementFromPoint\(x, y\)/);
  assert.doesNotMatch(code, /function scanGoogleImages\(\)/);
});
