// The Node version the scripts need. An older Node gets a warning on stderr, not a refusal.
// Keep this file in plain syntax: it must parse on an old Node, so that the warning can print.
const NEEDED = 24; // Node 20 ended on 2026-04-30 and Node 22 ends on 2027-04-30; Node 24 is supported until 2028-04-30

/** The warning for a Node version string such as "18.20.4", or undefined when it is new enough or cannot be read. */
function nodeWarning(version) {
  const major = parseInt(version, 10); // NaN when it cannot be read
  if (!(major < NEEDED)) return undefined;
  return `docent: warning: this is Node ${version}; Docent needs Node ${NEEDED} or newer. The scripts were not tested on it, so a drawing may be wrong or a script may fail.`;
}

/** Prints the warning, once, when this Node is too old. Each script calls it before it loads anything else. */
function warnOldNode() {
  const text = nodeWarning(process.versions.node);
  if (text) console.error(text);
}

module.exports = { NEEDED, nodeWarning, warnOldNode };
