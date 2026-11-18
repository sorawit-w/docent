// Use case diagrams in UML notation: actors, use cases in one system boundary, associations, «include», «extend»,
// and generalization between actors or between use cases. It is a structural kind: nothing moves and there is no dot.
// The data becomes a graph for graph.cjs with every node placed: actors in a column at the left (or the right), the
// use cases in columns inside the boundary, each included or extending use case to the right of the one it serves.
// On a phone it is a list per actor: the use cases the actor takes part in, each with its includes and extends.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const uml = require("./uml.cjs");
const { wrap, PHONE_NODE } = require("./graph.cjs");

const MOST = { actors: 6, usecases: 16, relations: 30, actor: 20, usecase: 32, system: 32 };
const TYPES = ["association", "include", "extend", "generalization"];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** An actor: a stick figure with its name under it. */
function actorShape(a, room = 112) {
  const name = textWidth(a.name, 14, 600) <= room ? [a.name] : wrap(a.name, "name", room);
  const w = Math.max(48, ...name.map((l) => textWidth(l, 14, 600) + 8)), h = 40 + 8 + 18 * name.length;
  return {
    w, h,
    // A line from the side meets the figure itself, not the edge of its name, while it is level with the figure.
    hit: (side, off, v) => {
      const top = v.cy - h / 2, y = v.cy + off;
      if (side === "left" || side === "right") return y >= top && y <= top + 40 ? [v.cx + (side === "left" ? -12 : 12), y] : [v.cx + (side === "left" ? -w / 2 : w / 2), y];
      return side === "top" ? [v.cx + off, top] : [v.cx + off, top + h];
    },
    draw: (cx, cy) => {
      const top = cy - h / 2;
      return { svg: uml.signs.actor(cx, top), texts: name.map((s, k) => ({ x: cx, y: top + 40 + 22 + 18 * k, s, cls: "name", anchor: "middle" })) };
    },
  };
}

/** A use case: an oval with its name inside. */
function caseShape(u, room = 200) {
  const name = textWidth(u.name, 14, 600) + 48 <= room ? [u.name] : wrap(u.name, "name", room - 48);
  const w = Math.max(120, ...name.map((l) => textWidth(l, 14, 600) + 48)), h = 48 + 18 * (name.length - 1);
  return {
    w, h, round: true,
    draw: (cx, cy) => ({ svg: uml.shapes.oval({ x: cx - w / 2, y: cy - h / 2, w, h }), texts: name.map((s, k) => ({ x: cx, y: cy + 5 - 9 * (name.length - 1) + 18 * k, s, cls: "name", anchor: "middle" })) }),
  };
}

