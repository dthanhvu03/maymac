// engine/emitter.mjs
// The kit's ONE transformer layer: reads engine/ + profiles/ sources and turns
// kit.config.yaml into per-IDE config, organized as a class per target behind a
// registry. Pure — every emitter returns [path, content] pairs; writing to disk,
// drift-checking and orchestration live in tools/kitgen (the orchestrator).
//
// Single source of truth: kitgen delegates all file generation here. Add an IDE by
// writing an Emitter subclass and registering it in EMITTERS.
//
// Zero new deps: reuses the kit's own YAML parser.
import { parseYaml, parseFrontmatter } from "../tools/kitgen/yaml.mjs";
import { readFileSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { join, dirname, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// KIT_DIR = where the kit's sources live (engine/, profiles/). Default = repo root
// relative to this file; overridable so a copied/installed kit resolves correctly.
export const DEFAULT_KIT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

const readAt = (kitDir, rel) => readFileSync(join(kitDir, rel), "utf8");
const listMdAt = (kitDir, rel) =>
  existsSync(join(kitDir, rel)) ? readdirSync(join(kitDir, rel)).filter((f) => f.endsWith(".md")).sort() : [];

// ---- source collectors (exported so `doctor` can reuse them) --------------
export function loadStrings(kitDir, lang) {
  const f = join(kitDir, "engine", "i18n", lang, "strings.yaml");
  const fb = join(kitDir, "engine", "i18n", "en", "strings.yaml");
  return parseYaml(readFileSync(existsSync(f) ? f : fb, "utf8"));
}

// Doctor/build diagnostic message catalog. Defaults to "vi" (the kit's original
// default audience) when not given — every governance validator below accepts an
// OPTIONAL trailing `lang` parameter for exactly this reason: existing callers that
// don't pass one keep getting byte-identical Vietnamese text; kitgen.mjs (the actual
// CLI) is the one place that computes `lang` from `cfg.project.language` and passes
// it through explicitly.
const DOCTOR_STRINGS_CACHE = new Map();
export function loadDoctorStrings(kitDir, lang = "vi") {
  const key = `${kitDir}::${lang}`;
  if (DOCTOR_STRINGS_CACHE.has(key)) return DOCTOR_STRINGS_CACHE.get(key);
  const f = join(kitDir, "engine", "i18n", lang, "doctor.yaml");
  const fb = join(kitDir, "engine", "i18n", "vi", "doctor.yaml");
  // Degrade gracefully: a missing/corrupt catalog must never crash doctor or build.
  // fmt() then renders each message as "[CODE]" (greppable, non-fatal) instead of
  // throwing ENOENT/YamlError up through validateConfig into an unguarded caller.
  let strings;
  try { strings = parseYaml(readFileSync(existsSync(f) ? f : fb, "utf8")) || {}; }
  catch { strings = {}; }
  DOCTOR_STRINGS_CACHE.set(key, strings);
  return strings;
}

// Render one CODE with named {placeholder} substitution. Named `fmt`, not the more
// conventional `t`, because several loops below already use `t` as a loop variable
// (e.g. "for (const t of ...preApprovedTools)") — a same-named import would be
// silently shadowed inside those scopes. Never throws and never goes silent: an
// unknown code still surfaces as "[CODE]" rather than vanishing, so a missing catalog
// entry is visible/greppable instead of a blank message.
export function fmt(strings, code, params = {}) {
  // Null-safe: a missing/absent catalog (strings == null) still degrades to "[CODE]"
  // rather than throwing — callers that pass the default `strings=null` (e.g.
  // listFilesRec's 2-arg form) must never crash the build on an escaping entry.
  const template = strings && strings[code];
  if (!template) return `[${code}]`;
  // `k in params` (property EXISTENCE), not `params[k] !== undefined` (value check):
  // a param explicitly passed as `undefined` must still render as the string
  // "undefined" — matching what the original template-literal interpolation did
  // (`` `stack.profile "${profile}"` `` with profile===undefined produced the literal
  // text "undefined", not a dropped/blank value). Only a param never passed at all
  // (key absent) falls back to the literal "{key}" placeholder.
  return String(template).replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

// Profile rules may override an engine rule with the same id by declaring
// `override: true` (mirrors the invariant override mechanism) — replaces the engine
// rule in place rather than leaving both, so it does not also trip the id-conflict
// check in validateRuleGovernance. A same-id profile rule WITHOUT `override: true` is
// left as a genuine duplicate for that check to catch (no silent shadowing).
// A project may declare one stack profile (a string) or several (a list) — e.g. a Go
// backend + a Next.js frontend. Each profile's conventions are path-scoped to its own
// files (Go → **/*.go, Next → **/*.tsx), so multiple profiles compose without collision.
// Always returns a non-empty list; falls back to ["generic"].
export function profileList(cfg) {
  const p = cfg?.stack?.profile;
  // Trim, drop empties, and DEDUPE (order-preserving) — a repeated profile would
  // otherwise emit a duplicate convention rule and crash on an invariant-id conflict.
  const list = [...new Set((Array.isArray(p) ? p : [p]).map((x) => (x == null ? "" : String(x).trim())).filter(Boolean))];
  return list.length ? list : ["generic"];
}

// Optional per-stack root directory (monorepo): a profile's conventions can be scoped
// to its own subtree, so a Go service and a Next.js app never cross-apply. Reads
// cfg.stack.roots[id]; returns "" when none. Normalizes "./x/" → "x".
export function profileRoot(cfg, id) {
  const roots = cfg?.stack?.roots;
  const r = roots && typeof roots === "object" && !Array.isArray(roots) ? roots[id] : undefined;
  return r ? String(r).replace(/^\.?\/+/, "").replace(/\/+$/, "") : "";
}

// Prefix a path glob with a root dir (glob-safe): "**/*.go" under "apps/api" → "apps/api/**/*.go".
function scopeGlob(root, p) {
  return root ? `${root}/${String(p).replace(/^\.\//, "")}` : p;
}

export function collectRules(kitDir, cfg) {
  const rules = [];
  for (const f of listMdAt(kitDir, "engine/rules")) {
    const { fm, body } = parseFrontmatter(readAt(kitDir, join("engine/rules", f)));
    rules.push({ ...fm, body: body.trim() });
  }
  // Each declared profile contributes its (path-scoped) convention rules.
  for (const pid of profileList(cfg)) {
    const profDir = join("profiles", pid);
    const profFile = join(kitDir, profDir, "profile.yaml");
    if (!existsSync(profFile)) continue;
    const prof = parseYaml(readFileSync(profFile, "utf8"));
    const root = profileRoot(cfg, pid);
    for (const r of prof.rules || []) {
      const { fm, body } = parseFrontmatter(readAt(kitDir, join(profDir, r)));
      const rule = { ...fm, body: body.trim() };
      // Scope this profile's conventions to its subtree when a root is configured.
      if (root) {
        if (Array.isArray(rule.paths)) rule.paths = rule.paths.map((p) => scopeGlob(root, p));
        if (rule.activation && Array.isArray(rule.activation.paths))
          rule.activation.paths = rule.activation.paths.map((p) => scopeGlob(root, p));
      }
      const existingIdx = rule.id ? rules.findIndex((x) => x.id === rule.id) : -1;
      if (existingIdx !== -1 && rule.override === true) rules.splice(existingIdx, 1, rule);
      else rules.push(rule);
    }
  }
  return rules;
}

// ---- Rule contract: activation + enforcement.type --------------------------
// Canonical (kit-owned) fields — activation{mode,paths} and enforcement{type,severity} —
// are a superset of the kit's original scope/paths/enforce frontmatter, which stays fully
// supported and is auto-derived into the new shape when the new fields are absent.
// `id.` maps rule.id -> the hook filename actually enforcing it (enforce:hook only).
export const RULE_HOOK_MAP = { "consistency-guard": "consistency-guard.mjs", "critique-gate": "critique-gate.mjs" };
export const RULE_OUTPUT_SECTION = /output format|required output|final output/i;
export const RULE_ACTIVATION_MODES = ["always", "path", "glob", "model-decision", "manual"];
export const RULE_ENFORCEMENT_TYPES = ["guidance", "static-check", "hook", "ci", "permission", "sandbox", "unsupported"];

// Legacy `enforce:` token(s) -> the strongest canonical enforcement.type they imply.
// "agent-read" is implicit for every rule (its Markdown is always shown to the agent),
// so it only matters when nothing stronger is present.
function legacyEnforceToType(enforce) {
  const toks = String(enforce || "").split("+").map((t) => t.trim());
  if (toks.includes("hook")) return "hook";
  if (toks.includes("gate") || toks.includes("generator")) return "static-check";
  if (toks.includes("agent-read")) return "guidance";
  return undefined;
}

// Compute the effective, normalized activation/enforcement view of a rule, merging the
// legacy scope/paths/enforce fields with the canonical nested ones (nested wins).
export function ruleEffective(rule) {
  rule = rule || {};
  const activation = rule.activation || {
    mode: rule.scope === "paths" ? "path" : "always",
    paths: rule.paths,
  };
  const enforcement = rule.enforcement || { type: legacyEnforceToType(rule.enforce) };
  return { activation, enforcement: { type: enforcement.type, severity: enforcement.severity } };
}

function gateSkillExists(kitDir) {
  try { return collectSkills(kitDir).some((s) => RULE_OUTPUT_SECTION.test(s.body)); }
  catch { return false; }
}

// Governance rules a Rule must not violate — checked BEFORE generation. A rule can never
// claim an enforcement type the kit cannot back (hook with no hook file, static-check
// with no gate skill), and no two rules across engine+profile may share an id (there is
// no project-layer override for rules the way invariants have one, so any collision is
// always a conflict). Pure/read-only.
export function validateRuleGovernance(kitDir, cfg, lang = "vi") {
  const strings = loadDoctorStrings(kitDir, lang);
  const errors = [];
  const warnings = [];
  const err = (code, params) => errors.push(`[${code}] ${fmt(strings, code, params)}`);
  const wrn = (code, params) => warnings.push(`[${code}] ${fmt(strings, code, params)}`);
  const seen = new Set();

  for (const r of collectRules(kitDir, cfg || {})) {
    if (!r.id) { err("RULE_ID_MISSING", { title: r.title || "?" }); continue; }
    if (seen.has(r.id)) err("RULE_ID_CONFLICT", { id: r.id });
    seen.add(r.id);
    checkSchemaVersion("RULE", r.schemaVersion, `rule "${r.id}"`, err, wrn);

    const { activation, enforcement } = ruleEffective(r);
    if (!RULE_ACTIVATION_MODES.includes(activation.mode))
      err("RULE_ACTIVATION_MODE_INVALID", { id: r.id, mode: activation.mode, modes: RULE_ACTIVATION_MODES.join(" | ") });
    if (!enforcement.type || !RULE_ENFORCEMENT_TYPES.includes(enforcement.type))
      err("RULE_ENFORCEMENT_TYPE_INVALID", { id: r.id, type: enforcement.type, types: RULE_ENFORCEMENT_TYPES.join(" | ") });
    else if (enforcement.type === "hook") {
      const mapped = RULE_HOOK_MAP[r.id];
      if (!mapped) err("RULE_HOOK_UNMAPPED", { id: r.id });
      else if (!existsSync(join(kitDir, ".kit/hooks", mapped)))
        err("RULE_HOOK_MISSING", { id: r.id, hookFile: mapped });
    } else if (enforcement.type === "static-check" && !gateSkillExists(kitDir)) {
      err("RULE_STATIC_CHECK_NO_BACKING", { id: r.id });
    }
  }
  return { errors, warnings };
}

export function collectRoles(kitDir) {
  return listMdAt(kitDir, "engine/roles").map((f) => {
    const { fm, body } = parseFrontmatter(readAt(kitDir, join("engine/roles", f)));
    return { fm, body: body.trim() };
  });
}

// ---- Role contract: capability/permission boundary --------------------------
// Canonical (kit-owned) authoring shape is nested — permissions{allowTools,denyTools,
// mode}, runtime{model,effort,maxTurns,isolation,background}, skills{preload},
// memory{scope}, output{requiredSections} — translated by the Claude emitter into
// Claude's real, VERIFIED subagent frontmatter fields (code.claude.com/docs/en/
// sub-agents, 2026-07-11): tools, disallowedTools, model, permissionMode, maxTurns,
// skills, isolation, background, effort, memory. The legacy flat `tools:`/`model:`
// fields (the kit's original format) remain fully supported — this is additive, not a
// breaking migration, since there is no external spec to converge to for Roles (unlike
// Skills). Fields with no verified vendor equivalent are NOT invented or emitted.
export const ROLE_PERMISSION_MODES = ["default", "acceptEdits", "auto", "dontAsk", "bypassPermissions", "plan", "manual"];
export const ROLE_ISOLATION_MODES = ["none", "worktree"];
export const ROLE_EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"];
export const ROLE_MEMORY_SCOPES = ["none", "user", "project", "local"];

function toToolList(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return v.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

// Compute the effective, normalized capability/permission view of a role's frontmatter,
// merging the legacy flat fields with the canonical nested ones (nested wins if both
// are set for the same concept — e.g. runtime.model over legacy model).
export function roleEffective(fm) {
  fm = fm || {};
  const allowTools = fm.permissions?.allowTools ? toToolList(fm.permissions.allowTools) : toToolList(fm.tools);
  return {
    allowTools,
    denyTools: toToolList(fm.permissions?.denyTools),
    permissionMode: fm.permissions?.mode,
    model: fm.runtime?.model || fm.model,
    effort: fm.runtime?.effort,
    maxTurns: fm.runtime?.maxTurns,
    isolation: fm.runtime?.isolation,
    background: fm.runtime?.background,
    skillsPreload: Array.isArray(fm.skills?.preload) ? fm.skills.preload : [],
    memoryScope: fm.memory?.scope,
    outputRequiredSections: Array.isArray(fm.output?.requiredSections) ? fm.output.requiredSections : [],
  };
}

export function collectCommands(kitDir) {
  return listMdAt(kitDir, "engine/commands").map((f) => {
    const { fm, body } = parseFrontmatter(readAt(kitDir, join("engine/commands", f)));
    return { ...fm, body: body.trim() };
  });
}

const SKILLS_DIR = "engine/skills";
const SUPPORT_SUBDIRS = ["scripts", "references", "assets"]; // NOT tests/ (never emitted)

// A path pattern that matches everything makes the whole set a no-op — migrating it
// into the Claude-only overlay would add noise with zero behavioral difference.
const TRIVIAL_PATH_PATTERNS = new Set(["**/*", "**", "*"]);
const isTrivialPathSet = (paths) => Array.isArray(paths) && paths.some((p) => TRIVIAL_PATH_PATTERNS.has(p));

// Recursively list files under `base`, refusing to follow any entry whose REAL
// (resolved) path escapes `root` — this is a symlink/junction/hardlink escape guard,
// not just a `isSymbolicLink()` check: on this platform a directory symlink reports
// `isDirectory()===true` AND `isSymbolicLink()===false` via fs.Dirent, so type-flag
// checks alone do not catch it (reproduced and confirmed). A skill's scripts/
// references/assets are meant to be fully self-contained; an entry resolving outside
// the skill's own folder is excluded and reported via `warn`, never silently included
// (arbitrary filesystem content would otherwise be copied verbatim into generated,
// committed output — a real, reproduced leak).
function listFilesRec(base, root, prefix = "", warn = () => {}, strings = null) {
  const out = [];
  const rootReal = realpathSync(root);
  for (const e of readdirSync(base, { withFileTypes: true })) {
    const abs = join(base, e.name);
    let real;
    try { real = realpathSync(abs); }
    catch { continue; } // broken link / unreadable — exclude, nothing to leak
    const rel = relative(rootReal, real);
    const escapes = rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel);
    if (escapes) {
      const name = `${prefix}${e.name}`;
      warn({ target: "skill", field: "supporting-file", source: abs, code: "SKILL_SUPPORTING_FILE_ESCAPES_ROOT",
        message: fmt(strings, "SKILL_SUPPORTING_FILE_ESCAPES_ROOT", { name, real }),
        remediation: fmt(strings, "SKILL_SUPPORTING_FILE_ESCAPES_ROOT_REMEDIATION") });
      continue;
    }
    if (e.isDirectory()) out.push(...listFilesRec(abs, root, `${prefix}${e.name}/`, warn, strings));
    else out.push(prefix + e.name);
  }
  return out;
}

// Load one skill as the normalized two-layer model: a portable SKILL.md (Agent Skills
// open standard — metadata is string→string only) plus an optional kit governance
// sidecar (skill.kit.yaml). Old single-file skills (id/paths/related_*) are migrated
// in-memory for one release, each divergence recorded as a warning (never silent).
function normalizeSkill(kitDir, d, warn, lang = "vi") {
  const strings = loadDoctorStrings(kitDir, lang);
  const { fm, body } = parseFrontmatter(readAt(kitDir, join(SKILLS_DIR, d, "SKILL.md")));
  const src = `${SKILLS_DIR}/${d}/SKILL.md`;

  // name MUST equal the directory (Agent Skills identity + command name).
  if (fm.name && fm.name !== d)
    warn({ target: "skill", field: "name", source: src, code: "SKILL_NAME_MISMATCH",
      message: fmt(strings, "SKILL_NAME_MISMATCH", { name: fm.name, dir: d }),
      remediation: fmt(strings, "SKILL_NAME_MISMATCH_REMEDIATION") });

  // `paths` is NOT part of the Agent Skills open standard (activation there is
  // description-based). Claude Code DOES support `paths` as a verified vendor extension
  // that gates automatic activation to matching files (code.claude.com/docs/en/skills,
  // 2026-07-11: "same format as path-specific rules"). A trivial "matches everything"
  // pattern is a no-op and is dropped as such; a real restriction is migrated into the
  // Claude-only activation overlay so behavior on Claude is preserved, never silently lost.
  let claudePaths;
  if (fm.paths) {
    if (isTrivialPathSet(fm.paths)) {
      warn({ target: "skill", field: "paths", source: src, code: "SKILL_PATHS_TRIVIAL_DROPPED",
        message: fmt(strings, "SKILL_PATHS_TRIVIAL_DROPPED"),
        remediation: fmt(strings, "SKILL_PATHS_TRIVIAL_DROPPED_REMEDIATION") });
    } else {
      claudePaths = fm.paths;
      warn({ target: "skill", field: "paths", source: src, code: "SKILL_PATHS_MIGRATED_VENDOR_OVERLAY",
        message: fmt(strings, "SKILL_PATHS_MIGRATED_VENDOR_OVERLAY"),
        remediation: fmt(strings, "SKILL_PATHS_MIGRATED_VENDOR_OVERLAY_REMEDIATION") });
    }
  }

  // metadata must be a string→string map (Agent Skills spec).
  const metadata = {};
  if (fm.metadata && typeof fm.metadata === "object" && !Array.isArray(fm.metadata)) {
    for (const [k, v] of Object.entries(fm.metadata)) {
      if (v !== null && typeof v === "object")
        warn({ target: "skill", field: `metadata.${k}`, source: src, code: "SKILL_METADATA_NOT_STRING",
          message: fmt(strings, "SKILL_METADATA_NOT_STRING"),
          remediation: fmt(strings, "SKILL_METADATA_NOT_STRING_REMEDIATION") });
      else metadata[String(k)] = String(v);
    }
  }

  // governance sidecar, or a backward-compat shim derived from old fields.
  const sidecar = join(kitDir, SKILLS_DIR, d, "skill.kit.yaml");
  let gov;
  if (existsSync(sidecar)) {
    gov = parseYaml(readFileSync(sidecar, "utf8")) || {};
    if (claudePaths && !gov.activation?.claude?.paths)
      gov = { ...gov, activation: { ...(gov.activation || {}), claude: { ...(gov.activation?.claude || {}), paths: claudePaths } } };
  } else {
    gov = {
      invocation: { implicit: true, manual: true },
      permissions: { requestedTools: [], deniedTools: [], preApprovedTools: [] },
      relatedRoles: fm.related_roles || [],
      relatedRules: fm.related_rules || [],
      ...(claudePaths ? { activation: { claude: { paths: claudePaths } } } : {}),
    };
    if (fm.related_roles || fm.related_rules)
      warn({ target: "skill", field: "related_*", source: src, code: "SKILL_RELATED_FIELDS_NONSTANDARD",
        message: fmt(strings, "SKILL_RELATED_FIELDS_NONSTANDARD"),
        remediation: fmt(strings, "SKILL_RELATED_FIELDS_NONSTANDARD_REMEDIATION") });
  }

  // supporting resources (scripts/references/assets), emitted alongside SKILL.md.
  // Containment-checked against the skill's own folder (see listFilesRec) — a symlink
  // pointing outside it is excluded and warned, never silently copied into output.
  const skillRoot = join(kitDir, SKILLS_DIR, d);
  const supporting = [];
  for (const sub of SUPPORT_SUBDIRS) {
    const abs = join(skillRoot, sub);
    if (existsSync(abs)) for (const f of listFilesRec(abs, skillRoot, "", warn, strings)) supporting.push({ rel: `${sub}/${f}`, abs: join(abs, f) });
  }

  return {
    id: d, name: d, description: fm.description || "", when_to_use: fm.when_to_use || "",
    license: fm.license, compatibility: fm.compatibility, metadata,
    body: body.trim(), gov, supporting, user_invocable: fm.user_invocable,
  };
}

// Collect all skills. `warn` is an optional sink for migration/validation warnings.
export function collectSkills(kitDir, warn = () => {}, lang = "vi") {
  if (!existsSync(join(kitDir, SKILLS_DIR))) return [];
  return readdirSync(join(kitDir, SKILLS_DIR))
    .filter((d) => existsSync(join(kitDir, SKILLS_DIR, d, "SKILL.md")))
    .sort()
    .map((d) => normalizeSkill(kitDir, d, warn, lang));
}

function readTargetCapabilities(kitDir, agent) {
  try { return JSON.parse(readFileSync(join(kitDir, "engine", "targets", agent, "capabilities.json"), "utf8")); }
  catch { return null; }
}

// A skill can declare a real constraint — manual-only invocation, Claude-only
// path-gated activation — that a configured target has no verified equivalent for.
// Never silently drop: warn which target/skill/field is affected and why.
function checkSkillTargetCapabilities(kitDir, cfg, skills, warn, lang = "vi") {
  const strings = loadDoctorStrings(kitDir, lang);
  const targets = Array.isArray(cfg?.agents) ? cfg.agents : [];
  const capCache = new Map();
  const capOf = (agent) => {
    if (!capCache.has(agent)) capCache.set(agent, readTargetCapabilities(kitDir, agent));
    return capCache.get(agent);
  };

  for (const s of skills) {
    const manualOnly = s.gov?.invocation?.implicit === false;
    const pathGate = s.gov?.activation?.claude?.paths;
    const sidecar = `${SKILLS_DIR}/${s.id}/skill.kit.yaml`;
    for (const agent of targets) {
      if (agent === "claude") continue; // verified native support for both, below
      const support = capOf(agent)?.features || {};
      if (manualOnly && support.invocationControl !== "supported")
        warn({ target: agent, field: "invocation.implicit", source: sidecar, code: "SKILL_INVOCATION_CONTROL_UNSUPPORTED_TARGET",
          message: fmt(strings, "SKILL_INVOCATION_CONTROL_UNSUPPORTED_TARGET", { agent, support: support.invocationControl || "unknown", id: s.id }),
          remediation: fmt(strings, "SKILL_INVOCATION_CONTROL_UNSUPPORTED_TARGET_REMEDIATION", { agent }) });
      if (pathGate?.length && support.pathGatedSkillActivation !== "supported")
        warn({ target: agent, field: "activation.claude.paths", source: sidecar, code: "SKILL_PATH_GATE_UNSUPPORTED_TARGET",
          message: fmt(strings, "SKILL_PATH_GATE_UNSUPPORTED_TARGET", { id: s.id, agent }),
          remediation: fmt(strings, "SKILL_PATH_GATE_UNSUPPORTED_TARGET_REMEDIATION", { agent }) });
    }
  }
}

// Re-run skill collection purely to gather warnings (used by build + doctor to surface
// capability drops / migration notices without changing buildOutputs' Map contract).
export function collectBuildWarnings(kitDir, cfg = {}, lang = "vi") {
  const warnings = [];
  const skills = collectSkills(kitDir, (w) => warnings.push(w), lang);
  checkSkillTargetCapabilities(kitDir, cfg, skills, (w) => warnings.push(w), lang);
  return warnings;
}

export const SKILL_TRUST_TIERS = ["T0", "T1", "T2", "T3", "T4"];
const HIGH_RISK_TIERS = new Set(["T3", "T4"]);
const SKILL_DESC_SPEC_LIMIT = 1024; // Agent Skills open spec hard limit (verified 2026-07-11)
const SKILL_LISTING_LIMIT = 1536;   // Claude's description+when_to_use listing cap (verified 2026-07-11)
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/; // spec: lowercase alnum+hyphen; no leading/trailing/double hyphen
const HASH_RE = /^(sha256|sha512):([0-9a-f]+)$/i;
const HASH_HEXLEN = { sha256: 64, sha512: 128 };

// Trigger-cue heuristic (multilingual, best-effort — NOT a precision guarantee). A
// description/when_to_use lacking any of these is flagged WEAK, not necessarily wrong.
const TRIGGER_CUES = [
  /use when/i, /use for/i, /use this when/i, /invoke (when|for|to|this)/i,
  /when (the|a|to|you|working)/i, /before (you|doing|publishing)/i, /if (the|a|you)/i,
  /dùng khi/i, /sử dụng khi/i, /áp dụng khi/i, /gọi khi/i, /invoke khi/i, /khi cần/i,
];

// Senior-completeness rubric (heuristic, WARN — the "hiring bar"). A role body should
// read like a senior playbook across three dimensions: what to do FIRST on a task, where
// its BOUNDARY is (hand-off / separation of duties, so it never plans+builds+reviews its
// own work), and how it VERIFIES quality / defines done. Multilingual, best-effort — a
// missing dimension is a nudge, never a build blocker.
const SENIORITY_CUES = {
  "a first move (what to do first)": [
    /\bfirst\b/i, /\bstart by\b/i, /\bbegin by\b/i, /\bon receiving\b/i, /\bin this order\b/i,
    /\bbefore (you|creating|acting|reporting|anything|writing)\b/i,
    /\btrước tiên\b/i, /\bđầu tiên\b/i, /\bkhi nhận\b/i, /\bbắt đầu\b/i,
  ],
  "a boundary / hand-off": [
    /\bnot for\b/i, /\bdo(?:es)? not\b/i, /\bdon'?t\b/i,
    /\bhand (?:off|back|it|the|them|those|runtime|structural|implementation)\b/i,
    /\bthat'?s the (?:planner|architect|implementer|reviewer|qa|analyst|devops|orchestrator)\b/i,
    /\byou delegate\b/i, /\bkhông phải\b/i, /\bbàn giao\b/i, /\bchuyển cho\b/i,
  ],
  "a verification / done bar": [
    /\bverif/i, /\btest/i, /\bevidence\b/i, /\bcheck\b/i, /\bconfirm/i, /\breview\b/i,
    /\bdone\b/i, /\bprove\b/i, /\brun the\b/i,
    /\bkiểm/i, /\bxác nhận\b/i, /\bbằng chứng\b/i, /\bhoàn thành\b/i,
  ],
};
function seniorityGaps(body) {
  const text = String(body || "");
  return Object.entries(SENIORITY_CUES)
    .filter(([, res]) => !res.some((re) => re.test(text)))
    .map(([dim]) => dim);
}

// Deterministic content-hash scope: the SKILL.md source as authored + every supporting
// file under scripts/references/assets, sorted by path. skill.kit.yaml (governance) and
// tests/ are OUT of scope — pinning covers the skill's actual behavior, not its metadata.
function computeSkillContentHash(kitDir, id, algorithm) {
  const dir = join(kitDir, SKILLS_DIR, id);
  const strings = loadDoctorStrings(kitDir, "vi");
  const parts = [readFileSync(join(dir, "SKILL.md"), "utf8")];
  const files = [];
  for (const sub of SUPPORT_SUBDIRS) {
    const abs = join(dir, sub);
    if (existsSync(abs)) for (const f of listFilesRec(abs, dir, "", undefined, strings)) files.push(`${sub}/${f}`);
  }
  files.sort();
  for (const rel of files) parts.push(`${rel.length}:${rel}\n${readFileSync(join(dir, rel), "utf8")}`);
  return createHash(algorithm).update(parts.join(""), "utf8").digest("hex");
}

// Per-abstraction schema versioning (P2 ergonomics): absent = implicit v1, no complaint.
// A non-integer/non-positive value is malformed (ERROR); a valid-but-unrecognized
// future version is a forward-compatibility WARNING, not a build blocker.
const SUPPORTED_SCHEMA_VERSIONS = { SKILL: [1], ROLE: [1], RULE: [1] };
function checkSchemaVersion(kind, value, tag, err, wrn) {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 1) {
    err(`${kind}_SCHEMA_VERSION_INVALID`, { tag, value });
    return;
  }
  if (!SUPPORTED_SCHEMA_VERSIONS[kind].includes(value))
    wrn(`${kind}_SCHEMA_VERSION_UNKNOWN`, { tag, value, supported: SUPPORTED_SCHEMA_VERSIONS[kind].join(", ") });
}

// Governance rules a skill must not violate — checked BEFORE generation (build fails,
// nothing is written) so a skill can never self-escalate beyond its declared trust
// tier, misrepresent its pinned content, or request a self-contradictory permission.
// Pure/read-only. Each message is tagged `[CODE]` so it stays greppable/testable while
// validateConfig's plain-string-array return shape is unchanged. `lang` defaults to
// "vi" so existing callers that don't pass one keep getting identical text —
// kitgen.mjs is the one place that computes the real project language and passes it.
export function validateSkillGovernance(kitDir, lang = "vi") {
  const strings = loadDoctorStrings(kitDir, lang);
  const errors = [];
  const warnings = [];
  const err = (code, params) => errors.push(`[${code}] ${fmt(strings, code, params)}`);
  const wrn = (code, params) => warnings.push(`[${code}] ${fmt(strings, code, params)}`);

  for (const s of collectSkills(kitDir)) {
    const gov = s.gov || {};
    const tier = gov.trustTier;
    const tag = `skill "${s.id}"`;
    checkSchemaVersion("SKILL", gov.schemaVersion, tag, err, wrn);

    // Agent Skills spec: name (forced = directory) must be lowercase alnum+hyphen, ≤64.
    if (!NAME_RE.test(s.id) || s.id.length > 64)
      err("SKILL_NAME_FORMAT_INVALID", { tag });

    // Agent Skills spec: description is required, non-empty, ≤1024 chars — an ERROR
    // (spec violation), separate from Claude's own ≤1536 listing cap (a WARNING below).
    if (!s.description) err("SKILL_DESCRIPTION_MISSING", { tag });
    else if (s.description.length > SKILL_DESC_SPEC_LIMIT)
      err("SKILL_DESCRIPTION_TOO_LONG", { tag, length: s.description.length, limit: SKILL_DESC_SPEC_LIMIT });

    const listingLen = (s.description || "").length + (s.when_to_use || "").length;
    if (listingLen > SKILL_LISTING_LIMIT)
      wrn("SKILL_DESCRIPTION_LISTING_TOO_LONG", { tag, length: listingLen, limit: SKILL_LISTING_LIMIT });

    const triggerText = `${s.description || ""} ${s.when_to_use || ""}`;
    if (s.description && !TRIGGER_CUES.some((re) => re.test(triggerText)))
      wrn("SKILL_DESCRIPTION_TRIGGER_WEAK", { tag });

    if (tier !== undefined && !SKILL_TRUST_TIERS.includes(tier))
      err("SKILL_TRUST_TIER_INVALID", { tag, tier, tiers: SKILL_TRUST_TIERS.join(" | ") });

    if (HIGH_RISK_TIERS.has(tier)) {
      if (gov.invocation?.implicit !== false)
        err("SKILL_TRUST_TIER_AUTO_INVOKE", { tag, tier });

      const hashField = gov.provenance?.contentHash;
      if (!hashField) {
        err("SKILL_TRUST_TIER_MISSING_HASH", { tag, tier });
      } else {
        const m = HASH_RE.exec(String(hashField));
        if (!m) {
          err("SKILL_HASH_FORMAT_INVALID", { tag, hashField });
        } else {
          const algo = m[1].toLowerCase();
          const hex = m[2];
          if (hex.length !== HASH_HEXLEN[algo]) {
            err("SKILL_HASH_ALGO_LENGTH_MISMATCH", { tag, hexLen: hex.length, algo, expectedLen: HASH_HEXLEN[algo] });
          } else {
            let actual = null;
            try { actual = computeSkillContentHash(kitDir, s.id, algo); } catch { /* files unreadable — leave actual null, no false mismatch */ }
            if (actual !== null && actual.toLowerCase() !== hex.toLowerCase())
              err("SKILL_HASH_MISMATCH", { tag, declared: hex.slice(0, 12), actual: actual.slice(0, 12) });
          }
        }
      }
    }

    const requested = new Set(gov.permissions?.requestedTools || []);
    const denied = new Set(gov.permissions?.deniedTools || []);
    for (const tool of gov.permissions?.preApprovedTools || []) {
      if (denied.has(tool)) err("SKILL_PERMISSION_CONTRADICTION", { tag, tool });
      else if (requested.size && !requested.has(tool))
        err("SKILL_PERMISSION_UNREQUESTED", { tag, tool });
    }
  }
  return { errors, warnings };
}

// Governance rules a Role must not violate — checked BEFORE generation. A role can
// never declare a self-contradictory permission boundary, preload a skill that does not
// exist or that cannot be preloaded (Claude skips a `disable-model-invocation` skill and
// only logs a debug warning — the kit surfaces this loudly instead, at build time).
// Pure/read-only. Same `[CODE]`-tagged message convention as validateSkillGovernance.
export function validateRoleGovernance(kitDir, lang = "vi") {
  const strings = loadDoctorStrings(kitDir, lang);
  const errors = [];
  const warnings = [];
  const err = (code, params) => errors.push(`[${code}] ${fmt(strings, code, params)}`);
  const wrn = (code, params) => warnings.push(`[${code}] ${fmt(strings, code, params)}`);
  const skillById = new Map(collectSkills(kitDir).map((s) => [s.id, s]));

  for (const role of collectRoles(kitDir)) {
    const fm = role.fm || {};
    const name = fm.name || "?";
    const tag = `role "${name}"`;
    const eff = roleEffective(fm);
    checkSchemaVersion("ROLE", fm.schemaVersion, tag, err, wrn);

    const allowSet = new Set(eff.allowTools);
    for (const tool of eff.denyTools)
      if (allowSet.has(tool)) err("ROLE_PERMISSION_CONTRADICTION", { tag, tool });

    if (eff.permissionMode !== undefined && !ROLE_PERMISSION_MODES.includes(eff.permissionMode))
      err("ROLE_PERMISSION_MODE_INVALID", { tag, mode: eff.permissionMode, modes: ROLE_PERMISSION_MODES.join(" | ") });
    if (eff.isolation !== undefined && !ROLE_ISOLATION_MODES.includes(eff.isolation))
      err("ROLE_ISOLATION_INVALID", { tag, mode: eff.isolation, modes: ROLE_ISOLATION_MODES.join(" | ") });
    if (eff.effort !== undefined && !ROLE_EFFORT_LEVELS.includes(eff.effort))
      err("ROLE_EFFORT_INVALID", { tag, effort: eff.effort, levels: ROLE_EFFORT_LEVELS.join(" | ") });
    if (eff.memoryScope !== undefined && !ROLE_MEMORY_SCOPES.includes(eff.memoryScope))
      err("ROLE_MEMORY_SCOPE_INVALID", { tag, scope: eff.memoryScope, scopes: ROLE_MEMORY_SCOPES.join(" | ") });
    if (eff.maxTurns !== undefined && (!Number.isInteger(eff.maxTurns) || eff.maxTurns < 1))
      err("ROLE_MAX_TURNS_INVALID", { tag });

    for (const sid of eff.skillsPreload) {
      const skill = skillById.get(sid);
      if (!skill) { err("ROLE_SKILL_PRELOAD_BROKEN_REFERENCE", { tag, sid }); continue; }
      if (skill.gov?.invocation?.implicit === false)
        err("ROLE_SKILL_PRELOAD_MANUAL_ONLY_CONFLICT", { tag, sid });
    }

    if (!fm.description) wrn("ROLE_DESCRIPTION_MISSING", { tag });
    else if (!TRIGGER_CUES.some((re) => re.test(fm.description)))
      wrn("ROLE_DESCRIPTION_TRIGGER_WEAK", { tag });

    // Senior-completeness rubric (the hiring bar): a role's body should read like a
    // senior playbook — first move, boundary/hand-off, and a verification/done bar.
    const gaps = seniorityGaps(role.body);
    if (gaps.length) wrn("ROLE_SENIORITY_INCOMPLETE", { tag, missing: gaps.join("; ") });

    for (const sec of eff.outputRequiredSections) {
      if (!new RegExp(`##\\s*${sec}`, "i").test(role.body))
        wrn("ROLE_OUTPUT_SECTION_MISSING", { tag, section: sec });
    }
  }
  return { errors, warnings };
}

// Merge invariants across layers: engine → profile → project (F-07). Each invariant
// gets a stable id (explicit `id` or slug of its path); a duplicate id is a conflict
// unless the PROJECT layer explicitly sets `override: true` over a lower layer.
// `enforcement` (guidance|static-check|hook|ci|unsupported) defaults to guidance.
const INV_ENFORCEMENT = new Set(["guidance", "static-check", "hook", "ci", "unsupported"]);

export function collectInvariants(kitDir, cfg, lang = "vi") {
  const strings = loadDoctorStrings(kitDir, lang);
  const out = [];
  const byId = new Map();
  const add = (inv, layer) => {
    if (!inv || typeof inv !== "object" || !inv.rule) return;
    const id = inv.id || `invariant-${slug(inv.path || inv.rule)}`;
    const enforcement = inv.enforcement || "guidance";
    if (!INV_ENFORCEMENT.has(enforcement))
      throw new Error(fmt(strings, "INVARIANT_ENFORCEMENT_INVALID", { id, enforcement, allowed: [...INV_ENFORCEMENT].join(" | ") }));
    const rec = { ...inv, id, enforcement, layer };
    const prev = byId.get(id);
    if (prev) {
      const canOverride = layer === "project" && inv.override === true && prev.layer !== "project";
      if (!canOverride)
        throw new Error(fmt(strings, "INVARIANT_ID_CONFLICT", { id, prevLayer: prev.layer, layer }));
      out.splice(out.indexOf(prev), 1);
    }
    byId.set(id, rec);
    out.push(rec);
  };

  for (const pid of profileList(cfg)) {
    const profFile = join(kitDir, "profiles", pid, "profile.yaml");
    if (!existsSync(profFile)) continue;
    const prof = parseYaml(readFileSync(profFile, "utf8"));
    const root = profileRoot(cfg, pid);
    for (const inv of prof.invariants || []) add(root && inv.path ? { ...inv, path: scopeGlob(root, inv.path) } : inv, "profile");
  }
  for (const inv of Array.isArray(cfg.invariants) ? cfg.invariants : []) add(inv, "project");
  return out;
}

// ---- render helpers (verbatim behavior — golden depends on exact bytes) ----
const y = (v) => JSON.stringify(String(v));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "rule";
const invName = (inv, i) => `invariant-${i + 1}-${slug(inv.path || i + 1)}`;

const SECRET_DENY = ["Read(./.env)", "Read(./.env.*)", "Read(./**/*.pem)", "Read(./**/*.key)", "Read(./**/id_rsa)"];

export function denyFromGuardrails(cfg) {
  const block = [...(cfg.guardrails?.block || []), ...(cfg.guardrails?.allow_extra || [])];
  const bases = new Set();
  for (const b of block) {
    if (!/^[a-z][\w.-]*(\s|$)/.test(b)) continue;
    const base = b.replace(/\s+([~/.][^\s]*)\s*$/, "").trim();
    bases.add(`Bash(${base}:*)`);
  }
  return [...bases, ...SECRET_DENY];
}

function emitClaudeMd(cfg, S) {
  const note = { vibe: S.mode_note_vibe, standard: S.mode_note_standard, strict: S.mode_note_strict }[cfg.mode] || S.mode_note_vibe;
  return `<!-- ${S.generated_banner} -->

# ${cfg.project?.name || "Project"} — agent instructions

${S.claude_intro}

${note}

${S.session_memory_note}

Roles live in \`.claude/agents/\`. Auto-loaded rules live in \`.claude/rules/\`. Single source: \`kit.config.yaml\` + \`engine/\`.
`;
}

function emitClaudeRule(rule, S) {
  const fmLines = [`# ${S.generated_banner}`];
  if (rule.scope === "paths" && Array.isArray(rule.paths) && rule.paths.length) {
    fmLines.push("paths:");
    for (const g of rule.paths) fmLines.push(`  - "${g}"`);
  }
  if (rule.title) fmLines.push(`description: ${y(rule.title)}`);
  return `---\n${fmLines.join("\n")}\n---\n\n${rule.body}\n`;
}

function emitCursorRule(rule, S) {
  const always = rule.scope !== "paths";
  const fmLines = [`# ${S.generated_banner}`];
  if (rule.title) fmLines.push(`description: ${y(rule.title)}`);
  if (!always && Array.isArray(rule.paths)) fmLines.push(`globs: ${rule.paths.join(",")}`);
  fmLines.push(`alwaysApply: ${always}`);
  return `---\n${fmLines.join("\n")}\n---\n\n${rule.body}\n`;
}

function emitAgent(role, S) {
  const fm = role.fm;
  const eff = roleEffective(fm);
  const lines = [`# ${S.generated_banner}`];
  if (fm.name !== undefined) lines.push(`name: ${fm.name}`);
  if (fm.description !== undefined) lines.push(`description: ${y(fm.description)}`);
  if (eff.allowTools.length) lines.push(`tools: ${eff.allowTools.join(", ")}`);
  if (eff.denyTools.length) lines.push(`disallowedTools: ${eff.denyTools.join(", ")}`);
  if (eff.model !== undefined) lines.push(`model: ${eff.model}`);
  if (eff.permissionMode !== undefined) lines.push(`permissionMode: ${eff.permissionMode}`);
  if (eff.maxTurns !== undefined) lines.push(`maxTurns: ${eff.maxTurns}`);
  if (eff.skillsPreload.length) {
    lines.push("skills:");
    for (const s of eff.skillsPreload) lines.push(`  - ${s}`);
  }
  if (eff.isolation !== undefined && eff.isolation !== "none") lines.push(`isolation: ${eff.isolation}`);
  if (eff.background !== undefined) lines.push(`background: ${eff.background}`);
  if (eff.effort !== undefined) lines.push(`effort: ${eff.effort}`);
  if (eff.memoryScope !== undefined && eff.memoryScope !== "none") lines.push(`memory: ${eff.memoryScope}`);
  return `---\n${lines.join("\n")}\n---\n\n${role.body}\n`;
}

function emitAgentsMd(cfg, S, alwaysRules, roles, skills, commands) {
  const note = { vibe: S.mode_note_vibe, standard: S.mode_note_standard, strict: S.mode_note_strict }[cfg.mode] || S.mode_note_vibe;
  const idx = (title, items) => items.length ? `\n## ${title}\n${items.map((i) => `- ${i}`).join("\n")}\n` : "";
  return `<!-- ${S.generated_banner} -->

# ${cfg.project?.name || "Project"} — agent instructions (AGENTS.md)

${note}

${S.session_memory_note}

${alwaysRules.map((r) => r.body).join("\n\n")}
${idx("Roles", roles.map((r) => `**${r.fm.name}** — ${r.fm.description || ""}`))}${idx("Skills", skills.map((s) => `**${s.id}** — ${s.description || ""}`))}${idx("Commands", commands.map((c) => `\`/${c.id}\` — ${c.description || ""}`))}`;
}

function emitClaudeSkill(skill, S) {
  // Agent Skills open standard + verified Claude extensions (when_to_use, paths,
  // disable-model-invocation, allowed-tools — code.claude.com/docs/en/skills, 2026-07-11).
  const fm = [`# ${S.generated_banner}`, `name: ${y(skill.name)}`];
  if (skill.description) fm.push(`description: ${y(skill.description)}`);
  if (skill.when_to_use) fm.push(`when_to_use: ${y(skill.when_to_use)}`);
  if (skill.license) fm.push(`license: ${y(skill.license)}`);
  if (skill.compatibility) fm.push(`compatibility: ${y(skill.compatibility)}`);
  // allowed-tools ONLY from pre-approved tools — never auto-promote requestedTools.
  const preApproved = skill.gov?.permissions?.preApprovedTools || [];
  if (preApproved.length) fm.push(`allowed-tools: ${preApproved.join(", ")}`);
  if (skill.gov?.invocation?.implicit === false) fm.push("disable-model-invocation: true");
  if (skill.user_invocable === false) fm.push("user-invocable: false");
  // Claude-only vendor extension: gates automatic activation to matching files.
  // Canonical/portable SKILL.md never carries this — it comes solely from the
  // Claude-specific overlay in skill.kit.yaml (gov.activation.claude.paths).
  const claudePaths = skill.gov?.activation?.claude?.paths;
  if (Array.isArray(claudePaths) && claudePaths.length) {
    fm.push("paths:");
    for (const g of claudePaths) fm.push(`  - "${g}"`);
  }
  return `---\n${fm.join("\n")}\n---\n\n${skill.body}\n`;
}

