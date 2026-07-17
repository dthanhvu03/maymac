// smkit eval — a deterministic scorecard for the kit's HARD-tier guardrails.
//
// It exercises the mechanical guarantees end-to-end (the guard classifier, the critique
// gate decision, config validation, the prompt-injection rule actually being emitted,
// settings-merge, hook integrity) and reports pass/total. No model needed — this answers
// "does the enforcement machinery actually work?" as a number, not a claim.
//
// It does NOT measure soft-tier compliance (does a model follow the markdown rules) — that
// needs a model-graded run; see docs/enforcement-and-evals.md. Stated plainly so the score
// is never mistaken for "the AI always obeys".
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyCommand, critiqueGateDecision, isGateExempt } from "../../.kit/hooks/_lib.mjs";
import { buildOutputs } from "../../engine/emitter.mjs";
import { validateConfig } from "./validate.mjs";
import { mergeClaudeSettings } from "./settings-merge.mjs";
import { hookHashes } from "./integrity.mjs";
import { parseYaml } from "./yaml.mjs";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Each check is a pure predicate → true = the guardrail behaved correctly.
export function evalChecks(kitDir = KIT) {
  const cfg = parseYaml(readFileSync(join(kitDir, "kit.config.yaml"), "utf8"));
  const out = buildOutputs(cfg, { kitDir });
  const hardRules = out.get(".claude/rules/hard-rules.md") || "";
  const w = { mode: "strict", projDir: "/w/app" };

  return [
    ["guard blocks `rm -rf /`", () => classifyCommand("rm -rf /", w).decision === "block"],
    ["guard blocks a force push", () => classifyCommand("git push --force", w).decision !== "allow"],
    ["guard allows a safe `ls -la`", () => classifyCommand("ls -la", w).decision === "allow"],
    ["critique gate denies an unchallenged code write (strict)", () => critiqueGateDecision({ relPath: "src/app.ts", mode: "strict", hasToken: false }).decision === "deny"],
    ["critique gate opens once a token exists", () => critiqueGateDecision({ relPath: "src/app.ts", mode: "strict", hasToken: true }).decision === "allow"],
    ["critique gate never blocks kit/config paths", () => isGateExempt(".kit/state/gate.json") === true],
    ["prompt-injection hard rule is actually emitted", () => /prompt-injection|untrusted/i.test(hardRules)],
    ["invalid config is rejected before generation", () => validateConfig({ version: 2, project: { name: "x", language: "en" }, mode: "nope", stack: { profile: "generic" }, agents: ["claude"] }, { kitDir, projectDir: kitDir, lang: "en" }).errors.length > 0],
    ["settings-merge preserves a user's own hook", () => {
      const m = mergeClaudeSettings(
        { hooks: { PreToolUse: [{ matcher: "X", hooks: [{ type: "command", command: "mine" }] }] } },
        { hooks: { PreToolUse: [] } });
      return m.hooks.PreToolUse.some((e) => e.hooks?.[0]?.command === "mine");
    }],
    ["hook integrity map covers the runtime hooks", () => Object.keys(hookHashes(join(kitDir, ".kit", "hooks"))).length >= 6],
  ];
}

export function runEval(kitDir = KIT) {
  return evalChecks(kitDir).map(([name, fn]) => {
    try { return { name, pass: !!fn(), err: null }; }
    catch (e) { return { name, pass: false, err: e?.message || String(e) }; }
  });
}

// CLI: `smkit eval [--json]`
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("eval.mjs")) {
  const results = runEval();
  const passed = results.filter((r) => r.pass).length;
  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify({ tool: "smkit-eval", total: results.length, passed, score: passed / results.length, results }, null, 2) + "\n");
  } else {
    console.log("smkit eval — hard-tier guardrail compliance\n");
    for (const r of results) console.log(`  ${r.pass ? "✔" : "✖"} ${r.name}${r.err ? ` — ${r.err}` : ""}`);
    console.log(`\nScore: ${passed}/${results.length} guardrail checks passed.`);
    if (passed < results.length) console.log("A failed check means a mechanical guardrail is NOT enforcing what it should — fix before shipping.");
    console.log("(Hard-tier only. Soft-tier / model compliance needs a model-graded run — see docs/enforcement-and-evals.md.)");
  }
  process.exit(passed === results.length ? 0 : 1);
}
