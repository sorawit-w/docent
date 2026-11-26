// Class and object diagrams in UML notation. A class is a box with its name, its attributes and its operations;
// relations are associations (with names, roles, multiplicities and a direction), aggregation, composition,
// generalization, realization and dependency; a note hangs on a class with a dashed line. An object is a box with
// "name : Class" underlined and its slots; links join objects. Both are structural kinds: nothing moves, no dot.
// The data becomes a graph for graph.cjs (a parent above its children, a whole above its parts), a list of cards
// for phones, and the classes and relations in words with a key to the marks.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const uml = require("./uml.cjs");
const { wrap, PHONE_NODE } = require("./graph.cjs");

const MOST = { classes: 16, relations: 24, members: 8, notes: 4, objects: 12, links: 16, slots: 8, name: 28, member: 40, stereotype: 20, label: 24, note: 80 };
const TYPES = ["association", "aggregation", "composition", "generalization", "realization", "dependency"];
const MULT = /^(\d+|\*)(\.\.(\d+|\*))?$/;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => String(Math.round(v * 100) / 100);
const an = (s) => (/^[aeiou]/i.test(s) ? "an" : "a");

/** Splits a member into lines no wider than room, at spaces; a member that fits keeps one line. */
const fit = (s, room) => (textWidth(s, 12) <= room ? [s] : wrapAt(s, room));
function wrapAt(s, room) {
  const out = [];
  for (const w of s.split(" ")) { const last = out.length ? `${out.at(-1)} ${w}` : w; if (out.length && textWidth(last, 12) <= room) out[out.length - 1] = last; else out.push(w); }
  return out;
}

/**
 * A box with compartments: a header (a stereotype line, then the name), then each list of members. Each member is
 * { s, italic?, under? }. room: the widest the box may be, so members wrap on a phone.
 */
function boxShape({ name, stereotype, italic, under, lists }, room = Infinity) {
  const nameLines = textWidth(name, 14, 600) + 32 <= room ? [name] : wrap(name, "name", room - 32);
  const inner = Math.min(room, 400) - 24;
  const parts = lists.map((list) => list.map((m) => ({ ...m, lines: fit(m.s, inner) })));
  const w = Math.max(120, textWidth(stereotype ? `«${stereotype}»` : "", 12) + 32, ...nameLines.map((l) => textWidth(l, 14, 600) + 32), ...parts.flat().flatMap((m) => m.lines.map((l) => textWidth(l, 12) + 24)));
  const head = (stereotype ? 18 : 0) + 18 * nameLines.length + 14;
  const heights = parts.map((list) => Math.max(12, 8 + 18 * list.reduce((n, m) => n + m.lines.length, 0)));
  const h = head + heights.reduce((a, b) => a + b, 0);
  return {
    w, h, grow: true,
    draw: (cx, cy, W = w, H = h) => {
      const x = cx - W / 2, y = cy - H / 2;
      const rules = [];
      let yy = y + head;
      for (const hh of heights) { rules.push(yy); yy += hh; }
      let svg = uml.shapes.compartments({ x, y, w: W, h: H }, rules);
      let ty = y + 20;
      if (stereotype) { svg += `<text x="${num(cx)}" y="${num(ty - 2)}" class="u-mem" text-anchor="middle">«${esc(stereotype)}»</text>`; ty += 18; }
      for (const l of nameLines) { svg += `<text x="${num(cx)}" y="${num(ty)}" class="name${italic ? " u-it" : ""}${under ? " u-ul" : ""}" text-anchor="middle">${esc(l)}</text>`; ty += 18; }
      parts.forEach((list, k) => {
        let my = rules[k] + 18;
        for (const m of list) for (const l of m.lines) { svg += `<text x="${num(x + 12)}" y="${num(my)}" class="u-mem${m.italic ? " u-it" : ""}${m.under ? " u-ul" : ""}">${esc(l)}</text>`; my += 18; }
      });
      return { svg, texts: [] };
    },
  };
}

/** A note: a box with a folded corner and its text. */
function noteShape(n, room = 200) {
  const lines = wrap(n.text, "sub", Math.min(room, 200) - 28);
  const w = Math.max(80, ...lines.map((l) => textWidth(l, 12) + 28)), h = 16 + 18 * lines.length;
  return {
    w, h, grow: true,
    draw: (cx, cy, W = w, H = h) => ({ svg: uml.shapes.note({ x: cx - W / 2, y: cy - H / 2, w: W, h: H }), texts: lines.map((s, k) => ({ x: cx - W / 2 + 12, y: cy - H / 2 + 22 + 18 * k, s, cls: "sub", anchor: "start" })) }),
  };
}

