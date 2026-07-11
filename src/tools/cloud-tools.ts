import axios from "axios";
import type { OpenCloudConfig } from "../config.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<{ text: string }>;
}

const BASE_URL = "https://apis.roblox.com";

function createClient(cfg: OpenCloudConfig) {
  if (!cfg.apiKey) {
    throw new Error("Open Cloud API key not configured. Set it in config.json or via vault.");
  }
  return axios.create({
    baseURL: BASE_URL,
    headers: { "x-api-key": cfg.apiKey, "Content-Type": "application/json" },
  });
}

export function createCloudTools(cloudConfig: OpenCloudConfig): ToolDefinition[] {
  return [
    {
      name: "cloud_list_data_stores",
      description: "List all data stores for a universe",
      inputSchema: {
        type: "object",
        properties: {
          universeId: {
            type: "string",
            description: "Roblox Universe ID (defaults to configured one)",
          },
        },
      },
      handler: async (args) => {
        const universeId = (args.universeId as string) || cloudConfig.defaultUniverseId;
        if (!universeId) return { text: "ERROR: universeId is required" };
        try {
          const client = createClient(cloudConfig);
          const res = await client.get(`/cloud/v2/universes/${universeId}/data-stores`);
          return { text: JSON.stringify(res.data, null, 2) };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { text: `ERROR: ${msg}` };
        }
      },
    },
    {
      name: "cloud_get_data_store_entry",
      description: "Get a value from a data store",
      inputSchema: {
        type: "object",
        required: ["universeId", "dataStoreName", "key"],
        properties: {
          universeId: { type: "string", description: "Roblox Universe ID" },
          dataStoreName: { type: "string", description: "Data store name" },
          key: { type: "string", description: "Entry key" },
        },
      },
      handler: async (args) => {
        const { universeId, dataStoreName, key } = args as Record<string, string>;
        try {
          const client = createClient(cloudConfig);
          const res = await client.get(
            `/cloud/v2/universes/${universeId}/data-stores/${encodeURIComponent(dataStoreName)}/entries/${encodeURIComponent(key)}`
          );
          return { text: JSON.stringify(res.data, null, 2) };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { text: `ERROR: ${msg}` };
        }
      },
    },
    {
      name: "cloud_set_data_store_entry",
      description: "Set a value in a data store",
      inputSchema: {
        type: "object",
        required: ["universeId", "dataStoreName", "key", "value"],
        properties: {
          universeId: { type: "string", description: "Roblox Universe ID" },
          dataStoreName: { type: "string", description: "Data store name" },
          key: { type: "string", description: "Entry key" },
          value: { type: "string", description: "Value to set (JSON string)" },
          exclusiveCreate: { type: "boolean", description: "Only create if key doesn't exist" },
        },
      },
      handler: async (args) => {
        const { universeId, dataStoreName, key, value, exclusiveCreate } = args as Record<string, string>;
        try {
          const client = createClient(cloudConfig);
          let parsed: unknown;
          try { parsed = JSON.parse(value); } catch { parsed = value; }
          const res = await client.post(
            `/cloud/v2/universes/${universeId}/data-stores/${encodeURIComponent(dataStoreName)}/entries`,
            { key, value: parsed, exclusiveCreate: !!exclusiveCreate }
          );
          return { text: JSON.stringify(res.data, null, 2) };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { text: `ERROR: ${msg}` };
        }
      },
    },
    {
      name: "cloud_get_universe_info",
      description: "Get information about a Roblox universe/experience",
      inputSchema: {
        type: "object",
        properties: {
          universeId: {
            type: "string",
            description: "Roblox Universe ID (defaults to configured one)",
          },
        },
      },
      handler: async (args) => {
        const universeId = (args.universeId as string) || cloudConfig.defaultUniverseId;
        if (!universeId) return { text: "ERROR: universeId is required" };
        try {
          const client = createClient(cloudConfig);
          const res = await client.get(`/cloud/v2/universes/${universeId}`);
          return { text: JSON.stringify(res.data, null, 2) };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { text: `ERROR: ${msg}` };
        }
      },
    },
    {
      name: "cloud_publish_place",
      description: "Publish a place to Roblox",
      inputSchema: {
        type: "object",
        required: ["universeId", "placeId"],
        properties: {
          universeId: { type: "string", description: "Roblox Universe ID" },
          placeId: { type: "string", description: "Roblox Place ID to publish" },
          publishType: {
            type: "string",
            enum: ["Play", "Edit"],
            description: "Publish type (default Play)",
          },
        },
      },
      handler: async (args) => {
        const { universeId, placeId, publishType } = args as Record<string, string>;
        try {
          const client = createClient(cloudConfig);
          const res = await client.post(
            `/cloud/v2/universes/${universeId}/places/${placeId}/publish`,
            { publishType: publishType || "Play" }
          );
          return { text: JSON.stringify(res.data, null, 2) };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { text: `ERROR: ${msg}` };
        }
      },
    },
    {
      name: "cloud_list_places",
      description: "List all places in a universe",
      inputSchema: {
        type: "object",
        properties: {
          universeId: {
            type: "string",
            description: "Roblox Universe ID (defaults to configured one)",
          },
        },
      },
      handler: async (args) => {
        const universeId = (args.universeId as string) || cloudConfig.defaultUniverseId;
        if (!universeId) return { text: "ERROR: universeId is required" };
        try {
          const client = createClient(cloudConfig);
          const res = await client.get(`/cloud/v2/universes/${universeId}/places`);
          return { text: JSON.stringify(res.data, null, 2) };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { text: `ERROR: ${msg}` };
        }
      },
    },
    {
      name: "cloud_send_notification",
      description: "Send a notification to all players in an experience",
      inputSchema: {
        type: "object",
        required: ["universeId", "message"],
        properties: {
          universeId: { type: "string", description: "Roblox Universe ID" },
          message: { type: "string", description: "Notification message text" },
        },
      },
      handler: async (args) => {
        const { universeId, message } = args as Record<string, string>;
        try {
          const client = createClient(cloudConfig);
          const res = await client.post(
            `/cloud/v2/universes/${universeId}/notifications`,
            { message }
          );
          return { text: JSON.stringify(res.data, null, 2) };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { text: `ERROR: ${msg}` };
        }
      },
    },
  ];
}
