import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 600000;

export class Vault {
  private key: Buffer;
  private storePath: string;
  private store: Record<string, string> = {};

  constructor(key: string, storePath: string) {
    const salt = randomBytes(SALT_LENGTH);
    this.key = pbkdf2Sync(key, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512");
    this.storePath = storePath;
    this.load();
  }

  static generateKey(): string {
    return randomBytes(32).toString("hex");
  }

  set(name: string, value: string): void {
    this.store[name] = this.encrypt(value);
    this.save();
  }

  get(name: string): string | null {
    const encrypted = this.store[name];
    if (!encrypted) return null;
    try {
      return this.decrypt(encrypted);
    } catch {
      return null;
    }
  }

  delete(name: string): void {
    delete this.store[name];
    this.save();
  }

  has(name: string): boolean {
    return name in this.store;
  }

  listKeys(): string[] {
    return Object.keys(this.store);
  }

  private encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    let encrypted = cipher.update(plaintext, "utf-8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${tag}:${encrypted}`;
  }

  private decrypt(packet: string): string {
    const parts = packet.split(":");
    if (parts.length < 3) throw new Error("Invalid vault packet");
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const encrypted = parts.slice(2).join(":");
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
  }

  private load(): void {
    if (!existsSync(this.storePath)) return;
    try {
      this.store = JSON.parse(readFileSync(this.storePath, "utf-8"));
    } catch {
      this.store = {};
    }
  }

  private save(): void {
    const dir = join(this.storePath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), "utf-8");
  }
}