/** Checks use case data and returns the model. */
function readUsecase(data) {
  if (data.place != null && data.place !== "flow") fail(`a use case diagram sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a use case diagram has no "form"; the renderer draws it, and a list on a phone`);
  for (const key of ["actors", "usecases", "relations"]) if (!Array.isArray(data[key])) fail(`"${key}" must be a list`);
  const system = words(data.system, `"system" (the name of the system, drawn on its boundary)`, MOST.system);
  if (data.actors.length < 1 || data.actors.length > MOST.actors) fail(`a use case diagram has 1 to ${MOST.actors} actors; this one has ${data.actors.length}`);
  if (data.usecases.length < 1 || data.usecases.length > MOST.usecases) fail(`a use case diagram has 1 to ${MOST.usecases} use cases; this one has ${data.usecases.length}`);
  if (data.relations.length < 1 || data.relations.length > MOST.relations) fail(`a use case diagram has 1 to ${MOST.relations} relations; this one has ${data.relations.length}`);
  const actors = data.actors.map((a, i) => {
    const what = `actor ${i + 1}`;
    if (!a || typeof a !== "object" || Array.isArray(a)) fail(`${what} must be an object with "id" and "name"`);
    if (a.side != null && a.side !== "left" && a.side !== "right") fail(`the side of ${what} must be "left" or "right"`);
    return { kind: "actor", index: i, id: id(a.id, `the id of ${what}`), name: words(a.name, `the name of ${what}`, MOST.actor), side: a.side || "left" };
  });
  const usecases = data.usecases.map((u, i) => {
    const what = `use case ${i + 1}`;
    if (!u || typeof u !== "object" || Array.isArray(u)) fail(`${what} must be an object with "id" and "name"`);
    return { kind: "usecase", index: i, id: id(u.id, `the id of ${what}`), name: words(u.name, `the name of ${what}`, MOST.usecase) };
  });
  const all = [...actors, ...usecases];
  all.forEach((n, i) => { if (all.findIndex((o) => o.id === n.id) !== i) fail(`two actors or use cases have the id "${n.id}"`); });
  const at = (nid, where) => all.find((o) => o.id === nid) || fail(`${where} names "${nid}", which is not an actor or a use case`);
  const relations = data.relations.map((r, i) => {
    const what = `relation ${i + 1}`;
    if (!r || typeof r !== "object" || Array.isArray(r)) fail(`${what} must be an object with "from" and "to"`);
    const type = r.type ?? "association";
    if (!TYPES.includes(type)) fail(`the type of ${what} must be one of ${TYPES.join(", ")}`);
    const from = at(r.from, what), to = at(r.to, what);
    if (from === to) fail(`${what} goes from "${from.id}" to itself`);
    if (type === "association" && !(from.kind === "actor" && to.kind === "usecase")) fail(`${what} is an association, which goes "from" an actor "to" a use case`);
    if ((type === "include" || type === "extend") && (from.kind !== "usecase" || to.kind !== "usecase")) fail(`${what} is an ${type}, which goes from one use case to another`);
    if (type === "generalization" && from.kind !== to.kind) fail(`${what} is a generalization between an actor and a use case; it goes between two actors or two use cases`);
    return { n: i, type, from, to };
  });
  relations.forEach((r, i) => { if (relations.findIndex((o) => o.from === r.from && o.to === r.to) !== i) fail(`two relations go from "${r.from.id}" to "${r.to.id}"`); });
  // A use case that includes itself, by a chain, never ends.
  const inc = (u) => relations.filter((r) => r.type === "include" && r.from === u).map((r) => r.to);
  const seen = new Set(), path = new Set();
  const walk = (u) => { if (path.has(u)) fail(`the use case "${u.id}" includes itself, by a chain of includes`); if (seen.has(u)) return; seen.add(u); path.add(u); inc(u).forEach(walk); path.delete(u); };
  usecases.forEach(walk);
  for (const u of usecases) if (!relations.some((r) => r.from === u || r.to === u)) fail(`the use case "${u.id}" has no relation; link it to an actor or to another use case, or leave it out`);
  for (const a of actors) if (!relations.some((r) => r.from === a || r.to === a)) fail(`the actor "${a.id}" has no relation; link it to a use case, or leave it out`);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "usecase", system, actors, usecases, relations };
}

/**
 * Where each node goes. A use case that an actor uses stands in the first column inside the boundary; a use case that
 * another one includes, that extends another one, or that is a kind of another one stands one column to the right of
 * it, in the same row when that row is free. Each actor stands level with the middle of its use cases.
 */
