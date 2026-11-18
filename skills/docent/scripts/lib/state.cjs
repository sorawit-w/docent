// State machine diagrams in UML notation: states with entry, do and exit, pseudostates, composite states (one level,
// up to two regions), and transitions labeled "trigger [guard] / effect". The data becomes a graph for graph.cjs,
// a column for phones, and the states and transitions in words with a key to the marks.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const uml = require("./uml.cjs");

const MOST = { states: 16, transitions: 30, regions: 2, name: 28, action: 28, trigger: 24, guard: 24, effect: 24 };
const PSEUDO = ["initial", "final", "choice", "junction", "history", "deep-history", "fork", "join", "terminate"];
const TYPES = ["state", "composite", ...PSEUDO];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The mark of each state or pseudostate, as a graph node. */
function shape(n, degree) {
  const mark = (w, h, svg, ports = "mid") => ({ w, h, ports, draw: (cx, cy) => ({ svg: svg(cx, cy), texts: [] }) });
  switch (n.type) {
    case "initial": return mark(16, 16, (cx, cy) => uml.nodes.initial([cx, cy]));
    case "final": return mark(20, 20, (cx, cy) => uml.nodes.final([cx, cy]));
    case "choice": return mark(32, 24, (cx, cy) => uml.nodes.decision([cx, cy]));
    case "junction": return mark(10, 10, (cx, cy) => uml.nodes.junction([cx, cy]));
    case "history": case "deep-history": return mark(24, 24, (cx, cy) => uml.nodes.history([cx, cy], n.type === "deep-history"));
    case "terminate": return mark(16, 16, (cx, cy) => uml.nodes.cross([cx, cy]));
    case "fork": case "join": { const w = Math.max(72, 24 * (degree + 1)); return mark(w, 6, (cx, cy) => uml.nodes.bar([cx, cy], w), "tb"); }
    default: {
      const lines = n.actions.map(([k, v]) => `${k} / ${v}`);
      const w = Math.max(96, textWidth(n.name, 14, 600) + 32, ...lines.map((l) => textWidth(l, 12) + 24));
      const h = lines.length ? 44 + 18 * lines.length : 40;
      return {
        w, h,
        draw: (cx, cy) => {
          const x = cx - w / 2, y = cy - h / 2;
          if (!lines.length) return { svg: uml.shapes.rounded({ x, y, w, h }), texts: [{ x: cx, y: cy + 5, s: n.name, cls: "name", anchor: "middle" }] };
          return { svg: uml.shapes.rounded({ x, y, w, h }) + `<line x1="${x}" y1="${y + 32}" x2="${x + w}" y2="${y + 32}" class="u-ln"/>`, texts: [{ x: cx, y: y + 21, s: n.name, cls: "name", anchor: "middle" }, ...lines.map((s, k) => ({ x: x + 12, y: y + 50 + 18 * k, s, cls: "sub", anchor: "start" }))] };
        },
      };
    }
  }
}

/** The label of a transition: trigger [guard] / effect, each part only when it is given. */
const labelOf = (t) => [t.trigger, t.guard && `[${t.guard}]`, t.effect && `/ ${t.effect}`].filter(Boolean).join(" ");

