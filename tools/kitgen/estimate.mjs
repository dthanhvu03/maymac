// Machine-readable task estimates. A task file (.kit/tasks/<id>.md) carries a fenced
// `estimate:` yaml block; this parses and sanity-checks it so tooling can act on the
// numbers (flag an XL task to slice, flag a low-confidence guess) instead of the size
// living only as prose. An estimate is a JUSTIFIED judgement, not a guarantee — the
// `basis` field is what separates a real estimate from a vibe.
import { parseYaml } from "./yaml.mjs";

export const COMPLEXITY = ["S", "M", "L", "XL"];
export const RISK = ["low", "medium", "high"];

// Extract + validate the estimate from a task markdown string.
// Returns { estimate, warnings }. `estimate` is null if no parseable block is present.
export function parseEstimate(md) {
  const warnings = [];
  let estimate = null;
  for (const m of String(md).matchAll(/```ya?ml\s*\n([\s\S]*?)```/gi)) {
    try {
      const y = parseYaml(m[1]);
      if (y && typeof y === "object" && y.estimate && typeof y.estimate === "object") { estimate = y.estimate; break; }
    } catch { /* not a valid yaml block — keep looking */ }
  }
  if (!estimate) return { estimate: null, warnings: ["no machine-readable estimate block found"] };

  if (!COMPLEXITY.includes(estimate.complexity))
    warnings.push(`complexity must be one of ${COMPLEXITY.join(" / ")} (got ${JSON.stringify(estimate.complexity)})`);
  else if (estimate.complexity === "XL")
    warnings.push("XL — slice the task smaller before starting");

  const c = Number(estimate.confidence);
  if (!Number.isFinite(c) || c < 0 || c > 1) warnings.push("confidence must be a number 0..1");
  else if (c < 0.4) warnings.push("low confidence (<0.4) — treat the estimate as speculative; cut scope or de-risk first");

  if (estimate.risk !== undefined && !RISK.includes(estimate.risk))
    warnings.push(`risk must be one of ${RISK.join(" / ")} (got ${JSON.stringify(estimate.risk)})`);

  const basis = String(estimate.basis ?? "").trim();
  if (!basis || /^<.*>$/.test(basis))
    warnings.push("basis is empty — a number with no basis is a guess, not an estimate");

  return { estimate, warnings };
}
