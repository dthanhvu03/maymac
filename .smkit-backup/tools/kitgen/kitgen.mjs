#!/usr/bin/env node
// kitgen — orchestrator: reads kit.config.yaml, delegates ALL file generation to
// engine/emitter.mjs (the single transformer layer), and owns writing to disk,
// drift-checking, and the health `doctor`.
//   node tools/kitgen/kitgen.mjs build     write generated files into outDir
//   node tools/kitgen/kitgen.mjs check     fail (exit 1) if outDir is out of sync
//   node tools/kitgen/kitgen.mjs doctor    health-check the kit + generated output
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "./yaml.mjs";
import { validateConfig } from "./validate.mjs";
import { applyBuild, classifyDrift } from "./apply.mjs";
import { reconcileSettings } from "./settings-merge.mjs";
import { hookHashes, HASHES_REL } from "./integrity.mjs";
import { buildOutputs, collectRules, collectRoles, collectSkills, collectBuildWarnings, estimateTokenBudget, loadDoctorStrings, fmt } from "../../engine/emitter.mjs";

// KIT_DIR = where the kit's sources live (engine/, profiles/) — relative to this file,
// so it works whether the kit is the project root or an installed dep.
// PROJECT_DIR = the project being configured — where kit.config.yaml is read and
// generated files are written. Defaults to the cwd (or CLAUDE_PROJECT_DIR).
const KIT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const kp = (...s) => join(KIT_DIR, ...s);
const pp = (...s) => join(PROJECT_DIR, ...s);

// The kit's original default audience is Vietnamese; a project opts into English by
// setting `project.language: en`. Messages emitted before a config is successfully
// parsed (Node-too-old, file-missing, parse-error) have no config to read yet, so
// they always use the default — only messages after that point can honor the setting.
const langOf = (cfg) => (cfg?.project?.language === "en" ? "en" : "vi");

// ---- doctor ---------------------------------------------------------------
const HOOK_MAP = { "consistency-guard": "consistency-guard.mjs", "critique-gate": "critique-gate.mjs" }; // enforce:hook rule.id -> hook file

// Mask secret-looking values in doctor messages before they reach --json output.
// Doctor messages are paths/config today; this is a safeguard, not the primary defense.
function redactSecrets(s) {
  return String(s).replace(
    /\b(token|secret|password|passwd|api[_-]?key|authorization)\b(\s*[:=]\s*)\S+/gi,
    "$1$2***",
  );
}
const OUTPUT_SECTION = /output format|required output|final output/i;

