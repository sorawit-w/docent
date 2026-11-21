// Communication diagrams in UML notation. Lifelines are boxes; a link between two lifelines is one solid line; each
// message is written beside its link with its decimal number (1, 1.1, 1.2, 2), an optional guard or repeat, and a
// small arrow the way it travels. The numbers give the order, so nothing moves: there is no dot.
const { fail, words, id } = require("./blocks.cjs");
const { PHONE_NODE } = require("./graph.cjs");
const { boxShape } = require("./class.cjs");
const uml = require("./uml.cjs");

const MOST = { lifelines: 8, messages: 20, name: 28, text: 40 };
const NUMBER = /^[1-9]\d*(\.[1-9]\d*)*$/;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const list = (v, what) => (v == null ? [] : Array.isArray(v) ? v : fail(`"${what}" must be a list`));
const parts = (n) => n.split(".").map(Number);
const before = (a, b) => { const p = parts(a), q = parts(b); for (let i = 0; i < Math.min(p.length, q.length); i++) if (p[i] !== q[i]) return p[i] < q[i]; return p.length < q.length; };

/** The words beside the link: "1.1 [guard]: text" or "1.2 *[i=1..n]: text". */
const signature = (m) => `${m.n}${m.repeat ? ` *${m.repeat}` : m.guard ? ` ${m.guard}` : ""}: ${m.text}`;
const bracket = (v, what) => { const s = words(v, what, MOST.text); return s.startsWith("[") && s.endsWith("]") ? s : `[${s}]`; };

/** Checks communication diagram data and returns the model. */
function readCommunication(data) {
  if (data.place != null && data.place !== "flow") fail(`a communication diagram sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a communication diagram has no "form"; the renderer draws it, and a list on a phone`);
  const lifelines = list(data.lifelines, "lifelines").map((l, i) => {
    const what = `lifeline ${i + 1}`;
    if (!l || typeof l !== "object" || Array.isArray(l)) fail(`${what} must be an object with "id" and "name", such as "c : Cart"`);
    return { id: id(l.id, `the id of ${what}`), name: words(l.name, `the name of ${what}`, MOST.name) };
  });
  if (lifelines.length < 2 || lifelines.length > MOST.lifelines) fail(`a communication diagram has 2 to ${MOST.lifelines} lifelines; this one has ${lifelines.length}`);
  lifelines.forEach((l, i) => { if (lifelines.findIndex((o) => o.id === l.id) !== i) fail(`two lifelines have the id "${l.id}"`); });
  const at = (x, where) => lifelines.find((l) => l.id === x) || fail(`${where} names "${x}", which is not a lifeline`);
  const messages = list(data.messages, "messages").map((m, i) => {
    const what = `message ${i + 1}`;
    if (!m || typeof m !== "object" || Array.isArray(m)) fail(`${what} must be an object with "n", "from", "to" and "text"`);
    const n = typeof m.n === "string" || typeof m.n === "number" ? String(m.n) : fail(`the number "n" of ${what} is missing; write it like "1", "1.1" or "2"`);
    if (!NUMBER.test(n)) fail(`the number "${n}" of ${what} is not a decimal sequence number, such as "1", "1.1" or "2"`);
    if (m.guard != null && m.repeat != null) fail(`${what} has both a "guard" and a "repeat"; give one`);
    return { n, from: at(m.from, what), to: at(m.to, what), text: words(m.text, `the text of ${what}`, MOST.text), guard: m.guard == null ? "" : bracket(m.guard, `the guard of ${what}`), repeat: m.repeat == null ? "" : bracket(m.repeat, `the repeat of ${what}`) };
  });
  if (messages.length < 1 || messages.length > MOST.messages) fail(`a communication diagram has 1 to ${MOST.messages} messages; this one has ${messages.length}`);
  messages.forEach((m, i) => {
    if (i > 0 && !before(messages[i - 1].n, m.n)) fail(`message ${i + 1} is numbered ${m.n}, which does not come after ${messages[i - 1].n}; list the messages in number order, each number once`);
    const up = m.n.split(".").slice(0, -1).join(".");
    if (up && !messages.some((o) => o.n === up)) fail(`message ${m.n} is part of message ${up}, which is not in the list`);
  });
  // One link for each pair of lifelines that talk, plus any link with no message.
  const links = [];
  const linkOf = (a, b) => links.find((k) => (k.a === a && k.b === b) || (k.a === b && k.b === a));
  for (const m of messages) if (!linkOf(m.from, m.to)) links.push({ a: m.from, b: m.to });
  for (const [i, k] of list(data.links, "links").entries()) {
    const what = `link ${i + 1}`;
    const a = at(k?.from, what), b = at(k.to, what);
    if (linkOf(a, b)) fail(`${what} joins "${a.id}" and "${b.id}", which a message already joins; leave it out`);
    links.push({ a, b });
  }
  for (const l of lifelines) if (!links.some((k) => k.a === l || k.b === l)) fail(`the lifeline "${l.id}" has no link; give it a message, or leave it out`);
  for (const k of links) k.messages = messages.filter((m) => linkOf(m.from, m.to) === k);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "communication", lifelines, messages, links };
}

const shapeOf = (l, room) => boxShape({ name: l.name, lists: [] }, room);

/** The graph for graph.cjs. A link is drawn from the lifeline that sends its first message. */
function graphOf(model) {
  return {
    nodes: model.lifelines.map((l) => ({ id: l.id, ...shapeOf(l) })),
    edges: model.links.map((k) => ({ from: k.a.id, to: k.b.id, still: true, labels: k.messages.map((m) => ({ s: signature(m), at: "mid", arrow: m.from === k.a ? "forward" : "back" })) })),
    groups: [],
  };
}

/** The list for phones: each lifeline, and the messages it sends, in number order. */
function columnOf(model) {
  return model.lifelines.map((l) => ({
    node: { id: `${l.id}-phone`, ...shapeOf(l, PHONE_NODE) },
    rows: model.messages.filter((m) => m.from === l).map((m) => ({ end: "open", label: signature(m), target: m.to.name })),
  }));
}

/** The messages in number order, and the key to the marks. */
function wordsOf(model) {
  const lines = model.messages.map((m) => `<li>${esc(m.n)}. ${esc(m.from.name)} sends ${esc(m.text)} to ${m.to === m.from ? "itself" : esc(m.to.name)}${m.guard ? `, only if ${esc(m.guard.slice(1, -1))}` : ""}${m.repeat ? `, again and again: ${esc(m.repeat.slice(1, -1))}` : ""}.</li>`);
  const bare = model.links.filter((k) => !k.messages.length).map((k) => `<li>${esc(k.a.name)} and ${esc(k.b.name)} are linked, and send nothing here.</li>`);
  const used = ["lifeline", "link", "message", "number"];
  if (model.messages.some((m) => m.guard)) used.push("guard");
  if (model.messages.some((m) => m.repeat)) used.push("repeat");
  return `<ol>${lines.join("")}</ol>\n${bare.length ? `<ul>${bare.join("")}</ul>\n` : ""}${uml.keyHtml(used, OWN)}`;
}

const OWN = {
  lifeline: "A box: one participant, named role : Type.",
  link: "A solid line: the two participants know each other, so they can send messages.",
  message: "Text beside a line with a small arrow: a message, sent the way the arrow points.",
  number: "The number before a message: its order. 1.1 and 1.2 happen inside message 1, before message 2.",
  guard: "[condition] after the number: the message is sent only when the condition holds.",
  repeat: "*[…] after the number: the message is sent again and again, as the brackets say.",
};

module.exports = { readCommunication, graphOf, columnOf, wordsOf, MOST };
