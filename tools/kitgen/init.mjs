#!/usr/bin/env node
// kit init — set up the kit for a project by ASKING plain-language questions
// (no coding/architecture knowledge needed), then writing config + memory + generating.
//
// Interactive:  node tools/kitgen/init.mjs
// Scripted:     node tools/kitgen/init.mjs --name "My App" --stack nextjs --mode vibe \
//                 --lang en --agents claude,cursor --purpose "..." --users "..." --never "..."
// Flags:        --dry-run (show, don't write)  --force (overwrite existing config)  --yes (accept defaults)
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { KNOWN_AGENTS } from "./validate.mjs"; // single source of truth for supported targets

// KIT_DIR = the kit's own files (profiles/, templates, kitgen). PROJECT_DIR = the
// project being set up, where config + memory are written and the build runs.
const KIT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const kp = (...s) => join(KIT_DIR, ...s);
const pp = (...s) => join(PROJECT_DIR, ...s);

// Last-resort guard for this top-level-await module: any error (sync throw or a
// rejected top-level await) exits cleanly with a one-line message, never a stack trace.
for (const ev of ["uncaughtException", "unhandledRejection"]) {
  process.on(ev, (e) => { console.error(`smkit init: ${e?.message || e}`); process.exit(1); });
}

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(`--${name}`); return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined; };
const has = (name) => args.includes(`--${name}`);
const DRY = has("dry-run"), FORCE = has("force"), YES = has("yes");

// Degrade to the built-in "generic" if profiles/ is missing or unreadable.
let profiles;
try {
  profiles = existsSync(kp("profiles"))
    ? readdirSync(kp("profiles")).filter((d) => existsSync(kp("profiles", d, "profile.yaml")))
    : ["generic"];
} catch { profiles = ["generic"]; }
if (!profiles.length) profiles = ["generic"];

// ---- detection (zero-question default) ------------------------------------
// A plain `smkit init` asks nothing: it reads the project to infer the stack(s)
// and which AI tools are in use, writes sensible defaults, and leaves the
// constitution as a placeholder for `/onboard` to fill (the AI reads the code and
// confirms with the user). Flags still override; `--interview` re-enables the Q&A.
const pkgHasNext = (p) => { try { const j = JSON.parse(readFileSync(p, "utf8")); return !!{ ...j.dependencies, ...j.devDependencies }.next; } catch { return false; } };
function detectStacksAt(base, root) {
  const out = [];
  if (existsSync(join(base, "go.mod"))) out.push({ id: "go", root });
  const pkg = join(base, "package.json");
  if (existsSync(pkg) && pkgHasNext(pkg)) out.push({ id: "nextjs", root });
  if (["pyproject.toml", "requirements.txt", "setup.py"].some((f) => existsSync(join(base, f)))) out.push({ id: "python", root });
  return out;
}
function detectStacks() {
  const found = [...detectStacksAt(PROJECT_DIR, "")];
  for (const container of ["apps", "packages", "services"]) {
    try {
      if (existsSync(pp(container))) {
        for (const sub of readdirSync(pp(container))) found.push(...detectStacksAt(pp(container, sub), `${container}/${sub}`));
      }
    } catch { /* unreadable dir → skip */ }
  }
  const seen = new Set(), list = [];
  for (const s of found) { if (!profiles.includes(s.id)) continue; const k = `${s.id}@${s.root}`; if (!seen.has(k)) { seen.add(k); list.push(s); } }
  return list;
}
function detectAgents() {
  // Safe baseline, never omitted: Claude Code (the primary target) + the universal
  // AGENTS.md standard (read by Codex / Gemini CLI / …). Detection only ADDS the
  // other editors it finds — so a project that only shows a `.cursor/` marker still
  // gets Claude Code config instead of silently missing the main tool.
  const a = new Set(["claude", "agentsmd"]);
  if (existsSync(pp(".cursor"))) a.add("cursor");
  if (existsSync(pp(".github", "copilot-instructions.md")) || existsSync(pp(".github", "instructions"))) a.add("copilot");
  if (existsSync(pp(".windsurf"))) a.add("windsurf");
  return [...a];
}
function detectName() {
  try { const n = JSON.parse(readFileSync(pp("package.json"), "utf8")).name; if (n) return String(n); } catch { /* no package.json */ }
  return PROJECT_DIR.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "My App";
}