function placeOf(model) {
  const { actors, usecases, relations } = model;
  const parents = (u) => relations.filter((r) => (r.type === "include" && r.to === u) || (r.type === "extend" && r.from === u) || (r.type === "generalization" && r.from === u)).map((r) => (r.type === "extend" ? r.to : r.type === "generalization" ? r.to : r.from));
  const used = (u) => relations.some((r) => r.type === "association" && r.to === u);
  const depth = new Map();
  for (const u of usecases) if (used(u) || !parents(u).length) depth.set(u, 0);
  for (let changed = true; changed;) {
    changed = false;
    for (const u of usecases) {
      if (depth.has(u)) continue;
      const ds = parents(u).filter((p) => depth.has(p)).map((p) => depth.get(p));
      if (ds.length) { depth.set(u, Math.min(...ds) + 1); changed = true; }
    }
  }
  for (const u of usecases) if (!depth.has(u)) depth.set(u, 0); // a loop of extends with no start: put it first
  // The order of the first column: by the first actor that uses each one, then as written.
  const firstUser = (u) => { const r = relations.find((q) => q.type === "association" && q.to === u); return r ? r.from.index : actors.length; };
  const order = [...usecases].sort((a, b) => depth.get(a) - depth.get(b) || (depth.get(a) ? 0 : firstUser(a) - firstUser(b)) || a.index - b.index);
  const rank = new Map(), taken = new Set();
  const free = (c, r) => { while (taken.has(`${c}:${r}`)) r++; taken.add(`${c}:${r}`); return r; };
  let next = 0;
  for (const u of order) {
    const d = depth.get(u);
    if (!d) { rank.set(u, free(1, next)); next = rank.get(u) + 1; continue; }
    const ps = parents(u).filter((p) => rank.has(p));
    rank.set(u, free(1 + d, ps.length ? Math.min(...ps.map((p) => rank.get(p))) : 0));
  }
  const D = Math.max(...usecases.map((u) => depth.get(u)));
  // A use case that only actors at the right take part in stands in the last column, next to them.
  const rightOnly = (u) => { const us = relations.filter((r) => r.type === "association" && r.to === u); return us.length && us.every((r) => r.from.side === "right"); };
  if (D > 0) for (const u of usecases) if (depth.get(u) === 0 && rightOnly(u)) { taken.delete(`1:${rank.get(u)}`); depth.set(u, D); const ps = parents(u).filter((p) => rank.has(p)); rank.set(u, free(1 + D, ps.length ? Math.min(...ps.map((p) => rank.get(p))) : rank.get(u))); }
  const sideCol = (a) => (a.side === "right" ? 2 + D : 0);
  const mid = (a) => {
    const rs = relations.filter((r) => r.type === "association" && r.from === a).map((r) => rank.get(r.to));
    if (rs.length) return Math.round((Math.min(...rs) + Math.max(...rs)) / 2);
    const g = relations.find((r) => r.type === "generalization" && r.from === a && rank.has(r.to));
    return g ? rank.get(g.to) + 1 : 0;
  };
  // Actors with use cases first, then the actors that are only a kind of another actor, so those stand below it.
  for (const a of [...actors].sort((p, q) => (relations.some((r) => r.type === "association" && r.from === p) ? 0 : 1) - (relations.some((r) => r.type === "association" && r.from === q) ? 0 : 1) || p.index - q.index)) {
    rank.set(a, free(sideCol(a), mid(a)));
  }
  const col = new Map([...usecases.map((u) => [u, 1 + depth.get(u)]), ...actors.map((a) => [a, sideCol(a)])]);
  return { rank, col };
}

const STYLE = {
  association: { end: null, dashed: false },
  include: { end: "open", dashed: true, label: "«include»" },
  extend: { end: "open", dashed: true, label: "«extend»" },
  generalization: { end: "hollow", dashed: false },
};

/** The graph for graph.cjs. */
function graphOf(model) {
  const { rank, col } = placeOf(model);
  const right = model.actors.some((a) => a.side === "right");
  return {
    nodes: [
      ...model.actors.filter((a) => a.side === "left").map((a) => ({ id: a.id, rank: rank.get(a), col: col.get(a), ...actorShape(a) })),
      ...model.usecases.map((u) => ({ id: u.id, group: "system", rank: rank.get(u), col: col.get(u), ...caseShape(u) })),
      ...model.actors.filter((a) => a.side === "right").map((a) => ({ id: a.id, group: "right", rank: rank.get(a), col: col.get(a), ...actorShape(a) })),
    ],
    edges: model.relations.map((r) => { const st = STYLE[r.type]; return { from: r.from.id, to: r.to.id, end: st.end, dashed: st.dashed, labels: st.label ? [{ s: st.label, at: "mid" }] : [], still: true }; }),
    groups: [{ id: "system", name: model.system, kind: "box" }, ...(right ? [{ id: "right", name: "", kind: "free" }] : [])],
  };
}

/** What a use case leads to, as rows under it: what it includes, what may extend it, and the kinds of it. */
function rowsOf(model, u) {
  const rows = [];
  for (const r of model.relations) {
    if (r.type === "include" && r.from === u) rows.push({ end: "open", dashed: true, label: "«include»", target: r.to.name });
    if (r.type === "extend" && r.to === u) rows.push({ end: "open", dashed: true, back: true, label: "«extend»", target: `${r.from.name}, which may add to it` });
    if (r.type === "generalization" && r.from === u) rows.push({ end: "hollow", label: "a kind of", target: r.to.name });
  }
  return rows;
}

