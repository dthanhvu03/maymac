#!/usr/bin/env node
// smkit uninstall — remove the kit from THIS project, safely.
//
// Removes three things:
//   1. Generated agent config — every file the kit wrote, identified by rebuilding
//      the expected output and cross-checking the ownership manifest. A generated
//      file you have since EDITED is kept (unless --force), never silently deleted.
//   2. Vendored kit source & runtime — engine/ profiles/ tools/kitgen/ .kit/hooks/,
//      the .kit templates, the build manifest, the version stamp, .kit/state/.
//   3. kit.config.yaml (+ .bak).
//
// It NEVER touches your own content: .kit/constitution.md, .kit/decisions.md,
// .kit/tasks/, or any file the kit did not generate.
//
// Flags:  --dry-run  show the plan, change nothing
//         --yes, -y  skip the confirmation prompt (required when there is no TTY)
//         --force    also remove generated files you have edited since
import { existsSync, readFileSync, rmSync, rmdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { createInterface } from "node:readline";
import { loadManifest, sha256 } from "./manifest.mjs";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const pp = (...s) => join(PROJECT_DIR, ...s);
const has = (f) => process.argv.includes(f);
const DRY = has("--dry-run");
const YES = has("--yes") || has("-y");
const FORCE = has("--force");

// ---- discover the generated files -----------------------------------------
// Prefer a live rebuild (exact byte comparison → precise "did the user edit it?"),
// and union in whatever the manifest recorded so stale files from an older build
// are cleaned up too. Both sources are best-effort: a half-removed install still
// uninstalls its source and config.
const manifest = loadManifest(PROJECT_DIR);
let outDir = manifest.outDir ?? ".";
let cfg = null;
try { const { parseYaml } = await import("./yaml.mjs"); cfg = parseYaml(readFileSync(pp("kit.config.yaml"), "utf8")); if (cfg?.outDir) outDir = cfg.outDir; }
catch { /* no/invalid config → rely on the manifest alone */ }

let expected = new Map();
try { if (cfg) { const { buildOutputs } = await import("../../engine/emitter.mjs"); expected = buildOutputs(cfg, { kitDir: PROJECT_DIR }); } }
catch { /* source already gone → rely on the manifest alone */ }

const genRels = new Set([...expected.keys(), ...Object.keys(manifest.files)]);
const genRemove = [];   // { rel (display), abs }
const genKept = [];     // files edited since generated — kept unless --force
for (const rel of genRels) {
  const abs = pp(outDir, rel);
  if (!existsSync(abs)) continue;
  const cur = readFileSync(abs, "utf8");
  const owned = expected.has(rel) ? cur === expected.get(rel)
    : manifest.files[rel] ? sha256(cur) === manifest.files[rel]
    : false;
  const disp = outDir === "." ? rel : `${outDir}/${rel}`;
  if (owned || FORCE) genRemove.push({ rel: disp, abs });
  else genKept.push(disp);
}

// ---- vendored source & runtime (fixed, unambiguously the kit's) ------------
const SOURCE = [
  "engine", "profiles", "tools/kitgen", ".kit/hooks",
  ".kit/constitution.template.md", ".kit/decisions.template.md",
  ".kit/task.template.md", ".kit/handoff.template.md",
  ".kit/build-manifest.json", ".kit/.smkit-version", ".kit/state",
  "kit.config.yaml", "kit.config.yaml.bak",
];
const srcRemove = SOURCE.filter((rel) => existsSync(pp(rel)));

// ---- your content — always kept -------------------------------------------
const PRESERVE = [".kit/constitution.md", ".kit/decisions.md", ".kit/tasks"].filter((rel) => existsSync(pp(rel)));

// ---- plan ------------------------------------------------------------------
console.log(`smkit uninstall — ${PROJECT_DIR}\n`);
const section = (title, items) => { console.log(`${title} (${items.length})`); for (const i of [...items].sort()) console.log(`   - ${i}`); console.log(""); };
section("REMOVE — generated agent config", genRemove.map((g) => g.rel));
section("REMOVE — kit source & runtime", srcRemove);
if (genKept.length) section("KEEP — generated files you edited (rerun with --force to remove)", genKept);
if (PRESERVE.length) section("KEEP — your content (never removed)", PRESERVE);

if (!genRemove.length && !srcRemove.length) { console.log("Nothing to remove — no kit install found here."); process.exit(0); }
if (DRY) { console.log("(dry-run — nothing was changed)"); process.exit(0); }

// ---- confirm ---------------------------------------------------------------
if (!YES) {
  if (!process.stdin.isTTY) { console.error("Refusing to delete without confirmation. Rerun with --yes (or --dry-run to preview)."); process.exit(1); }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise((res) => rl.question("Remove the above and uninstall the kit? (y/N) ", res));
  rl.close();
  if (!/^y(es)?$/i.test(String(ans).trim())) { console.log("Aborted — nothing was changed."); process.exit(0); }
}

// ---- remove ----------------------------------------------------------------
let n = 0;
const drop = (abs, label, recursive) => { try { rmSync(abs, { recursive, force: true }); n++; } catch (e) { console.error(`  ! could not remove ${label}: ${e.message}`); } };
for (const g of genRemove) drop(g.abs, g.rel, false);
for (const rel of srcRemove) drop(pp(rel), rel, true);

// prune kit-owned dirs left empty (bottom-up), never climbing to the project root
const pruneRoots = new Set(["tools", ".kit", ...genRemove.map((g) => dirname(g.rel))]);
for (const start of [...pruneRoots].map((d) => pp(d)).sort((a, b) => b.length - a.length)) {
  let d = start;
  while (d.startsWith(PROJECT_DIR) && d !== PROJECT_DIR) {
    try { if (existsSync(d) && statSync(d).isDirectory() && readdirSync(d).length === 0) { rmdirSync(d); d = dirname(d); } else break; }
    catch { break; }
  }
}

console.log(`\nRemoved ${n} item(s). The kit is uninstalled.`);
if (PRESERVE.length) console.log(`Kept your content: ${PRESERVE.join(", ")}  (delete .kit/ by hand if you don't want it).`);
console.log(`Reload your editor so it drops the kit's slash-commands.`);
process.exit(0);