// ---- prompting ------------------------------------------------------------
// Interview is OFF by default — `smkit init` infers everything from the project and
// stays silent; `/onboard` confirms + fills the constitution later. `--interview`
// re-enables the guided Q&A. Also non-interactive under --yes/--dry-run or no TTY.
const INTERVIEW = has("interview");
const nonInteractive = !INTERVIEW || YES || DRY || !process.stdin.isTTY;
let rl;
async function ask(question, def, choices) {
  const preset = { name: flag("name"), lang: flag("lang"), stack: flag("stack"), mode: flag("mode"),
    agents: flag("agents"), purpose: flag("purpose"), users: flag("users"), never: flag("never") }[question.key];
  if (preset !== undefined) return preset;
  if (nonInteractive) return def;
  if (!rl) rl = createInterface({ input: process.stdin, output: process.stdout });
  const hint = choices ? ` (${choices.join("/")})` : def ? ` [${def}]` : "";
  const a = (await rl.question(`${question.q}${hint}: `)).trim();
  return a || def;
}

// Interview prompts per language. The language question is asked FIRST (bilingual),
// then every following question speaks the chosen language.
const PROMPTS = {
  en: {
    name: "What is your project called?",
    purpose: "In one sentence, what does it do?",
    users: "Who will use it?",
    never: "One thing it must NEVER do?",
    stack: "Which stack(s)? (comma-separated for full-stack, e.g. go,nextjs)",
    mode: "How strict?",
    agents: "Which AI tools? (comma-separated; agentsmd = the open AGENTS.md standard, read by Codex / Gemini CLI)",
    root: "Folder for this stack (blank = repo root)",
  },
  vi: {
    name: "Dự án của bạn tên gì?",
    purpose: "Một câu: nó làm gì?",
    users: "Ai sẽ dùng nó?",
    never: "Một điều nó TUYỆT ĐỐI KHÔNG được làm?",
    stack: "Dùng stack nào? (nhiều thì ngăn bằng dấu phẩy, ví dụ go,nextjs)",
    mode: "Mức độ chặt chẽ?",
    agents: "Dùng AI tool nào? (ngăn bằng dấu phẩy; agentsmd = chuẩn mở AGENTS.md, đọc bởi Codex / Gemini CLI)",
    root: "Thư mục cho stack này (trống = gốc repo)",
  },
};

// ---- gather answers (precedence: flag > detected > default) ---------------
// Read the project so a zero-question init still writes an accurate config.
const detStacks0 = detectStacks();
const defaultStack = profiles.includes("generic") ? "generic" : (profiles[0] || "generic");
const detStacks = detStacks0.length ? detStacks0 : [{ id: defaultStack, root: "" }];
const detStackStr = [...new Set(detStacks.map((s) => s.id))].join(",");
const detAgents = detectAgents();

const answers = {};
// Language first (asked only in --interview mode; else defaults to en, /onboard can switch).
answers.lang = await ask({ key: "lang", q: "Language for instructions? / Ngôn ngữ hướng dẫn?" }, "en", ["en", "vi"]);
if (!["en", "vi"].includes(answers.lang)) { console.log(`  note: unsupported language "${answers.lang}" — using en`); answers.lang = "en"; }
const P = PROMPTS[answers.lang] || PROMPTS.en;
answers.name = await ask({ key: "name", q: P.name }, detectName());
answers.purpose = await ask({ key: "purpose", q: P.purpose }, "");
answers.users = await ask({ key: "users", q: P.users }, "");
answers.never = await ask({ key: "never", q: P.never }, "");
const stackRaw = await ask({ key: "stack", q: P.stack }, detStackStr, profiles);

// Parse + validate the stack answer: comma-separated list, keep only known profiles,
// dedupe, fall back to the default — so a typo can't write an invalid config.
let stacks = String(stackRaw).split(",").map((s) => s.trim()).filter(Boolean);
const unknownStacks = stacks.filter((s) => !profiles.includes(s));
if (unknownStacks.length) console.log(`  note: ignoring unknown stack(s): ${unknownStacks.join(", ")}  (valid: ${profiles.join(" / ")})`);
stacks = [...new Set(stacks.filter((s) => profiles.includes(s)))];
if (!stacks.length) stacks = [defaultStack];

