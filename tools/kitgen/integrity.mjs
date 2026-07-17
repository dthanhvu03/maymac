// Runtime integrity: a shipped map of hashes for the kit's hooks, so `doctor` can
// tell if a vendored hook was modified or corrupted since it was installed.
//
// This is tamper-EVIDENCE and corruption detection, not cryptographic supply-chain
// security: the hashes file is shipped alongside the hooks and isn't signed, so it
// catches the realistic threat (an editor/merge mangled a hook, or a hook was hand-
// edited) — not a determined attacker who also rewrites the hashes file.
//
// The map is (re)generated only at release (package.json `prepublishOnly`) or by
// running this file directly — never by a normal `build` — so that a hook changed
// after install shows up as a mismatch instead of being silently re-blessed.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const HASHES_REL = ".kit/hooks/.hashes.json";
const sha256 = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");

// Stable (sorted) hash map of every runtime hook (*.mjs) in a hooks directory.
export function hookHashes(hooksDir) {
  const out = {};
  for (const f of readdirSync(hooksDir).filter((n) => n.endsWith(".mjs")).sort())
    out[f] = sha256(readFileSync(join(hooksDir, f)));
  return out;
}

// Write the integrity map for a project's hooks into HASHES_REL.
export function writeHashes(projectDir) {
  const map = hookHashes(join(projectDir, ".kit", "hooks"));
  writeFileSync(join(projectDir, HASHES_REL),
    JSON.stringify({ version: 1, algorithm: "sha256", files: map }, null, 2) + "\n");
  return map;
}

// CLI: `node tools/kitgen/integrity.mjs` regenerates the map for this repo.
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("integrity.mjs")) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const map = writeHashes(root);
  console.log(`integrity: wrote ${Object.keys(map).length} hook hash(es) → ${HASHES_REL}`);
}
