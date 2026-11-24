// The list of rules (scripts/lib/rules.cjs): every error and warning of check names a rule on the list, and every rule on the list is
// reported somewhere in the scripts (docs/proposals/repo-config.md, section 9).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { RULES, HOUSE, GUARANTEE, LEFT_OUT, NUMBER_RULES, say, split, relabel } = require("../skills/docent/scripts/lib/rules.cjs");
const { checkDocument, main } = require("../skills/docent/scripts/check.cjs");
const hand = require("../skills/docent/scripts/lib/hand.cjs");

const skill = path.join(__dirname, "..", "skills", "docent");
const scripts = path.join(skill, "scripts");
const sources = [...fs.readdirSync(scripts).map((f) => path.join(scripts, f)), ...fs.readdirSync(path.join(scripts, "lib")).map((f) => path.join(scripts, "lib", f))]
  .filter((f) => f.endsWith(".cjs") && !f.endsWith("rules.cjs"));
const code = sources.map((f) => fs.readFileSync(f, "utf8")).join("\n");

test("every rule that the scripts report is on the list", () => {
  const reported = new Set([...code.matchAll(/(?<![.\w])(?:say|error|warn)\(\s*"([^"]+)"/g), ...code.matchAll(/\b(?:rule|id): "([a-z]+\.[\w.-]+)"/g)].map((m) => m[1]));
  assert.ok(reported.size > 100, `the scripts report ${reported.size} rules by name`);
  for (const id of reported) assert.ok(RULES.has(id), `"${id}" is reported in the scripts but not listed in rules.cjs`);
  assert.throws(() => say("cards.cuont", "x"), /check has no rule "cards\.cuont"; add it to scripts\/lib\/rules\.cjs/);
});

test("every rule on the list is reported somewhere in the scripts", () => {
  assert.deepEqual(LEFT_OUT, Object.keys(hand.LEFT_OUT), "the chart types left out are the ones hand.cjs leaves out");
  for (const id of RULES.keys()) {
    if (id.startsWith("hand.left-out.")) continue; // reported as `hand.left-out.${type}`, one ID for each type of LEFT_OUT
    if (Object.values(NUMBER_RULES).includes(id) && code.includes("NUMBER_RULES[")) continue; // reported by the rule's number in "Numbers"
    assert.ok(code.includes(`"${id}"`), `"${id}" is listed in rules.cjs, but no script reports it`);
  }
  for (const id of Object.values(NUMBER_RULES)) assert.ok(RULES.has(id));
});

test("each rule has a group, and names a part of the docs that exists", () => {
  const docs = { "DESIGN.md": "references/DESIGN.md", "SKILL.md": "SKILL.md", "diagrams.md": "references/diagrams.md", "widgets.md": "references/widgets.md" };
  const headings = Object.fromEntries(Object.entries(docs).map(([name, file]) => [name, new Set([...fs.readFileSync(path.join(skill, file), "utf8").matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1].trim()))]));
  for (const rule of RULES.values()) {
    assert.ok([HOUSE, GUARANTEE].includes(rule.group), rule.id);
    assert.match(rule.id, /^[a-z]+(\.[a-z0-9-]+)+$/, "an ID is a family and a name, joined by a dot");
    const [, file, part] = rule.where.match(/^([\w.]+), "(.+)"$/) || [];
    assert.ok(headings[file] && headings[file].has(part), `${rule.id}: ${rule.where} is not a heading`);
  }
});

test("the groups are the ones the proposal decided: house style may change, guarantees may not", () => {
  const house = ["numbers.rounding", "numbers.thousands", "numbers.ranges", "numbers.points", "numbers.change", "numbers.dates", "numbers.about",
    ...LEFT_OUT.map((t) => `hand.left-out.${t}`), "flat.gradient", "flat.shadow", "flat.filter", "text.uppercase", "title.format", "title.h1", "title.host", "title.docent",
    "credit.missing", "tagline.length", "tagline.markup", "cards.count", "findings.count", "widgets.most", "findings.lead", "findings.link", "steps.heading", "facts.joined",
    "diagram.twice", "diagram.advice", "profile.missing", "profile.suggest", "table.num", "table.total-row", "table.foot-rows", "footnotes.section", "footnotes.order",
    "footnotes.length", "sources.uncited", "sources.year", "sources.order", "sources.id", "sources.second", "source.outside", "source.empty", "method.parts", "status.words",
    "quote.speaker", "quote.marks", "quote.length", "quote.speaker-markup", "quote.outside", "accent.status", "accent.gray", "deck.widget", "logo.size"];
  const guarantees = ["host.contrast", "ground.pure", "table.sum", "source.chart", "numbers.minus", "findings.label", "sources.link-text", "personal.data", "skip.link", "tokens.kit", "kit.blocks", "network.src"];
  for (const id of house) assert.equal(RULES.get(id)?.group, HOUSE, id);
  for (const id of guarantees) assert.equal(RULES.get(id)?.group, GUARANTEE, id);
});

test("every error and warning of check starts with the ID of its rule", () => {
  const template = fs.readFileSync(path.join(skill, "assets", "template.html"), "utf8");
  const broken = fs.readFileSync(path.join(skill, "assets", "specimen.html"), "utf8")
    .replace("</head>", '<link rel="stylesheet" href="https://example.com/a.css"><style>.x { color: #fff; background: #fff; box-shadow: 0 0 1px; text-transform: uppercase; font-size: 10px; --bg: #eee; --host-accent: #1a7f37; }</style></head>')
    .replace("</main>", '<ul class="cards"><li>One</li></ul><p>A | B | C · D</p><blockquote><p>"Hi"</p></blockquote><p><small>-12 and 45-76 and ~250</small></p><p>Write to someone@company.com.</p></main>')
    .replace(/<title>.*<\/title>/, "<title>A page — Docent</title>");
  for (const html of [template, broken, "<p>No page at all</p>"]) {
    const { errors, warnings } = checkDocument(html);
    assert.ok(errors.length + warnings.length > 5);
    for (const line of [...errors, ...warnings]) assert.ok(RULES.has(split(line).id), `no rule ID: ${line}`);
  }
});

test("say, split and relabel keep the ID in front of the text", () => {
  assert.equal(say("cards.count", "a card grid has 10 cards"), "[cards.count] a card grid has 10 cards");
  assert.deepEqual(split("[cards.count] a card grid has 10 cards"), { id: "cards.count", text: "a card grid has 10 cards" });
  assert.deepEqual(split("a line with no rule"), { id: null, text: "a line with no rule" });
  assert.equal(relabel("[hand.size] rule 4, real size: …", "Figure 2, hand-drawn: "), "[hand.size] Figure 2, hand-drawn: rule 4, real size: …");
});

test("check --rules prints every rule once, with its group, and check names the rule on each line of its output", () => {
  const out = [];
  const log = console.log;
  console.log = (line) => out.push(String(line));
  try {
    assert.equal(main(["--rules"]), 0);
    const listed = out.join("\n").split("\n").slice(1);
    assert.equal(listed.length, RULES.size);
    assert.deepEqual(listed.map((l) => l.split(/\s+/)[0]), [...RULES.keys()]);
    assert.match(listed.find((l) => l.startsWith("cards.count ")), /^cards\.count\s+house style\s+DESIGN\.md, "Card grid"$/);
    assert.match(listed.find((l) => l.startsWith("host.contrast ")), /^host\.contrast\s+guarantee\s+DESIGN\.md, "Host tokens"$/);
    out.length = 0;
    const file = path.join(__dirname, "fixtures", "deck.html"); // not built, so check reports that the kit is missing
    assert.equal(main([file]), 1);
    assert.ok(out.some((l) => l === `check ${file}: error [kit.blocks]: the document has no kit styles; run stamp`), out.join("\n"));
  } finally {
    console.log = log;
  }
});
