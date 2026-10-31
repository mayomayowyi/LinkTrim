"use strict";

(() => {
  const ext = typeof browser === "undefined" ? chrome : browser;
  const isX = /^(?:www\.|mobile\.)?(?:x\.com|twitter\.com)$/.test(location.hostname);
  const isYouTube = /^(?:www\.|m\.)?youtube\.com$/.test(location.hostname);
  const isAmazon = /^(?:www\.|m\.|smile\.)?amazon\.co\.jp$/.test(location.hostname);
  const isWikipedia = location.hostname.endsWith(".wikipedia.org");
  const BUTTON = "linktrim-copy";
  let queued = false;
  const timers = new WeakMap();

  const paths = {
    link: [["path", { d: "M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" }]],
    time: [["circle", { cx: "12", cy: "12", r: "9" }], ["path", { d: "M12 6.5V12l3.5 2" }]],
    playlist: [["path", { d: "M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" }]]
  };

  // X displays the destination text, but the link href points to t.co.
  // Capture the exact right-clicked link; avoid network requests or extra permissions.
  let contextLink = null;
  if (isX) {
    document.addEventListener("contextmenu", event => {
      contextLink = null;
      const anchor = event.target?.closest?.("a[href]");
      if (!anchor) return;
      let shortened;
      try { shortened = new URL(anchor.href); } catch { return; }
      if (shortened.hostname !== "t.co" || !["http:", "https:"].includes(shortened.protocol)) return;

      const candidates = [
        anchor.getAttribute("data-expanded-url"),
        anchor.getAttribute("title"),
        anchor.getAttribute("aria-label"),
        anchor.textContent
      ];
      for (const value of candidates) {
        const text = (value || "").trim().replace(/\u200b/g, "");
        if (!text || /[\s\u2026]|\.\.\./.test(text)) continue;
        try {
          const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
          if (!["http:", "https:"].includes(url.protocol) ||
              !url.hostname.includes(".") || url.hostname === "t.co") continue;
          contextLink = { original: shortened.href, expanded: url.href, time: Date.now() };
          break;
        } catch { /* Not a complete destination URL. */ }
      }
    }, true);

    ext.runtime.onMessage.addListener((message, _sender, respond) => {
      if (message?.type !== "expand-context-link") return;
      const saved = contextLink;
      const fresh = saved && Date.now() - saved.time < 30000;
      respond({ url: fresh && message.linkUrl === saved.original ? saved.expanded : null });
    });
  }

  function own(article, selector) {
    return [...article.querySelectorAll(selector)].find(node =>
      node.closest('article[data-testid="tweet"]') === article
    );
  }

  function postUrl(article) {
    const candidates = [];
    for (const link of article.querySelectorAll('a[href*="/status/"]')) {
      if (link.closest('article[data-testid="tweet"]') !== article) continue;
      try {
        const url = new URL(link.href);
        if (!/^(?:(?:www|mobile)\.)?(?:x\.com|twitter\.com)$/.test(url.hostname) ||
            !/^\/(?:[^/]+\/status|i\/status)\/\d+\/?$/.test(url.pathname)) continue;
        if (link.querySelector("time")) return url.href;
        // A quote can contain another post URL; do not guess between multiple IDs.
        if (!link.closest('[data-testid="tweetText"], [data-testid="quoteTweet"]')) candidates.push(url.href);
      } catch { /* Ignore invalid links. */ }
    }
    return new Set(candidates.map(value => new URL(value).pathname)).size === 1
      ? candidates[0] : null;
  }

  function videoIn(article) {
    return own(article, "video");
  }

  function youtubeVideo() {
    return location.pathname === "/watch"
      ? new URL(location.href).searchParams.has("v")
      : /^\/(?:shorts|live)\/[^/]+/.test(location.pathname);
  }

  function secondsFrom(video) {
    if (!video || !Number.isFinite(video.currentTime) ||
        !Number.isFinite(video.duration) || video.duration <= 0) return null;
    return Math.max(0, Math.floor(video.currentTime));
  }

  function status(button, ok) {
    for (const timer of timers.get(button) || []) clearTimeout(timer);
    button.dataset.status = ok ? "OK" : "!";
    button.dataset.fade = "false";
    const ids = [
      setTimeout(() => { button.dataset.fade = "true"; }, 1500),
      setTimeout(() => {
        delete button.dataset.status;
        delete button.dataset.fade;
        timers.delete(button);
      }, 1850)
    ];
    timers.set(button, ids);
  }

  function makeButton(kind, getData) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON;
    button.dataset.kind = kind;
    button.title = kind === "time" ? "再生位置付きURLをコピー" :
      kind === "playlist" ? "リストのみのURLをコピー" : "単体URLをコピー";
    button.setAttribute("aria-label", button.title);
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    for (const [name, value] of Object.entries({
      viewBox: "0 0 24 24", width: "18", height: "18", fill: "none",
      stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round",
      "stroke-linejoin": "round", "aria-hidden": "true"
    })) svg.setAttribute(name, value);
    for (const [tag, attributes] of paths[kind]) {
      const shape = document.createElementNS(ns, tag);
      for (const [name, value] of Object.entries(attributes)) shape.setAttribute(name, value);
      svg.append(shape);
    }
    button.append(svg);
    for (const type of ["pointerdown", "mousedown", "mouseup", "touchstart"]) {
      button.addEventListener(type, event => event.stopPropagation());
    }
    button.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const data = getData();
      if (!data) { status(button, false); return; }
      try {
        const result = await ext.runtime.sendMessage({ type: "copy-inline", ...data });
        status(button, result?.ok === true);
      } catch { status(button, false); }
    });
    return button;
  }

  function setControls(host, getData, videoPresent) {
    const existing = host.querySelector(":scope > .linktrim-controls");
    const controls = existing || document.createElement("div");
    if (!existing) {
      controls.className = "linktrim-controls";
      controls.append(makeButton("link", () => getData(false)));
    }
    const time = controls.querySelector(`[data-kind="time"]`);
    if (videoPresent && !time) controls.append(makeButton("time", () => getData(true)));
    if (!videoPresent && time) time.remove();
    if (!existing) host.append(controls);
  }

  function scanX() {
    document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
      const url = postUrl(article);
      if (!url) return;
      const share = own(article, '[data-testid="share"]');
      const actionBar = share?.closest('[role="group"]') || own(article, '[role="group"]');
      const host = actionBar || article;
      // Re-use an existing control group; do not append a new one after React updates.
      setControls(host, withTime => {
        const currentUrl = postUrl(article);
        if (!currentUrl) return null;
        if (!withTime) return { url: currentUrl };
        const seconds = secondsFrom(videoIn(article));
        return seconds === null ? null : { url: currentUrl, seconds };
      }, Boolean(videoIn(article) || own(article, '[data-testid="videoPlayer"], [data-testid="videoComponent"]')));
    });
  }

  function scanYouTube() {
    if (!youtubeVideo()) {
      document.querySelectorAll(".linktrim-controls").forEach(node => node.remove());
      return;
    }
    const activeShort = document.querySelector('ytd-reel-video-renderer[is-active]');
    const actions = document.querySelector("ytd-watch-metadata #actions") ||
      activeShort?.querySelector("#actions") ||
      document.querySelector("ytd-reel-video-renderer #actions");
    if (!actions) return;
    let controls = actions.querySelector(".linktrim-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "linktrim-controls";
      const share = [...actions.querySelectorAll("button")].find(button =>
        /(?:共有|Share)/i.test(button.getAttribute("aria-label") || button.textContent || "")
      );
      const anchor = share?.closest("yt-button-view-model, ytd-button-renderer, ytd-share-button-renderer") || share;
      if (anchor?.parentElement) anchor.before(controls);
      else actions.prepend(controls);
    }
    if (!controls.querySelector('[data-kind="link"]')) {
      controls.append(makeButton("link", () => ({ url: location.href })));
      controls.append(makeButton("time", () => {
        if (document.querySelector(".html5-video-player.ad-showing")) return null;
        const video = document.querySelector('ytd-reel-video-renderer[is-active] video') ||
          document.querySelector("video.html5-main-video") ||
          document.querySelector("#movie_player video") || document.querySelector("video");
        const seconds = secondsFrom(video);
        return seconds === null ? null : { url: location.href, seconds };
      }));
    }
  }

  // The card controls live on the thumbnail, never inside an <a> element.
  // This keeps browser navigation unchanged unless one of our buttons is pressed.
  const ytCardSelector = [
    "ytd-rich-grid-media", "ytd-video-renderer", "ytd-compact-video-renderer",
    "ytd-playlist-video-renderer", "ytd-playlist-panel-video-renderer",
    "ytd-grid-video-renderer", "ytd-reel-item-renderer", "ytd-rich-grid-slim-media",
    "ytd-playlist-renderer", "ytd-grid-playlist-renderer", "ytd-compact-playlist-renderer",
    "ytd-radio-renderer", "ytd-compact-radio-renderer", "yt-lockup-view-model",
    "yt-shorts-lockup-view-model", "ytd-shorts-lockup-view-model", "ytm-shorts-lockup-view-model"
  ].join(",");
  const ytListCardSelector = [
    "ytd-playlist-renderer", "ytd-grid-playlist-renderer", "ytd-compact-playlist-renderer",
    "ytd-radio-renderer", "ytd-compact-radio-renderer"
  ].join(",");
  const ytPlaylistRowSelector = "ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer";
  const amazonCardSelector = [
    '[data-component-type="s-search-result"]', 'div.s-result-item[data-asin]',
    'li.a-carousel-card', 'li[data-itemid]', '.p13n-sc-uncoverable-faceout',
    '[data-asin][data-index]'
  ].join(",");

  function anchorHrefs(card) {
    return [...card.querySelectorAll("a[href]")].map(a => a.getAttribute("href") || a.href).filter(Boolean);
  }

  // Unlike YouTube's thumbnail subtree, this overlay is a direct child of the
  // document. Native hover previews may be replaced or layered above cards,
  // but they cannot unmount or cover the extension's floating controls.
  const cardTargets = new Map();
  let cardOverlay = null;
  let activeTarget = null;
  let pointerX = -1;
  let pointerY = -1;

  function ensureCardOverlay() {
    if (cardOverlay?.isConnected) return cardOverlay;
    if (!document.body) return null;
    cardOverlay = document.createElement("div");
    cardOverlay.className = "linktrim-card-portal";
    cardOverlay.setAttribute("role", "group");
    const controls = document.createElement("div");
    controls.className = "linktrim-card-controls";
    controls.append(makeButton("link", () => currentCardData("link")));
    controls.append(makeButton("playlist", () => currentCardData("playlist")));
    cardOverlay.append(controls);
    document.body.append(cardOverlay);
    return cardOverlay;
  }

  function currentCardData(kind) {
    if (!activeTarget?.node.isConnected) return null;
    const fresh = activeTarget.getCurrent();
    const url = kind === "playlist" ? fresh.list : fresh.video || fresh.product || fresh.wiki;
    return url ? { url, ...(kind === "playlist" ? { mode: "playlist" } : {}) } : null;
  }

  function registerCard(node, hit, getCurrent, kind = "card") {
    if (!node || !hit) return;
    const data = getCurrent();
    if (!data?.video && !data?.list && !data?.product && !data?.wiki) return;
    cardTargets.set(node, { node, hit, getCurrent, kind });
  }

  function cardHitRect(entry) {
    return entry.hit?.isConnected ? entry.hit.getBoundingClientRect() : null;
  }

  function within(rect, x, y) {
    return rect && rect.width > 0 && rect.height > 0 &&
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function cardAt(x, y) {
    if (activeTarget?.node.isConnected && within(cardHitRect(activeTarget), x, y)) return activeTarget;
    if (isWikipedia) {
      const anchor = document.elementFromPoint(x, y)?.closest('a[href]');
      if (!anchor?.closest('#mw-content-text, .mw-search-results, .mw-body-content')) return null;
      const getCurrent = () => ({ wiki: LinkTrimCardLinks.wikipediaArticle(anchor.getAttribute('href'), location.href) });
      return getCurrent().wiki ? { node: anchor, hit: anchor, getCurrent, kind: "wikipedia" } : null;
    }
    // Geometry fallback matters when YouTube renders the autoplay preview in
    // a separate layer which does not descend from its original card.
    for (const entry of cardTargets.values()) {
      if (entry.node.isConnected && within(cardHitRect(entry), x, y)) return entry;
    }
    return null;
  }

  function positionOverlay(entry, rect) {
    const portal = ensureCardOverlay();
    if (!portal || !rect) return;
    const fresh = entry.getCurrent();
    const hasLink = Boolean(fresh.video || fresh.product || fresh.wiki);
    const hasList = Boolean(fresh.list);
    const controls = portal.firstElementChild;
    const linkButton = controls.querySelector('[data-kind="link"]');
    const listButton = controls.querySelector('[data-kind="playlist"]');
    if (!hasLink && !hasList) { portal.style.display = "none"; return; }
    linkButton.hidden = !hasLink;
    listButton.hidden = !hasList;
    // Clamp the portal inside the visible viewport and keep YouTube's own
    // upper-right preview and caption controls unobstructed.
    // Wikipedia's text links need the control beside the link, not on top of its text.
    const wiki = Boolean(fresh.wiki);
    const left = Math.max(4, Math.min(window.innerWidth - (hasLink && hasList ? 83 : 44),
      wiki ? rect.right + 2 : rect.left + 8));
    const top = Math.max(4, Math.min(window.innerHeight - 44,
      wiki ? rect.top - 6 : rect.top + 8));
    portal.style.left = `${left}px`;
    portal.style.top = `${top}px`;
    portal.style.display = "block";
  }

  function refreshCardHover() {
    if (!cardOverlay && !cardTargets.size && !isWikipedia) return;
    const portal = cardOverlay;
    const overlayRect = portal?.style.display !== "none" ? portal?.getBoundingClientRect() : null;
    const activeRect = activeTarget?.node.isConnected ? cardHitRect(activeTarget) : null;
    const wikiBridge = activeTarget?.kind === "wikipedia" && activeRect && overlayRect &&
      pointerX >= activeRect.left && pointerX <= overlayRect.right &&
      pointerY >= Math.min(activeRect.top, overlayRect.top) &&
      pointerY <= Math.max(activeRect.bottom, overlayRect.bottom);
    const entry = (within(overlayRect, pointerX, pointerY) || wikiBridge) && activeTarget?.node.isConnected
      ? activeTarget : cardAt(pointerX, pointerY);
    if (!entry) {
      activeTarget = null;
      if (portal) portal.style.display = "none";
      return;
    }
    activeTarget = entry;
    positionOverlay(entry, cardHitRect(entry));
  }

  // The Amazon detail button is positioned inside the image column. Native
  // document scrolling now moves it with the Share control without JS timers.

  function installHoverTracking() {
    if (typeof document.addEventListener !== "function" || typeof window === "undefined") return;
    document.addEventListener("pointermove", event => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      refreshCardHover();
    }, true);
    document.addEventListener("pointerleave", () => {
      pointerX = pointerY = -1;
      refreshCardHover();
    });
    window.addEventListener("scroll", refreshCardHover, true);
    window.addEventListener("resize", () => {
      refreshCardHover();
      if (isAmazon) positionAmazonPageControl();
    });
  }
  installHoverTracking();

  const ytThumbSelector = [
    'ytd-thumbnail', 'yt-thumbnail-view-model',
    'a#thumbnail', '#thumbnail', '.shortsLockupViewModelHostThumbnailContainer',
    '.yt-shorts-lockup-view-model__thumbnail', 'a[href*="/shorts/"]'
  ].join(",");

  function scanYouTubeCards() {
    if (typeof LinkTrimCardLinks === "undefined") return;
    const page = new URL(location.href);
    // Only list rows (not unrelated suggestions) inherit the page's playlist.
    const contextList = LinkTrimCardLinks.youtubePlaylistId(page);
    for (const card of document.querySelectorAll(ytCardSelector)) {
      // Avoid duplicate buttons on a card that includes a newer lockup component.
      if (card.matches("yt-lockup-view-model") && card.closest("ytd-video-renderer, ytd-compact-video-renderer, ytd-rich-grid-media, ytd-playlist-renderer, ytd-radio-renderer")) continue;
      const isPlaylist = card.matches(ytListCardSelector);
      const isListRow = card.matches(ytPlaylistRowSelector);
      const getCurrent = () => LinkTrimCardLinks.youtubeCard(
        anchorHrefs(card), location.href, isPlaylist, isListRow ? contextList : null
      );
      const data = getCurrent();
      if (!data.video && !data.list) continue;
      // Keep the button outside YouTube's DOM rather than inside its preview.
      // Only the original thumbnail area triggers the floating controls.
      const hit = card.querySelector(ytThumbSelector) || card;
      registerCard(card, hit, getCurrent);
    }
  }

  function amazonImageArea() {
    return document.querySelector("#leftCol, #imageBlock, #main-image-container, #imageBlock_feature_div");
  }

  function amazonShareAnchor() {
    const selectors = [
      "#shareIcon a, #shareIcon button, #shareIcon",
      "#shareIcon_feature_div a, #shareIcon_feature_div button, #shareIcon_feature_div",
      "#imageBlock .a-icon-share, #leftCol .a-icon-share",
      "#leftCol [aria-label*='シェア'], #leftCol [aria-label*='共有']",
      "#leftCol [aria-label*='Share'], #leftCol [title*='シェア']",
      "#leftCol [title*='共有'], #leftCol [title*='Share']",
      "#leftCol [id*='shareIcon'], #leftCol [class*='share-icon']"
    ];
    for (const selector of selectors) {
      for (const node of document.querySelectorAll(selector)) {
        const target = node.closest('button, a, [role="button"]') || node;
        const rect = target.getBoundingClientRect();
        if (rect.width >= 16 && rect.width <= 90 && rect.height >= 16 && rect.height <= 90)
          return rect;
      }
    }

    // Amazon changes the share control's markup frequently. When its label
    // cannot be found, prefer the leftmost small control in the upper-right
    // image toolbar (usually Share, followed by the wishlist heart).
    const area = amazonImageArea();
    if (!area) return null;
    const imageRect = area.getBoundingClientRect();
    const candidates = [];
    for (const node of area.querySelectorAll('button, a, [role="button"]')) {
      if (node.closest(".linktrim-amazon-page-control")) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 22 || rect.width > 60 || rect.height < 22 || rect.height > 60) continue;
      if (rect.left < imageRect.right - Math.min(200, imageRect.width * .35) ||
          rect.right > imageRect.right + 12) continue;
      if (rect.top < imageRect.top - 12 || rect.top > imageRect.top + 130) continue;
      candidates.push(rect);
    }
    candidates.sort((a, b) => a.left - b.left);
    return candidates[0] || null;
  }

  let amazonObservedArea = null;
  const amazonAreaObserver = isAmazon && typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => positionAmazonPageControl()) : null;

  function watchAmazonArea(area) {
    if (area === amazonObservedArea) return;
    amazonAreaObserver?.disconnect();
    amazonObservedArea = area;
    if (area) amazonAreaObserver?.observe(area);
  }

  function positionAmazonPageControl() {
    const control = document.querySelector(".linktrim-amazon-page-control");
    if (!control) return;
    const isProduct = Boolean(LinkTrimCardLinks.amazonAsin(new URL(location.href)));
    if (control.classList.contains("linktrim-amazon-detail-control") !== isProduct)
      control.classList.toggle("linktrim-amazon-detail-control", isProduct);
    if (!isProduct) {
      watchAmazonArea(null);
      if (control.parentElement !== document.body) document.body.append(control);
      for (const prop of ["left", "top", "display"]) {
        if (control.style.getPropertyValue(prop)) control.style.removeProperty(prop);
      }
      return;
    }

    const area = amazonImageArea();
    if (!area || !area.getBoundingClientRect().width) {
      if (control.style.display !== "none") control.style.display = "none";
      return;
    }
    // A position:absolute child of the image column scrolls immediately with
    // Amazon's Share button. A fixed, body-level portal needs JS position
    // updates on every scroll frame and visibly lags on busy product pages.
    if (getComputedStyle(area).position === "static") area.style.position = "relative";
    if (control.parentElement !== area) area.append(control);
    watchAmazonArea(area);

    const bounds = area.getBoundingClientRect();
    const share = amazonShareAnchor();
    const scaleX = bounds.width / area.offsetWidth || 1;
    const scaleY = bounds.height / area.offsetHeight || 1;
    const left = share ? (share.left - bounds.left) / scaleX - area.clientLeft - 42
      : area.clientWidth - 160;
    const top = share
      ? (share.top - bounds.top) / scaleY - area.clientTop + (share.height / scaleY - 34) / 2
      : 12;
    if (!Number.isFinite(left) || !Number.isFinite(top) || left < 4) {
      if (control.style.display !== "none") control.style.display = "none";
      return;
    }
    const x = `${left}px`, y = `${top}px`;
    if (control.style.left !== x) control.style.left = x;
    if (control.style.top !== y) control.style.top = y;
    if (control.style.display !== "flex") control.style.display = "flex";
  }

  function scanAmazonPage() {
    if (!document.body) return;
    let control = document.querySelector(".linktrim-amazon-page-control");
    if (!control) {
      control = document.createElement("div");
      control.className = "linktrim-amazon-page-control";
      const button = makeButton("link", () => ({ url: location.href }));
      button.title = "このページのURLをコピー";
      button.setAttribute("aria-label", button.title);
      control.append(button);
      document.body.append(control);
    }
    positionAmazonPageControl();
  }

  function scanAmazonCards() {
    if (typeof LinkTrimCardLinks === "undefined") return;
    scanAmazonPage();
    const seen = new Set();

    const isDetail = Boolean(LinkTrimCardLinks.amazonAsin(new URL(location.href)));

    for (const card of document.querySelectorAll(amazonCardSelector)) {
      const getCurrent = () => ({ product: LinkTrimCardLinks.amazonCard(
        anchorHrefs(card), location.href, card.getAttribute("data-asin")
      ) });
      const data = getCurrent();
      if (!data.product) continue;
      const imageLinks = [...card.querySelectorAll("a[href]")].filter(a => a.querySelector("img"));
      const imageLink = imageLinks.find(a => {
        try { return LinkTrimCardLinks.amazonAsin(new URL(a.href, location.href)); }
        catch { return false; }
      }) || imageLinks[0];
      const hit = imageLink?.querySelector("img") || card.querySelector(".s-product-image-container img, img.s-image") || imageLink;
      if (!hit || seen.has(hit)) continue;
      seen.add(hit);
      registerCard(card, hit, getCurrent);
    }

    // Product images outside search results (homepage, recommendations,
    // purchase history, wishlists, seller widgets) use many layouts.
    const productSelector = 'a[href*="/dp/"], a[href*="/gp/product/"], a[href*="/gp/aw/d/"]';
    for (const anchor of document.querySelectorAll(productSelector)) {
      if (isDetail && anchor.closest("#imageBlock, #main-image-container, #imgTagWrapperId")) continue;
      const hit = anchor.querySelector("img");
      if (!hit || seen.has(hit)) continue;
      const getCurrent = () => ({ product: LinkTrimCardLinks.amazonCard(
        [anchor.getAttribute("href")], location.href
      ) });
      if (!getCurrent().product) continue;
      seen.add(hit);
      registerCard(anchor, hit, getCurrent);
    }
  }

  function scanWikipedia() {
    if (typeof LinkTrimCardLinks === "undefined") return;
    const heading = document.querySelector("#firstHeading, .mw-first-heading");
    if (heading && !heading.querySelector(".linktrim-wikipedia-title-control")) {
      const control = document.createElement("span");
      control.className = "linktrim-wikipedia-title-control";
      const button = makeButton("link", () => ({ url: location.href }));
      button.title = "このページのURLをコピー";
      button.setAttribute("aria-label", button.title);
      control.append(button);
      heading.append(control);
    }
    // Wikipedia can contain thousands of links. Resolve only the hovered link
    // in cardAt rather than scanning every article link on DOM updates.
  }

  function scan() {
    queued = false;
    cardTargets.clear();
    if (isX) scanX();
    else if (isYouTube) {
      scanYouTube();
      scanYouTubeCards();
    } else if (isAmazon) scanAmazonCards();
    else if (isWikipedia) scanWikipedia();
    if (isYouTube || isAmazon || isWikipedia) refreshCardHover();
  }

  function queueScan() {
    if (queued) return;
    queued = true;
    setTimeout(scan, 250);
  }

  const style = document.createElement("style");
  style.textContent = `
    .linktrim-controls { display: inline-flex; align-items: center; justify-content: center; gap: 0; flex: 0 0 auto; }
    .${BUTTON} { appearance: none; position: relative; display: inline-flex; align-items: center;
      justify-content: center; box-sizing: border-box; flex: 0 0 36px; width: 36px; height: 36px; padding: 0; border: 0;
      border-radius: 50%; color: inherit; background: transparent; cursor: pointer;
      opacity: .62; transition: background-color .15s, opacity .15s; }
    .${BUTTON}:hover { opacity: .95; background: rgba(127,127,127,.12); }
    .${BUTTON}[data-status] { opacity: 1; }
    .${BUTTON}:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    .${BUTTON} svg { display: block; width: 18px; height: 18px; flex: none; }
    .${BUTTON}[data-status] svg { visibility: hidden; }
    .${BUTTON}[data-status]::after { content: attr(data-status); position: absolute; inset: 0;
      display: grid; place-items: center; font: 700 11px/1 system-ui, sans-serif;
      opacity: 1; transition: opacity .35s; }
    .${BUTTON}[data-fade="true"]::after { opacity: 0; }
    /* The global portal is outside YouTube's replaceable preview layers.
       The user must hover a thumbnail; the portal remains clickable. */
    .linktrim-card-portal { position: fixed !important; z-index: 2147483647 !important;
      display: none; pointer-events: none; }
    .linktrim-card-portal .linktrim-card-controls { position: relative; display: flex;
      align-items: center; gap: 2px; padding: 2px; background: rgba(18,18,20,.88);
      border-radius: 22px; color: #fff; pointer-events: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,.28); }
    .linktrim-card-portal .linktrim-copy { width: 30px; height: 30px; flex-basis: 30px;
      color: #fff; opacity: .95; pointer-events: auto; }
    .linktrim-card-portal .linktrim-copy:hover { background: rgba(255,255,255,.20); }
    .linktrim-card-portal .linktrim-copy[hidden] { display: none !important; }
    .linktrim-amazon-page-control {
      position: fixed; bottom: 18px; right: 18px; z-index: 2147483000;
      display: flex; padding: 2px; border-radius: 50%; color: #fff;
      background: rgba(18,18,20,.88); box-shadow: 0 2px 9px rgba(0,0,0,.3); }
    .linktrim-amazon-page-control .linktrim-copy { width: 34px; height: 34px;
      flex-basis: 34px; opacity: 1; color: #fff; }
    .linktrim-amazon-page-control .linktrim-copy:hover { background: rgba(255,255,255,.18); }
    .linktrim-amazon-detail-control {
      position: absolute; bottom: auto; right: auto; width: 34px; height: 34px; padding: 0;
      color: #111; background: #fff; border: 1px solid #e1e3e5;
      box-shadow: 0 1px 5px rgba(0,0,0,.18); }
    .linktrim-amazon-detail-control .linktrim-copy { color: #111; width: 32px; height: 32px;
      flex-basis: 32px; }
    .linktrim-amazon-detail-control .linktrim-copy:hover { background: rgba(0,0,0,.07); }
    .linktrim-wikipedia-title-control { display: inline-flex; vertical-align: middle;
      margin-inline-start: 8px; padding: 1px; border-radius: 50%; color: #fff;
      background: rgba(18,18,20,.88); white-space: nowrap; }
    .linktrim-wikipedia-title-control .linktrim-copy { width: 28px; height: 28px;
      flex-basis: 28px; opacity: 1; color: #fff; }
    .linktrim-wikipedia-title-control .linktrim-copy:hover { background: rgba(255,255,255,.18); }
    @media (prefers-reduced-motion: reduce) {
      .${BUTTON}, .${BUTTON}::after { transition: none; }
    }
  `;
  (document.head || document.documentElement).append(style);
  new MutationObserver(queueScan).observe(document.documentElement, { childList: true, subtree: true });
  queueScan();
})();
