// Package and profile diagrams in UML notation. A package is a folder: its name in the tab and its members listed in
// its body, or, when it holds other packages, a frame around them (one level). Dependencies between packages are
// dashed with an open arrowhead and «import», «access» or «merge». A profile is a package marked «profile» that holds
// stereotypes, each extending a metaclass (a solid line with a filled triangle); a package that uses the profile
// points to it with «apply». Both are structural kinds: nothing moves and there is no dot.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const uml = require("./uml.cjs");
const { wrap, PHONE_NODE } = require("./graph.cjs");
const { boxShape } = require("./class.cjs");

const MOST = { packages: 12, members: 8, dependencies: 20, stereotypes: 12, name: 28, member: 32, attribute: 32 };
const DEPS = ["import", "access", "merge", "use"];
const TAB = 22; // the height of a package's tab
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => String(Math.round(v * 100) / 100);

/** A package with no packages inside: a folder with its name in the tab and its members in the body. */
function folderShape(p, room = Infinity) {
  const name = textWidth(p.title, 14, 600) + 24 <= room ? [p.title] : wrap(p.title, "name", room - 24);
  const members = p.members.flatMap((m) => (textWidth(m, 12) + 24 <= room ? [m] : wrap(m, "sub", room - 24)));
  const tabW = Math.max(...name.map((l) => textWidth(l, 14, 600))) + 24, tabH = TAB + 18 * (name.length - 1);
  const w = Math.max(120, tabW + 24, ...members.map((m) => textWidth(m, 12) + 24)), body = Math.max(36, 12 + 18 * members.length);
  const h = tabH + body;
  return {
    w, h,
    hit: (side, off, v) => (side === "top" && Math.abs(off) <= w / 2 && v.cx + off > v.cx - w / 2 + tabW ? [v.cx + off, v.cy - h / 2 + tabH] : { top: [v.cx + off, v.cy - h / 2], bottom: [v.cx + off, v.cy + h / 2], left: [v.cx - w / 2, v.cy + off], right: [v.cx + w / 2, v.cy + off] }[side]),
    draw: (cx, cy) => {
      const x = cx - w / 2, y = cy - h / 2;
      let svg = uml.shapes.folder({ x, y, w, h }, tabW, tabH);
      name.forEach((l, k) => (svg += `<text x="${num(x + 12)}" y="${num(y + 16 + 18 * k)}" class="name">${esc(l)}</text>`));
      members.forEach((m, k) => (svg += `<text x="${num(x + 12)}" y="${num(y + tabH + 22 + 18 * k)}" class="u-mem">${esc(m)}</text>`));
      return { svg, texts: [] };
    },
  };
}

/** The frame of a package that holds packages: a folder around them, its name in the tab. */
const frameDraw = (title) => (r) => {
  const tabW = textWidth(title, 14, 600) + 24;
  return { svg: uml.shapes.folder(r, tabW, TAB), texts: [{ x: r.x + 12, y: r.y + 16, s: title, cls: "name", anchor: "start" }] };
};

