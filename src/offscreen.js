"use strict";

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.target !== "offscreen" || message?.type !== "copy") return;
  const field = document.createElement("textarea");
  field.value = message.text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
  document.body.append(field);
  try {
    field.focus();
    field.select();
    const ok = document.execCommand("copy");
    respond({ ok, error: ok ? undefined : "コピーが拒否されました" });
  } catch (error) {
    respond({ ok: false, error: String(error) });
  } finally {
    field.remove();
  }
});
