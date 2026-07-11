function setStatus(id, text, color) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
  const dot = document.getElementById(id === "bridge-status" ? "studio-dot" : "mcp-dot");
  if (dot) {
    dot.className = "dot";
    if (color === "green") dot.classList.add("dot-green");
    else if (color === "yellow") dot.classList.add("dot-yellow");
    else dot.classList.add("dot-red");
  }
}

function updatePopup() {
  chrome.runtime.sendMessage({ type: "get_status" }, (status) => {
    status = status || {};
    if (status.connected) {
      setStatus("bridge-status", "Connected", "green");
    } else {
      setStatus("bridge-status", "Disconnected", "red");
    }

    if (status.mcpAlive) {
      setStatus("mcp-status", "Online", "green");
    } else if (status.connected) {
      setStatus("mcp-status", "Studio Offline", "yellow");
    } else {
      setStatus("mcp-status", "Offline", "red");
    }

    if (status.toolCount != null) {
      document.getElementById("tool-count").textContent = status.toolCount;
    }
  });

  chrome.runtime.sendMessage({ type: "list_tools" }, (resp) => {
    const tools = (resp && resp.tools) || [];
    const list = document.getElementById("tool-list");
    list.innerHTML = tools
      .map((t) => `<div class="tool-item"><span>${t.name}</span> — ${(t.description || "").slice(0, 60)}</div>`)
      .join("");
    document.getElementById("tool-count").textContent = tools.length;
  });
}

document.addEventListener("DOMContentLoaded", updatePopup);