// Per-stack root folder (monorepo): seed from detection, override with --roots, or ask
// each in --interview mode. Only accept a safe relative path segment.
const SAFE_ROOT = /^\w[\w./-]*$/;
const normRoot = (v) => {
  const s = String(v).trim().replace(/^\.\/+/, "").replace(/\/+$/, "");
  return SAFE_ROOT.test(s) ? s : "";
};
const roots = {};
for (const s of detStacks) if (s.root && stacks.includes(s.id)) roots[s.id] = s.root;   // detected roots
const rootsFlag = flag("roots");
if (rootsFlag) {
  for (const k of Object.keys(roots)) delete roots[k];   // an explicit --roots is authoritative
  for (const pair of String(rootsFlag).split(",")) {
    const [k, v] = pair.split("=").map((x) => (x || "").trim());
    if (!k || !v || !stacks.includes(k)) continue;
    const nr = normRoot(v);
    if (nr) roots[k] = nr; else console.log(`  note: ignoring invalid folder for "${k}": ${v}`);
  }
} else if (INTERVIEW && stacks.length > 1) {
  for (const s of stacks) {
    const r = normRoot(await ask({ key: `__root_${s}`, q: `${P.root} — ${s}` }, roots[s] || ""));
    if (r) roots[s] = r; else delete roots[s];
  }
}

answers.mode = await ask({ key: "mode", q: P.mode }, "vibe", ["vibe", "standard", "strict"]);
answers.agents = await ask({ key: "agents", q: P.agents }, detAgents.join(","), KNOWN_AGENTS);
if (rl) rl.close();

answers.stack = stacks;                       // internally always an array
const stackLabel = stacks.join(", ");
// One profile → a plain string (unchanged config shape); several → a YAML list.
const stackProfileYaml = stacks.length === 1
  ? `profile: ${stacks[0]}`
  : `profile:\n${stacks.map((s) => `    - ${s}`).join("\n")}`;
// Optional per-stack roots block, appended under `stack:`.
const rootsYaml = Object.keys(roots).length
  ? `\n  roots:\n${Object.entries(roots).map(([k, v]) => `    ${k}: ${v}`).join("\n")}`
  : "";

const agentsList = answers.agents.split(",").map((s) => s.trim()).filter(Boolean);

// ---- build files ----------------------------------------------------------
const configYaml = `# Universal Agent Kit — project config (written by \`kit init\`)
version: 2

project:
  name: ${JSON.stringify(String(answers.name))}
  language: ${answers.lang}

mode: ${answers.mode}

stack:
  ${stackProfileYaml}${rootsYaml}
  test: ""
  lint: ""
  build: ""

agents:
${agentsList.map((a) => `  - ${a}`).join("\n")}

outDir: .

approvers:
  schema_change: []
  prod_deploy: []
  data_delete: []

invariants: []

guardrails:
  block:
    - "rm -rf /"
    - "rm -rf ~"
    - "git push --force"
    - "git push -f"
    - "git reset --hard"
    - "DROP TABLE"
    - "DROP DATABASE"
    - "TRUNCATE"
    - "DELETE FROM"
    - "docker compose down -v"
    - "docker volume rm"
    - "docker volume prune"
    - "docker system prune --volumes"
  allow_extra: []
`;

const constitution = `# Project Constitution

> The immovable principles of this project. Agents must obey this every session.

## What we are building
${answers.purpose || "<describe in one plain-language paragraph>"}

## Who uses it
${answers.users || "<the users and what they need>"}

## Must never happen
${answers.never || "<e.g. no destructive database operations in production>"}

## Non-negotiable choices
- Stack: ${stackLabel}
- Mode: ${answers.mode}
`;

// Seed the Decision Log from the template if present; a missing template must not
// abort setup — fall back to a minimal header.
const decisionsSeed = existsSync(kp(".kit", "decisions.template.md"))
  ? readFileSync(kp(".kit", "decisions.template.md"), "utf8")
  : "# Decision Log\n\n> Record non-trivial technical decisions here so future sessions stay consistent.\n";

// ---- write / dry-run ------------------------------------------------------
console.log(`\nkit init — ${answers.name}  (stack=${stackLabel}, mode=${answers.mode}, lang=${answers.lang}, agents=${agentsList.join("+")})\n`);
const log = (action, rel) => console.log(`  ${action.padEnd(28)} ${rel}`);

// Self-contained install (decision A): copy the kit's own source into the project
// so it runs without depending on node_modules. Idempotent — never clobber existing.
if (!DRY && PROJECT_DIR !== KIT_DIR) {
  for (const d of ["engine", "profiles", "tools", ".kit"]) {
    if (!existsSync(pp(d))) cpSync(kp(d), pp(d), { recursive: true });
  }
  log("copied", "engine/ profiles/ tools/ .kit/ (self-contained)");
}

