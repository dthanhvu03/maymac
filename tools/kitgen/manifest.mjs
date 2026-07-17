// Ownership manifest: the record of exactly which files the generator wrote, and
// their content hash, from the previous build. This is what lets `build` clean up
// its OWN stale output without ever blanket-deleting a directory (which would take
// user-authored files with it). Stored per project at .kit/build-manifest.json.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

export const MANIFEST_REL = ".kit/build-manifest.json";

export function sha256(str) {
  return createHash("sha256").update(str, "utf8").digest("hex");
}

// Load the manifest, or a null-outDir empty one if absent/corrupt (fail-safe: an
// unreadable manifest must NOT be treated as "these files are mine to delete").
export function loadManifest(projectDir) {
  try {
    const m = JSON.parse(readFileSync(join(projectDir, MANIFEST_REL), "utf8"));
    if (m && typeof m === "object" && m.files && typeof m.files === "object")
      return { version: m.version || 1, outDir: m.outDir ?? null, files: m.files };
  } catch { /* absent or corrupt → migration mode */ }
  return { version: 1, outDir: null, files: {} };
}

export function saveManifest(projectDir, manifest) {
  const p = join(projectDir, MANIFEST_REL);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify({ version: 1, outDir: manifest.outDir, files: manifest.files }, null, 2) + "\n");
}

export function manifestExists(projectDir) {
  return existsSync(join(projectDir, MANIFEST_REL));
}
