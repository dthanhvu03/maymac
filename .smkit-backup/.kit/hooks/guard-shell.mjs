#!/usr/bin/env node
// PreToolUse(Bash) guard v2. Segment-aware, path-boundary aware, audited.
// - splits the command on ; | & && || and checks EACH segment (fixes chaining like
//   `echo x && rm -rf`), resolves path args against a tiered boundary, and detects
//   network→shell pipes and embedded/obfuscated code.
// - BLOCK (exit 2) / WARN (allow + reason) / ALLOW (silent) by mode.
// - Fail-CLOSED on unparseable input. Every decision is appended to .kit/audit.log.
// NOT isolation — this is damage-control for honest mistakes; use the OS sandbox for real containment.
import { loadBlocklist, loadConfig, classifyCommand, auditLog } from "./_lib.mjs";

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", async () => {
  const [block, cfg] = await Promise.all([loadBlocklist(), loadConfig()]);
  const mode = cfg.mode || "vibe";

  let cmd;
  try {
    const input = JSON.parse(raw || "{}");
    cmd = input.tool_input?.command || "";
  } catch {
    auditLog({ ts: Date.now(), decision: "block", reason: "unparseable tool input", cmd: null });
    process.stderr.write("kit guardrail: could not parse tool input; blocking to be safe.\n");
    process.exit(2);
  }

  // Fail CLOSED on an unexpected analysis error — block rather than let an
  // un-analysed command through (consistent with the unparseable-input path above).
  let decision, reason, segment;
  try {
    ({ decision, reason, segment } = classifyCommand(cmd, { mode, block }));
  } catch (e) {
    auditLog({ ts: Date.now(), mode, decision: "block", reason: `guard internal error: ${e?.message || e}`, cmd });
    process.stderr.write("kit guardrail: internal error analysing the command; blocking to be safe.\n");
    process.exit(2);
  }
  auditLog({ ts: Date.now(), mode, decision, reason, segment, cmd });

  if (decision === "block") {
    process.stderr.write(
      `Blocked by kit guardrail: ${reason}${segment && segment !== cmd ? ` (in: ${segment})` : ""}. ` +
      `Blocked in all modes. If truly needed, run it manually outside the agent.\n`
    );
    process.exit(2);
  }
  if (decision === "warn") {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: `kit guardrail WARNING: ${reason}. Proceed only if you understand it.`,
      },
    }));
  }
  process.exit(0);
});