// Ensure the project dir and .kit/ exist before writing (init may target a fresh folder).
if (!DRY) mkdirSync(pp(".kit"), { recursive: true });

// kit.config.yaml is authoritative — it always reflects the interview answers.
// If a different one exists, back it up so nothing is lost.
const cfgPath = pp("kit.config.yaml");
if (DRY) {
  log("would write", "kit.config.yaml");
} else {
  if (existsSync(cfgPath) && !FORCE) {
    const cur = readFileSync(cfgPath, "utf8");
    if (cur !== configYaml) { writeFileSync(cfgPath + ".bak", cur); log("backed up previous →", "kit.config.yaml.bak"); }
  }
  writeFileSync(cfgPath, configYaml);
  log("write", "kit.config.yaml");
}

// A .gitignore that keeps secrets, deps, build output, and kit runtime state out of git
// (the generated agent config at the project root IS meant to be committed). Never
// clobber an existing one.
const gitignore = `# Secrets & local env — never commit (rotate if leaked)
.env
.env.*
!.env.example

# Dependencies & build output
node_modules/
vendor/
dist/
build/
coverage/

# Logs & DB dumps — NOT migrations. Migration files (goose / golang-migrate / prisma)
# are SOURCE and must be committed, so never ignore *.sql broadly — only real dumps.
*.log
*.dump
*.sql.gz
/dumps/
storage/logs/*

# Kit runtime state (regenerated — not shared)
.kit/audit.log
.kit/build-manifest.json
.kit/state/
.smkit-backup/
`;

// Memory files + .gitignore are the user's own content — never clobber if they exist.
let constitutionWritten = false;
for (const [rel, content] of [[".kit/constitution.md", constitution], [".kit/decisions.md", decisionsSeed], [".gitignore", gitignore]]) {
  const ex = existsSync(pp(rel));
  if (DRY) { log(ex ? "keep existing" : "would write", rel); continue; }
  if (ex) { log("keep existing", rel); } else { writeFileSync(pp(rel), content); log("write", rel); if (rel === ".kit/constitution.md") constitutionWritten = true; }
}

// Stamp the installed kit version so `smkit update` knows the baseline to upgrade from.
if (!DRY) { try { const v = JSON.parse(readFileSync(kp("package.json"), "utf8")).version; if (v) writeFileSync(pp(".kit", ".smkit-version"), v + "\n"); } catch { /* stamp is best-effort */ } }

if (DRY) { console.log("\n[dry-run] nothing written. Re-run without --dry-run to apply."); process.exit(0); }

console.log("\nGenerating agent config…");
// Run the build in the PROJECT_DIR so kitgen reads this project's config and writes here.
const r = spawnSync(process.execPath, [kp("tools", "kitgen", "kitgen.mjs"), "build"], {
  stdio: "inherit",
  cwd: PROJECT_DIR,
  env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_DIR },
});
if (r.error) { console.error(`\nBuild failed to start: ${r.error.message}`); process.exit(1); }
if (r.status !== 0) { console.error(`\nBuild failed (${r.status === null ? "signal " + r.signal : "exit " + r.status}).`); process.exit(r.status || 1); }
const needsOnboard = constitutionWritten && (!answers.purpose || !answers.users || !answers.never);
const nextStep = needsOnboard
  ? (answers.lang === "vi"
      ? `Bước tiếp: mở AI tool rồi chạy /onboard — em sẽ đọc dự án "${answers.name}", điền constitution (làm gì · cho ai · điều cấm) để anh xác nhận.`
      : `Next: open your AI tool and run /onboard — it reads "${answers.name}" and fills the constitution (what you build · who uses it · what it must never do) for you to confirm.`)
  : `Open your AI tool and start building "${answers.name}".`;
// This is a SELF-CONTAINED install — there is no global `smkit` on PATH here. Show the
// exact way to run kit commands in this project so the user doesn't hit "smkit: not found".
const howToRun = answers.lang === "vi"
  ? "Lệnh kit ở đây chạy bằng: `node tools/kitgen/kitgen.mjs <doctor|build|check>`  (hoặc `npm i -g @zusem/smkit` để có lệnh tắt `smkit`)."
  : "Run kit commands here with: `node tools/kitgen/kitgen.mjs <doctor|build|check>`  (or `npm i -g @zusem/smkit` for the short `smkit` command).";
console.log(`\nDone. ${nextStep}\n${howToRun}`);
process.exit(0);
