"use strict";

// URL extraction for cards. Does not fetch pages or depend on DOM layout.
const LinkTrimCardLinks = (() => {
  const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
  const playlistIdPattern = /^[A-Za-z0-9_-]{2,128}$/;
  const asinPattern = /^[A-Z0-9]{10}$/;

  function parse(href, base) {
    try {
      const url = new URL(href, base);
      return ["http:", "https:"].includes(url.protocol) ? url : null;
    } catch { return null; }
  }

  function youtubeVideoId(url) {
    if (!url) return null;
    const host = url.hostname.toLowerCase();
    if (host !== "youtube.com" && host !== "www.youtube.com" && host !== "m.youtube.com" &&
        host !== "youtu.be" && host !== "www.youtu.be") return null;
    const id = host.endsWith("youtu.be")
      ? url.pathname.match(/^\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1]
      : url.pathname === "/watch" ? url.searchParams.get("v")
        : url.pathname.match(/^\/(?:shorts|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1];
    return id && videoIdPattern.test(id) ? id : null;
  }

  function youtubePlaylistId(url) {
    if (!url || !["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname.toLowerCase())) return null;
    const id = url.searchParams.get("list");
    return id && playlistIdPattern.test(id) ? id : null;
  }

  function youtubeCard(hrefs, base, isPlaylistCard = false, fallbackPlaylistId = null) {
    let video = null, list = null;
    for (const href of hrefs) {
      const url = parse(href, base);
      if (!url) continue;
      const nextVideo = youtubeVideoId(url);
      const nextList = youtubePlaylistId(url);
      if (!video && nextVideo) video = /^\/shorts\//.test(url.pathname)
        ? `https://www.youtube.com/shorts/${nextVideo}`
        : `https://www.youtube.com/watch?v=${nextVideo}`;
      if (!list && nextList) list = `https://www.youtube.com/playlist?list=${nextList}`;
      if (video && list) break;
    }
    if (!list && playlistIdPattern.test(fallbackPlaylistId || "")) {
      list = `https://www.youtube.com/playlist?list=${fallbackPlaylistId}`;
    }
    return { video: isPlaylistCard ? null : video, list };
  }

  function amazonAsin(url) {
    if (!url || !["amazon.co.jp", "www.amazon.co.jp", "m.amazon.co.jp", "smile.amazon.co.jp"].includes(url.hostname.toLowerCase())) return null;
    const id = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Za-z0-9]{10})(?:\/|$)/i)?.[1]?.toUpperCase();
    return id && asinPattern.test(id) ? id : null;
  }

  function amazonCard(hrefs, base, cardAsin) {
    for (const href of hrefs) {
      const asin = amazonAsin(parse(href, base));
      if (asin) return `https://www.amazon.co.jp/dp/${asin}/`;
    }
    const baseUrl = parse(base, base);
    if (!baseUrl || !["amazon.co.jp", "www.amazon.co.jp", "m.amazon.co.jp", "smile.amazon.co.jp"].includes(baseUrl.hostname.toLowerCase())) return null;
    const asin = String(cardAsin || "").toUpperCase();
    return asinPattern.test(asin) ? `https://www.amazon.co.jp/dp/${asin}/` : null;
  }

  function wikipediaArticle(href, base) {
    const url = parse(href, base);
    if (!url || !url.hostname.toLowerCase().endsWith(".wikipedia.org") ||
        !url.pathname.startsWith("/wiki/") || url.pathname.length <= 6) return null;
    for (const name of [...url.searchParams.keys()]) {
      if (name.toLowerCase().startsWith("utm_") || name.toLowerCase() === "wprov") {
        url.searchParams.delete(name);
      }
    }
    return url.href;
  }

  return { youtubeCard, amazonCard, wikipediaArticle, youtubeVideoId, youtubePlaylistId, amazonAsin };
})();

if (typeof module !== "undefined" && module.exports) module.exports = LinkTrimCardLinks;
