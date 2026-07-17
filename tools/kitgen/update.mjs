#!/usr/bin/env node
// smkit update — refresh the self-contained kit source inside a project to THIS
// package's version, preserving the user's own content (config + memory + tasks),
// then rebuild. Because a project ships a frozen copy of the kit, updates must be
// pulled from a fresh package:   npx @zusem/smkit@latest update
//
// Flags: --dry-run (show, write nothing) · --yes (no prompt) · --no-build · --force
import { readFileSync, writeFileSync, existsSync, rmSync, cpSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";

// Never stack-trace at the user (same discipline as the rest of the CLI).
process.on("uncaughtException", (e) => { console.error(`\nsmkit update: ${e?.message || e}`); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error(`\nsmkit update: ${e?.message || e}`); process.exit(1); });

const KIT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const kp = (...s) => join(KIT_DIR, ...s);
const pp = (...s) => join(PROJECT_DIR, ...s);

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const DRY = has("dry-run"), YES = has("yes"), NOBUILD = has("no-build"), FORCE = has("force");

const readVersion = (dir) => {
  try { return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version || "?"; }
  catch { return "?"; }
};
const newVer = readVersion(KIT_DIR);

// The project ships its own (old) copy of the kit. If we're running THAT copy,
// KIT_DIR === PROJECT_DIR and there is nothing newer to pull — tell the user how.
if (PROJECT_DIR === KIT_DIR) {
  console.error(
    "smkit update: you're running the copy already installed in this project, so there's\n" +
    "nothing newer to pull. Update from a fresh package instead:\n\n" +
    "  npx @zusem/smkit@latest update\n");
  process.exit(1);
}
if (!existsSync(pp("kit.config.yaml"))) {
  console.error("smkit update: no kit.config.yaml here — this project isn't set up yet.\n" +
    "Run `npx @zusem/smkit init` first.");
  process.exit(1);
}

const stampPath = pp(".kit", ".smkit-version");
const oldVer = existsSync(stampPath) ? readFileSync(stampPath, "utf8").trim() : "unknown (pre-0.1.2)";

// The new package must look complete BEFORE we touch anything — never delete the
// user's source only to find the replacement missing.
for (const d of ["engine", "tools"]) {
  if (!existsSync(kp(d))) {
    console.error(`smkit update: this package looks incomplete (missing ${d}/). Aborting — nothing changed.`);
    process.exit(1);
  }
}

// Refuse a silent downgrade (an older package run over a newer project) unless forced.
const cmpVer = (a, b) => {
  const pa = String(a).split("."), pb = String(b).split(".");
  for (let i = 0; i < 3; i++) { const x = parseInt(pa[i], 10) || 0, y = parseInt(pb[i], 10) || 0; if (x !== y) return x < y ? -1 : 1; }
  return 0;
};
if (cmpVer(newVer, oldVer) < 0 && !FORCE) {
  console.error(`smkit update: this package (${newVer}) is OLDER than what's installed (${oldVer}).\n` +
    "Refusing to downgrade. Run `npx @zusem/smkit@latest update`, or pass --force to override.");
  process.exit(1);
}

// Kit-owned = refreshed from the new package. Everything else (config, memory,
// tasks, .gitignore) is the user's and is left untouched.
const REPLACE_DIRS = ["engine", "profiles", "tools", join(".kit", "hooks")];
const REPLACE_FILES = ["constitution.template.md", "decisions.template.md", "task.template.md", "handoff.template.md"]
  .map((f) => join(".kit", f));

console.log(`\nsmkit update — ${oldVer}  →  ${newVer}\n`);
console.log("  refresh (kit-owned):  engine/  profiles/  tools/  .kit/hooks/  .kit/*.template.md");
console.log("  keep (yours):         kit.config.yaml  .kit/constitution.md  .kit/decisions.md  .kit/tasks/  .gitignore\n");

// Whether the project's installed kit-owned files are byte-identical to this package.
// Trusting the version STAMP alone is fragile — a stamp can advance while the source
// stays stale (a bad prior update, a mixed npx cache). So on a same-version run we
// compare actual content and re-sync if it drifted, instead of blindly doing nothing.
const walkRel = (root) => {
  const out = [];
  const rec = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) rec(p); else out.push(relative(root, p));
    }
  };
  if (existsSync(root)) rec(root);
  return out;
};
function installedMatchesPackage() {
  for (const d of REPLACE_DIRS) {
    if (!existsSync(kp(d))) continue;
    for (const rel of walkRel(kp(d))) {
      const there = pp(d, rel);
      if (!existsSync(there) || readFileSync(kp(d, rel), "utf8") !== readFileSync(there, "utf8")) return false;
    }
  }
  for (const f of REPLACE_FILES)
    if (existsSync(kp(f)) && (!existsSync(pp(f)) || readFileSync(kp(f), "utf8") !== readFileSync(pp(f), "utf8"))) return false;
  return true;
}

