#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, getRoot } from "./config.js";
import { Vault } from "./vault.js";
import { MCPClient } from "./mcp-client.js";
import { findStudioMCP } from "./studio-launcher.js";
import { createStudioTools } from "./tools/studio-tools.js";
import { createCloudTools } from "./tools/cloud-tools.js";

const config = loadConfig();
const vaultKey = process.env.XENOZ_VAULT_KEY || Vault.generateKey();
const vault = new Vault(vaultKey, config.vault.keyPath || `${getRoot()}/.vault/store.json`);

let studioClient: MCPClient | null = null;

async function startStudioClient(): Promise<void> {
  const serverCfg = config.mcpServers["roblox-studio"];
  if (!serverCfg) return;

  let command = serverCfg.command;
  const args = [...serverCfg.args];

  if (command === "launch_studio_mcp") {
    const studio = findStudioMCP();
    if (studio) {
      command = studio.mcpExe;
    } else {
      console.error("[xenoz-mcp] StudioMCP.exe not found. Install Roblox Studio and enable Studio as MCP Server.");
      return;
    }
  }

  studioClient = new MCPClient("roblox-studio", command, args, serverCfg.env);

  try {
    await studioClient.start();
    const tools = studioClient.getTools();
    console.error(`[xenoz-mcp] Roblox Studio connected: ${tools.length} tools available`);

    studioClient.on("exit", (code) => {
      console.error(`[xenoz-mcp] Studio MCP exited (code ${code}), reconnecting in 5s...`);
      setTimeout(() => startStudioClient(), 5000);
    });
  } catch (err) {
    console.error(`[xenoz-mcp] Failed to connect to Studio MCP:`, err);
    console.error(`[xenoz-mcp] Retrying in 10s...`);
    setTimeout(() => startStudioClient(), 10000);
  }
}

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<{ text: string; images?: { data: string; mimeType: string }[] }>;
};

const studioTools = createStudioTools(null);
const cloudTools = createCloudTools(config.openCloud);

const allTools: ToolDefinition[] = [
  {
    name: "studio_status",
    description: "Check if Roblox Studio is connected and available",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const alive = studioClient?.isAlive || false;
      const tools = alive ? studioClient!.getTools().length : 0;
      return {
        text: JSON.stringify({
          connected: alive,
          studioOpen: alive,
          toolsAvailable: tools,
          studioMcpVersion: alive ? "connected" : "disconnected",
        }),
      };
    },
  },
  {
    name: "vault_set",
    description: "Securely store an encrypted value (AES-256-GCM). Use for API keys and secrets.",
    inputSchema: {
      type: "object",
      required: ["name", "value"],
      properties: {
        name: { type: "string", description: "Key name" },
        value: { type: "string", description: "Value to encrypt and store" },
      },
    },
    handler: async (args) => {
      vault.set(String(args.name), String(args.value));
      return { text: `Stored encrypted value for '${args.name}'` };
    },
  },
  {
    name: "vault_get",
    description: "Retrieve a decrypted value from the encrypted vault",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Key name to retrieve" },
      },
    },
    handler: async (args) => {
      const value = vault.get(String(args.name));
      if (value === null) {
        return { text: `No value found for '${args.name}'` };
      }
      return { text: value };
    },
  },
  {
    name: "vault_has",
    description: "Check if a key exists in the encrypted vault",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Key name to check" },
      },
    },
    handler: async (args) => {
      return { text: String(vault.has(String(args.name))) };
    },
  },
  {
    name: "vault_list",
    description: "List all stored key names in the encrypted vault (values not shown)",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const keys = vault.listKeys();
      return { text: keys.length > 0 ? keys.join("\n") : "(empty vault)" };
    },
  },
  ...studioTools,
  ...cloudTools,
];

const toolMap = new Map<string, ToolDefinition>();
for (const t of allTools) {
  toolMap.set(t.name, t);
}

function refreshStudioTools(): void {
  const alive = studioClient?.isAlive || false;
  const freshStudioTools = createStudioTools(alive ? studioClient : null);
  for (const t of freshStudioTools) {
    toolMap.set(t.name, t);
  }
}

const server = new Server(
  { name: "xenoz-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  refreshStudioTools();
  const tools = Array.from(toolMap.values()).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = toolMap.get(name);

  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    const result = await tool.handler(args || {});
    const content: Record<string, unknown>[] = [{ type: "text", text: result.text }];

    if (result.images) {
      for (const img of result.images) {
        content.push({ type: "image", data: img.data, mimeType: img.mimeType });
      }
    }

    return { content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `ERROR: ${msg}` }],
      isError: true,
    };
  }
});

async function main(): Promise<void> {
  console.error(`[xenoz-mcp] Starting XenozMCP v0.1.0...`);
  console.error(`[xenoz-mcp] Vault: ${config.vault.enabled ? "enabled (AES-256-GCM)" : "disabled"}`);
  console.error(`[xenoz-mcp] Open Cloud: ${config.openCloud.apiKey ? "configured" : "not configured"}`);

  if (config.openCloud.apiKey) {
    vault.set("opencloud_api_key", config.openCloud.apiKey);
  }

  startStudioClient();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[xenoz-mcp] Ready — listening on stdio`);
}

main().catch((err) => {
  console.error("[xenoz-mcp] Fatal error:", err);
  process.exit(1);
});
