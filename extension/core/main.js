(() => {
  "use strict";

  const P = NVProvider;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log("[xenoz]", ...a);

  // ── State ─────────────────────────────────────────────────────────────
  const A = {
    running: false,
    stop: false,
    userStopped: false,
    started: false,
    observing: false,
    lastText: "",
    bridgeConnected: false,
    mcpAlive: false,
  };

  let toolsCache = [];
  let resolveObserve = null;

  // ── UI Panel ──────────────────────────────────────────────────────────
  let panel = null;
  let statusDot = null;
  let startBtn = null;
  let stopBtn = null;

  function createPanel() {
    if (panel) return;
    panel = document.createElement("div");
    panel.id = "xenoz-panel";
    panel.innerHTML = `
      <div class="xenoz-header">
        <span class="xenoz-title">XenozMCP</span>
        <span class="xenoz-status-dot" id="xenoz-status-dot">●</span>
      </div>
      <div class="xenoz-body">
        <button id="xenoz-start-btn" class="xenoz-btn xenoz-btn-start">▶ Start Studio Agent</button>
        <button id="xenoz-stop-btn" class="xenoz-btn xenoz-btn-stop" style="display:none">■ Stop</button>
        <div class="xenoz-tools" id="xenoz-tools"></div>
      </div>
      <div class="xenoz-footer">
        <span class="xenoz-status-text" id="xenoz-status-text">Disconnected</span>
      </div>
    `;
    document.body.appendChild(panel);

    statusDot = panel.querySelector("#xenoz-status-dot");
    startBtn = panel.querySelector("#xenoz-start-btn");
    stopBtn = panel.querySelector("#xenoz-stop-btn");

    startBtn.onclick = startAgent;
    stopBtn.onclick = stopAgent;
  }

  function updateStatus(connected, alive) {
    A.bridgeConnected = connected;
    A.mcpAlive = alive;
    if (!statusDot) return;
    const text = panel?.querySelector("#xenoz-status-text");
    if (connected && alive) {
      statusDot.style.color = "#00ff88";
      if (text) text.textContent = "Connected";
    } else if (connected) {
      statusDot.style.color = "#ffaa00";
      if (text) text.textContent = "Bridge OK — Studio offline";
    } else {
      statusDot.style.color = "#ff4444";
      if (text) text.textContent = "Disconnected";
    }
  }

  // ── Bridge Communication ──────────────────────────────────────────────
  async function callTool(name, args, timeout) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "call_tool", name, arguments: args || {}, timeout: timeout || 120000 },
        (resp) => resolve(resp || { ok: false, error: "no response" })
      );
    });
  }

  async function refreshTools() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "list_tools" }, (resp) => {
        toolsCache = (resp && resp.tools) || [];
        resolve(toolsCache);
      });
    });
  }

  async function getStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "get_status" }, (resp) => {
        resolve(resp || { connected: false, mcpAlive: false });
      });
    });
  }

  // ── Agent Loop ────────────────────────────────────────────────────────
  async function startAgent() {
    if (A.running) return;
    A.running = true;
    A.stop = false;
    A.userStopped = false;

    const status = await getStatus();
    if (!status.mcpAlive) {
      injectMessage("⚠️ XenozMCP Bridge or Roblox Studio is not connected. Start XenozMCP and open Studio first.");
      A.running = false;
      return;
    }

    await refreshTools();
    const toolList = toolsCache.map((t) => t.name).join(", ");

    startBtn.style.display = "none";
    stopBtn.style.display = "inline-flex";

    // Inject system prompt
    const systemPrompt = NV.buildSystemPrompt(toolsCache, {
      siteName: P.siteName || "this AI",
    });
    injectMessage(systemPrompt);

    A.started = true;
    A.observing = true;
    observeLoop();
  }

  function stopAgent() {
    A.stop = true;
    A.running = false;
    A.observing = false;
    startBtn.style.display = "inline-flex";
    stopBtn.style.display = "none";
    injectMessage("⏹️ Agent stopped.");
  }

  async function observeLoop() {
    while (A.observing && !A.stop) {
      try {
        const text = await P.getLatestResponse();
        if (text && text !== A.lastText) {
          A.lastText = text;
          const commands = NVParse.parseCommands(text);
          for (const cmd of commands) {
            if (A.stop) break;
            await executeCommand(cmd);
          }
        }
      } catch (e) {
        log("observe error:", e);
      }
      await sleep(1500);
    }
  }

  async function executeCommand(cmd) {
    log("executing:", cmd.command, cmd.params);
    addChip(cmd.command, "running");

    // Check if it's a virtual tool
    const vt = VirtualTools.getVirtualTools().find((t) => t.name === cmd.command);
    if (vt) {
      const result = await vt.run(cmd.params);
      const text = result.text || result.error || "OK";
      injectMessage(`📦 ${cmd.command} result:\n${text.slice(0, 3000)}`);
      addChip(cmd.command, result.ok !== false ? "done" : "error");
      return;
    }

    const result = await callTool(cmd.command, cmd.params);
    if (result.ok === false || result.error) {
      injectMessage(`❌ ${cmd.command} ERROR: ${result.error}`);
      addChip(cmd.command, "error");
    } else {
      let output = result.text || "OK";
      if (result.images && result.images.length > 0) {
        // AI sites handle attached images automatically via message
      }
      injectMessage(`✅ ${cmd.command} result:\n${output.slice(0, 3000)}`);
      addChip(cmd.command, "done");
    }
  }

  function addChip(name, status) {
    const container = document.getElementById("xenoz-tools");
    if (!container) return;
    const chip = document.createElement("span");
    chip.className = `xenoz-chip xenoz-chip-${status}`;
    chip.textContent = name;
    container.appendChild(chip);
    container.scrollTop = container.scrollHeight;
  }

  function injectMessage(text) {
    if (P.injectText) {
      P.injectText(text);
    } else {
      // Fallback: try generic input injection
      const input = document.querySelector("textarea, [contenteditable='true'], .ql-editor");
      if (input) {
        if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
          input.value = text;
        } else {
          input.textContent = text;
        }
        const event = new Event("input", { bubbles: true });
        input.dispatchEvent(event);
        // Try to submit
        const sendBtn = document.querySelector("button[type='submit'], [aria-label*='send'], [data-testid*='send']");
        if (sendBtn) setTimeout(() => sendBtn.click(), 500);
      }
    }
  }

  // ── Bridge status listener ────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "bridge_status") {
      updateStatus(msg.connected, msg.mcpAlive);
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    createPanel();
    getStatus().then((s) => updateStatus(s.connected, s.mcpAlive));
    log("XenozMCP extension initialized for", P.siteName || "unknown site");
  }

  // Wait for provider to be ready
  let retries = 0;
  function waitForProvider() {
    if (typeof NVProvider !== "undefined") {
      init();
    } else if (retries < 50) {
      retries++;
      setTimeout(waitForProvider, 200);
    }
  }
  waitForProvider();
})();
