"use strict";

const TRACKING_KEYS = new Set([
  "fbclid", "gclid", "dclid", "gbraid", "wbraid", "msclkid",
  "yclid", "twclid", "ttclid", "igshid", "mc_cid", "mc_eid", "srsltid"
]);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{2,128}$/;
const ASIN = /^[A-Z0-9]{10}$/;

function isAmazonJapan(host) {
  return host === "amazon.co.jp" || /^(?:www|m|smile)\.amazon\.co\.jp$/.test(host);
}

function getAmazonAsin(url) {
  if (!isAmazonJapan(url.hostname.toLowerCase())) return null;
  const segment = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Za-z0-9]{10})(?:[\/]|$)/i)?.[1];
  const asin = segment?.toUpperCase();
  return asin && ASIN.test(asin) ? asin : null;
}

function getYouTubePlaylistId(url) {
  if (!isDomain(url.hostname.toLowerCase(), "youtube.com")) return null;
  const list = url.searchParams.get("list");
  return list && PLAYLIST_ID.test(list) ? list : null;
}

function isDomain(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function getYouTubeVideoId(url) {
  const host = url.hostname.toLowerCase();
  let id = null;
  if (host === "youtu.be" || host === "www.youtu.be") {
    id = url.pathname.match(/^\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1];
  } else if (isDomain(host, "youtube.com") || isDomain(host, "youtube-nocookie.com")) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else id = url.pathname.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1];
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

function cleanUrl(input, options = {}) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return input;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return input;

  const host = url.hostname.toLowerCase();
  const playlistId = getYouTubePlaylistId(url);
  if (options.playlistOnly === true) {
    if (!playlistId) return input;
    return `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
  }

  const asin = getAmazonAsin(url);
  if (asin) return `https://www.amazon.co.jp/dp/${asin}/`;

  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    const seconds = options.timeSeconds;
    if (!(Number.isSafeInteger(seconds) && seconds > 0)) {
      if (host === "youtu.be" || host === "www.youtu.be") return `https://youtu.be/${videoId}`;
      if (/^\/shorts\//.test(url.pathname)) return `https://www.youtube.com/shorts/${videoId}`;
    }
    const result = new URL("https://www.youtube.com/watch");
    result.searchParams.set("v", videoId);
    if (Number.isSafeInteger(seconds) && seconds > 0) {
      result.searchParams.set("t", `${seconds}s`);
    }
    return result.href;
  }

  if (isDomain(host, "x.com") || isDomain(host, "twitter.com")) {
    const match = url.pathname.match(/^(\/(?:[^/]+\/status|i\/status)\/\d+)(?:\/.*)?$/);
    if (match) {
      url.pathname = match[1];
      url.search = "";
      url.hash = "";
      const seconds = options.timeSeconds;
      if (Number.isSafeInteger(seconds) && seconds > 0) {
        url.pathname += "/video/1";
        url.searchParams.set("t", String(seconds));
      }
      return url.href;
    }
  }

  if (isDomain(host, "youtube.com") && url.pathname === "/playlist") {
    if (playlistId) return `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
  }

  let changed = false;
  for (const name of [...url.searchParams.keys()]) {
    const key = name.toLowerCase();
    if (key.startsWith("utm_") || TRACKING_KEYS.has(key) ||
        (host.endsWith(".wikipedia.org") && key === "wprov") ||
        ((isDomain(host, "youtube.com") || host === "youtu.be") && key === "si")) {
      url.searchParams.delete(name);
      changed = true;
    }
  }
  return changed ? url.href : input;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { cleanUrl, getYouTubeVideoId, getYouTubePlaylistId, getAmazonAsin, isAmazonJapan };
}
