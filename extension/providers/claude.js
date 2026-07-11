const NVProvider = (() => {
  "use strict";
  const siteName = "Claude";
  let lastResponse = "";
  let diagFn = null;

  function getLatestResponse() {
    const articles = document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"]');
    if (!articles.length) {
      // Alternative: all font-cards or prose blocks
      const prose = document.querySelectorAll('.font-claude-message, .prose');
      if (!prose.length) return "";
      return prose[prose.length - 1].textContent || "";
    }
    const last = articles[articles.length - 1];
    return last.textContent || "";
  }

  function injectText(text) {
    const editor = document.querySelector('[contenteditable="true"], .ProseMirror, textarea');
    if (editor) {
      editor.focus();
      if (editor.tagName === "TEXTAREA") {
        editor.value = text;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        document.execCommand("insertText", false, text);
      }
      const sendBtn = document.querySelector('[aria-label*="Send"], button[type="submit"]');
      if (sendBtn) setTimeout(() => sendBtn.click(), 500);
    }
  }

  function isGenerating() {
    return !!document.querySelector('[aria-label*="Stop"], [data-testid="stop-button"]');
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
