const NVProvider = (() => {
  "use strict";
  const siteName = "Gemini";
  let lastResponse = "";
  let diagFn = null;

  function getLatestResponse() {
    const messages = document.querySelectorAll('[data-message-model-id], .message-content, .conversation-turn');
    if (!messages.length) return "";
    const last = messages[messages.length - 1];
    return last.textContent || "";
  }

  function injectText(text) {
    const editor = document.querySelector('[contenteditable="true"], .ql-editor, textarea');
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
    return !!document.querySelector('[aria-label*="Stop"], [data-testid*="stop"]');
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
