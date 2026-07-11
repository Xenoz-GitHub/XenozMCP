import { spawn, ChildProcess } from "child_process";
import { createInterface } from "readline";
import { EventEmitter } from "events";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPCallResult {
  text: string;
  images?: { data: string; mimeType: string }[];
}

export class MCPClient extends EventEmitter {
  private proc: ChildProcess | null = null;
  private reqId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; timer: NodeJS.Timeout }>();
  private toolsCache: MCPTool[] = [];
  private writeLock = false;
  private writeBuffer: string[] = [];
  private _reader: ReturnType<typeof createInterface> | null = null;

  constructor(
    public readonly id: string,
    private command: string,
    private args: string[],
    private env?: Record<string, string>
  ) {
    super();
  }

  get isAlive(): boolean {
    return this.proc !== null && this.proc.exitCode === null;
  }

  start(startTimeout = 15_000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isAlive) return resolve();

      const cmd = this.resolveCommand(this.command, this.args);
      const env = { ...process.env };
      if (this.env) {
        for (const [k, v] of Object.entries(this.env)) {
          env[k] = this.resolveVars(v);
        }
      }

      this.proc = spawn(cmd.command, cmd.args, {
        stdio: ["pipe", "pipe", "pipe"],
        env,
      } as Record<string, unknown>) as ChildProcess;

      const stderrChunks: string[] = [];
      if (this.proc.stderr) {
        this.proc.stderr.on("data", (chunk: Buffer) => {
          stderrChunks.push(chunk.toString());
        });
      }

      if (this.proc.stdout) {
        this._reader = createInterface({ input: this.proc.stdout });
        this._reader.on("line", (line: string) => {
          line = line.trim();
          if (!line) return;
          try {
            const msg = JSON.parse(line);
            const mid = msg.id;
            if (mid != null && this.pending.has(mid)) {
              const p = this.pending.get(mid)!;
              clearTimeout(p.timer);
              p.resolve(msg);
              this.pending.delete(mid);
            }
          } catch {
            /* non-JSON log line */
          }
        });
      }

      this.proc.on("error", (err) => {
        this.emit("error", err);
        reject(err);
      });

      this.proc.on("exit", (code) => {
        this.proc = null;
        this.emit("exit", code);
        for (const [, p] of this.pending) {
          clearTimeout(p.timer);
          p.resolve(null);
        }
        this.pending.clear();
      });

      const timeoutId = setTimeout(() => {
        reject(new Error(`MCPClient ${this.id} start timeout`));
      }, startTimeout);

      this.request("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "xenoz-mcp", version: "0.1.0" },
      })
        .then(() => {
          this.notify("notifications/initialized");
          return this.refreshTools();
        })
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  stop(): void {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve(null);
    }
    this.pending.clear();
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
  }

  getTools(): MCPTool[] {
    return [...this.toolsCache];
  }

  async refreshTools(): Promise<MCPTool[]> {
    const msg = await this.request("tools/list", {}, 15_000);
    if (msg && typeof msg === "object" && "result" in (msg as Record<string, unknown>)) {
      this.toolsCache = ((msg as Record<string, unknown>).result as Record<string, unknown>).tools as MCPTool[] || [];
    }
    return this.getTools();
  }

  async callTool(name: string, args: Record<string, unknown>, timeout = 120_000): Promise<MCPCallResult> {
    const msg = await this.request("tools/call", { name, arguments: args }, timeout);
    if (!msg) {
      throw new Error(`No response from server '${this.id}' after ${timeout}ms`);
    }
    const m = msg as Record<string, unknown>;
    if (m.error) {
      const err = m.error as Record<string, unknown>;
      throw new Error(String(err.message || JSON.stringify(err)));
    }
    const content = ((m.result as Record<string, unknown>)?.content as Record<string, unknown>[]) || [];
    const text = content
      .filter((c) => c.type === "text")
      .map((c) => String(c.text))
      .join("\n");
    const images = content
      .filter((c) => c.type === "image" && c.data)
      .map((c) => ({ data: String(c.data), mimeType: String(c.mimeType || "image/jpeg") }));
    return { text, images: images.length > 0 ? images : undefined };
  }

  private request(method: string, params: Record<string, unknown>, timeout = 30_000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.isAlive) {
        return reject(new Error(`Server '${this.id}' is dead`));
      }
      const id = this.reqId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve(null);
      }, timeout);
      this.pending.set(id, { resolve, timer });

      const payload = { jsonrpc: "2.0", id, method, params };
      try {
        this.writeLine(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  private notify(method: string, params?: Record<string, unknown>): void {
    const payload = { jsonrpc: "2.0", method, params: params || {} };
    this.writeLine(JSON.stringify(payload));
  }

  private writeLine(data: string): void {
    if (!this.proc?.stdin?.writable) return;
    this.proc.stdin.write(data + "\n");
  }

  private resolveCommand(command: string, args: string[]): { command: string; args: string[] } {
    const cmd = command.toLowerCase();
    if (cmd.endsWith(".py")) {
      return { command: process.execPath, args: [command, ...args] };
    }
    if (["npx", "npm", "yarn", "pnpm", "bunx"].includes(cmd)) {
      return { command: "cmd.exe", args: ["/c", command, ...args] };
    }
    return { command, args };
  }

  private resolveVars(value: string): string {
    return value.replace(/%([^%]+)%/g, (_, key) => process.env[key] || "");
  }
}