// Strictly PORTABLE Agent Skills open-standard frontmatter, for the cross-tool
// `.agents/skills/` discovery path (verified 2026-07-11: Codex reads $CWD/.agents/skills,
// $REPO_ROOT/.agents/skills, etc.; Gemini CLI reads .agents/skills/ and even prioritizes
// it over its own native .gemini/skills/ — neither reads .claude/skills). Only fields
// defined by the open spec are emitted: name, description, license, compatibility,
// metadata, allowed-tools. Claude-only extensions (when_to_use, disable-model-invocation,
// user-invocable, paths) are deliberately excluded — those tools have no verified
// support for them and emitting them here would misrepresent the contract.
function emitPortableSkill(skill, S) {
  const fm = [`# ${S.generated_banner}`, `name: ${y(skill.name)}`];
  if (skill.description) fm.push(`description: ${y(skill.description)}`);
  if (skill.license) fm.push(`license: ${y(skill.license)}`);
  if (skill.compatibility) fm.push(`compatibility: ${y(skill.compatibility)}`);
  if (Object.keys(skill.metadata || {}).length) {
    fm.push("metadata:");
    for (const [k, v] of Object.entries(skill.metadata)) fm.push(`  ${k}: ${y(v)}`);
  }
  const preApproved = skill.gov?.permissions?.preApprovedTools || [];
  if (preApproved.length) fm.push(`allowed-tools: ${preApproved.join(" ")}`); // spec: space-separated
  return `---\n${fm.join("\n")}\n---\n\n${skill.body}\n`;
}