const header = (data, kind) => {
  if (data.place != null && data.place !== "flow") fail(`${kind} sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`${kind} has no "form"; the renderer draws it, and a list on a phone`);
};

function readPackages(list, what = "package") {
  if (!Array.isArray(list)) fail(`"packages" must be a list`);
  const packages = list.map((p, i) => {
    const say = `${what} ${i + 1}`;
    if (!p || typeof p !== "object" || Array.isArray(p)) fail(`${say} must be an object with "id" and "name"`);
    if (p.members != null && !Array.isArray(p.members)) fail(`the members of ${say} must be a list`);
    const members = (p.members || []).map((m, k) => words(m, `member ${k + 1} of ${say}`, MOST.member));
    if (members.length > MOST.members) fail(`${say} lists ${members.length} members; at most ${MOST.members}. Name the main ones`);
    const name = words(p.name, `the name of ${say}`, MOST.name);
    return { kind: "package", index: i, id: id(p.id, `the id of ${say}`), name, title: name, members, inside: p.in ?? null };
  });
  return packages;
}

/** Checks package diagram data and returns the model. */
function readPackage(data) {
  header(data, "a package diagram");
  const packages = readPackages(data.packages);
  if (packages.length < 1 || packages.length > MOST.packages) fail(`a package diagram has 1 to ${MOST.packages} packages; this one has ${packages.length}`);
  packages.forEach((p, i) => { if (packages.findIndex((o) => o.id === p.id) !== i) fail(`two packages have the id "${p.id}"`); });
  for (const p of packages) {
    if (p.inside == null) continue;
    const outer = packages.find((o) => o.id === p.inside) || fail(`the package "${p.id}" is in "${p.inside}", which is not a package`);
    if (outer.inside != null) fail(`the package "${p.id}" is in "${outer.id}", which is itself in a package; packages nest one level deep`);
  }
  for (const p of packages) p.holds = packages.filter((o) => o.inside === p.id);
  for (const p of packages) if (p.holds.length && p.members.length) fail(`the package "${p.id}" holds packages and lists members; list the members in the packages inside it`);
  if (!Array.isArray(data.dependencies ?? [])) fail(`"dependencies" must be a list`);
  const at = (pid, where) => packages.find((p) => p.id === pid) || fail(`${where} names "${pid}", which is not a package`);
  const dependencies = (data.dependencies || []).map((d, i) => {
    const what = `dependency ${i + 1}`;
    if (!d || typeof d !== "object" || Array.isArray(d)) fail(`${what} must be an object with "from" and "to"`);
    const type = d.type ?? "import";
    if (!DEPS.includes(type)) fail(`the type of ${what} must be one of ${DEPS.join(", ")}`);
    const from = at(d.from, what), to = at(d.to, what);
    if (from === to) fail(`${what} goes from "${from.id}" to itself`);
    if (from.inside === to.id || to.inside === from.id) fail(`${what} joins "${from.id}" to the package around it; a package already sees the package it is in`);
    return { n: i, type, from, to };
  });
  if (dependencies.length > MOST.dependencies) fail(`a package diagram has at most ${MOST.dependencies} dependencies`);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "package", packages, dependencies };
}

/** Checks profile diagram data and returns the model. */
function readProfile(data) {
  header(data, "a profile diagram");
  const name = words(data.profile, `"profile" (the name of the profile)`, MOST.name);
  for (const key of ["stereotypes", "metaclasses", "extensions"]) if (!Array.isArray(data[key])) fail(`"${key}" must be a list`);
  if (data.stereotypes.length < 1 || data.stereotypes.length + data.metaclasses.length > MOST.stereotypes) fail(`a profile diagram has 1 or more stereotypes, and at most ${MOST.stereotypes} stereotypes and metaclasses together`);
  const stereotypes = data.stereotypes.map((s, i) => {
    const what = `stereotype ${i + 1}`;
    if (!s || typeof s !== "object" || Array.isArray(s)) fail(`${what} must be an object with "id" and "name"`);
    if (s.attributes != null && !Array.isArray(s.attributes)) fail(`the attributes of ${what} must be a list`);
    const attributes = (s.attributes || []).map((a, k) => ({ s: words(a, `attribute ${k + 1} of ${what}`, MOST.attribute) }));
    if (attributes.length > MOST.members) fail(`${what} has at most ${MOST.members} attributes`);
    return { kind: "stereotype", id: id(s.id, `the id of ${what}`), name: words(s.name, `the name of ${what}`, MOST.name), attributes };
  });
  const metaclasses = data.metaclasses.map((m, i) => {
    const what = `metaclass ${i + 1}`;
    if (!m || typeof m !== "object" || Array.isArray(m)) fail(`${what} must be an object with "id" and "name", the UML metaclass such as "Class"`);
    return { kind: "metaclass", id: id(m.id, `the id of ${what}`), name: words(m.name, `the name of ${what}`, MOST.name), attributes: [] };
  });
  const all = [...stereotypes, ...metaclasses];
  all.forEach((n, i) => { if (all.findIndex((o) => o.id === n.id) !== i) fail(`two stereotypes or metaclasses have the id "${n.id}"`); });
  const at = (nid, where, kind) => { const n = all.find((o) => o.id === nid); if (!n || (kind && n.kind !== kind)) fail(`${where} names "${nid}", which is not a ${kind || "stereotype or metaclass"}`); return n; };
  const extensions = data.extensions.map((e, i) => {
    const what = `extension ${i + 1}`;
    if (!e || typeof e !== "object" || Array.isArray(e)) fail(`${what} must be an object with "from" (a stereotype) and "to" (a metaclass)`);
    return { type: "extension", from: at(e.from, what, "stereotype"), to: at(e.to, what, "metaclass"), required: Boolean(e.required) };
  });
  if (data.generalizations != null && !Array.isArray(data.generalizations)) fail(`"generalizations" must be a list`);
  const generalizations = (data.generalizations || []).map((g, i) => {
    const what = `generalization ${i + 1}`;
    const from = at(g?.from, what, "stereotype"), to = at(g.to, what, "stereotype");
    if (from === to) fail(`${what} goes from "${from.id}" to itself`);
    return { type: "generalization", from, to };
  });
  for (const s of stereotypes) if (!extensions.some((e) => e.from === s) && !generalizations.some((g) => g.from === s)) fail(`the stereotype "${s.id}" extends no metaclass; give it an extension, or make it a kind of another stereotype`);
  for (const m of metaclasses) if (!extensions.some((e) => e.to === m)) fail(`no stereotype extends the metaclass "${m.id}"; leave it out`);
  if (data.appliedTo != null && !Array.isArray(data.appliedTo)) fail(`"appliedTo" must be a list of the packages that use the profile`);
  const applied = (data.appliedTo || []).map((p, i) => ({ kind: "package", id: `applied-${i + 1}`, name: words(p, `package ${i + 1} of "appliedTo"`, MOST.name), title: words(p, "", MOST.name), members: [] }));
  if (applied.length > 3) fail(`a profile is applied to at most 3 packages in one diagram`);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "profile", name, stereotypes, metaclasses, extensions, generalizations, applied };
}

const PROFILE = "the-profile"; // the group id of the profile frame

/** The graph for graph.cjs. */
function graphOf(model) {
  if (model.kind === "package") {
    const framed = model.packages.filter((p) => p.holds.length);
    const endId = (p) => (p.holds.length ? `group-${p.id}` : p.id);
    return {
      nodes: model.packages.filter((p) => !p.holds.length).map((p) => ({ id: p.id, group: p.inside ? `group-${p.inside}` : undefined, ...folderShape(p) })),
      edges: model.dependencies.map((d) => ({ from: endId(d.from), to: endId(d.to), end: "open", dashed: true, labels: d.type === "use" ? [] : [{ s: `«${d.type}»`, at: "mid" }], still: true })),
      groups: framed.map((p) => ({ id: `group-${p.id}`, name: p.name, kind: "box", tab: TAB, draw: frameDraw(p.name) })),
    };
  }
  const title = `«profile» ${model.name}`;
  return {
    nodes: [
      ...model.stereotypes.map((s) => ({ id: s.id, group: PROFILE, ...shapeOf(s) })),
      ...model.metaclasses.map((m) => ({ id: m.id, group: PROFILE, ...shapeOf(m) })),
      ...model.applied.map((p) => ({ id: p.id, ...folderShape(p) })),
    ],
    edges: [
      ...model.extensions.map((e) => ({ from: e.from.id, to: e.to.id, end: "hollow-filled", up: true, labels: e.required ? [{ s: "{required}", at: "mid" }] : [], still: true })),
      ...model.generalizations.map((g) => ({ from: g.from.id, to: g.to.id, end: "hollow", up: true, labels: [], still: true })),
      ...model.applied.map((p) => ({ from: p.id, to: PROFILE, end: "open", dashed: true, labels: [{ s: "«apply»", at: "mid" }], still: true })),
    ],
    groups: [{ id: PROFILE, name: title, kind: "box", tab: TAB, draw: frameDraw(title) }],
  };
}

function shapeOf(n, room) {
  return boxShape({ name: n.name, stereotype: n.kind, lists: n.attributes.length ? [n.attributes] : [] }, room);
}

/** The list for phones. */
function columnOf(model) {
  if (model.kind === "package") {
    const rows = (p) => model.dependencies.filter((d) => d.from === p).map((d) => ({ end: "open", dashed: true, label: d.type === "use" ? "uses" : `«${d.type}»`, target: d.to.name }));
    const items = [];
    for (const p of model.packages.filter((q) => !q.inside)) {
      if (!p.holds.length) { items.push({ node: { id: `${p.id}-phone`, ...folderShape(p, PHONE_NODE) }, rows: rows(p) }); continue; }
      const own = rows(p);
      p.holds.forEach((q, k) => items.push({ node: { id: `${q.id}-phone`, ...folderShape(q, PHONE_NODE) }, group: p.name, rows: [...(k === 0 ? own.map((r) => ({ ...r, target: `${r.target} (all of ${p.name})` })) : []), ...rows(q)] }));
    }
    return items;
  }
  return [
    ...model.stereotypes.map((s) => ({ node: { id: `${s.id}-phone`, ...shapeOf(s, PHONE_NODE) }, group: `«profile» ${model.name}`, rows: [...model.extensions.filter((e) => e.from === s).map((e) => ({ end: "hollow-filled", label: e.required ? "extends, {required}" : "extends", target: e.to.name })), ...model.generalizations.filter((g) => g.from === s).map((g) => ({ end: "hollow", label: "a kind of", target: g.to.name }))] })),
    ...model.metaclasses.map((m) => ({ node: { id: `${m.id}-phone`, ...shapeOf(m, PHONE_NODE) }, group: `«profile» ${model.name}`, rows: [] })),
    ...model.applied.map((p) => ({ node: { id: `${p.id}-phone`, ...folderShape(p, PHONE_NODE) }, rows: [{ end: "open", dashed: true, label: "«apply»", target: `the profile ${model.name}` }] })),
  ];
}

/** The diagram in words, and the key to the marks it uses. */
function wordsOf(model) {
  const used = ["package"];
  if (model.kind === "package") {
    const lines = model.packages.map((p) => `<li>The package ${esc(p.name)}${p.inside ? `, inside ${esc(model.packages.find((o) => o.id === p.inside).name)}` : ""}${p.holds.length ? `, holds the packages ${p.holds.map((q) => esc(q.name)).join(", ")}` : p.members.length ? `, holds ${p.members.map((m) => `“${esc(m)}”`).join(", ")}` : ""}.</li>`);
    const verb = { import: "imports", access: "uses, without passing on,", merge: "merges", use: "depends on" };
    const deps = model.dependencies.map((d) => `<li>${esc(d.from.name)} ${verb[d.type]} ${esc(d.to.name)}.</li>`);
    if (model.dependencies.length) used.push("dependency");
    for (const t of ["import", "access", "merge"]) if (model.dependencies.some((d) => d.type === t)) used.push(t);
    return `<ul>${lines.join("")}</ul>${deps.length ? `\n<ul>${deps.join("")}</ul>` : ""}\n${uml.keyHtml(used, OWN)}`;
  }
  const lines = [
    ...model.extensions.map((e) => `<li>The stereotype «${esc(e.from.name)}» extends the metaclass ${esc(e.to.name)}${e.required ? "; every " + esc(e.to.name) + " must carry it" : ""}${e.from.attributes.length ? `, and adds ${e.from.attributes.map((a) => `“${esc(a.s)}”`).join(", ")}` : ""}.</li>`),
    ...model.generalizations.map((g) => `<li>«${esc(g.from.name)}» is a kind of «${esc(g.to.name)}».</li>`),
    ...model.applied.map((p) => `<li>The package ${esc(p.name)} applies the profile.</li>`),
  ];
  used.push("stereotypeBox", "metaclassBox", "extension");
  if (model.generalizations.length) used.push("generalization");
  if (model.applied.length) used.push("apply");
  return `<p>The profile ${esc(model.name)}.</p>\n<ul>${lines.join("")}</ul>\n${uml.keyHtml(used, OWN)}`;
}

const OWN = {
  package: "A folder: a package, its name in the tab, and what it holds in its body.",
  dependency: "A dashed line with an open arrowhead: the package at the line's start needs the package at the arrowhead.",
  import: "«import»: the first package uses the public names of the second as its own, and passes them on.",
  access: "«access»: the first package uses the public names of the second, but does not pass them on.",
  merge: "«merge»: the contents of the second package are merged into the first.",
  stereotypeBox: "A box marked «stereotype»: a new kind of model element that the profile adds.",
  metaclassBox: "A box marked «metaclass»: a kind of element in UML itself, such as Class, that a stereotype extends.",
  extension: "A solid line with a filled triangle: the stereotype at the line's start extends the metaclass at the triangle.",
  apply: "A dashed line marked «apply»: the package uses the profile.",
};

module.exports = { readPackage, readProfile, graphOf, columnOf, wordsOf, MOST };