/** The list for phones: one band for each actor, with the use cases it takes part in and what each of them leads to. */
function columnOf(model) {
  const items = [];
  const below = (u, seen) => { // the use cases that a use case leads to, depth first, each once
    const out = [];
    for (const r of model.relations) {
      const next = (r.type === "include" && r.from === u) ? r.to : (r.type === "extend" && r.to === u) ? r.from : null;
      if (next && !seen.has(next)) { seen.add(next); out.push(next, ...below(next, seen)); }
    }
    return out;
  };
  const listed = new Set();
  for (const a of model.actors) {
    const gens = model.relations.filter((r) => r.type === "generalization" && r.from === a);
    items.push({ node: { id: `${a.id}-phone`, ...actorShape(a, PHONE_NODE) }, group: a.name, rows: gens.map((r) => ({ end: "hollow", label: "a kind of", target: r.to.name })) });
    // Each use case the actor takes part in, then each use case it leads to that leads further on; a row under its
    // parent names the others already. Each shows once in the band.
    const shown = new Set(), direct = model.relations.filter((q) => q.type === "association" && q.from === a).map((q) => q.to);
    const show = (u) => { if (shown.has(u)) return; shown.add(u); listed.add(u); items.push({ node: { id: `${u.id}-${a.id}-phone`, ...caseShape(u, PHONE_NODE) }, group: a.name, rows: rowsOf(model, u) }); };
    for (const u of direct) {
      show(u);
      for (const v of below(u, new Set([u]))) { listed.add(v); if (!direct.includes(v) && rowsOf(model, v).length) show(v); }
    }
  }
  // Use cases that no actor reaches, such as a general use case with kinds: in a band of their own.
  for (const u of model.usecases) if (!listed.has(u)) items.push({ node: { id: `${u.id}-phone`, ...caseShape(u, PHONE_NODE) }, group: "Other use cases", rows: rowsOf(model, u) });
  return items;
}

/** The actors, the use cases and their relations in words, and the key to the marks the drawing uses. */
function wordsOf(model) {
  const { actors, usecases, relations } = model;
  const list = (xs) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;
  const q = (u) => `“${esc(u.name)}”`;
  const lines = actors.map((a) => {
    const say = [];
    const uses = relations.filter((r) => r.type === "association" && r.from === a).map((r) => q(r.to));
    if (uses.length) say.push(`${esc(a.name)} takes part in ${list(uses)}.`);
    for (const r of relations.filter((x) => x.type === "generalization" && x.from === a)) say.push(`${esc(a.name)} is a kind of ${esc(r.to.name)}, and takes part in all that ${esc(r.to.name)} does.`);
    return `<li>${say.join(" ")}</li>`;
  });
  const more = usecases.flatMap((u) => relations.filter((r) => r.from === u).map((r) => ({
    include: `<li>${q(u)} always includes ${q(r.to)}.</li>`,
    extend: `<li>${q(u)} may add to ${q(r.to)}, under a condition.</li>`,
    generalization: `<li>${q(u)} is a kind of ${q(r.to)}.</li>`,
  })[r.type]));
  const types = new Set(relations.map((r) => r.type));
  const used = ["actor", "usecase", "boundary", "association"];
  if (types.has("include")) used.push("include");
  if (types.has("extend")) used.push("extend");
  if (types.has("generalization")) used.push("generalization");
  return `<p>The system: ${esc(model.system)}.</p>\n<ul>${lines.join("")}</ul>${more.length ? `\n<ul>${more.join("")}</ul>` : ""}\n${uml.keyHtml(used, OWN)}`;
}

const OWN = {
  actor: "A stick figure: an actor, a person or another system that uses this one.",
  usecase: "An oval: a use case, something an actor does with the system.",
  boundary: "The large box with the system's name: what is inside it is part of the system.",
  association: "A solid line: the actor takes part in the use case.",
  include: "A dashed line with an open arrowhead, marked «include»: the first use case always uses the second.",
  extend: "A dashed line with an open arrowhead, marked «extend»: the first use case may add to the second, under a condition.",
  generalization: "A solid line with a hollow triangle: the actor or use case at the line's start is a kind of the one at the triangle.",
};

module.exports = { readUsecase, graphOf, columnOf, wordsOf, MOST };