// Read-only health check of the kit + generated output. Returns an exit code.
function runDoctor() {
  const R = [];
  const ok = (g, m, code) => R.push({ g, level: "ok", m, code });
  const warn = (g, m, code) => R.push({ g, level: "warn", m, code });
  const err = (g, m, code) => R.push({ g, level: "error", m, code });
  const clean = (g) => R.filter((r) => r.g === g && r.level !== "ok").length === 0;

  // 1. Node — no config parsed yet, so this always uses the default-language catalog.
  const strings0 = loadDoctorStrings(KIT_DIR, "vi");
  const nodeMajor = parseInt(process.versions.node, 10);
  if (nodeMajor >= 18) ok("Node", fmt(strings0, "NODE_OK", { version: process.versions.node }), "NODE_OK");
  else err("Node", fmt(strings0, "NODE_TOO_OLD", { version: process.versions.node }), "NODE_TOO_OLD");

  // 2. Config
  let cfg = null;
  const cfgPath = pp("kit.config.yaml");
  if (!existsSync(cfgPath)) err("Config", fmt(strings0, "CONFIG_FILE_MISSING"), "CONFIG_FILE_MISSING");
  else {
    try { cfg = parseYaml(readFileSync(cfgPath, "utf8")); }
    catch (e) { err("Config", fmt(strings0, "CONFIG_PARSE_ERROR", { message: e.message, hint: e.hint || "sửa YAML" }), "CONFIG_PARSE_ERROR"); }
  }
  // Once cfg is known, every subsequent message honors project.language.
  const lang = langOf(cfg);
  const strings = loadDoctorStrings(KIT_DIR, lang);
  if (cfg) {
    const { errors, warnings } = validateConfig(cfg, { kitDir: KIT_DIR, projectDir: PROJECT_DIR, lang });
    for (const m of warnings) warn("Config", m);
    for (const m of errors) err("Config", m);
    if (clean("Config")) ok("Config", fmt(strings, "CONFIG_VALID"), "CONFIG_VALID");
  }

  // 3. Paths
  const reqDirs = ["engine/rules", "engine/roles", "engine/commands", "engine/skills", "profiles", ".kit/hooks"];
  const missDirs = reqDirs.filter((d) => !existsSync(kp(d)));
  if (missDirs.length) for (const d of missDirs) err("Paths", fmt(strings, "PATHS_MISSING_DIR", { dir: d }), "PATHS_MISSING_DIR");
  else ok("Paths", reqDirs.join(", "), "PATHS_OK");

  // 5. Hooks
  const reqHooks = ["guard-shell.mjs", "session-start.mjs", "consistency-guard.mjs", "critique-gate.mjs", "_lib.mjs", "yaml.mjs"];
  const missHooks = reqHooks.filter((h) => !existsSync(kp(".kit/hooks", h)));
  if (missHooks.length) for (const h of missHooks) err("Hooks", fmt(strings, "HOOKS_MISSING_FILE", { file: h }), "HOOKS_MISSING_FILE");
  // vendored yaml must stay byte-identical to the source parser
  const vend = kp(".kit/hooks/yaml.mjs"), src = kp("tools/kitgen/yaml.mjs");
  if (existsSync(vend) && existsSync(src) && readFileSync(vend, "utf8") !== readFileSync(src, "utf8"))
    err("Hooks", fmt(strings, "HOOKS_YAML_DRIFT"), "HOOKS_YAML_DRIFT");
  if (clean("Hooks")) ok("Hooks", reqHooks.map((h) => h.replace(".mjs", "")).join(", "), "HOOKS_OK");

  // Integrity — vendored hooks match the hashes shipped with the kit. Tamper/corruption
  // evidence (not signed): catches a hook modified or mangled since install. Skipped
  // silently when no hashes file is present (older installs / dev checkouts mid-edit).
  try {
    const hashesPath = kp(HASHES_REL);
    if (existsSync(hashesPath)) {
      const stored = JSON.parse(readFileSync(hashesPath, "utf8")).files || {};
      const current = hookHashes(kp(".kit/hooks"));
      let bad = 0;
      for (const [f, h] of Object.entries(stored)) {
        if (!(f in current)) { err("Integrity", `hook missing since install: ${f}`, "HOOKS_INTEGRITY_MISSING"); bad++; }
        else if (current[f] !== h) { err("Integrity", `hook modified since install (run \`smkit update\` to restore, or re-hash if intended): ${f}`, "HOOKS_INTEGRITY_MISMATCH"); bad++; }
      }
      if (!bad) ok("Integrity", `${Object.keys(stored).length} hook(s) match the shipped hashes`, "HOOKS_INTEGRITY_OK");
    }
  } catch (e) { warn("Integrity", `integrity check skipped (${e?.message || e})`, "INTEGRITY_CHECK_FAILED"); }

  // Build once, reused by drift + settings cross-check.
  let outputs = null;
  const outDir = cfg?.outDir || "dist";
  if (cfg) {
    try { outputs = buildOutputs(cfg, { kitDir: KIT_DIR }); reconcileSettings(outputs, { projectDir: PROJECT_DIR, outDir }); }
    catch (e) { err("Generated output", fmt(strings, "GENERATED_OUTPUT_BUILD_FAILED", { message: e.message }), "GENERATED_OUTPUT_BUILD_FAILED"); }
  }

  // 4. Drift — classified against the ownership manifest (F-08). Wrapped so an
  // unreadable directory (permissions) degrades to one warning instead of aborting
  // the whole health-check.
  if (outputs) {
    try {
      const { missing, modified, stale, unexpected } = classifyDrift({ outDir, outputs, projectDir: PROJECT_DIR });
      for (const r of missing) err("Generated output", fmt(strings, "MISSING_OWNED", { outDir, rel: r }), "MISSING_OWNED");
      for (const r of modified) err("Generated output", fmt(strings, "MODIFIED_OWNED", { outDir, rel: r }), "MODIFIED_OWNED");
      for (const r of stale) warn("Generated output", fmt(strings, "STALE_OWNED", { outDir, rel: r }), "STALE_OWNED");
      for (const r of unexpected) warn("Generated output", fmt(strings, "UNEXPECTED_UNOWNED", { outDir, rel: r }), "UNEXPECTED_UNOWNED");
      const driftN = missing.length + modified.length;
      if (driftN) err("Generated output", fmt(strings, "GENERATED_OUTPUT_DRIFT", { outDir, count: driftN }), "DRIFT");
      else if (!stale.length && !unexpected.length) ok("Generated output", fmt(strings, "GENERATED_OUTPUT_MATCH", { count: outputs.size, outDir }), "GENERATED_OUTPUT_MATCH");
    } catch (e) {
      warn("Generated output", `drift check skipped (${e?.message || e})`, "DRIFT_CHECK_FAILED");
    }
  }

  // Hooks: settings cross-check (WARN)
  if (outputs) {
    const refs = (outputs.get(".claude/settings.json") || "").match(/\.kit\/hooks\/([\w.-]+\.mjs)/g) || [];
    for (const ref of new Set(refs)) {
      const f = ref.split("/").pop();
      if (!existsSync(kp(".kit/hooks", f))) warn("Hooks", fmt(strings, "HOOKS_SETTINGS_HOOK_MISSING", { file: f }), "HOOKS_SETTINGS_HOOK_MISSING");
    }
  }

  // 6. Rules enforce
  let rules = [];
  try { rules = collectRules(KIT_DIR, cfg || {}); } catch { /* ignore */ }
  const gateSkillExists = () => { try { return collectSkills(KIT_DIR).some((s) => OUTPUT_SECTION.test(s.body)); } catch { return false; } };
  for (const r of rules) {
    if (!r.enforce) { warn("Rules (enforce)", fmt(strings, "RULES_ENFORCE_MISSING_LABEL", { id: r.id }), "RULES_ENFORCE_MISSING_LABEL"); continue; }
    for (const tok of String(r.enforce).split("+").map((tk) => tk.trim())) {
      if (tok === "agent-read") continue;
      else if (tok === "generator") { if (!existsSync(kp("tools/kitgen/kitgen.mjs"))) err("Rules (enforce)", fmt(strings, "RULES_ENFORCE_GENERATOR_MISSING", { id: r.id }), "RULES_ENFORCE_GENERATOR_MISSING"); }
      else if (tok === "gate") { if (!gateSkillExists()) err("Rules (enforce)", fmt(strings, "RULES_ENFORCE_GATE_NO_SKILL", { id: r.id }), "RULES_ENFORCE_GATE_NO_SKILL"); }
      else if (tok === "hook") {
        const mapped = HOOK_MAP[r.id];
        if (!mapped) warn("Rules (enforce)", fmt(strings, "RULES_ENFORCE_HOOK_UNMAPPED", { id: r.id }), "RULES_ENFORCE_HOOK_UNMAPPED");
        else if (!existsSync(kp(".kit/hooks", mapped))) err("Rules (enforce)", fmt(strings, "RULES_ENFORCE_HOOK_MISSING_FILE", { id: r.id, hookFile: mapped }), "RULES_ENFORCE_HOOK_MISSING_FILE");
      } else warn("Rules (enforce)", fmt(strings, "RULES_ENFORCE_TOKEN_UNRECOGNIZED", { id: r.id, tok }), "RULES_ENFORCE_TOKEN_UNRECOGNIZED");
    }
  }
  if (rules.length && clean("Rules (enforce)")) ok("Rules (enforce)", fmt(strings, "RULES_ENFORCE_OK", { count: rules.length }), "RULES_ENFORCE_OK");

  // 7. Skills P0
  let skills = [];
  try { skills = collectSkills(KIT_DIR); } catch { /* ignore */ }
  const byId = new Map(skills.map((s) => [s.id, s]));
  for (const id of ["code-review", "refactor", "test-design"]) {
    const s = byId.get(id);
    if (!s) { err("Skills", fmt(strings, "SKILLS_P0_MISSING", { id }), "SKILLS_P0_MISSING"); continue; }
    if (!s.description) warn("Skills", fmt(strings, "SKILLS_P0_DESCRIPTION_MISSING", { id }), "SKILLS_P0_DESCRIPTION_MISSING");
    if (!OUTPUT_SECTION.test(s.body)) warn("Skills", fmt(strings, "SKILLS_P0_OUTPUT_SECTION_MISSING", { id }), "SKILLS_P0_OUTPUT_SECTION_MISSING");
  }
  // Skill schema / migration / target-capability warnings — each carries its own code.
  for (const w of collectBuildWarnings(KIT_DIR, cfg || {}, lang))
    warn("Skills", `[${w.target}] ${w.field} @ ${w.source}: ${w.message}${w.remediation ? ` -> ${w.remediation}` : ""}`, w.code || "SKILL_SCHEMA");
  if (clean("Skills")) ok("Skills", fmt(strings, "SKILLS_P0_OK"), "SKILLS_P0_OK");

  // 8. Roles
  let roles = [];
  try { roles = collectRoles(KIT_DIR); } catch { /* ignore */ }
  for (const role of roles) {
    const fm = role.fm || {};
    const n = fm.name || "?";
    // The multilingual, heuristic trigger-cue check now lives in validateRoleGovernance
    // (ROLE_DESCRIPTION_TRIGGER_WEAK, surfaced under "Config" above) — this legacy
    // check stayed English-literal-only and would just duplicate it less accurately.
    if (!fm.model) warn("Roles", fmt(strings, "ROLES_MODEL_MISSING", { name: n }), "ROLES_MODEL_MISSING");
    if (!fm.tools) warn("Roles", fmt(strings, "ROLES_TOOLS_MISSING", { name: n }), "ROLES_TOOLS_MISSING");
  }
  if (roles.length && clean("Roles")) ok("Roles", fmt(strings, "ROLES_OK", { count: roles.length }), "ROLES_OK");

  const errCount = R.filter((r) => r.level === "error").length;
  const warnCount = R.filter((r) => r.level === "warn").length;

  // ---- progressive-disclosure token budget (P2, opt-in via --tokens) ----
  // A documented ESTIMATE (chars/4), never presented as an exact count.
  const showTokens = process.argv.includes("--tokens");
  const tokenBudget = showTokens && cfg ? estimateTokenBudget(KIT_DIR, cfg) : null;

  // ---- machine-readable output (F-11) ----
  if (process.argv.includes("--json")) {
    const sevOf = { ok: "info", warn: "warning", error: "error" };
    const results = R
      .map((r) => ({ group: r.g, severity: sevOf[r.level], code: r.code || null, message: redactSecrets(r.m) }))
      .sort((a, b) => a.group.localeCompare(b.group) || String(a.code).localeCompare(String(b.code)) || a.message.localeCompare(b.message));
    process.stdout.write(JSON.stringify({
      schemaVersion: 1,
      tool: "smkit-doctor",
      project: cfg?.project?.name ?? null,
      summary: { errors: errCount, warnings: warnCount },
      results,
      ...(tokenBudget ? { tokenBudget } : {}),
    }, null, 2) + "\n");
    return errCount > 0 ? 1 : 0;
  }

  // ---- print ----
  console.log(`SM Kit doctor — ${cfg?.project?.name || "?"} (mode=${cfg?.mode || "?"}, profile=${cfg?.stack?.profile || "?"})\n`);
  const sym = { ok: "  ✔", warn: "  ⚠ [WARN]", error: "  ✖ [ERROR]" };
  for (const g of ["Node", "Config", "Paths", "Generated output", "Hooks", "Integrity", "Rules (enforce)", "Skills", "Roles"]) {
    const items = R.filter((r) => r.g === g);
    if (!items.length) continue;
    console.log(g);
    for (const it of items) console.log(`${sym[it.level]}${it.code ? ` [${it.code}]` : ""} ${it.m}`);
  }
  const errs = R.filter((r) => r.level === "error").length;
  const warns = R.filter((r) => r.level === "warn").length;
  console.log(`\nSummary: ${errs} error(s), ${warns} warning(s).`);

  if (tokenBudget) {
    const { alwaysLoaded, onDemand, estimateMethod } = tokenBudget;
    console.log(`\nToken budget (${estimateMethod}):`);
    console.log(`  Always-loaded: ~${alwaysLoaded.total} tokens`);
    console.log(`    rules (activation=always): ~${alwaysLoaded.rules.tokens} tokens, ${alwaysLoaded.rules.lines} lines` +
      (alwaysLoaded.rules.overTarget ? ` [OVER target of ${alwaysLoaded.rules.lineTarget} lines]` : ""));
    console.log(`    role catalog (name+description): ~${alwaysLoaded.roleCatalog.tokens} tokens`);
    console.log(`    skill catalog (name+description): ~${alwaysLoaded.skillCatalog.tokens} tokens`);
    console.log(`  On-demand (loaded only when triggered):`);
    console.log(`    path/glob-scoped rule bodies: ~${onDemand.pathScopedRules.tokens} tokens`);
    console.log(`    role prompts (per subagent invocation): ~${onDemand.rolePrompts.tokens} tokens`);
    console.log(`    skill bodies (per activation): ~${onDemand.skillBodies.tokens} tokens`);
  }

  return errs > 0 ? 1 : 0;
}

