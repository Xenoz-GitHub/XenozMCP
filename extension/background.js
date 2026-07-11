const PORT = 17613;
const URL = `ws://127.0.0.1:${PORT}`;

const PROVIDER_URLS = [
  "https://chat.deepseek.com/*",
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://claude.ai/*",
  "https://gemini.google.com/*",
  "https://chat.qwen.ai/*",
  "https://chat.mistral.ai/*",
  "https://copilot.microsoft.com/*",
  "https://www.perplexity.ai/*",
  "https://perplexity.ai/*",
];

const RECONNECT_MIN = 1000;
const RECONNECT_MAX = 15000;
const HEARTBEAT_MS = 18000;
const REQUEST_TIMEOUT = 130000;

let ws = null;
let connected = false;
let reconnectDelay = RECONNECT_MIN;
let reconnectTimer = null;
let heartbeatTimer = null;
let nextId = 1;
const pending = new Map();
let toolsCache = [];
let mcpAlive = false;

function log(...a) {
  console.log("[xenoz-bg]", ...a);
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  clearTimeout(reconnectTimer);
  try {
    ws = new WebSocket(URL);
  } catch (e) {
    log("WebSocket ctor failed", e);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    connected = true;
    reconnectDelay = RECONNECT_MIN;
    log("connected to XenozMCP bridge");
    startHeartbeat();
    broadcastStatus();
    refreshTools();
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    handleBridgeMessage(msg);
  };

  ws.onclose = () => {
    connected = false;
    mcpAlive = false;
    stopHeartbeat();
    failAllPending("Bridge disconnected");
    scheduleReconnect();
    broadcastStatus();
  };

  ws.onerror = () => {
    ws.close();
  };
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 1.5, RECONNECT_MAX);
    connect();
  }, reconnectDelay);
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, HEARTBEAT_MS);
}

function stopHeartbeat() {
  clearInterval(heartbeatTimer);
}

function handleBridgeMessage(msg) {
  if (msg.type === "tools" && msg.tools) {
    toolsCache = msg.tools;
    mcpAlive = true;
    broadcastStatus();
    return;
  }
  if (msg.type === "tool_result" && msg.id != null) {
    const p = pending.get(msg.id);
    if (p) {
      clearTimeout(p.timer);
      pending.delete(msg.id);
      p.resolve(msg);
    }
    return;
  }
  if (msg.type === "status" && msg.id != null) {
    const p = pending.get(msg.id);
    if (p) {
      clearTimeout(p.timer);
      pending.delete(msg.id);
      p.resolve(msg);
    }
  }
}

function sendToBridge(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
    return true;
  }
  return false;
}

function bridgeCall(msg, timeout) {
  return new Promise((resolve) => {
    const id = nextId++;
    msg.id = id;
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, error: "timeout" });
    }, timeout || REQUEST_TIMEOUT);
    pending.set(id, { resolve, timer });
    if (!sendToBridge(msg)) {
      clearTimeout(timer);
      pending.delete(id);
      resolve({ ok: false, error: "Bridge offline" });
    }
  });
}

function failAllPending(reason) {
  for (const [id, p] of pending) {
    clearTimeout(p.timer);
    pending.delete(id);
    p.resolve({ ok: false, error: reason });
  }
}

async function refreshTools() {
  const resp = await bridgeCall({ type: "list_tools" }, 10000);
  if (resp.tools) {
    toolsCache = resp.tools;
    mcpAlive = true;
  }
}

function broadcastStatus() {
  const status = { connected, mcpAlive, toolCount: toolsCache.length };
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && PROVIDER_URLS.some((p) => tab.url.match(escapeRegex(p)))) {
        chrome.tabs.sendMessage(tab.id, { type: "bridge_status", ...status }).catch(() => {});
      }
    }
  });
}

function escapeRegex(str) {
  return str.replace(/\*/g, ".*").replace(/\?/g, ".");
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "call_tool") {
    bridgeCall({ type: "call_tool", name: msg.name, arguments: msg.arguments || {} }, msg.timeout).then(sendResponse);
    return true;
  }
  if (msg.type === "list_tools") {
    sendResponse({ tools: toolsCache });
    return;
  }
  if (msg.type === "get_status") {
    sendResponse({ connected, mcpAlive, toolCount: toolsCache.length });
    return;
  }
});

// Startup
connect();
