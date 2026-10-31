"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cleanUrl } = require("../src/cleaner.js");

const checks = [
  ["X post", "https://x.com/mayopyi/status/2115666437767676037?a=TzAGRkDOH0pmd40fLdE&s=20", "https://x.com/mayopyi/status/2115666437767676037"],
  ["X photo path", "https://x.com/mayo/status/2115666437767676037/photo/1?s=20", "https://x.com/mayo/status/2115666437767676037"],
  ["Twitter status", "https://twitter.com/mayo/status/12345?s=20", "https://twitter.com/mayo/status/12345"],
  ["X video timestamp", "https://x.com/AUTOMATONJapan/status/2115945254365110684", "https://x.com/AUTOMATONJapan/status/2115945254365110684/video/1?t=17", { timeSeconds: 17 }],
  ["X video timestamp from a video URL", "https://x.com/AUTOMATONJapan/status/2115945254365110684/video/1?t=15", "https://x.com/AUTOMATONJapan/status/2115945254365110684/video/1?t=70", { timeSeconds: 70 }],
  ["X regular copy removes timestamp and video URL", "https://x.com/AUTOMATONJapan/status/2115945254365110684/video/1?t=17", "https://x.com/AUTOMATONJapan/status/2115945254365110684"],
  ["X regular copy never adds time", "https://x.com/AUTOMATONJapan/status/2115945254365110684?utm_source=chatgpt.com", "https://x.com/AUTOMATONJapan/status/2115945254365110684"],
  ["X time zero means original post", "https://x.com/AUTOMATONJapan/status/2115945254365110684", "https://x.com/AUTOMATONJapan/status/2115945254365110684", { timeSeconds: 0 }],
  ["Twitter video time", "https://twitter.com/example/status/1234567890123456789", "https://twitter.com/example/status/1234567890123456789/video/1?t=17", { timeSeconds: 17 }],
  ["X unsigned time ignored", "https://x.com/mayo/status/1234", "https://x.com/mayo/status/1234", { timeSeconds: -3 }],
  ["X time fractional ignored", "https://x.com/mayo/status/1234", "https://x.com/mayo/status/1234", { timeSeconds: 17.1 }],
  ["YouTube live share", "https://www.youtube.com/live/z5N77jZs54s?si=NKZHTBoH9W-P-W_n", "https://www.youtube.com/watch?v=z5N77jZs54s"],
  ["YouTube watch", "https://www.youtube.com/watch?v=z5N77jZs54s&si=abcdef&t=123", "https://www.youtube.com/watch?v=z5N77jZs54s"],
  ["YouTube Mix single video", "https://www.youtube.com/watch?list=RDz5N77jZs54s&start_radio=1&index=4&v=z5N77jZs54s&si=123", "https://www.youtube.com/watch?v=z5N77jZs54s"],
  ["YouTube playlist video", "https://www.youtube.com/watch?v=z5N77jZs54s&list=PL12345&index=12", "https://www.youtube.com/watch?v=z5N77jZs54s"],
  ["YouTube timestamp copy", "https://www.youtube.com/watch?v=44lW4WTZZjM&list=PL123&t=35s", "https://www.youtube.com/watch?v=44lW4WTZZjM&t=70s", { timeSeconds: 70 }],
  ["YouTube timestamp at zero", "https://www.youtube.com/watch?v=44lW4WTZZjM&list=PL123", "https://www.youtube.com/watch?v=44lW4WTZZjM", { timeSeconds: 0 }],
  ["YouTube playlist page", "https://www.youtube.com/playlist?list=PL12345&si=abcdef&index=3", "https://www.youtube.com/playlist?list=PL12345"],
  ["YouTube Shorts", "https://www.youtube.com/shorts/z5N77jZs54s?feature=share&si=abc", "https://www.youtube.com/shorts/z5N77jZs54s"],
  ["YouTube embed", "https://www.youtube.com/embed/z5N77jZs54s?start=55", "https://www.youtube.com/watch?v=z5N77jZs54s"],
  ["YouTube shortened", "https://youtu.be/z5N77jZs54s?si=abc&t=10", "https://youtu.be/z5N77jZs54s"],
  ["YouTube shortened timestamp", "https://youtu.be/z5N77jZs54s?si=abc", "https://www.youtube.com/watch?v=z5N77jZs54s&t=34s", { timeSeconds: 34 }],
  ["Invalid YouTube ID preserved", "https://www.youtube.com/watch?v=short&list=PL123", "https://www.youtube.com/watch?v=short&list=PL123"],
  ["ChatGPT utm", "https://example.com/article?utm_source=chatgpt.com", "https://example.com/article"],
  ["Functional query", "https://example.com/search?q=hello&utm_medium=social&page=2", "https://example.com/search?q=hello&page=2"],
  ["Unknown query", "https://example.com/page?token=abc&si=123", "https://example.com/page?token=abc&si=123"],
  ["Common trackers", "https://example.com/?utm_campaign=x&fbclid=A&gclid=B&msclkid=C", "https://example.com/"],
  ["False domain", "https://notyoutube.com/watch?v=z5N77jZs54s&list=PL123", "https://notyoutube.com/watch?v=z5N77jZs54s&list=PL123"],
  ["Subdomain impersonation", "https://youtube.com.evil.example/watch?v=z5N77jZs54s&list=PL123", "https://youtube.com.evil.example/watch?v=z5N77jZs54s&list=PL123"],
  ["Anchors", "https://example.com/docs?utm_source=x#part2", "https://example.com/docs#part2"],
  ["Invalid URL", "hello", "hello"],
  ["Internal URL", "chrome://extensions/?id=abc", "chrome://extensions/?id=abc"]
];
for (const [label, input, expected, options] of checks) {
  test(label, () => assert.equal(cleanUrl(input, options), expected));
}
