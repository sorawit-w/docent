// From widget data to markup: a chooser, a checklist or a decision helper.
// The author writes text only. Every text is escaped, so a widget cannot carry markup or a script of its own.
// Each widget is readable with scripts off and on paper; the page script adds memory and the answer of a decision helper.
const { fail, words, id } = require("./blocks.cjs");

const KINDS = ["chooser", "checklist", "decision"];
const MOST = { cases: 5, blocks: 8, items: 12, questions: 3, options: 4, answers: 12, label: 60, name: 24, option: 32, short: 32, line: 160, note: 160, para: 400, code: 1200, question: 80, title: 48 };
const ARROW = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2.5 8 6l-3.5 3.5"/></svg>';

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Text between two ` marks is code. Nothing else in a text has a meaning.
const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

const list = (value, what, least, most) => {
  if (!Array.isArray(value)) fail(`${what} must be a list`);
  if (value.length < least || value.length > most) fail(`${what} must have ${least} to ${most} entries; it has ${value.length}`);
  return value;
};
const unique = (names, what) => names.forEach((name, i) => { if (names.findIndex((other) => other.toLowerCase() === name.toLowerCase()) !== i) fail(`two ${what} are named "${name}"`); });
const only = (object, keys, what) => { for (const key of Object.keys(object)) if (!keys.includes(key)) fail(`${what} has the field "${key}", which a widget does not know; the fields are ${keys.map((k) => `"${k}"`).join(", ")}`); };

/** One block of a case: a paragraph, a code block, a list or numbered steps. */
function bodyBlock(item, what, caseName, codes) {
  if (typeof item === "string") return `<p>${inline(words(item, what, MOST.para))}</p>`;
  if (!item || typeof item !== "object" || Array.isArray(item)) fail(`${what} must be a text, or an object with "code", "list" or "steps"`);
  if (item.code != null) {
    only(item, ["code", "label"], what);
    if (typeof item.code !== "string" || !item.code.trim()) fail(`${what}: "code" must be text`);
    const code = item.code.replace(/\s+$/, "");
    if (code.length > MOST.code) fail(`${what}: the code is ${code.length} characters long; the most is ${MOST.code}`);
    codes.n += 1;
    const label = item.label != null ? words(item.label, `${what}: "label"`, MOST.label) : `Code for ${caseName}${codes.n > 1 ? `, ${codes.n}` : ""}`;
    return `<pre tabindex="0" role="region" aria-label="${esc(label)}"><code>${esc(code)}</code></pre>`;
  }
  for (const [key, tag] of [["list", "ul"], ["steps", "ol"]]) {
    if (item[key] == null) continue;
    only(item, [key], what);
    const lines = list(item[key], `${what}: "${key}"`, 1, MOST.items).map((line, i) => `<li>${inline(words(line, `${what}: line ${i + 1}`, MOST.line))}</li>`);
    return `<${tag}>\n${lines.join("\n")}\n</${tag}>`;
  }
  return fail(`${what} must be a text, or an object with "code", "list" or "steps"`);
}

/** A chooser: the reader picks one case, and only that case shows. With scripts off it still works; on paper every case prints. */
function chooser(data, w) {
  only(data, ["id", "kind", "label", "cases"], "the chooser");
  const cases = list(data.cases, '"cases"', 2, MOST.cases).map((c, i) => {
    if (!c || typeof c !== "object") fail(`case ${i + 1} must be an object with "name" and "body"`);
    only(c, ["name", "body"], `case ${i + 1}`);
    const name = words(c.name, `the name of case ${i + 1}`, MOST.name), codes = { n: 0 };
    const body = list(c.body, `the body of case ${i + 1}`, 1, MOST.blocks).map((item, j) => bodyBlock(item, `case ${i + 1}, block ${j + 1}`, name, codes));
    return { name, body };
  });
  unique(cases.map((c) => c.name), "cases");
  const options = cases.map((c, i) => `<input type="radio" name="${w.id}" id="${w.id}-${i + 1}"${i ? "" : " checked"}><label class="opt" for="${w.id}-${i + 1}">${esc(c.name)}</label>`);
  const panels = cases.map((c) => `<div class="case">\n<p class="case-t">${esc(c.name)}</p>\n${c.body.join("\n")}\n</div>`);
  return {
    key: cases.map((c) => c.name).join("|"),
    html: `<div class="choose" id="${w.id}" role="group" aria-labelledby="${w.id}-t">\n<span class="wd-t" id="${w.id}-t">${esc(w.label)}</span>\n${options.join("\n")}\n${panels.join("\n")}\n</div>`,
  };
}

/** A checklist: the reader ticks each line. The page script remembers the ticks and counts them. */
function checklist(data, w) {
  only(data, ["id", "kind", "label", "items"], "the checklist");
  const items = list(data.items, '"items"', 2, MOST.items).map((item, i) => {
    const what = `item ${i + 1}`;
    if (typeof item === "string") return { text: words(item, what, MOST.line), note: "" };
    if (!item || typeof item !== "object") fail(`${what} must be a text, or an object with "text" and "note"`);
    only(item, ["text", "note"], what);
    return { text: words(item.text, `the text of ${what}`, MOST.line), note: words(item.note, `the note of ${what}`, MOST.note, false) };
  });
  const lines = items.map((item, i) => `<li><input type="checkbox" id="${w.id}-${i + 1}"><label for="${w.id}-${i + 1}">${inline(item.text)}${item.note ? `<span class="sub">${inline(item.note)}</span>` : ""}</label></li>`);
  return {
    key: null,
    html: `<form class="checks" id="${w.id}" aria-labelledby="${w.id}-t">\n<p class="wd-t" id="${w.id}-t">${esc(w.label)}</p>\n<ul>\n${lines.join("\n")}\n</ul>\n<p class="wd-foot"><output></output><button class="wd-btn" type="reset">Clear the ticks</button></p>\n</form>`,
  };
}

/** A decision helper: the reader answers the questions and gets the one answer that fits. Its still form is the table of all cases. */
function decision(data, w) {
  only(data, ["id", "kind", "label", "questions", "answers"], "the decision helper");
  const questions = list(data.questions, '"questions"', 1, MOST.questions).map((q, i) => {
    if (!q || typeof q !== "object") fail(`question ${i + 1} must be an object with "text" and "options"`);
    only(q, ["text", "short", "options"], `question ${i + 1}`);
    const options = list(q.options, `the options of question ${i + 1}`, 2, MOST.options).map((o, j) => words(o, `option ${j + 1} of question ${i + 1}`, MOST.option));
    unique(options, `options of question ${i + 1}`);
    if (options.some((o) => o.toLowerCase() === "any")) fail(`question ${i + 1} has an option named "any"; in an answer, "any" stands for every option`);
    const text = words(q.text, `the text of question ${i + 1}`, MOST.question);
    // The table of all cases has one column for each question. "short" is the heading of that column; without it the question is the heading.
    return { text, short: words(q.short, `"short" of question ${i + 1}`, MOST.short, false) || text, options };
  });
  const answers = list(data.answers, '"answers"', 2, MOST.answers).map((a, i) => {
    const what = `answer ${i + 1}`;
    if (!a || typeof a !== "object") fail(`${what} must be an object with "when", "title" and "text"`);
    only(a, ["when", "title", "text"], what);
    if (!Array.isArray(a.when) || a.when.length !== questions.length) fail(`"when" of ${what} must name one option, or "any", for each of the ${questions.length} questions`);
    // 0 stands for any option; otherwise the number of the option, from 1.
    const when = a.when.map((name, q) => {
      if (name === "any") return 0;
      const at = questions[q].options.indexOf(name);
      return at < 0 ? fail(`${what} names "${name}" for question ${q + 1}; its options are ${questions[q].options.map((o) => `"${o}"`).join(", ")}, or "any"`) : at + 1;
    });
    return { when, title: words(a.title, `the title of ${what}`, MOST.title), text: words(a.text, `the text of ${what}`, MOST.note) };
  });
  // Every mix of options must fit exactly one answer, so the reader always gets one.
  const mixes = questions.reduce((all, q) => all.flatMap((mix) => q.options.map((_, o) => [...mix, o + 1])), [[]]);
  for (const mix of mixes) {
    const fits = answers.flatMap((a, i) => (a.when.every((w_, q) => !w_ || w_ === mix[q]) ? [i + 1] : []));
    const named = mix.map((o, q) => `"${questions[q].options[o - 1]}"`).join(" and ");
    if (!fits.length) fail(`no answer fits ${named}; every mix of options needs one answer`);
    if (fits.length > 1) fail(`answers ${fits.join(" and ")} both fit ${named}; every mix of options needs exactly one answer`);
  }
  const asks = questions.map((q, i) => {
    const name = `${w.id}-q${i + 1}`;
    return `<fieldset><legend>${inline(q.text)}</legend>\n${q.options.map((o, j) => `<input type="radio" name="${name}" id="${name}-${j + 1}"><label class="opt" for="${name}-${j + 1}">${esc(o)}</label>`).join("\n")}\n</fieldset>`;
  });
  const rows = answers.map((a) => `<tr data-when="${a.when.join(",")}">${a.when.map((o, q) => `<td>${o ? esc(questions[q].options[o - 1]) : "Any"}</td>`).join("")}<td><strong>${inline(a.title)}</strong>${inline(a.text)}</td></tr>`);
  return {
    key: null,
    html: [
      `<div class="decide" id="${w.id}">`,
      `<p class="wd-t" id="${w.id}-t">${esc(w.label)}</p>`,
      `<form class="decide-ask" aria-labelledby="${w.id}-t">`,
      ...asks,
      `<output class="decide-out"></output>`,
      `<p class="wd-foot"><button class="wd-btn" type="reset">Start again</button></p>`,
      `</form>`,
      `<details open>`,
      `<summary>${ARROW}All cases</summary>`,
      `<div class="table-wrap" role="region" aria-label="All cases: ${esc(w.label)}" tabindex="0">`,
      `<table>`,
      `<thead><tr>${questions.map((q) => `<th scope="col">${inline(q.short)}</th>`).join("")}<th scope="col">Answer</th></tr></thead>`,
      `<tbody>`,
      ...rows,
      `</tbody>`,
      `</table>`,
      `</div>`,
      `</details>`,
      `</div>`,
    ].join("\n"),
  };
}

/**
 * Builds one widget. Returns { id, kind, html, key, warnings }. Throws when the data is wrong.
 * key: choosers with the same key change together; null for the other kinds.
 */
function renderWidget(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail("the widget data must be one JSON object");
  if (!KINDS.includes(data.kind)) fail(`"kind" must be "chooser", "checklist" or "decision"`);
  const w = { id: `wd-${id(data.id, '"id"')}`, label: words(data.label, '"label"', MOST.label) };
  const built = { chooser, checklist, decision }[data.kind](data, w);
  return { id: data.id, kind: data.kind, html: built.html, key: built.key, warnings: [] };
}

module.exports = { renderWidget, KINDS, MOST };
