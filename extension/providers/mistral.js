const NVProvider = (() => {
  "use strict";
  const siteName = "Mistral";
  let lastResponse = "";
  let diagFn = null;

  function getLatestResponse() {
    const messages = document.querySelectorAll('[class*="message"], [data-testid*="message"]');
    if (!messages.length) return "";
    const last = messages[messages.length - 1];
    return last.textContent || "";
  }

  function injectText(text) {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.value = text;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      const sendBtn = document.querySelector('[aria-label*="send"], button[type="submit"]');
      if (sendBtn) setTimeout(() => sendBtn.click(), 500);
    }
  }

  function isGenerating() {
    return !!document.querySelector('[class*="stop"], button:has(svg[class*="stop"])');
  }

  function snapshot() {
    return { lastLen: lastResponse.length };
  }

  const timings = {};

  return {
    siteName, getLatestResponse, injectText, isGenerating, snapshot, timings,
    init: () => {},
  };
})();
