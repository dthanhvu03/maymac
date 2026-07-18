// The kit's tooling runs on the DEV machine's Node — independent of the project's app
// runtime, which the kit never executes. The runtime works on ~Node 14+, but 18 is the
// tested floor. We WARN (not block): an older Node gets a clear, actionable message
// instead of a cryptic crash, while still running if it can.
export const NODE_FLOOR = 18;

// Pure so it's testable: returns the warning string, or null when the version is fine.
export function nodeWarning(major, version = String(major)) {
  if (!Number.isFinite(major) || major >= NODE_FLOOR) return null;
  return (
    `smkit: you're on Node ${version}; the kit's tooling targets Node >= ${NODE_FLOOR}. ` +
    `It may still work, but please install a newer Node (via nvm / volta). ` +
    `This is only about the kit's own tooling — your project's app runtime and version are untouched.`
  );
}

export function warnIfOldNode(out = process.stderr) {
  const version = process.versions.node;
  const msg = nodeWarning(Number.parseInt(version, 10), version);
  if (msg) out.write(msg + "\n");
}