function emitSettings(cfg, S) {
  const hookCmd = (f) => `node "\${CLAUDE_PROJECT_DIR}/.kit/hooks/${f}"`;
  const settings = {
    $schema: "https://json.schemastore.org/claude-code-settings.json",
    _generated: S.generated_banner,
    permissions: { deny: denyFromGuardrails(cfg) },
    hooks: {
      SessionStart: [{ hooks: [{ type: "command", command: hookCmd("session-start.mjs") }] }],
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: hookCmd("guard-shell.mjs") }] },
        { matcher: "Write|Edit", hooks: [{ type: "command", command: hookCmd("consistency-guard.mjs") }] },
        { matcher: "Write|Edit", hooks: [{ type: "command", command: hookCmd("critique-gate.mjs") }] },
      ],
    },
  };
  return JSON.stringify(settings, null, 2) + "\n";
}

function emitCopilotRepo(cfg, S, alwaysRules) {
  const body = alwaysRules.map((r) => r.body).join("\n\n");
  return `<!-- ${S.generated_banner} -->\n\n# ${cfg.project?.name || "Project"} — Copilot instructions\n\n${S.claude_intro}\n\n${body}\n`;
}
function emitCopilotInstruction(rule, S) {
  return `---\n# ${S.generated_banner}\napplyTo: "${(rule.paths || []).join(",")}"\n---\n\n${rule.body}\n`;
}

