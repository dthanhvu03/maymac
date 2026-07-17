// Shared helpers for the kit hooks. Kept dependency-light so a hook never
// crashes (and thus silently disables itself) just because an import failed.
import { readFileSync, appendFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

// The project the hooks act on. Claude Code passes CLAUDE_PROJECT_DIR; fall back
// to the repo that contains this hook (…/.kit/hooks/_lib.mjs → repo root).
export const projectDir = process.env.CLAUDE_PROJECT_DIR
  || join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Parse kit.config.yaml, returning {} on any failure. The YAML parser is loaded
// via dynamic import so a missing/moved parser degrades gracefully (the caller
// falls back to its own safe defaults) instead of throwing at module load.
export async function loadConfig() {
  try {
    // Vendored copy so .kit/ is self-contained (no reach into tools/); kept in
    // sync with tools/kitgen/yaml.mjs by the generator + checked by `doctor`.
    const { parseYaml } = await import("./yaml.mjs");
    return parseYaml(readFileSync(join(projectDir, "kit.config.yaml"), "utf8")) || {};
  } catch {
    return {};
  }
}

// Always-enforced destructive-command blocklist (fail-closed baseline).
export const DEFAULT_BLOCK = [
  "rm -rf /", "rm -rf ~", "rm -rf *",
  "git push --force", "git push -f", "git reset --hard",
  "DROP TABLE", "DROP DATABASE", "TRUNCATE", "DELETE FROM",
  "docker compose down -v", "docker volume rm", "docker volume prune",
  "docker system prune --volumes",
];

// Matcher for one blocklist entry: whitespace-flexible, case-insensitive, and
// bounded so "--force" does not match "--force-with-lease".
export function makeMatcher(pattern) {
  const esc = pattern.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\w-])${esc}(?![\\w-])`, "i");
}

// Returns the matched pattern (truthy) or undefined.
export function matchesBlock(cmd, list) {
  return list.find((p) => makeMatcher(p).test(cmd));
}

// Full blocklist = built-in defaults + config block + allow_extra (deduped).
export async function loadBlocklist() {
  const g = (await loadConfig()).guardrails || {};
  return [...new Set([...DEFAULT_BLOCK, ...(g.block || []), ...(g.allow_extra || [])])];
}

// ---- Guard v2: segment split, path-boundary, classification ---------------
// NOTE: this is operator-level tokenization, NOT a full shell parser. It closes
// chaining/path-escape/audit gaps for honest mistakes; it is NOT isolation.

// Split a command into top-level segments on ; | & && || and newlines,
// respecting single/double quotes. Returns trimmed non-empty segments.
export function splitSegments(cmd) {
  const segs = [];
  let cur = "", quote = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) { cur += c; if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    if (c === ";" || c === "\n" || c === "|" || c === "&") {
      segs.push(cur); cur = "";
      if ((c === "|" || c === "&") && cmd[i + 1] === c) i++; // consume second of || &&
      continue;
    }
    cur += c;
  }
  segs.push(cur);
  return segs.map((s) => s.trim()).filter(Boolean);
}

function tokenize(seg) {
  const out = []; let cur = "", quote = null;
  for (const c of seg) {
    if (quote) { if (c === quote) quote = null; else cur += c; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (/\s/.test(c)) { if (cur) { out.push(cur); cur = ""; } continue; }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

const EMBEDDED = /\$\(|`|<<|\b(?:bash|sh|zsh|node|python|python3|ruby|perl)\s+-\w*(?:c|e)\b/;
const NET = /\b(?:curl|wget|fetch)\b/;
const EXEC_SINK = /\|\s*(?:sudo\s+)?(?:bash|sh|zsh|node|python|python3|ruby|perl)\b/;
const WRITE_VERB = /^(?:rm|rmdir|mv|dd|shred|truncate|chmod|chown|cp|ln)$/;
const DB_CLIENTS = /^(?:psql|mysql|mysqldump|sqlite3|mongo|mongosh|redis-cli|cockroach|clickhouse-client)$/;

const ZERO_ACCESS = [/(^|\/)\.ssh(\/|$)/, /(^|\/)\.aws(\/|$)/, /(^|\/)\.gnupg(\/|$)/,
  /(^|\/)\.env(\.|$|\/)/, /(^|\/)\.git(\/|$)/, /(^|\/)\.kit(\/|$)/, /(^|\/)id_rsa(\b|$)/];

function expandTilde(p, home) { return p.startsWith("~") ? home + p.slice(1) : p; }

