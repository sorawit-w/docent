const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { nodeWarning, NEEDED } = require("../skills/docent/scripts/lib/node.cjs");

test("the minimum is Node 24", () => {
  assert.equal(NEEDED, 24);
});

test("a Node older than 24 gets a warning that names the version", () => {
  for (const version of ["18.20.4", "22.11.0"]) {
    const text = nodeWarning(version);
    assert.match(text, new RegExp(`^docent: warning: this is Node ${version.replace(/\./g, "\\.")}; Docent needs Node 24 or newer\\.`));
    assert.ok(!text.includes("\n"), "one line");
  }
});

test("Node 24 and newer get no warning", () => {
  for (const version of ["24.0.0", "24.20.0", "26.1.0"]) assert.equal(nodeWarning(version), undefined);
});

test("a version that cannot be read gets no warning", () => {
  assert.equal(nodeWarning(""), undefined);
  assert.equal(nodeWarning("unknown"), undefined);
});

test("each script warns before it loads anything else", () => {
  for (const name of ["render", "stamp", "check", "brand"]) {
    const lines = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "scripts", `${name}.cjs`), "utf8").split("\n");
    const first = lines.findIndex((l) => /^(const|let|var) |require\(/.test(l));
    assert.match(lines[first], /^require\("\.\/lib\/node\.cjs"\)\.warnOldNode\(\);/, `${name}.cjs warns first`);
  }
});