/** Checks state machine data and returns the model. */
function readState(data) {
  if (data.place != null && data.place !== "flow") fail(`a state machine diagram sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a state machine diagram has no "form"; the renderer draws it, and a column on a phone`);
  for (const key of ["states", "transitions"]) if (!Array.isArray(data[key])) fail(`"${key}" must be a list`);
  if (data.transitions.length < 1 || data.transitions.length > MOST.transitions) fail(`a state machine diagram has 1 to ${MOST.transitions} transitions; this one has ${data.transitions.length}`);
  const all = data.states.map((st, i) => {
    const what = `state ${i + 1}`;
    if (!st || typeof st !== "object" || Array.isArray(st)) fail(`${what} must be an object with "id"`);
    const sid = id(st.id, `the id of ${what}`);
    const type = st.type ?? "state";
    if (!TYPES.includes(type)) fail(`the type of ${what} ("${sid}") must be one of ${TYPES.join(", ")}`);
    const named = type === "state" || type === "composite";
    if (named && st.name == null) fail(`${what} ("${sid}") is a ${type} and needs a "name"`);
    if (!named && st.name != null) fail(`${what} ("${sid}") is a ${type} pseudostate, which has no name; leave "name" out`);
    const actions = [];
    for (const k of ["entry", "do", "exit"]) if (st[k] != null) { if (type !== "state") fail(`${what} ("${sid}") has "${k}"; only a simple state has entry, do and exit actions`); actions.push([k, words(st[k], `the ${k} action of ${what}`, MOST.action)]); }
    if (type === "composite" && st.regions != null && ![1, 2].includes(st.regions)) fail(`the composite state "${sid}" has ${st.regions} regions; it has 1 or ${MOST.regions}`);
    return { index: i, id: sid, type, name: named ? words(st.name, `the name of ${what}`, MOST.name) : "", actions, inside: st.in ?? null, region: st.region ?? 1, regions: st.regions ?? 1 };
  });
  all.forEach((n, i) => { if (all.findIndex((o) => o.id === n.id) !== i) fail(`two states have the id "${n.id}"`); });
  const composites = all.filter((n) => n.type === "composite");
  for (const n of all) {
    if (n.inside == null) { if (n.region !== 1) fail(`the state "${n.id}" has a region but is not inside a composite state`); if (n.type === "history" || n.type === "deep-history") fail(`the history "${n.id}" is not inside a composite state; a history remembers the last state inside one`); continue; }
    const c = composites.find((o) => o.id === n.inside);
    if (!c) fail(`the state "${n.id}" is in "${n.inside}", which is not a composite state`);
    if (n.type === "composite") fail(`the composite state "${n.id}" is inside "${n.inside}"; composite states go one level deep`);
    if (!Number.isInteger(n.region) || n.region < 1 || n.region > c.regions) fail(`the state "${n.id}" is in region ${n.region} of "${c.id}", which has ${c.regions} region${c.regions > 1 ? "s" : ""}`);
  }
  for (const c of composites) for (let r = 1; r <= c.regions; r++) if (!all.some((n) => n.inside === c.id && n.region === r)) fail(`region ${r} of the composite state "${c.id}" has no states`);
  const nodes = all.filter((n) => n.type !== "composite");
  if (nodes.length < 2 || nodes.length > MOST.states) fail(`a state machine diagram has 2 to ${MOST.states} states and pseudostates, not counting composite states; this one has ${nodes.length}`);
  const at = (sid, where) => { const n = all.find((o) => o.id === sid); return n || fail(`${where} names "${sid}", which is not a state`); };
  const transitions = data.transitions.map((t, i) => {
    const what = `transition ${i + 1}`;
    if (!t || typeof t !== "object" || Array.isArray(t)) fail(`${what} must be an object with "from" and "to"`);
    const from = at(t.from, what), to = at(t.to, what);
    const made = { n: i, from, to, trigger: words(t.trigger, `the trigger of ${what}`, MOST.trigger, false), guard: words(t.guard, `the guard of ${what}`, MOST.guard, false), effect: words(t.effect, `the effect of ${what}`, MOST.effect, false) };
    if (/^\[|\]$/.test(made.guard)) fail(`the guard of ${what} has brackets; write it without them, and the renderer adds them`);
    if (/^\//.test(made.effect)) fail(`the effect of ${what} starts with "/"; write it without, and the renderer adds it`);
    if (from.type === "initial" && (made.trigger || made.guard)) fail(`${what} leaves the initial pseudostate "${from.id}" with a trigger or a guard; it may only have an effect`);
    if (from.type === "composite" && from === to) fail(`${what} goes from the composite state "${from.id}" to itself; draw a line to itself on a simple state`);
    if (from !== to && from.type === "composite" && to.inside === from.id) fail(`${what} goes from the composite state "${from.id}" to a state inside it`);
    if (from !== to && to.type === "composite" && from.inside === to.id) fail(`${what} goes from a state inside "${to.id}" to its own frame`);
    return made;
  });
  const outs = (n) => transitions.filter((t) => t.from === n), ins = (n) => transitions.filter((t) => t.to === n);
  for (const n of all) {
    const o = outs(n).length, k = ins(n).length, say = `the ${n.type === "state" ? "state" : n.type} "${n.id}"`;
    if (n.type === "initial" && (k || o !== 1)) fail(`${say} has ${k} transitions in and ${o} out; an initial pseudostate has none in and one out`);
    if ((n.type === "final" || n.type === "terminate") && o) fail(`${say} has a transition out; it ends the machine${n.type === "final" ? " or its region" : ""}`);
    if (n.type === "choice" && (k < 1 || o < 2)) fail(`${say} has ${k} transitions in and ${o} out; a choice has one or more in and two or more out`);
    if (n.type === "choice" && outs(n).some((t) => !t.guard)) fail(`a transition out of ${say} has no guard; each says when it is taken, such as "else"`);
    if (n.type === "fork" && (k !== 1 || o < 2)) fail(`${say} has ${k} transitions in and ${o} out; a fork has one in and two or more out`);
    if (n.type === "join" && (k < 2 || o !== 1)) fail(`${say} has ${k} transitions in and ${o} out; a join has two or more in and one out`);
    if ((n.type === "history" || n.type === "deep-history") && o > 1) fail(`${say} has ${o} transitions out; a history has at most one, to the state it starts in the first time`);
    if (n.type !== "initial" && n.type !== "composite" && n.type !== "history" && n.type !== "deep-history" && !k && !(n.inside && n.type !== "state")) fail(`nothing goes into ${say}; every state except an initial pseudostate has a transition in`);
  }
  for (const c of composites) for (let r = 1; r <= c.regions; r++) {
    const starts = all.filter((n) => n.inside === c.id && n.region === r && n.type === "initial");
    if (starts.length > 1) fail(`region ${r} of "${c.id}" has ${starts.length} initial pseudostates; it has at most one`);
  }
  const top = all.filter((n) => !n.inside && n.type === "initial");
  if (top.length !== 1) fail(`a state machine has one initial pseudostate outside every composite state; this one has ${top.length}`);

  // The main path, for the dot: from the initial pseudostate, each state's first transition, until a state repeats.
  const main = [top[0]];
  for (;;) { const t = outs(main.at(-1))[0]; if (!t || main.includes(t.to)) break; main.push(t.to); }
  const mainT = new Set(main.slice(1).map((to, i) => transitions.find((t) => t.from === main[i] && t.to === to).n));
  // The order of the column: depth first from the start; a composite stands for its own states, in their order.
  const order = [];
  const visit = (n) => {
    if (n.type === "composite") { for (const m of all.filter((o) => o.inside === n.id)) if (m.type === "initial" || !ins(m).length) visit(m); for (const t of outs(n)) visit(t.to); return; }
    if (order.includes(n)) return;
    order.push(n);
    for (const t of outs(n)) visit(t.to);
  };
  visit(top[0]);
  for (const n of nodes) visit(n);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "state", all, nodes, composites, transitions, outs, ins, order, mainT };
}