export function pathTier(raw, projDir, home = homedir()) {
  const abs = resolve(projDir, expandTilde(raw, home)).replace(/\\/g, "/");
  const proj = resolve(projDir).replace(/\\/g, "/");
  if (ZERO_ACCESS.some((re) => re.test(abs))) return "zeroAccess";
  if (abs !== proj && !abs.startsWith(proj + "/")) return "outsideWorkspace";
  return "workspace";
}

function pathArgs(tokens) {
  return tokens.slice(1).filter((t) =>
    !t.startsWith("-") && (/[~/]/.test(t) || /^\.?(env|ssh|aws|gnupg|git)\b/i.test(t)));
}

// ---- Guard v3: workspace-internal destruction + Windows -------------------
// The v2 guard only blocked deletes OUTSIDE the workspace; deleting the whole
// project from inside (`rm -rf .`, `git clean -fdx`, `git checkout -- .`) sailed
// through. v3 classifies recursive-delete targets by where they point.

// Build/cache dirs that are safe to nuke — deleting them is normal cleanup, so
// blocking would just make the agent unable to do its job.
const BUILD_WHITELIST = new Set([
  "dist", "build", "out", "output", ".next", ".nuxt", ".svelte-kit", ".output",
  "node_modules", "coverage", ".cache", ".turbo", ".parcel-cache", ".vercel",
  "tmp", "temp", ".tmp",
]);
// Targets that mean "everything here" → deleting them wipes the project.
const WHOLE_TREE = new Set([".", "./", ".\\", "*", "./*", ".\\*", "", "/", "~", "~/"]);

