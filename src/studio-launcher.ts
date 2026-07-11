import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { platform } from "os";

const CANDIDATE_ROOTS: string[] = [];

const localAppData = process.env.LOCALAPPDATA;
if (localAppData) {
  CANDIDATE_ROOTS.push(join(localAppData, "Roblox", "Versions"));
}

const programFiles =
  process.env["ProgramFiles(x86)"] || process.env.ProgramFiles;
if (programFiles) {
  CANDIDATE_ROOTS.push(join(programFiles, "Roblox", "Versions"));
}

export interface StudioInfo {
  mcpExe: string;
  studioExe: string;
}

export function findStudioMCP(): StudioInfo | null {
  const found: { path: string; mtime: number }[] = [];

  for (const root of CANDIDATE_ROOTS) {
    if (!existsSync(root)) continue;
    try {
      for (const entry of readdirSync(root)) {
        const versionDir = join(root, entry);
        if (!statSync(versionDir).isDirectory()) continue;

        const mcpExe = join(versionDir, "StudioMCP.exe");
        if (existsSync(mcpExe)) {
          found.push({ path: mcpExe, mtime: statSync(mcpExe).mtimeMs });
        }
      }
    } catch {
      continue;
    }
  }

  if (found.length === 0) return null;
  found.sort((a, b) => b.mtime - a.mtime);

  const mcpExe = found[0].path;
  const studioExe = join(mcpExe, "..", "RobloxStudioBeta.exe");

  return {
    mcpExe,
    studioExe: existsSync(studioExe) ? studioExe : mcpExe.replace("StudioMCP.exe", "RobloxStudioBeta.exe"),
  };
}

export function findStudioExe(): string | null {
  for (const root of CANDIDATE_ROOTS) {
    if (!existsSync(root)) continue;
    try {
      for (const entry of readdirSync(root)) {
        const versionDir = join(root, entry);
        if (!statSync(versionDir).isDirectory()) continue;
        const exe = join(versionDir, "RobloxStudioBeta.exe");
        if (existsSync(exe)) return exe;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function getStudioLaunchCommand(
  task: string,
  placeId?: string,
  universeId?: string,
  scriptFile?: string
): { command: string; args: string[] } {
  const studioExe = findStudioExe();
  if (!studioExe) {
    throw new Error("Roblox Studio not found. Install Roblox Studio first.");
  }

  const args: string[] = [`--task`, task];

  if (placeId && universeId) {
    args.push(`--placeId`, placeId, `--universeId`, universeId);
  }

  if (scriptFile) {
    args.push(`--runScriptFile`, scriptFile);
  }

  return { command: studioExe, args };
}