function emitClaudeCommand(cmd, S) {
  const fm = [`# ${S.generated_banner}`];
  if (cmd.description) fm.push(`description: ${y(cmd.description)}`);
  if (cmd["argument-hint"]) fm.push(`argument-hint: ${y(cmd["argument-hint"])}`);
  return `---\n${fm.join("\n")}\n---\n\n${cmd.body}\n`;
}
function emitCursorCommand(cmd, S) {
  return `<!-- ${S.generated_banner} -->\n\n${cmd.body}\n`;
}

// Enforcement note so a human reading the artifact knows whether it is advisory.
const invNote = (inv) =>
  (inv.enforcement && inv.enforcement !== "guidance")
    ? `\n\n_(enforcement: ${inv.enforcement})_`
    : "\n\n_SOFT RULE — advisory guidance, not enforced by the kit._";

function emitCursorInvariant(inv, S) {
  const fm = [`# ${S.generated_banner}`, `description: ${y(inv.rule || "")}`, `globs: ${inv.path || "**/*"}`, "alwaysApply: false"];
  return `---\n${fm.join("\n")}\n---\n\n${inv.rule || ""}${invNote(inv)}\n`;
}
function emitWindsurfInvariant(inv, S) {
  // Modern .windsurf/rules format: trigger frontmatter (NOT the legacy XML .windsurfrules).
  const fm = [`# ${S.generated_banner}`, "trigger: glob", `globs: ${inv.path || "**/*"}`];
  return `---\n${fm.join("\n")}\n---\n\n${inv.rule || ""}${invNote(inv)}\n`;
}
function emitWindsurfRule(rule, S) {
  const fmLines = [`# ${S.generated_banner}`];
  if (rule.scope === "paths" && Array.isArray(rule.paths)) {
    fmLines.push("trigger: glob");
    fmLines.push(`globs: ${rule.paths.join(",")}`);
  } else {
    fmLines.push("trigger: always_on");
  }
  return `---\n${fmLines.join("\n")}\n---\n\n${rule.body}\n`;
}