const groupId = (c, r) => (c.regions > 1 ? `${c.id}--r${r}` : c.id);

/** How a state is named in the words and the column. */
function callName(model, n) {
  if (n.name) return n.name;
  const where = n.inside ? ` in ${model.all.find((c) => c.id === n.inside).name}` : "";
  return { initial: "the start", final: "the end", choice: "the choice", junction: "the junction", history: "the last state", "deep-history": "the last state, at every level", fork: "the fork", join: "the join", terminate: "the stop" }[n.type] + where;
}

/** The graph for graph.cjs. */
function graphOf(model) {
  const { nodes, transitions, composites, mainT } = model;
  const groups = composites.flatMap((c) => Array.from({ length: c.regions }, (_, k) => ({
    id: groupId(c, k + 1), name: k ? "" : c.name, kind: "box", frame: c.regions > 1 ? c.id : undefined,
    draw: (r, dividers) => ({ svg: uml.shapes.rounded(r) + dividers.map((x) => `<line x1="${x}" y1="${r.y}" x2="${x}" y2="${r.y + r.h}" class="u-ln u-dash"/>`).join(""), texts: [{ x: r.x + 12, y: r.y + 21, s: c.name, cls: "name", anchor: "start" }] }),
  })));
  const endId = (n) => (n.type === "composite" ? groupId(n, 1) : n.id);
  const degree = (n) => Math.max(model.outs(n).length, model.ins(n).length);
  return {
    nodes: nodes.map((n) => ({ id: n.id, group: n.inside ? groupId(composites.find((c) => c.id === n.inside), n.region) : undefined, ...shape(n, degree(n)) })),
    edges: transitions.map((t) => ({ from: endId(t.from), to: endId(t.to), end: "open", labels: labelOf(t) ? [{ s: labelOf(t), at: "mid" }] : [], still: !mainT.has(t.n), first: mainT.has(t.n) })),
    groups,
  };
}

