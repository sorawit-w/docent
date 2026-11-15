// Widgets, tested against stored markup. Run with UPDATE=1 to store new expected output after a wanted change.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderWidget } = require("../skills/docent/scripts/lib/widget.cjs");
const { renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `widget-${name}.json`), "utf8"));

for (const kind of ["chooser", "checklist", "decision"]) {
  test(`a ${kind} matches the stored markup`, () => {
    const built = renderWidget(fixture(kind));
    assert.equal(built.kind, kind);
    const file = path.join(__dirname, "expected", `widget-${kind}.html`);
    if (process.env.UPDATE) fs.writeFileSync(file, built.html + "\n");
    assert.equal(built.html + "\n", fs.readFileSync(file, "utf8"), `widget-${kind}.html changed; look at the widget, then run with UPDATE=1`);
  });
}

test("each widget has a still form: it is readable with scripts off and on paper", () => {
  const chooser = renderWidget(fixture("chooser")).html;
  assert.equal((chooser.match(/<input type="radio"/g) || []).length, 3, "real radio buttons, so the styles alone show the chosen case");
  assert.equal((chooser.match(/ checked>/g) || []).length, 1, "the first case is chosen at the start");
  assert.equal((chooser.match(/<p class="case-t">/g) || []).length, 3, "each case carries its name, for paper");
  const checklist = renderWidget(fixture("checklist")).html;
  assert.equal((checklist.match(/<input type="checkbox"/g) || []).length, 4, "real boxes");
  assert.match(checklist, /<button class="wd-btn" type="reset">/, "the button clears the ticks without a script");
  const decision = renderWidget(fixture("decision")).html;
  assert.match(decision, /<details open>/, "the table of all cases is open until the page script closes it");
  assert.equal((decision.match(/<tr data-when="/g) || []).length, 4);
  assert.match(decision, /<tr data-when="0,1"><td>Any<\/td><td>Yes<\/td>/, "0 stands for any option");
  assert.match(decision, /<legend>How many people use it\?<\/legend>/, "the question is asked in full");
  assert.match(decision, /<th scope="col">People<\/th><th scope="col">Do you need <code>SSO<\/code>\?<\/th>/, "a column takes the short heading when the question has one");
});

test("a widget holds text only: every text is escaped, and `code` marks code", () => {
  const data = fixture("chooser");
  data.label = 'A <b>label</b> & "more"';
  data.cases[0].name = "<i>one</i>";
  data.cases[0].body = ['<script>alert(1)</script> and `<b>`', { code: '</code></pre><script>alert(2)</script>' }, { list: ['<img src="x.png">'] }];
  const { html } = renderWidget(data);
  for (const tag of ["<script", "<img", "<b>", "<i>"]) assert.ok(!html.includes(tag), `${tag} must not come through`);
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt; and <code>&lt;b&gt;</code>"));
  assert.ok(html.includes('aria-label="Code for &lt;i&gt;one&lt;/i&gt;"'));
  assert.match(renderWidget(fixture("chooser")).html, /Check that 2 &lt; 3 &amp; the folder exists\./);
});

test("wrong widget data is refused with a plain reason", () => {
  const broken = (name, change, reason) => { const copy = fixture(name); change(copy); assert.throws(() => renderWidget(copy), reason); };
  broken("chooser", (d) => (d.kind = "slider"), /"kind" must be "chooser", "checklist" or "decision"/);
  broken("chooser", (d) => (d.id = "Bad Id"), /"id" must be a short id/);
  broken("chooser", (d) => delete d.label, /"label" is missing/);
  broken("chooser", (d) => (d.cases.length = 1), /"cases" must have 2 to 5 entries; it has 1/);
  broken("chooser", (d) => (d.cases[1].name = "INSTALLER"), /two cases are named "INSTALLER"/);
  broken("chooser", (d) => (d.cases[0].html = "<p>x</p>"), /case 1 has the field "html", which a widget does not know/);
  broken("chooser", (d) => (d.cases[0].body = [{ table: [] }]), /case 1, block 1 must be a text, or an object with "code", "list" or "steps"/);
  broken("chooser", (d) => (d.cases[0].name = "x".repeat(30)), /30 characters long; the most is 24/);
  broken("checklist", (d) => (d.items.length = 1), /"items" must have 2 to 12 entries/);
  broken("checklist", (d) => (d.items[0] = { note: "x" }), /the text of item 1 is missing/);
  broken("decision", (d) => (d.answers[0].when = ["One"]), /"when" of answer 1 must name one option, or "any", for each of the 2 questions/);
  broken("decision", (d) => (d.answers[0].when = ["Two", "No"]), /answer 1 names "Two" for question 1; its options are "One", "2 to 10", "More", or "any"/);
  broken("decision", (d) => d.answers.splice(0, 1), /no answer fits "One" and "No"; every mix of options needs one answer/);
  broken("decision", (d) => (d.answers[3].when = ["any", "any"]), /answers 1 and 4 both fit "One" and "No"/);
  broken("decision", (d) => (d.questions[1].options = ["Any", "No"]), /an option named "any"/);
  broken("decision", (d) => d.questions.push({ text: "a?", options: ["x", "y"] }, { text: "b?", options: ["x", "y"] }), /"questions" must have 1 to 3 entries; it has 4/);
});

test("render builds every widget block of a document in place, and gives the same result when it runs again", () => {
  const data = JSON.stringify(fixture("checklist"), null, 1);
  const page = `<main>\n<!-- docent:widget\n${data}\n-->\n<!-- /docent:widget -->\n<p>text</p>\n<!-- docent:widget\n${data.replace('"release"', '"again"')}\n-->\nold markup\n<!-- /docent:widget -->\n</main>`;
  const first = renderDocument(page);
  assert.deepEqual(first.widgets.map((r) => [r.id, r.form, r.error]), [["release", "checklist", null], ["again", "checklist", null]]);
  assert.ok(first.html.includes('<form class="checks" id="wd-release"') && first.html.includes('id="wd-again"') && !first.html.includes("old markup"));
  assert.ok(first.html.includes(data), "the data stays in the document");
  assert.equal(renderDocument(first.html).html, first.html);
  assert.match(renderDocument(page.replace('"again"', '"release"')).widgets[1].error, /two widgets have the id "release"/);
  const refused = renderDocument("<!-- docent:widget\n{\"id\": \"x\", \"kind\": \"checklist\", \"label\": \"L\", \"items\": [\"one\"]}\n-->\nkept as it was\n<!-- /docent:widget -->");
  assert.match(refused.widgets[0].error, /"items" must have 2 to 12 entries/);
  assert.ok(refused.html.includes("kept as it was"), "a refused block stays as it was");
});

test("the examples in references/widgets.md are built without an error", () => {
  const guide = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "references", "widgets.md"), "utf8");
  const pages = [...guide.matchAll(/```html\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.equal(pages.length, 3, "one example for each kind");
  const kinds = pages.map((page) => { const { widgets } = renderDocument(page); assert.deepEqual(widgets.map((w) => w.error), [null]); return widgets[0].form; });
  assert.deepEqual(kinds, ["chooser", "checklist", "decision"]);
});
