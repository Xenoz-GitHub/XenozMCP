const NVProvider = (() => {
  "use strict";
  const siteName = "ChatGPT";
  let lastResponse = "";
  let diagFn = null;

  function getLatestResponse() {
    const articles = document.querySelectorAll('article, [data-message-author-role="assistant"]');
    if (!articles.length) return "";
    const last = articles[articles.length - 1];
    return last.textContent || "";
  }

  function injectText(text) {
    const editor = document.querySelector("#prompt-textarea, [contenteditable='true']");
    if (editor) {
      editor.focus();
      document.execCommand("insertText", false, text);
      const sendBtn = document.querySelector('[data-testid="send-button"], button[aria-label*="send"]');
      if (sendBtn) setTimeout(() => sendBtn.click(), 500);
    }
  }

  function isGenerating() {
    return !!document.querySelector('[data-testid="stop-button"], [aria-label*="Stop"]');
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