/** The column for phones. */
function columnOf(model) {
  const { order, outs } = model;
  const groupName = (n) => { if (!n.inside) return null; const c = model.all.find((o) => o.id === n.inside); return c.regions > 1 ? `${c.name}, region ${n.region}` : c.name; };
  return order.map((n, k) => {
    const next = order[k + 1];
    const node = { id: n.id, ...shape(n, Math.max(outs(n).length, model.ins(n).length)) };
    const o = outs(n);
    if (o.length === 1 && o[0].to === next && o[0].to !== n && groupName(next) === groupName(n)) return { node, group: groupName(n), arrow: { end: "open", label: labelOf(o[0]) }, rows: [] };
    return { node, group: groupName(n), rows: o.map((t) => ({ end: "open", label: labelOf(t), target: t.to === n ? "back to itself" : `${t.to.type !== "composite" && order.indexOf(t.to) >= 0 && order.indexOf(t.to) < k ? "back to" : "to"} ${callName(model, t.to)}` })) };
  });
}

/** The states and transitions in words, and the key to the marks the drawing uses. */
function wordsOf(model) {
  const { order, outs, composites, all } = model;
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const when = (t) => [t.trigger ? `on “${esc(t.trigger)}”` : "", t.guard ? `if ${esc(t.guard)}` : ""].filter(Boolean).join(", ");
  const go = (n, t) => { const w = when(t); const target = t.to === n ? "stay in it and start it again" : `go to ${esc(callName(model, t.to))}`; return `${w ? `${cap(w)}, ` : ""}${w ? target : cap(target)}${t.effect ? `, doing “${esc(t.effect)}”` : ""}.`; };
  const lines = order.map((n) => {
    const where = n.inside ? `${esc(all.find((c) => c.id === n.inside).name)}${all.find((c) => c.id === n.inside).regions > 1 ? `, region ${n.region}` : ""}: ` : "";
    const say = [];
    switch (n.type) {
      case "initial": say.push(n.inside ? "Here it starts." : "The machine starts here."); break;
      case "final": say.push(n.inside ? "This region is done." : "The machine ends."); break;
      case "terminate": say.push("The machine stops at once."); break;
      case "choice": say.push("A choice."); break;
      case "junction": say.push("Paths meet here."); break;
      case "history": say.push("Back to the state that was active last."); break;
      case "deep-history": say.push("Back to the state that was active last, at every level inside."); break;
      case "fork": say.push("The paths split and run at the same time."); break;
      case "join": say.push("Wait until every path that comes in is done."); break;
      default: say.push(`The state ${esc(n.name)}.`, ...n.actions.map(([k, v]) => `${{ entry: "On entry", do: "While in it", exit: "On exit" }[k]}: ${esc(v)}.`));
    }
    for (const t of outs(n)) say.push(go(n, t));
    return `<li>${where}${say.join(" ")}</li>`;
  });
  const comp = composites.map((c) => `<li>${esc(c.name)} is a state with states inside${c.regions > 1 ? `, in ${c.regions} regions that are active at the same time` : ""}. ${outs(c).map((t) => { const g = go(c, t); return `From any state inside, ${g[0].toLowerCase()}${g.slice(1)}`; }).join(" ")}</li>`);
  const types = new Set(all.map((n) => n.type));
  const used = [];
  const map = { initial: "initial", state: "state", composite: "composite", choice: "decision", junction: "junction", history: "history", "deep-history": "deepHistory", fork: "bar", join: "bar", final: "final", terminate: "cross" };
  for (const t of ["initial", "state", "composite", "choice", "junction", "history", "deep-history", "fork", "final", "terminate"]) if (types.has(t) || (t === "fork" && types.has("join"))) used.push(map[t]);
  if (composites.some((c) => c.regions > 1)) used.push("region");
  used.push("transition");
  return `<ol>${lines.join("")}</ol>${comp.length ? `\n<ul>${comp.join("")}</ul>` : ""}\n${uml.keyHtml([...new Set(used)], OWN)}`;
}

const OWN = {
  state: "A box with round corners: a state. Below its name: what it does on entry, while in it (do), and on exit.",
  composite: "A large box with round corners and states inside: a state made of smaller states.",
  region: "A dashed line inside a state: its regions, which are active at the same time.",
  transition: "A solid line with an open arrowhead: a change of state. Its label is the event, a condition in brackets, and after a slash what is done.",
  final: "A ring around a filled dot: the machine, or the region, is done.",
  decision: "A hollow diamond: a choice; the path that is taken depends on the condition in brackets.",
  cross: "A cross: the machine stops at once.",
};

module.exports = { readState, graphOf, columnOf, wordsOf, MOST };