// ---- run ------------------------------------------------------------------

function main() {
  const mode = process.argv[2] || "build";
  if (mode === "doctor") { process.exit(runDoctor()); }
  const cfgPath = pp("kit.config.yaml");
  if (!existsSync(cfgPath)) {
    console.error(`No kit.config.yaml in ${PROJECT_DIR}. Run \`smkit init\` there first (or cd into the project).`);
    process.exit(1);
  }
  let cfg;
  try {
    cfg = parseYaml(readFileSync(cfgPath, "utf8"));
  } catch (e) {
    console.error(`Invalid kit.config.yaml — ${e.message}${e.hint ? ` -> ${e.hint}` : ""}. Nothing was generated.`);
    process.exit(1);
  }

  // Validate BEFORE touching the filesystem. A bad config must never produce a
  // partial or out-of-bounds generation, so we stop here — no mkdir/rm/write ran yet.
  const { errors, warnings } = validateConfig(cfg, { kitDir: KIT_DIR, projectDir: PROJECT_DIR, lang: langOf(cfg) });
  for (const w of warnings) console.error(`WARN: ${w}`);
  if (errors.length) {
    console.error(`Invalid kit.config.yaml — nothing was generated (${mode}):`);
    for (const e of errors) console.error(`  ✖ ${e}`);
    process.exit(1);
  }

  const outDir = cfg.outDir || "dist";
  // Surface skill schema / capability-drop warnings (never silent).
  for (const w of collectBuildWarnings(KIT_DIR, cfg, langOf(cfg)))
    console.error(`WARN [${w.code || "SKILL_SCHEMA"}] [${w.target}/${w.field}] ${w.source}: ${w.message}${w.remediation ? ` -> ${w.remediation}` : ""}`);
  const outputs = buildOutputs(cfg, { kitDir: KIT_DIR });
  // Keep an existing .claude/settings.json: merge the kit's hooks/deny into the
  // user's file instead of replacing it (check/build/doctor all reconcile the same
  // way, so the drift check stays clean).
  reconcileSettings(outputs, { projectDir: PROJECT_DIR, outDir });

  if (mode === "check") {
    let drift = 0;
    for (const [rel, content] of outputs) {
      const abs = pp(outDir, rel);
      const cur = existsSync(abs) ? readFileSync(abs, "utf8") : null;
      if (cur !== content) { console.error(`DRIFT: ${outDir}/${rel}`); drift++; }
    }
    if (drift) { console.error(`\n${drift} file(s) out of sync. Run: node tools/kitgen/kitgen.mjs build`); process.exit(1); }
    console.log(`OK — ${outputs.size} generated file(s) in sync (${outDir}/).`);
    return;
  }

  // build — apply via the ownership manifest: delete only files THIS kit generated
  // before (and only if unmodified), never blanket-delete a directory. User-authored
  // files that the kit doesn't generate are always left untouched.
  const force = process.argv.includes("--force");
  let res;
  try {
    res = applyBuild({ outDir, outputs, projectDir: PROJECT_DIR, force });
  } catch (e) {
    console.error(`Build failed while writing — rolled back, previous output left intact: ${e.message}`);
    process.exit(1);
  }
  for (const w of res.warnings) console.error(`WARN: ${w}`);
  console.log(`Built ${outputs.size} file(s) → ${outDir}/  (mode=${cfg.mode}, profile=${cfg.stack?.profile}, lang=${cfg.project?.language})`);
  if (res.deleted) console.log(`  removed ${res.deleted} stale generated file(s)`);
  if (res.backedUp) console.log(`  backed up ${res.backedUp} pre-existing file(s) → *.bak before overwriting`);
  if (res.skipped) console.log(`  skipped ${res.skipped} protected file(s) — rerun with --force to replace`);
  for (const rel of [...outputs.keys()].sort()) console.log(`  ${outDir}/${rel}`);
}

// Last-resort guard: an unexpected internal error must exit cleanly (exit 1) with a
// one-line message, never a raw stack trace. Filesystem safety is already handled inside
// main() — applyBuild is transactional and rolls back — so this only covers the
// read/validate/build phase before any write (and doctor, which writes nothing).
try {
  main();
} catch (e) {
  console.error(`smkit: unexpected error — nothing was written (${e?.message || e}).`);
  process.exit(1);
}