// ---- transformers (one class per IDE target) ------------------------------
// Each emit() returns an array of [relativePath, content] pairs.
class Emitter {
  constructor(ctx) { this.ctx = ctx; }
  emit() { return []; }
}

class AgentsMdEmitter extends Emitter {
  emit() {
    const { cfg, S, alwaysRules, roles, skills, commands } = this.ctx;
    const out = [["AGENTS.md", emitAgentsMd(cfg, S, alwaysRules, roles, skills, commands)]];
    // Cross-tool skill discovery (verified: Codex + Gemini CLI both read .agents/skills/;
    // neither reads .claude/skills/). Portable frontmatter only — no Claude extensions.
    for (const s of skills) {
      out.push([`.agents/skills/${s.id}/SKILL.md`, emitPortableSkill(s, S)]);
      for (const sup of s.supporting) out.push([`.agents/skills/${s.id}/${sup.rel}`, readFileSync(sup.abs, "utf8")]);
    }
    return out;
  }
}

class ClaudeEmitter extends Emitter {
  emit() {
    const { cfg, S, rules, roles, commands, skills } = this.ctx;
    const out = [["CLAUDE.md", emitClaudeMd(cfg, S)]];
    for (const r of rules) out.push([`.claude/rules/${r.id}.md`, emitClaudeRule(r, S)]);
    for (const role of roles) out.push([`.claude/agents/${role.fm.name}.md`, emitAgent(role, S)]);
    for (const c of commands) out.push([`.claude/commands/${c.id}.md`, emitClaudeCommand(c, S)]);
    for (const s of skills) {
      out.push([`.claude/skills/${s.id}/SKILL.md`, emitClaudeSkill(s, S)]);
      // Bundle supporting resources (scripts/references/assets); tests/ is never emitted.
      for (const sup of s.supporting) out.push([`.claude/skills/${s.id}/${sup.rel}`, readFileSync(sup.abs, "utf8")]);
    }
    out.push([".claude/settings.json", emitSettings(cfg, S)]);
    return out;
  }
}

