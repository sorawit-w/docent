// The color rules: the dark accent worked out from a light one, and the distance to a status color, measured as the proposal measured them.
const test = require("node:test");
const assert = require("node:assert/strict");
const { contrast, lab, darkAccent, distance, nearestStatus, PAGE } = require("../skills/docent/scripts/lib/color.cjs");

test("a dark accent keeps the hue and reaches 7:1 on the dark page, close to what a person picks", () => {
  assert.deepEqual(["#2f3fd0", "#0b6e4f", "#c8102e", "#111111"].map(darkAccent), ["#a291ff", "#5ab08d", "#ff7570", "#a0a0a0"]);
  for (const light of ["#2f3fd0", "#0b6e4f", "#c8102e", "#a21caf", "#f2b824", "#000000"]) {
    const dark = darkAccent(light);
    assert.ok(contrast(dark, PAGE.dark) >= 7 && contrast(dark, PAGE.darkWell) >= 4.5, `${light} -> ${dark}`);
    if (lab(light).C > 10) assert.ok(Math.abs(lab(dark).h - lab(light).h) < 2, `${light} keeps its hue`);
  }
  assert.ok(distance(darkAccent("#2f3fd0"), "#8e9bff") < 11, "within 10.8 of Docent's hand-picked dark accent");
});

test("the distance to the nearest status color, in each theme", () => {
  assert.equal(nearestStatus("#c8102e", "light").name, "err");
  assert.equal(nearestStatus("#c8102e", "light").distance.toFixed(1), "4.3");
  assert.equal(nearestStatus("#0b6e4f", "light").distance.toFixed(1), "23.9");
  assert.ok(nearestStatus("#a21caf", "light").distance > 25 && nearestStatus("#ec6cf7", "dark").distance > 25, "the SKILL.md example is far from every status color");
});
