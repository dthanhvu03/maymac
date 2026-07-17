#!/usr/bin/env node
// PreToolUse(Write|Edit) pre-build critique gate (trụ cột #2).
// In standard/strict, blocks the FIRST code write of a session until the change has
// been critiqued and recorded to .kit/state/gate.json; vibe only reminds. Docs, .kit,
// config, and generated agent config are never gated. Fails OPEN on any error so a bug
// never bricks the ability to edit. Enforcement is Claude-only (runs via settings.json);
// on other targets the matching rule is guidance, like every hook.
import { readFileSync } from "node:fs";
import { join, relative, isAbsolute } from "node:path";
import { projectDir, loadConfig, critiqueGateDecision } from "./_lib.mjs";

// A token is valid only if it carries a non-empty `decision` — proof a real critique
// happened, not an empty file. Session-start removes it, so each session needs one pass.
function tokenValid() {
  try {
    const t = JSON.parse(readFileSync(join(projectDir, ".kit", "state", "gate.json"), "utf8"));
    return !!(t && typeof t.decision === "string" && t.decision.trim());
  } catch { return false; }
}

function relPathOf(fp) {
  if (!fp) return "";
  try { return isAbsolute(fp) ? relative(projectDir, fp) : fp; }
  catch { return fp; }
}

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", async () => {
  let decision = "allow";
  let reason = "";
  try {
    const input = JSON.parse(raw || "{}");
    const ti = input.tool_input || {};
    const fp = ti.file_path || ti.path || "";
    const mode = (await loadConfig()).mode || "vibe";
    ({ decision, reason } = critiqueGateDecision({ relPath: relPathOf(fp), mode, hasToken: tokenValid() }));
  } catch { decision = "allow"; reason = ""; } // fail open

  // Only assert a decision when we actually BLOCK. For allow/exempt/token/vibe we emit
  // NO permissionDecision — deferring to the normal permission flow rather than
  // auto-approving the write. A blanket "allow" here would suppress the user's
  // confirmation prompt for every code edit once the gate is satisfied. A vibe-mode
  // reminder is surfaced on stderr (shown to the user, non-blocking) without approving.
  if (decision === "deny") {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
    }));
  } else if (reason) {
    process.stderr.write(`kit critique-gate: ${reason}\n`);
  }
  process.exit(0);
});
