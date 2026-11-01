"use strict";

if (typeof importScripts === "function") importScripts("cleaner.js");
const ext = typeof browser === "undefined" ? chrome : browser;
const MENU_SINGLE = "copy-single-url";
const MENU_TIME = "copy-video-timestamp";
const badgeTimers = new Map();
let creatingOffscreen;

ext.runtime.onInstalled.addListener(() => {
  ext.contextMenus.create({
    id: MENU_SINGLE,
    title: "単体URLをコピー",
    contexts: ["link", "page"]
  });
  ext.contextMenus.create({
    id: MENU_TIME,
    title: "現在位置付きURLをコピー",
    contexts: ["page", "video", "action"],
    documentUrlPatterns: ["*://youtube.com/*", "*://*.youtube.com/*", "*://youtu.be/*"]
  });
});

// ページ内ボタンからのコピー要求は、送信元サイトとURLを照合する。
ext.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== "copy-inline" || !Number.isInteger(sender.tab?.id)) return;
  let url, options = {};
  try {
    url = new URL(message.url);
    const from = new URL(sender.url || sender.tab.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") return;
    const isX = host => ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"].includes(host);
    const isYouTube = host => ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host);

    if (isX(from.hostname)) {
      if (message.mode !== undefined || !isX(url.hostname) ||
          !/^\/(?:[^/]+\/status|i\/status)\/\d+\/?$/.test(url.pathname)) return;
    } else if (isYouTube(from.hostname)) {
      if (!isYouTube(url.hostname) || !getYouTubeVideoId(url) && !getYouTubePlaylistId(url)) return;
      if (message.mode === "playlist") {
        if (!getYouTubePlaylistId(url) || message.seconds !== undefined) return;
        options.playlistOnly = true;
      } else if (message.mode !== undefined || !getYouTubeVideoId(url)) return;
    } else if (from.hostname.endsWith(".wikipedia.org")) {
      if (message.mode !== undefined || message.seconds !== undefined ||
          !url.hostname.endsWith(".wikipedia.org") ||
          (url.href !== from.href && !url.pathname.startsWith("/wiki/"))) return;
    } else if (isAmazonJapan(from.hostname)) {
      if (message.mode !== undefined || message.seconds !== undefined ||
          !isAmazonJapan(url.hostname) || (!getAmazonAsin(url) && url.href !== from.href)) return;
    } else return;

    if (message.seconds !== undefined) {
      if (!Number.isSafeInteger(message.seconds) || message.seconds < 0) return;
      if (isYouTube(from.hostname) && getYouTubeVideoId(url) !== getYouTubeVideoId(from)) return;
      options.timeSeconds = message.seconds;
    }
  } catch { return; }
  void copyAndReport(url.href, sender.tab.id, false, options).then(ok => respond({ ok }));
  return true;
});

ext.action.onClicked.addListener(tab => {
  void copyAndReport(tab?.url, tab?.id);
});

ext.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_SINGLE) {
    void copyContextUrl(info, tab);
  } else if (info.menuItemId === MENU_TIME) {
    void copyAndReport(info.pageUrl || tab?.url, tab?.id, true);
  }
});

async function copyContextUrl(info, tab) {
  let source = info.linkUrl || info.pageUrl || tab?.url;
  if (info.linkUrl && Number.isInteger(tab?.id)) {
    try {
      const target = new URL(info.linkUrl);
      const page = new URL(info.pageUrl || tab.url);
      if (target.hostname === "t.co" &&
          ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"].includes(page.hostname)) {
        const result = await ext.tabs.sendMessage(tab.id, {
          type: "expand-context-link", linkUrl: target.href
        });
        if (result?.url) source = result.url;
      }
    } catch { /* 展開できない場合は短縮URLをそのままコピーする。 */ }
  }
  return copyAndReport(source, tab?.id);
}

async function copyAndReport(source, tabId, includeCurrentTime = false, initialOptions = {}) {
  try {
    if (!source) throw new Error("ページのURLを取得できません");
    let options = initialOptions;
    if (includeCurrentTime) {
      const url = new URL(source);
      if (!getYouTubeVideoId(url) || !Number.isInteger(tabId)) {
        throw new Error("現在位置付きコピーはYouTubeの動画ページでのみ使用できます");
      }
      const seconds = await readPosition(tabId);
      if (seconds === null) throw new Error("動画の現在位置を取得できませんでした");
      options = { timeSeconds: seconds };
    }
    await writeClipboard(cleanUrl(source, options));
    await showResult("OK", "#347F9C", tabId);
    return true;
  } catch (error) {
    console.error("URLのコピーに失敗しました", error);
    await showResult("!", "#B54B51", tabId);
    return false;
  }
}

async function readPosition(tabId) {
  const results = await ext.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (document.querySelector(".html5-video-player.ad-showing")) return null;
      const video = document.querySelector("video.html5-main-video") ||
                    document.querySelector("#movie_player video");
      if (!video || !Number.isFinite(video.currentTime) ||
          !Number.isFinite(video.duration) || video.duration <= 0) return null;
      return Math.max(0, Math.floor(video.currentTime));
    }
  });
  const value = results?.[0]?.result;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

async function showResult(text, color, tabId) {
  const target = Number.isInteger(tabId) ? { tabId } : {};
  const key = Number.isInteger(tabId) ? tabId : "global";
  for (const timer of badgeTimers.get(key) || []) clearTimeout(timer);
  const timers = [];
  badgeTimers.set(key, timers);

  try {
    await ext.action.setBadgeText({ text: "", ...target });
    await ext.action.setBadgeBackgroundColor({ color, ...target });
    if (ext.action.setBadgeTextColor) {
      await ext.action.setBadgeTextColor({ color: [255, 255, 255, 255], ...target });
    }
    if (badgeTimers.get(key) !== timers) return;
    await ext.action.setBadgeText({ text, ...target });
    if (badgeTimers.get(key) !== timers) return;

    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    for (const [index, alpha] of [192, 128, 64, 0].entries()) {
      timers.push(setTimeout(() => {
        if (badgeTimers.get(key) !== timers) return;
        void ext.action.setBadgeBackgroundColor({ color: [...rgb, alpha], ...target });
        if (ext.action.setBadgeTextColor) {
          void ext.action.setBadgeTextColor({ color: [255, 255, 255, alpha], ...target });
        }
      }, 1500 + index * 150));
    }
    timers.push(setTimeout(() => {
      if (badgeTimers.get(key) !== timers) return;
      badgeTimers.delete(key);
      void ext.action.setBadgeText({ text: "", ...target });
    }, 2100));
  } catch (error) {
    console.warn("結果バッジを表示できませんでした", error);
  }
}

async function writeClipboard(text) {
  if (typeof document !== "undefined") {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch { /* 別のコピー方法を試す。 */ }
    }
    if (copyUsingDocument(document, text)) return;
    throw new Error("クリップボードへの書き込みが拒否されました");
  }

  await ensureOffscreen();
  const response = await ext.runtime.sendMessage({ target: "offscreen", type: "copy", text });
  if (!response?.ok) throw new Error(response?.error || "コピーに失敗しました");
}

function copyUsingDocument(doc, text) {
  const field = doc.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
  doc.body.append(field);
  try {
    field.focus();
    field.select();
    return doc.execCommand("copy");
  } finally {
    field.remove();
  }
}

async function ensureOffscreen() {
  if (await ext.offscreen.hasDocument()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = ext.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["CLIPBOARD"],
      justification: "ユーザー操作で指定したURLをクリップボードへコピーするため"
    }).finally(() => { creatingOffscreen = undefined; });
  }
  await creatingOffscreen;
}