// Classify ONE delete target: block (root/protected/outside), warn (a real subdir
// inside the workspace), or allow (a whitelisted build dir).
function classifyDeleteTarget(t, projDir) {
  const raw = t.replace(/^["']|["']$/g, "");
  if (WHOLE_TREE.has(raw)) return "block";
  const norm = raw.replace(/\\/g, "/").replace(/\/+$/, "");
  if (norm === "" || norm === ".") return "block";
  if (/(^|\/)\.git(\/|$)/.test(norm)) return "block";
  const tier = pathTier(raw, projDir);
  if (tier === "zeroAccess" || tier === "outsideWorkspace") return "block";
  const base = norm.split("/").pop();
  if (BUILD_WHITELIST.has(base)) return "allow";
  return "warn";
}

// Worst decision across a delete command's targets (block > warn > allow).
function worstTarget(targets, projDir, phrase) {
  let worst = "allow", culprit = "";
  for (const t of targets) {
    const c = classifyDeleteTarget(t, projDir);
    if (c === "block") return { decision: "block", reason: `${phrase} "${t}" (workspace root or protected path)` };
    if (c === "warn" && worst === "allow") { worst = "warn"; culprit = t; }
  }
  return worst === "warn" ? { decision: "warn", reason: `${phrase} "${culprit}" inside the workspace` } : null;
}

const hasFlag = (tokens, re) => tokens.some((t) => re.test(t));

// Supply-chain / obfuscation risks (F-06). Returns {decision, reason} where decision
// is warn | highrisk (highrisk → block in strict, warn otherwise). curl|sh is handled
// separately by the network→exec check.
export function classifySupplyChain(seg, tokens, verb) {
  const v = (verb || "").toLowerCase();
  const sub = (tokens[1] || "").toLowerCase();

  // Running an unpinned package straight from the registry.
  const isDlx = (v === "npx") || (v === "bunx") || ((v === "pnpm" || v === "yarn") && sub === "dlx");
  if (isDlx) {
    const start = (v === "pnpm" || v === "yarn") ? 2 : 1;
    const pkg = tokens.slice(start).find((t) => !t.startsWith("-"));
    if (pkg && !pkg.includes("@"))
      return { decision: "warn", reason: `runs an unpinned package (${v}${sub === "dlx" ? " dlx" : ""} "${pkg}") — pin a version or vet it first` };
  }

  // Installing a dependency from a remote URL or git source.
  if ((v === "npm" || v === "pnpm" || v === "yarn" || v === "bun") &&
      /\b(install|add|i)\b/.test(seg) && /(https?:\/\/|git\+|github:|git@)/.test(seg))
    return { decision: "warn", reason: "installs a dependency from a remote/git source — vet it before trusting" };

  // PowerShell encoded / base64 command — cannot be analysed.
  if ((/\b(?:powershell|pwsh)\b/i.test(seg) && /(?:^|\s)-e(?:nc(?:odedcommand)?)?\b/i.test(seg)) ||
      /FromBase64String/i.test(seg))
    return { decision: "highrisk", reason: "PowerShell encoded/base64 command — payload cannot be inspected" };

  return null;
}

// Detect a destructive command that operates INSIDE the workspace. Returns
// {decision, reason} or null. String-level (matches the guard's tokenize model),
// covering POSIX and Windows verbs even though the hook binds the Bash tool.
export function classifyDestructive(seg, tokens, verb, projDir = projectDir) {
  const v = (verb || "").toLowerCase();
  const rest = tokens.slice(1);

  if (v === "rm" && (hasFlag(tokens, /^-[a-z]*r/i) || tokens.includes("--recursive"))) {
    const targets = rest.filter((t) => !t.startsWith("-"));
    return worstTarget(targets.length ? targets : ["."], projDir, "recursively deletes");
  }

  if (v === "git") {
    const sub = tokens[1];
    if (sub === "clean" && hasFlag(tokens, /^-[a-z]*f/i) && hasFlag(tokens, /^-[a-z]*d/i))
      return { decision: "block", reason: "git clean removes untracked files and directories" };
    if (sub === "checkout" && tokens.includes("--")) {
      const targets = tokens.slice(tokens.indexOf("--") + 1);
      return worstTarget(targets.length ? targets : ["."], projDir, "git checkout discards local changes in");
    }
    if (sub === "restore") {
      const targets = rest.slice(1).filter((t) => !t.startsWith("-"));
      return worstTarget(targets.length ? targets : ["."], projDir, "git restore discards local changes in");
    }
  }

  if (v === "find" && (/(^|\s)-delete\b/.test(seg) || /-exec\s+rm\b/.test(seg)))
    return { decision: "block", reason: "find deletes matched files" };

  if (/\bprisma\b/.test(seg) && /\bmigrate\s+reset\b/.test(seg))
    return { decision: "block", reason: "prisma migrate reset drops and recreates the database" };
  if (/\bartisan\b/.test(seg) && /\bmigrate:(fresh|refresh)\b/.test(seg))
    return { decision: "block", reason: "artisan migrate:fresh/refresh drops all tables" };

  // Windows destructive verbs (defense-in-depth; the hook binds Bash but these may
  // still appear via pwsh/cmd wrappers).
  if (v === "remove-item" || v === "ri") {
    if (hasFlag(tokens, /^-recurse/i)) {
      const targets = rest.filter((t) => !t.startsWith("-"));
      return worstTarget(targets.length ? targets : ["."], projDir, "Remove-Item recursively deletes");
    }
  }
  if (v === "del" || v === "erase" || v === "rmdir" || v === "rd") {
    const targets = rest.filter((t) => !t.startsWith("-") && !/^\/[a-z]$/i.test(t));
    return worstTarget(targets.length ? targets : ["."], projDir, `${v} deletes`);
  }

  return null;
}

// Classify a full command → {decision: block|warn|allow, reason, segment}.
export function classifyCommand(cmd, { mode = "vibe", block = DEFAULT_BLOCK, projDir = projectDir } = {}) {
  const segs = splitSegments(cmd);

  // network → exec composition (curl … | sh)
  if (NET.test(cmd) && EXEC_SINK.test(cmd))
    return { decision: "block", reason: "pipes network download into a shell (curl|sh)", segment: cmd };

  let warn = null;
  for (const seg of segs) {
    const tokens = tokenize(seg);
    const verb = (tokens[0] || "").split("/").pop(); // strip path prefix e.g. /bin/rm

    // Guard v3: workspace-internal destruction (rm -rf ., git clean, Windows, …).
    const destr = classifyDestructive(seg, tokens, verb, projDir);
    if (destr?.decision === "block") return { ...destr, segment: seg };
    if (destr?.decision === "warn") warn = warn || { ...destr, segment: seg };

    // Supply-chain / obfuscation (unpinned npx, remote install, PS encoded).
    const sc = classifySupplyChain(seg, tokens, verb);
    if (sc?.decision === "highrisk") {
      if (mode === "strict") return { decision: "block", reason: sc.reason + " (strict)", segment: seg };
      warn = warn || { decision: "warn", reason: sc.reason + " — review before trusting", segment: seg };
    } else if (sc?.decision === "warn") {
      warn = warn || { decision: "warn", reason: sc.reason, segment: seg };
    }

    const isDbExec = DB_CLIENTS.test(verb) || /(^|\s)-[ce]\s+['"]/.test(seg) || /--(?:command|execute|eval)\b/.test(seg);

    for (const pat of block) {
      if (!makeMatcher(pat).test(seg)) continue;
      const sqlish = /^[A-Z]/.test(pat.trim()); // e.g. "DROP TABLE", "DELETE FROM"
      if (!sqlish) return { decision: "block", reason: `matches blocked pattern "${pat}"`, segment: seg };
      if (isDbExec) return { decision: "block", reason: `executes destructive SQL "${pat}"`, segment: seg };
      warn = warn || { decision: "warn", reason: `mentions SQL keyword "${pat}" (not clearly executed)`, segment: seg };
    }

    for (const p of pathArgs(tokens)) {
      const tier = pathTier(p, projDir);
      if (tier === "zeroAccess")
        return { decision: "block", reason: `touches protected path "${p}"`, segment: seg };
      if (tier === "outsideWorkspace" && (WRITE_VERB.test(verb) || seg.startsWith(">")))
        return { decision: "block", reason: `writes/deletes outside the workspace ("${p}")`, segment: seg };
    }

    if (EMBEDDED.test(seg)) {
      if (mode === "strict") return { decision: "block", reason: "contains embedded/obfuscated code (strict)", segment: seg };
      warn = warn || { decision: "warn", reason: "contains embedded code — review before trusting", segment: seg };
    }
  }
  return warn || { decision: "allow", reason: "", segment: "" };
}

// ---- Pre-build critique gate (trụ cột #2) ---------------------------------
// A PreToolUse(Write|Edit) gate: in standard/strict, block the first code write of a
// session until the change has been critiqued (a token is recorded). vibe only reminds.
// These paths are NEVER gated — kit internals (so writing the token / brief / Decision
// Log is never blocked), docs/notes, generated agent config, build output, config &
// lockfiles. Everything else is treated as "code/work" worth challenging first.
export const GATE_EXEMPT = [
  /(^|\/)\.kit(\/|$)/, /(^|\/)\.git(\/|$)/, /(^|\/)node_modules(\/|$)/,
  /(^|\/)(dist|build|out|coverage)(\/|$)/,
  // Generated agent-config dirs. Note: `.github` is intentionally NOT blanket-exempt —
  // the kit's Copilot output there is *.md (already exempt via the markdown rule below),
  // so leaving `.github` off the list keeps real CI files (.github/workflows/*.yml)
  // gated instead of silently skipping the critique.
  /(^|\/)\.(claude|cursor|windsurf|agents)(\/|$)/,
  /(^|\/)docs(\/|$)/,
  /\.(md|mdx|markdown|txt)$/i,
  /(^|\/)kit\.config\.ya?ml$/i,
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|composer\.lock)$/i,
  /(^|\/)(\.gitignore|LICENSE|README[^/]*)$/i,
];

// Is this write path exempt from the critique gate? Empty/unknown path → exempt
// (fail open: never block on a path we cannot read).
export function isGateExempt(relPath) {
  const p = String(relPath || "").replace(/\\/g, "/");
  if (!p) return true;
  return GATE_EXEMPT.some((re) => re.test(p));
}

// Decide the pre-build critique gate for one Write/Edit. Pure (no fs). The hook reads
// the mode + token state and passes them in.
//   { decision: "allow" | "deny", reason, exempt? }
export function critiqueGateDecision({ relPath, mode = "vibe", hasToken = false } = {}) {
  if (isGateExempt(relPath)) return { decision: "allow", reason: "", exempt: true };
  if (hasToken) return { decision: "allow", reason: "" };
  if (mode !== "standard" && mode !== "strict")
    return {
      decision: "allow",
      reason:
        "Pre-build reminder: have you challenged this change — correctness, security & data, " +
        "consistency, simplicity/necessity, reversibility? Run /challenge to make it a habit.",
    };
  return {
    decision: "deny",
    reason:
      `Pre-build critique required in ${mode} mode. Before writing code for a new task, challenge it ` +
      "through the lenses (correctness · security & data · consistency · simplicity/necessity · " +
      "reversibility) — run /challenge or the pre-build-critique skill — then record the verdict to " +
      ".kit/state/gate.json (a JSON object with a non-empty \"decision\"). This runs once per session; " +
      "edits flow after it. Docs, .kit, and config paths are never gated.",
  };
}

// Append one JSONL decision line to .kit/audit.log (best-effort; not tamper-evident).
export function auditLog(entry, projDir = projectDir) {
  try { appendFileSync(join(projDir, ".kit", "audit.log"), JSON.stringify(entry) + "\n"); }
  catch { /* best-effort */ }
}