class CursorEmitter extends Emitter {
  emit() {
    const { S, rules, commands, skills, invariants } = this.ctx;
    const out = [];
    for (const r of rules) out.push([`.cursor/rules/${r.id}.mdc`, emitCursorRule(r, S)]);
    for (const c of commands) out.push([`.cursor/commands/${c.id}.md`, emitCursorCommand(c, S)]);
    // Cursor has no model-invoked skills → expose each skill as a command too.
    for (const s of skills) out.push([`.cursor/commands/${s.id}.md`, emitCursorCommand({ body: s.body }, S)]);
    invariants.forEach((inv, i) => out.push([`.cursor/rules/${invName(inv, i)}.mdc`, emitCursorInvariant(inv, S)]));
    return out;
  }
}

class CopilotEmitter extends Emitter {
  emit() {
    const { cfg, S, rules } = this.ctx;
    const always = rules.filter((r) => r.scope !== "paths");
    const scoped = rules.filter((r) => r.scope === "paths");
    const out = [[".github/copilot-instructions.md", emitCopilotRepo(cfg, S, always)]];
    for (const r of scoped) out.push([`.github/instructions/${r.id}.instructions.md`, emitCopilotInstruction(r, S)]);
    return out;
  }
}

class WindsurfEmitter extends Emitter {
  emit() {
    const { S, rules, invariants } = this.ctx;
    const out = [];
    for (const r of rules) out.push([`.windsurf/rules/${r.id}.md`, emitWindsurfRule(r, S)]);
    invariants.forEach((inv, i) => out.push([`.windsurf/rules/${invName(inv, i)}.md`, emitWindsurfInvariant(inv, S)]));
    return out;
  }
}

