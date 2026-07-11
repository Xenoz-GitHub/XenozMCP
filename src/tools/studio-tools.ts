import type { MCPClient, MCPCallResult } from "../mcp-client.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<MCPCallResult>;
}

export function createStudioTools(studioClient: MCPClient | null): ToolDefinition[] {
  return [
    {
      name: "list_studio_commands",
      description: "List all available Roblox Studio MCP commands with descriptions and parameter details",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        if (!studioClient?.isAlive) {
          return {
            text: "ERROR: Roblox Studio is not connected. Open Roblox Studio and enable 'Studio as MCP Server' in Assistant settings.",
          };
        }
        const tools = studioClient.getTools();
        const lines = tools.map((t) => {
          const props = (t.inputSchema?.properties as Record<string, unknown>) || {};
          const args = Object.keys(props).join(", ");
          return `  ${t.name}(${args}) - ${t.description}`;
        });
        return { text: `Available commands (${tools.length}):\n${lines.join("\n")}` };
      },
    },
    {
      name: "execute_luau",
      description: "Execute Luau code in Roblox Studio. Use `return` for output (print is NOT captured). Runs synchronously (~20s budget).",
      inputSchema: {
        type: "object",
        required: ["code"],
        properties: {
          code: {
            type: "string",
            description: "Luau code to execute. Use `return` for output, NOT print().",
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default 20000)",
          },
        },
      },
      handler: async (args) => {
        if (!studioClient?.isAlive) {
          return { text: "ERROR: Roblox Studio is not connected." };
        }
        return studioClient.callTool("execute_luau", {
          code: args.code,
        }, (args.timeout as number) || 20000);
      },
    },
    {
      name: "script_read",
      description: "Read the full contents of a script in Roblox Studio by path",
      inputSchema: {
        type: "object",
        required: ["target_file"],
        properties: {
          target_file: {
            type: "string",
            description: "Full dot-path to the script (e.g. game.ServerStorage.MyScript)",
          },
        },
      },
      handler: async (args) => {
        if (!studioClient?.isAlive) {
          return { text: "ERROR: Roblox Studio is not connected." };
        }
        return studioClient.callTool("script_read", {
          target_file: args.target_file,
        });
      },
    },
    {
      name: "screen_capture",
      description: "Capture the Roblox Studio viewport. Takes a screenshot of the current scene.",
      inputSchema: {
        type: "object",
        properties: {
          single: {
            type: "boolean",
            description: "If true, capture a single angle instead of multi-angle",
          },
        },
      },
      handler: async (args) => {
        if (!studioClient?.isAlive) {
          return { text: "ERROR: Roblox Studio is not connected." };
        }
        return studioClient.callTool("screen_capture", args);
      },
    },
    {
      name: "inspect_instance",
      description: "Inspect a Roblox instance by dot-path. Returns properties, attributes, and children.",
      inputSchema: {
        type: "object",
        required: ["path"],
        properties: {
          path: {
            type: "string",
            description: "Dot-notation path (e.g. Workspace.Model.Part). Case-insensitive.",
          },
        },
      },
      handler: async (args) => {
        if (!studioClient?.isAlive) {
          return { text: "ERROR: Roblox Studio is not connected." };
        }
        return studioClient.callTool("inspect_instance", {
          path: args.path,
        });
      },
    },
    {
      name: "start_stop_play",
      description: "Start or stop play-testing in Roblox Studio",
      inputSchema: {
        type: "object",
        required: ["is_start"],
        properties: {
          is_start: {
            type: "boolean",
            description: "true to start play-testing, false to stop",
          },
        },
      },
      handler: async (args) => {
        if (!studioClient?.isAlive) {
          return { text: "ERROR: Roblox Studio is not connected." };
        }
        return studioClient.callTool("start_stop_play", {
          is_start: args.is_start,
        });
      },
    },
    {
      name: "get_studio_state",
      description: "Get the current state of Roblox Studio connection and place info",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        if (!studioClient?.isAlive) {
          return { text: JSON.stringify({ connected: false, studioOpen: false, placeLoaded: false }) };
        }
        try {
          const result = await studioClient.callTool("get_studio_state", {});
          return result;
        } catch {
          return { text: JSON.stringify({ connected: true, studioOpen: true, placeLoaded: true }) };
        }
      },
    },
    {
      name: "search_game_tree",
      description: "Search for instances in the game tree by name or class",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Search query (name or class name)" },
          scope: { type: "string", description: "Scope path to search within (e.g. game.Workspace)" },
          max_results: { type: "number", description: "Maximum results (default 20)" },
        },
      },
      handler: async (args) => {
        if (!studioClient?.isAlive) {
          return { text: "ERROR: Roblox Studio is not connected." };
        }
        return studioClient.callTool("search_game_tree", args);
      },
    },
    {
      name: "open_place",
      description: "Open a Roblox place in Studio by place ID and universe ID",
      inputSchema: {
        type: "object",
        required: ["place_id", "universe_id"],
        properties: {
          place_id: { type: "string", description: "Roblox Place ID" },
          universe_id: { type: "string", description: "Roblox Universe ID" },
          task: {
            type: "string",
            enum: ["EditPlace", "EditPlaceRevision"],
            description: "Task (default EditPlace)",
          },
        },
      },
      handler: async (args) => {
        const studioExe = (await import("../studio-launcher.js")).findStudioExe();
        if (!studioExe) {
          return { text: "ERROR: Roblox Studio not found on this system." };
        }
        const { spawn } = await import("child_process");
        const task = (args.task as string) || "EditPlace";
        const child = spawn(studioExe, [
          "--task", task,
          "--placeId", String(args.place_id),
          "--universeId", String(args.universe_id),
        ], { detached: true, stdio: "ignore" });
        child.unref();
        return { text: `Opened place ${args.place_id} in Roblox Studio (task: ${task})` };
      },
    },
  ];
}
