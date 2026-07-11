const NVProvider = (() => {
  "use strict";
  const siteName = "DeepSeek";
  let lastResponse = "";
  let generating = false;
  let diagFn = null;

  function waitForElement(sel, timeout) {
    return new Promise((resolve) => {
      if (document.querySelector(sel)) return resolve(document.querySelector(sel));
      const observer = new MutationObserver(() => {
        if (document.querySelector(sel)) {
          observer.disconnect();
          resolve(document.querySelector(sel));
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      if (timeout) setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
  }

  function getLatestResponse() {
    const articles = document.querySelectorAll('article, [data-testid^="conversation-turn"]');
    if (!articles.length) return "";
    const last = articles[articles.length - 1];
    const text = last.textContent || "";
    return text;
  }

  function injectText(text) {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.value = text;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      const sendBtn = document.querySelector("button[type='submit'], [aria-label*='send']");
      if (sendBtn) setTimeout(() => sendBtn.click(), 300);
    }
  }

  function isGenerating() {
    const stopBtn = document.querySelector("[aria-label*='stop'], button:has(svg path[d*='M6 6l12 12'])");
    return !!stopBtn;
  }

  function snapshot() {
    return { lastLen: lastResponse.length };
  }

  const timings = {};

  return {
    siteName, getLatestResponse, injectText, isGenerating, snapshot, timings,
    init: (opts) => { diagFn = opts?.diag; },
  };
})();