/** A member: a string, or { text, static, abstract }. */
function member(m, what) {
  if (typeof m === "string") return { s: words(m, what, MOST.member) };
  if (!m || typeof m !== "object" || Array.isArray(m)) fail(`${what} must be text, or an object with "text"`);
  return { s: words(m.text, what, MOST.member), under: Boolean(m.static), italic: Boolean(m.abstract) };
}

const list = (v, what, most) => {
  if (v == null) return [];
  if (!Array.isArray(v)) fail(`${what} must be a list`);
  if (v.length > most) fail(`${what} has ${v.length} entries; at most ${most}`);
  return v;
};

function readNotes(data, nodes) {
  return list(data.notes, '"notes"', MOST.notes).map((n, i) => {
    const what = `note ${i + 1}`;
    if (!n || typeof n !== "object") fail(`${what} must be an object with "id", "text" and "on"`);
    const on = nodes.find((c) => c.id === n.on) || fail(`${what} is on "${n.on}", which is not in the diagram`);
    return { id: id(n.id, `the id of ${what}`), text: words(n.text, `the text of ${what}`, MOST.note), on };
  });
}

const header = (data, kind) => {
  if (data.place != null && data.place !== "flow") fail(`${kind} sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`${kind} has no "form"; the renderer draws it, and a list of cards on a phone`);
};

/** Checks class diagram data and returns the model. */
function readClass(data) {
  header(data, "a class diagram");
  for (const key of ["classes", "relations"]) if (!Array.isArray(data[key])) fail(`"${key}" must be a list`);
  if (data.classes.length < 1 || data.classes.length > MOST.classes) fail(`a class diagram has 1 to ${MOST.classes} classes; this one has ${data.classes.length}`);
  if (data.relations.length > MOST.relations) fail(`a class diagram has at most ${MOST.relations} relations; this one has ${data.relations.length}`);
  const classes = data.classes.map((c, i) => {
    const what = `class ${i + 1}`;
    if (!c || typeof c !== "object" || Array.isArray(c)) fail(`${what} must be an object with "id" and "name"`);
    const cid = id(c.id, `the id of ${what}`);
    const stereotype = words(c.stereotype, `the stereotype of ${what}`, MOST.stereotype, false);
    if (/^«|»$|^<<|>>$/.test(stereotype)) fail(`the stereotype of ${what} has guillemets; write it without them, such as "interface", and the renderer adds them`);
    const attributes = list(c.attributes, `the attributes of ${what}`, MOST.members).map((m, k) => member(m, `attribute ${k + 1} of ${what}`));
    const operations = list(c.operations, `the operations of ${what}`, MOST.members).map((m, k) => member(m, `operation ${k + 1} of ${what}`));
    if (attributes.some((m) => m.italic)) fail(`an attribute of ${what} is abstract; only an operation can be abstract`);
    return { kind: "class", index: i, id: cid, name: words(c.name, `the name of ${what}`, MOST.name), stereotype, abstract: Boolean(c.abstract), attributes, operations };
  });
  classes.forEach((c, i) => { if (classes.findIndex((o) => o.id === c.id) !== i) fail(`two classes have the id "${c.id}"`); });
  const at = (cid, where) => classes.find((c) => c.id === cid) || fail(`${where} names "${cid}", which is not a class`);
  const relations = data.relations.map((r, i) => {
    const what = `relation ${i + 1}`;
    if (!r || typeof r !== "object" || Array.isArray(r)) fail(`${what} must be an object with "from" and "to"`);
    const type = r.type ?? "association";
    if (!TYPES.includes(type)) fail(`the type of ${what} must be one of ${TYPES.join(", ")}`);
    const from = at(r.from, what), to = at(r.to, what);
    if (from === to && type !== "association") fail(`${what} is a ${type} from "${from.id}" to itself; only an association may go to its own class`);
    const ends = (key, check) => {
      if (r[key] == null) return ["", ""];
      if (!Array.isArray(r[key]) || r[key].length !== 2) fail(`the ${key} of ${what} must be a list of two: one for the "from" end, one for the "to" end; write "" for an end with none`);
      return r[key].map((v, k) => { const s = words(v, `the ${key} of ${what}`, MOST.label, false); if (s && check) check(s, k); return s; });
    };
    const multiplicity = ends("multiplicity", (s) => { if (!MULT.test(s)) fail(`the multiplicity "${s}" of ${what} is not a UML multiplicity, such as "1", "0..1", "*" or "1..*"`); });
    const roles = ends("roles");
    const structural = ["association", "aggregation", "composition"].includes(type);
    if (!structural && (r.multiplicity != null || r.roles != null)) fail(`${what} is a ${type}, which has no multiplicities or roles`);
    if (r.navigable != null && type !== "association") fail(`only an association has "navigable"`);
    if (r.stereotype != null && type !== "dependency") fail(`only a dependency has a "stereotype", such as "use" or "create"`);
    const label = type === "dependency" ? (r.stereotype ? `«${words(r.stereotype, `the stereotype of ${what}`, MOST.stereotype)}»` : "") : words(r.name, `the name of ${what}`, MOST.label, false);
    if (r.name != null && !structural) fail(`${what} is a ${type}, which has no name`);
    if (type === "realization" && !/interface/i.test(to.stereotype)) fail(`${what} realizes "${to.id}", which is not an interface; give "${to.id}" the stereotype "interface", or use a generalization`);
    return { n: i, type, from, to, label, multiplicity, roles, navigable: Boolean(r.navigable) };
  });
  // A class that is a kind of itself, by a chain, is not a class.
  const parents = (c) => relations.filter((r) => (r.type === "generalization" || r.type === "realization") && r.from === c).map((r) => r.to);
  const path = new Set(), done = new Set();
  const walk = (c) => { if (path.has(c)) fail(`the class "${c.id}" is a kind of itself, by a chain of generalizations`); if (done.has(c)) return; path.add(c); parents(c).forEach(walk); path.delete(c); done.add(c); };
  classes.forEach(walk);
  const notes = readNotes(data, classes);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "class", classes, relations, notes };
}

/** Checks object diagram data and returns the model. */
function readObject(data) {
  header(data, "an object diagram");
  for (const key of ["objects", "links"]) if (!Array.isArray(data[key])) fail(`"${key}" must be a list`);
  if (data.objects.length < 1 || data.objects.length > MOST.objects) fail(`an object diagram has 1 to ${MOST.objects} objects; this one has ${data.objects.length}`);
  if (data.links.length > MOST.links) fail(`an object diagram has at most ${MOST.links} links; this one has ${data.links.length}`);
  const objects = data.objects.map((o, i) => {
    const what = `object ${i + 1}`;
    if (!o || typeof o !== "object" || Array.isArray(o)) fail(`${what} must be an object with "id" and "class"`);
    const name = words(o.name, `the name of ${what}`, MOST.name, false), cls = words(o.class, `the class of ${what}`, MOST.name);
    const slots = list(o.slots, `the slots of ${what}`, MOST.slots).map((s, k) => {
      const text = words(s, `slot ${k + 1} of ${what}`, MOST.member);
      if (!/\S\s*=\s*\S/.test(text)) fail(`slot ${k + 1} of ${what} is "${text}"; a slot gives a value, such as "total = 40"`);
      return { s: text };
    });
    return { kind: "object", index: i, id: id(o.id, `the id of ${what}`), name, cls, title: `${name} : ${cls}`.trim(), slots };
  });
  objects.forEach((o, i) => { if (objects.findIndex((q) => q.id === o.id) !== i) fail(`two objects have the id "${o.id}"`); });
  const at = (oid, where) => objects.find((o) => o.id === oid) || fail(`${where} names "${oid}", which is not an object`);
  const links = data.links.map((l, i) => {
    const what = `link ${i + 1}`;
    if (!l || typeof l !== "object" || Array.isArray(l)) fail(`${what} must be an object with "from" and "to"`);
    const from = at(l.from, what), to = at(l.to, what);
    if (from === to) fail(`${what} goes from "${from.id}" to itself`);
    return { n: i, type: "link", from, to, label: words(l.name, `the name of ${what}`, MOST.label, false), multiplicity: ["", ""], roles: ["", ""], navigable: false };
  });
  const notes = readNotes(data, objects);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "object", objects, links, notes };
}

/** The shape of a class or an object. */
function shapeOf(n, room) {
  if (n.kind === "object") return boxShape({ name: n.title, under: true, lists: n.slots.length ? [n.slots] : [] }, room);
  const lists = n.attributes.length || n.operations.length ? [n.attributes, ...(n.operations.length ? [n.operations] : [])] : [];
  return boxShape({ name: n.name, stereotype: n.stereotype, italic: n.abstract, lists }, room);
}

/**
 * How a relation is drawn. The engine draws a mark only at the end of a line, so a line whose mark belongs at its
 * "from" end (the diamond of the whole) runs the other way. up: the line points up, so its "to" end stands above.
 */
function lineOf(r) {
  const flip = r.type === "aggregation" || r.type === "composition";
  const end = { association: r.navigable ? "open" : null, link: null, aggregation: "diamond", composition: "diamond-filled", generalization: "hollow", realization: "hollow", dependency: "open" }[r.type];
  const [a, b] = flip ? [r.to, r.from] : [r.from, r.to];
  const atA = flip ? 1 : 0, atB = flip ? 0 : 1; // which data end sits at the line's start, and at its end
  const tag = (k) => [r.roles[k], r.multiplicity[k]].filter(Boolean).join(" ");
  const labels = [];
  if (r.label) labels.push({ s: r.label, at: "mid" });
  if (tag(atA)) labels.push({ s: tag(atA), at: "start" });
  if (tag(atB)) labels.push({ s: tag(atB), at: "end" });
  return { from: a.id, to: b.id, end, dashed: r.type === "realization" || r.type === "dependency", labels, up: ["generalization", "realization", "aggregation", "composition"].includes(r.type), still: true };
}

/** The graph for graph.cjs. */
function graphOf(model) {
  const nodes = model.kind === "class" ? model.classes : model.objects;
  const rels = model.kind === "class" ? model.relations : model.links;
  return {
    nodes: [...nodes.map((n) => ({ id: n.id, ...shapeOf(n) })), ...model.notes.map((n) => ({ id: n.id, ...noteShape(n) }))],
    edges: [...rels.map(lineOf), ...model.notes.map((n) => ({ from: n.id, to: n.on.id, end: null, dashed: true, labels: [], still: true }))],
    groups: [],
  };
}

/** How a relation reads from the class where it starts. */
function rowOf(r, from) {
  const mult = (k) => (r.multiplicity[k] ? ` (${r.multiplicity[k]})` : "");
  switch (r.type) {
    case "generalization": return { end: "hollow", label: "a kind of", target: r.to.name };
    case "realization": return { end: "hollow", dashed: true, label: "implements", target: r.to.name };
    case "dependency": return { end: "open", dashed: true, label: r.label ? `depends on, ${r.label}` : "depends on", target: r.to.name };
    case "composition": return { end: "diamond-filled", back: true, label: "owns", target: `${r.to.name}${mult(1)}` };
    case "aggregation": return { end: "diamond", back: true, label: "holds", target: `${r.to.name}${mult(1)}` };
    case "link": return { end: null, label: r.label || "linked to", target: r.to.title };
    default: return { end: r.navigable ? "open" : null, label: r.label || "linked to", target: r.from === from ? `${r.to.name}${mult(1)}` : `${r.from.name}${mult(0)}` };
  }
}

/** The list for phones: a card for each class or object, and under it a row for each relation that starts there. */
function columnOf(model) {
  const nodes = model.kind === "class" ? model.classes : model.objects;
  const rels = model.kind === "class" ? model.relations : model.links;
  return nodes.map((n) => ({
    node: { id: `${n.id}-phone`, ...shapeOf(n, PHONE_NODE) },
    rows: [...rels.filter((r) => r.from === n).map((r) => rowOf(r, n)), ...model.notes.filter((q) => q.on === n).map((q) => ({ end: null, dashed: true, label: "note", target: q.text }))],
  }));
}

/** The classes or objects and their relations in words, and the key to the marks the drawing uses. */
function wordsOf(model) {
  const q = (s) => `“${esc(s)}”`;
  const used = [];
  let lines, rels;
  if (model.kind === "class") {
    lines = model.classes.map((c) => {
      const what = c.stereotype ? `${esc(c.name)} («${esc(c.stereotype)}»)` : c.abstract ? `${esc(c.name)}, an abstract class` : esc(c.name);
      const say = [`${what}.`];
      if (c.attributes.length) say.push(`Attributes: ${c.attributes.map((m) => q(m.s) + (m.under ? " (static)" : "")).join(", ")}.`);
      if (c.operations.length) say.push(`Operations: ${c.operations.map((m) => q(m.s) + (m.under ? " (static)" : "") + (m.italic ? " (abstract)" : "")).join(", ")}.`);
      return `<li>${say.join(" ")}</li>`;
    });
    rels = model.relations.map((r) => {
      const a = esc(r.from.name), b = esc(r.to.name), m = (k) => (r.multiplicity[k] ? ` ${esc(r.multiplicity[k])}` : "");
      const role = (k) => (r.roles[k] ? ` as ${q(r.roles[k])}` : "");
      switch (r.type) {
        case "generalization": return `<li>${a} is a kind of ${b}.</li>`;
        case "realization": return `<li>${a} implements the interface ${b}.</li>`;
        case "dependency": return `<li>${a} depends on ${b}${r.label ? ` (${esc(r.label)})` : ""}.</li>`;
        case "composition": return `<li>${a} owns${m(1)} ${b}${role(1)}; ${an(b)} ${b} cannot exist without its ${a}.</li>`;
        case "aggregation": return `<li>${a} holds${m(1)} ${b}${role(1)}; ${an(b)} ${b} can exist without it.</li>`;
        default: return `<li>${a} is linked to${m(1)} ${b}${role(1)}${r.label ? `, by ${q(r.label)}` : ""}${r.multiplicity[0] ? `; each ${b} to ${esc(r.multiplicity[0])} ${a}${role(0)}` : ""}${r.navigable ? `; the link is used from ${a} to ${b}` : ""}.</li>`;
      }
    });
    used.push("classBox");
    if (model.classes.some((c) => c.stereotype)) used.push("stereotype");
    if (model.classes.some((c) => c.abstract || c.operations.some((o) => o.italic))) used.push("abstract");
    if (model.classes.some((c) => [...c.attributes, ...c.operations].some((o) => o.under))) used.push("static");
    if (model.classes.some((c) => [...c.attributes, ...c.operations].some((o) => /^[+\-#~]/.test(o.s)))) used.push("visibility");
    const types = new Set(model.relations.map((r) => r.type));
    for (const t of TYPES) if (types.has(t)) used.push(t);
    if (model.relations.some((r) => r.multiplicity.some(Boolean))) used.push("multiplicity");
  } else {
    lines = model.objects.map((o) => `<li>${o.name ? `${esc(o.name)}, ${an(o.cls)} ${esc(o.cls)}` : `${an(o.cls) === "an" ? "An" : "A"} ${esc(o.cls)}`}${o.slots.length ? `, with ${o.slots.map((s) => q(s.s)).join(", ")}` : ""}.</li>`);
    rels = model.links.map((l) => `<li>${esc(l.from.title)} is linked to ${esc(l.to.title)}${l.label ? `, by ${q(l.label)}` : ""}.</li>`);
    used.push("objectBox");
    if (model.links.length) used.push("link");
  }
  if (model.notes.length) used.push("note");
  const notes = model.notes.map((n) => `<li>A note on ${esc(n.on.name || n.on.title)}: ${esc(n.text)}</li>`);
  return `<ul>${lines.join("")}</ul>${rels.length ? `\n<ul>${rels.join("")}</ul>` : ""}${notes.length ? `\n<ul>${notes.join("")}</ul>` : ""}\n${uml.keyHtml(used, OWN)}`;
}

const OWN = {
  classBox: "A box in parts: a class. The name is at the top; under the first line are its attributes, under the second its operations.",
  objectBox: "A box with an underlined name: an object, written as its name, a colon and its class. Under the line are its values.",
  stereotype: "A word in «»: what kind of class it is, such as an interface.",
  abstract: "A name in italics: abstract; it has no instances of its own, only kinds of it do.",
  static: "An underlined member: it belongs to the class, not to each instance.",
  visibility: "The sign before a member: + public, - private, # protected, ~ package.",
  association: "A solid line: the two classes are linked. An open arrowhead shows the direction in which the link is used; a name sits beside the line.",
  link: "A solid line: the two objects are linked.",
  multiplicity: "A number or range at the end of a line, such as 1 or 0..*: how many of the class at that end take part. * means any number.",
  note: "A box with a folded corner, joined by a dashed line: a note on that class.",
};

module.exports = { readClass, readObject, graphOf, columnOf, wordsOf, boxShape, MOST };