// Registry — key order defines emit order (matches the original fixed order).
export const EMITTERS = {
  agentsmd: AgentsMdEmitter,
  claude: ClaudeEmitter,
  cursor: CursorEmitter,
  copilot: CopilotEmitter,
  windsurf: WindsurfEmitter,
};

// ---- Progressive-disclosure token budget (P2 ergonomics) -------------------
// A documented ESTIMATE only (chars/4, a common rough heuristic for English text) —
// NOT an exact tokenizer. Never present this as a precise count; it exists so the kit
// can flag an always-loaded footprint growing unboundedly, and to stop "this saves
// tokens" claims from being made without any measurement at all.
const TOKEN_CHARS_PER_TOKEN = 4;
const estTokens = (str) => Math.ceil((str || "").length / TOKEN_CHARS_PER_TOKEN);
export const ALWAYS_ON_RULE_BODY_LINE_TARGET = 200; // matches the kit's own design target

// Returns a structured, itemized estimate of what's always loaded into context (rule
// bodies with activation.mode==="always", the role delegation catalog, the skill
// discovery catalog) vs what's loaded on demand (path/glob-scoped rule bodies, full
// role prompts, full skill bodies + supporting files). Pure/read-only.
export function estimateTokenBudget(kitDir, cfg) {
  cfg = cfg || {};
  const rules = collectRules(kitDir, cfg);
  const roles = collectRoles(kitDir);
  const skills = collectSkills(kitDir);

  const item = (id, text) => ({ id, chars: (text || "").length, tokens: estTokens(text) });
  const sum = (items) => items.reduce((a, x) => a + x.tokens, 0);

  const alwaysRuleItems = rules.filter((r) => ruleEffective(r).activation.mode === "always").map((r) => item(r.id, r.body));
  const onDemandRuleItems = rules.filter((r) => ruleEffective(r).activation.mode !== "always").map((r) => item(r.id, r.body));
  const roleCatalogItems = roles.map((r) => item(r.fm?.name, `${r.fm?.name || ""} ${r.fm?.description || ""}`));
  const rolePromptItems = roles.map((r) => item(r.fm?.name, r.body));
  const skillCatalogItems = skills.map((s) => item(s.id, `${s.name} ${s.description} ${s.when_to_use || ""}`));
  const skillBodyItems = skills.map((s) => item(s.id, s.body));

  const alwaysLoadedTokens = sum(alwaysRuleItems) + sum(roleCatalogItems) + sum(skillCatalogItems);
  const alwaysRuleLines = rules
    .filter((r) => ruleEffective(r).activation.mode === "always")
    .reduce((a, r) => a + r.body.split("\n").length, 0);

  return {
    estimateMethod: `chars/${TOKEN_CHARS_PER_TOKEN} (rough heuristic, NOT an exact tokenizer)`,
    alwaysLoaded: {
      rules: { items: alwaysRuleItems, tokens: sum(alwaysRuleItems), lines: alwaysRuleLines, lineTarget: ALWAYS_ON_RULE_BODY_LINE_TARGET, overTarget: alwaysRuleLines > ALWAYS_ON_RULE_BODY_LINE_TARGET },
      roleCatalog: { items: roleCatalogItems, tokens: sum(roleCatalogItems) },
      skillCatalog: { items: skillCatalogItems, tokens: sum(skillCatalogItems) },
      total: alwaysLoadedTokens,
    },
    onDemand: {
      pathScopedRules: { items: onDemandRuleItems, tokens: sum(onDemandRuleItems) },
      rolePrompts: { items: rolePromptItems, tokens: sum(rolePromptItems) },
      skillBodies: { items: skillBodyItems, tokens: sum(skillBodyItems) },
    },
  };
}

// Build the full output map for a config. Pure: returns Map<relPath, content>.
export function buildOutputs(cfg, { kitDir = DEFAULT_KIT_DIR } = {}) {
  const S = loadStrings(kitDir, cfg.project?.language || "en");
  const rules = collectRules(kitDir, cfg);
  const roles = collectRoles(kitDir);
  const commands = collectCommands(kitDir);
  const skills = collectSkills(kitDir);
  const alwaysRules = rules.filter((r) => r.scope !== "paths");
  const invariants = collectInvariants(kitDir, cfg);
  const ctx = { cfg, S, rules, roles, commands, skills, alwaysRules, invariants };

  const targets = new Set(cfg.agents || ["claude"]);
  const out = new Map();
  for (const agent of Object.keys(EMITTERS)) {
    if (!targets.has(agent)) continue;
    for (const [rel, content] of new EMITTERS[agent](ctx).emit()) out.set(rel, content);
  }
  return out;
}