if (oldVer === newVer && !FORCE && !DRY) {
  if (installedMatchesPackage()) {
    console.log(`Already on ${newVer} and in sync with this package. Nothing to do.`);
    process.exit(0);
  }
  console.log(`Stamped ${newVer}, but the installed kit files differ from this package — re-syncing them.`);
  // fall through to confirm + refresh (self-heal a stale/drifted install)
}

async function confirm() {
  const nonInteractive = YES || DRY || !process.stdin.isTTY;
  if (nonInteractive) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question("This replaces the kit-owned files above (a backup is saved to .smkit-backup/). Continue? [y/N] ")).trim().toLowerCase();
  rl.close();
  return a === "y" || a === "yes";
}

if (!(await confirm())) { console.log("Cancelled — nothing changed."); process.exit(0); }

if (DRY) { console.log("[dry-run] nothing written. Re-run without --dry-run to apply."); process.exit(0); }

// Step 1 — snapshot everything we're about to touch into the backup. Nothing is
// destroyed yet, so a failure here leaves the project fully intact.
const backup = pp(".smkit-backup");
try {
  rmSync(backup, { recursive: true, force: true });
  mkdirSync(backup, { recursive: true });
  for (const d of REPLACE_DIRS) if (existsSync(pp(d))) cpSync(pp(d), join(backup, d), { recursive: true });
  for (const f of REPLACE_FILES) if (existsSync(pp(f))) { mkdirSync(dirname(join(backup, f)), { recursive: true }); cpSync(pp(f), join(backup, f)); }
} catch (e) {
  console.error(`\nsmkit update: couldn't create a backup (${e?.message || e}). Nothing was changed.`);
  process.exit(1);
}

// Restore the project from the backup — used if the refresh fails part-way.
const restore = () => {
  for (const d of REPLACE_DIRS) { rmSync(pp(d), { recursive: true, force: true }); if (existsSync(join(backup, d))) cpSync(join(backup, d), pp(d), { recursive: true }); }
  for (const f of REPLACE_FILES) if (existsSync(join(backup, f))) cpSync(join(backup, f), pp(f));
};

// Step 2 — apply the refresh transactionally. Any error rolls the project back so
// it is never left half-updated or with a deleted directory.
try {
  for (const d of REPLACE_DIRS) {
    if (!existsSync(kp(d))) continue;   // package lacks it → keep the user's, don't delete
    rmSync(pp(d), { recursive: true, force: true });
    cpSync(kp(d), pp(d), { recursive: true });
  }
  for (const f of REPLACE_FILES) if (existsSync(kp(f))) cpSync(kp(f), pp(f));
  writeFileSync(stampPath, newVer + "\n");
} catch (e) {
  console.error(`\nsmkit update: refresh failed (${e?.message || e}) — rolling back…`);
  try { restore(); console.error("Rolled back. Your project is unchanged."); }
  catch (e2) { console.error(`Rollback also failed (${e2?.message || e2}). Restore manually from .smkit-backup/`); }
  process.exit(1);
}
console.log(`  ✓ refreshed to ${newVer}. Previous kit source backed up in .smkit-backup/`);

if (!NOBUILD) {
  console.log("\nRebuilding agent config…");
  // --force: the engine was just fully replaced, so the generated output must sync to it
  // completely. Without it, output left over from the old engine reads as "locally
  // modified" and gets protected/skipped, leaving the project in drift (doctor errors).
  // A user's hand-edit to a generated file is still saved to <file>.bak first (0.1.8).
  const r = spawnSync(process.execPath, [pp("tools", "kitgen", "kitgen.mjs"), "build", "--force"],
    { stdio: "inherit", cwd: PROJECT_DIR, env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_DIR } });
  if (r.error) { console.error(`\nRebuild couldn't start: ${r.error.message}. Restore from .smkit-backup/ if needed.`); process.exit(1); }
  if (r.status !== 0) { console.error(`\nRebuild failed (exit ${r.status}). Your files are intact; restore from .smkit-backup/ if needed.`); process.exit(r.status || 1); }
}

console.log(`\nDone — updated to ${newVer}. See CHANGELOG.md for what's new.`);
console.log("If you had edited engine/ or profiles/ in place, re-apply those changes from .smkit-backup/.");
// Self-contained install: no global `smkit` on PATH — show how to run commands here.
console.log("Run kit commands here with: `node tools/kitgen/kitgen.mjs <doctor|build|check>`  (or `npm i -g @zusem/smkit` for the short `smkit` command).");
process.exit(0);
