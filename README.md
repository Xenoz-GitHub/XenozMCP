
<p align="center">
  <img src="assets/x.png" alt="XenozMCP Logo" width="180"/>
</p>

<p align="center">
  <strong><span style="color:#58a6ff;font-size:24px">⟦ XENOZMCP ⟧</span></strong><br/>
  <span style="color:#8b949e;font-size:14px">AI neural bridge for the Roblox metaverse</span>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-00ff88?style=flat-square" alt="MIT"/></a>
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js" alt="Node"/></a>
  <a href="#"><img src="https://img.shields.io/badge/encryption-AES--256--GCM-00aaff?style=flat-square" alt="AES-256-GCM"/></a>
  <a href="#"><img src="https://img.shields.io/badge/protocol-MCP-ff69b4?style=flat-square" alt="MCP"/></a>
</p>

---

```
╔═══════════════════════════════════════════════════════╗
║  XENOZMCP  —  v0.1.0                                 ║
║  AI → Roblox Studio neural bridge                    ║
║  Transport: stdio | WebSocket :17613                  ║
║  Encryption: AES-256-GCM                             ║
║  Status: ████████████ 100% operational               ║
╚═══════════════════════════════════════════════════════╝
```

XenozMCP is a **Model Context Protocol** server that opens a neural link between AI consciousness and the Roblox metaverse. It translates AI intent into Studio actions — executing Luau, manipulating instances, controlling play-testing, and commanding the Open Cloud — all secured by military-grade AES-256-GCM encryption.

Connect any MCP-compatible client (Claude, Cursor, Copilot) or inject directly into 8 AI chat sites via the browser extension. One protocol. Infinite creation.

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                    AI CONSCIOUSNESS                  │
│         Claude · Cursor · GPT · DeepSeek            │
└─────────────────────┬───────────────────────────────┘
                      │ stdio / WebSocket
                      ▼
┌─────────────────────────────────────────────────────┐
│                  XENOZMCP KERNEL                     │
│                                                     │
│  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │Studio MCP  │  │Open Cloud  │  │AES-256-GCM    │  │
│  │Controller  │  │Gateway     │  │Encrypted Vault│  │
│  └─────┬──────┘  └──────┬─────┘  └───────┬───────┘  │
│        │                │                │          │
│  ┌─────┴──────┐  ┌──────┴─────┐          │          │
│  │StudioMCP   │  │apis.roblox │          │          │
│  │.exe (stdio)│  │.com (REST) │          │          │
│  └─────┬──────┘  └────────────┘          │          │
│        │                                  │          │
└────────┼──────────────────────────────────┼──────────┘
         │                                  │
         ▼                                  ▼
  ┌──────────────┐                 ┌──────────────────┐
  │ Roblox Studio│                 │  Local Vault     │
  │  Metaverse   │                 │  (encrypted keys)│
  └──────────────┘                 └──────────────────┘
```

### Dual-Channel Communication

| Channel | Transport | Port | Clients |
|---------|-----------|------|---------|
| **MCP Core** | stdio | — | Claude Desktop, Cursor, Claude Code, Copilot |
| **Extension Bridge** | WebSocket | `17613` | DeepSeek, ChatGPT, Claude, Gemini, Qwen, Mistral, Perplexity |

---

## DEPLOYMENT

### Prerequisites
- **Node.js ≥ 18** — the runtime
- **Roblox Studio** — with MCP enabled (Assistant → MCP Servers → Studio as MCP Server)

### Quick Launch

```bash
# Clone from the source
git clone https://github.com/Xenoz-GitHub/XenozMCP.git
cd XenozMCP

# Initialize the kernel
npm install
npm run build

# Activate the bridge
node dist/index.js
```

Or double-click `start-xenoz.bat` on Windows — it auto-installs, builds, and fires up.

### Extension Injection (for AI chat sites)

```
chrome://extensions → Developer Mode → Load unpacked → select extension/
```

Then open any supported AI site and hit **▶ Start Studio Agent**.

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "xenoz-mcp": {
      "command": "node",
      "args": ["path/to/XenozMCP/dist/index.js"]
    }
  }
}
```

---

## COMMAND MATRIX

### System Core
| Command | Function | Security |
|---------|----------|----------|
| `studio_status` | Ping the neural link | — |
| `vault_set` | Encrypt & store a secret | AES-256-GCM |
| `vault_get` | Decrypt & retrieve | AES-256-GCM |
| `vault_has` | Probe key existence | — |
| `vault_list` | Enumerate stored keys | — |

### Studio Manipulation
| Command | Function |
|---------|----------|
| `list_studio_commands` | Scan available Studio MCP commands |
| `execute_luau` | Inject and run Luau bytecode |
| `script_read` | Extract script source by path |
| `screen_capture` | Photograph the viewport (multi-angle) |
| `inspect_instance` | Read instance properties and children |
| `start_stop_play` | Toggle play-testing dimension |
| `get_studio_state` | Query the Studio status matrix |
| `search_game_tree` | Locate instances by name or class |
| `open_place` | Open a place by ID |

### Open Cloud Commands
| Command | Function |
|---------|----------|
| `cloud_list_data_stores` | Scan data store index |
| `cloud_get_data_store_entry` | Read from the data stream |
| `cloud_set_data_store_entry` | Write to the data stream |
| `cloud_get_universe_info` | Access universe metadata |
| `cloud_publish_place` | Deploy a place to production |
| `cloud_list_places` | Map all places in a universe |
| `cloud_send_notification` | Broadcast to all active players |

---

## SECURITY PROTOCOL

XenozMCP uses **AES-256-GCM** (Galois/Counter Mode) for all secret storage — the same encryption standard securing banking and military communications. Each secret is encrypted with a unique initialization vector, authenticated with a 128-bit GCM tag, and derived through 600,000 PBKDF2 iterations.

```
plaintext → AES-256-GCM → iv:tag:ciphertext → vault.store
```

Set your vault key via `XENOZ_VAULT_KEY` environment variable, or let XenozMCP generate one on first launch.

---

## CONFIGURATION

Edit `config.json` to bind your Open Cloud credentials:

```json
{
  "openCloud": {
    "apiKey": "your-api-key",
    "defaultUniverseId": "123456789"
  }
}
```

Sensitive values can also be injected at runtime through the `vault_set` command — never stored in plaintext.

---

## ENVIRONMENT VARIABLES

| Variable | Purpose |
|----------|---------|
| `XENOZ_VAULT_KEY` | 64-char hex key for the AES-256-GCM vault |

---

## LICENSE

**MIT** — fork it, mod it, deploy it.

---

<p align="center">
  <span style="color:#484f58">built by </span><span style="color:#58a6ff">**XenozExe**</span><br/>
  <span style="color:#30363d;font-size:12px">⟦ 0x7F >_ 0x3A ⟧</span>
</p>
