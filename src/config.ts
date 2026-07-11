import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface OpenCloudConfig {
  apiKey: string;
  defaultUniverseId: string;
}

export interface VaultConfig {
  enabled: boolean;
  keyPath: string;
}

export interface AppConfig {
  mcpServers: Record<string, MCPServerConfig>;
  openCloud: OpenCloudConfig;
  vault: VaultConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  mcpServers: {
    "roblox-studio": {
      command: "launch_studio_mcp",
      args: [],
    },
  },
  openCloud: {
    apiKey: "",
    defaultUniverseId: "",
  },
  vault: {
    enabled: true,
    keyPath: join(ROOT, ".vault"),
  },
};

export function loadConfig(path?: string): AppConfig {
  const configPath = path || join(ROOT, "config.json");
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(configPath, "utf-8");
    const user = JSON.parse(raw);
    return {
      mcpServers: { ...DEFAULT_CONFIG.mcpServers, ...user.mcpServers },
      openCloud: { ...DEFAULT_CONFIG.openCloud, ...user.openCloud },
      vault: { ...DEFAULT_CONFIG.vault, ...user.vault },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function getRoot(): string {
  return ROOT;
}
