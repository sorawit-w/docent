// Activity diagrams in UML notation: actions, decisions and merges, forks and joins, objects, signals, partitions.
// The data becomes a graph for graph.cjs, a column for phones, and the steps in words with a key to the marks.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const uml = require("./uml.cjs");
const { wrap, PHONE_NODE } = require("./graph.cjs");

const MOST = { nodes: 20, flows: 30, partitions: 5, forks: 4, name: 32, guard: 24, state: 20 };
const TYPES = ["initial", "action", "decision", "merge", "fork", "join", "final", "flow-final", "object", "send", "accept"];
const NAMED = ["action", "object", "send", "accept", "interaction"];
// An interaction overview diagram is an activity diagram whose nodes are interactions: each a ref frame that names a sequence diagram.
const OVERVIEW = { types: ["initial", "interaction", "decision", "merge", "fork", "join", "final", "flow-final"], frames: 12 };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const nameW = (s) => textWidth(s, 14, 600);

/** The mark of each kind of node, as a graph node: its size, its ports and how it draws itself. room: the widest it may
 * be (the phone column); a longer name wraps onto more lines. */
function shape(n, degree, room = Infinity) {
  const lines = (pad) => (nameW(n.name) + pad <= room ? [n.name] : wrap(n.name, "name", room - pad));
  const stack = (ln, cx, cy, dx = 0) => ln.map((s, k) => ({ x: cx + dx, y: cy + 5 - 9 * (ln.length - 1) + 18 * k, s, cls: "name", anchor: "middle" }));
  switch (n.type) {
    case "initial": return { w: 16, h: 16, ports: "mid", draw: (cx, cy) => ({ svg: uml.nodes.initial([cx, cy]), texts: [] }) };
    case "final": return { w: 20, h: 20, ports: "mid", draw: (cx, cy) => ({ svg: uml.nodes.final([cx, cy]), texts: [] }) };
    case "flow-final": return { w: 20, h: 20, ports: "mid", draw: (cx, cy) => ({ svg: uml.nodes.flowFinal([cx, cy]), texts: [] }) };
    case "decision": case "merge": return { w: 32, h: 24, ports: "mid", draw: (cx, cy) => ({ svg: uml.nodes.decision([cx, cy]), texts: [] }) };
    case "fork": case "join": {
      const w = Math.max(72, 24 * (degree + 1));
      return { w, h: 6, ports: "tb", draw: (cx, cy) => ({ svg: uml.nodes.bar([cx, cy], w), texts: [] }) };
    }
    case "object": {
      const ln = lines(32), st = n.state ? `[${n.state}]` : "";
      const w = Math.max(96, ...ln.map((l) => nameW(l) + 32), st ? textWidth(st, 12) + 32 : 0), h = 40 + 18 * (ln.length - 1) + (st ? 12 : 0);
      return { w, h, draw: (cx, cy) => ({ svg: uml.shapes.compartments({ x: cx - w / 2, y: cy - h / 2, w, h }), texts: st ? [...stack(ln, cx, cy - 7), { x: cx, y: cy + h / 2 - 10, s: st, cls: "sub", anchor: "middle" }] : stack(ln, cx, cy) }) };
    }
    case "send": case "accept": {
      const ln = lines(44), w = Math.max(108, ...ln.map((l) => nameW(l) + 44)), h = 40 + 18 * (ln.length - 1);
      return { w, h, draw: (cx, cy) => ({ svg: uml.shapes[n.type]({ x: cx - w / 2, y: cy - h / 2, w, h }), texts: stack(ln, cx, cy, n.type === "send" ? -6 : 6) }) };
    }
    case "interaction": {
      // A ref frame: a box with the tab "ref" at its upper left and the interaction's name in the middle. With a diagram, the name links to it.
      const ln = lines(32), w = Math.max(120, ...ln.map((l) => nameW(l) + 32)), h = 52 + 18 * (ln.length - 1);
      return {
        w, h,
        draw: (cx, cy) => {
          const x = cx - w / 2, y = cy - h / 2, t = stack(ln, cx, cy + 8);
          const name = t.map((q) => `<text x="${q.x}" y="${q.y}" class="name" text-anchor="middle">${esc(q.s)}</text>`).join("");
          return { svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="u-face"/>${uml.shapes.tab({ x, y, w: 40, h: 20 })}<text x="${x + 10}" y="${y + 14}" class="u-op">ref</text>${name}`, texts: [] };
        },
      };
    }
    default: {
      const ln = lines(32), w = Math.max(96, ...ln.map((l) => nameW(l) + 32)), h = 40 + 18 * (ln.length - 1);
      return { w, h, draw: (cx, cy) => ({ svg: uml.shapes.rounded({ x: cx - w / 2, y: cy - h / 2, w, h }), texts: stack(ln, cx, cy) }) };
    }
  }
}

/** Checks activity data and returns the model: the graph, the column for phones and the steps in words. */
function readActivity(data, overview = false) {
  const kind = overview ? "an interaction overview diagram" : "an activity diagram";
  const types = overview ? OVERVIEW.types : TYPES;
  if (data.place != null && data.place !== "flow") fail(`${kind} sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`${kind} has no "form"; the renderer draws it, and a column on a phone`);
  for (const key of ["nodes", "flows"]) if (!Array.isArray(data[key])) fail(`"${key}" must be a list`);
  if (data.nodes.length < 2 || data.nodes.length > MOST.nodes) fail(`${kind} has 2 to ${MOST.nodes} nodes; this one has ${data.nodes.length}`);
  if (data.flows.length < 1 || data.flows.length > MOST.flows) fail(`${kind} has 1 to ${MOST.flows} flows; this one has ${data.flows.length}`);
  if (overview && data.partitions != null) fail(`an interaction overview diagram has no partitions; each interaction names its participants in its own sequence diagram`);
  if (data.partitions != null && !Array.isArray(data.partitions)) fail(`"partitions" must be a list`);
  const partitions = (data.partitions || []).map((p, i) => ({ id: id(p?.id, `the id of partition ${i + 1}`), name: words(p.name, `the name of partition ${i + 1}`, MOST.name) }));
  if (partitions.length > MOST.partitions) fail(`an activity diagram has at most ${MOST.partitions} partitions; this one has ${partitions.length}`);
  partitions.forEach((p, i) => { if (partitions.findIndex((o) => o.id === p.id) !== i) fail(`two partitions have the id "${p.id}"`); });
  const nodes = data.nodes.map((node, i) => {
    const what = `node ${i + 1}`;
    if (!node || typeof node !== "object" || Array.isArray(node)) fail(`${what} must be an object with "id"`);
    const nid = id(node.id, `the id of ${what}`);
    const type = node.type ?? (overview ? "interaction" : "action");
    if (!types.includes(type)) fail(`the type of ${what} ("${nid}") must be one of ${types.join(", ")}`);
    const field = type === "interaction" ? "ref" : "name";
    if (type === "interaction" && node.name != null) fail(`${what} ("${nid}") is an interaction; it names the interaction in "ref", not "name"`);
    if (NAMED.includes(type) && node[field] == null) fail(`${what} ("${nid}") is a${["action", "object", "accept", "interaction"].includes(type) ? "n" : ""} ${type} and needs a "${field}"`);
    if (!NAMED.includes(type) && (node.name != null || node.ref != null)) fail(`${what} ("${nid}") is a ${type}, which has no name in UML; leave "name" out`);
    if (node.diagram != null && type !== "interaction") fail(`${what} ("${nid}") has a "diagram"; only an interaction names one`);
    if (node.state != null && type !== "object") fail(`${what} ("${nid}") has a "state"; only an object node has one`);
    let part = null;
    if (partitions.length) {
      part = partitions.findIndex((p) => p.id === node.partition);
      if (part < 0) fail(`${what} ("${nid}") names the partition "${node.partition}", which does not exist; when a diagram has partitions, every node sits in one`);
    } else if (node.partition != null) fail(`${what} ("${nid}") names a partition, but the diagram has no "partitions"`);
    return { index: i, id: nid, type, name: NAMED.includes(type) ? words(node[field], `the ${field} of ${what}`, MOST.name) : "", state: words(node.state, `the state of ${what}`, MOST.state, false), part, diagram: node.diagram == null ? null : id(node.diagram, `the diagram of ${what}`) };
  });
  nodes.forEach((n, i) => { if (nodes.findIndex((o) => o.id === n.id) !== i) fail(`two nodes have the id "${n.id}"`); });
  const at = (nid, where) => { const i = nodes.findIndex((n) => n.id === nid); return i < 0 ? fail(`${where} names "${nid}", which is not a node`) : i; };
  const flows = data.flows.map((f, i) => {
    const what = `flow ${i + 1}`;
    if (!f || typeof f !== "object" || Array.isArray(f)) fail(`${what} must be an object with "from" and "to"`);
    const from = at(f.from, what), to = at(f.to, what);
    if (from === to) fail(`${what} starts and ends at "${nodes[from].id}"`);
    const guard = words(f.guard, `the guard of ${what}`, MOST.guard, false);
    if (guard && nodes[from].type !== "decision") fail(`${what} has a guard, but it leaves the ${nodes[from].type} "${nodes[from].id}"; only the flows out of a decision have guards`);
    if (/^\[|\]$/.test(guard)) fail(`the guard of ${what} has brackets; write it without them, and the renderer adds them`);
    return { n: i, from, to, guard };
  });
  flows.forEach((f, i) => { if (flows.findIndex((o) => o.from === f.from && o.to === f.to) !== i) fail(`two flows go from "${nodes[f.from].id}" to "${nodes[f.to].id}"`); });
  const outs = nodes.map((n) => flows.filter((f) => f.from === n.index)), ins = nodes.map((n) => flows.filter((f) => f.to === n.index));
  for (const n of nodes) {
    const o = outs[n.index].length, k = ins[n.index].length, say = `the ${n.type} "${n.id}"`;
    if (n.type === "initial" && (k || o !== 1)) fail(`${say} has ${k} flows in and ${o} out; an initial node has none in and one out`);
    if ((n.type === "final" || n.type === "flow-final") && o) fail(`${say} has a flow out; a final node ends a path`);
    if (n.type === "decision" && (k !== 1 || o < 2)) fail(`${say} has ${k} flows in and ${o} out; a decision has one in and two or more out. To join paths, use a merge`);
    if (n.type === "decision" && outs[n.index].some((f) => !f.guard)) fail(`a flow out of ${say} has no guard; each flow out of a decision says when it is taken, such as "in stock" or "else"`);
    if (n.type === "decision" && new Set(outs[n.index].map((f) => f.guard.toLowerCase())).size < o) fail(`two flows out of ${say} have the same guard`);
    // A small mark has four places where a line can meet it: one on each side.
    if (n.type === "decision" && o > 3) fail(`${say} has ${o} flows out; a decision has at most 3, so that each line meets one side of the diamond. Split the choice in two decisions`);
    if (n.type === "merge" && k > 3) fail(`${say} has ${k} flows in; a merge has at most 3, so that each line meets one side of the diamond. Use two merges`);
    if ((n.type === "final" || n.type === "flow-final") && k > 4) fail(`${say} has ${k} flows in; a final node has at most 4, one on each side. Add a second final node`);
    if (n.type === "merge" && (k < 2 || o !== 1)) fail(`${say} has ${k} flows in and ${o} out; a merge has two or more in and one out`);
    if (n.type === "fork" && (k !== 1 || o < 2)) fail(`${say} has ${k} flows in and ${o} out; a fork has one in and two or more out`);
    if (n.type === "join" && (k < 2 || o !== 1)) fail(`${say} has ${k} flows in and ${o} out; a join has two or more in and one out`);
    if (NAMED.includes(n.type) && o > 1) fail(`${say} has ${o} flows out; to split the path, add a decision (one path is taken) or a fork (all paths run at once)`);
    if (n.type !== "initial" && !k) fail(`nothing flows into ${say}; every node except an initial node has a flow in`);
    if (!["final", "flow-final"].includes(n.type) && !o) fail(`${say} has no flow out; a path ends at a final node ("final" or "flow-final")`);
  }
  for (const p of partitions) if (!nodes.some((n) => n.part === partitions.indexOf(p))) fail(`the partition "${p.id}" has no nodes; leave it out`);
  const starts = nodes.filter((n) => n.type === "initial");
  if (!starts.length) fail(`${kind} starts at an initial node ({ "type": "initial" })`);
  if (overview && nodes.filter((n) => n.type === "interaction").length > OVERVIEW.frames) fail(`an interaction overview diagram has at most ${OVERVIEW.frames} interactions`);
  if (nodes.filter((n) => n.type === "fork").length > MOST.forks) fail(`${kind} has at most ${MOST.forks} forks`);
  const seen = new Set(starts.map((n) => n.index)), todo = [...seen];
  while (todo.length) for (const f of outs[todo.pop()]) if (!seen.has(f.to)) { seen.add(f.to); todo.push(f.to); }
  const lost = nodes.find((n) => !seen.has(n.index));
  if (lost) fail(`no path from an initial node reaches "${lost.id}"`);

  // The main path, for the dot: from the first initial node, each node's first flow, until a node repeats or the path ends.
  const main = [starts[0].index];
  for (;;) { const f = outs[main.at(-1)][0]; if (!f || main.includes(f.to)) break; main.push(f.to); }
  const mainFlows = new Map(main.slice(1).map((to, i) => [flows.find((f) => f.from === main[i] && f.to === to).n, i])); // flow -> its place on the main path
  // The order of the column: the main path; after each split, the nodes of its other branches, each followed by where it leads.
  const order = [];
  const visit = (i) => { if (order.includes(i)) return; order.push(i); outs[i].forEach((f) => visit(f.to)); };
  for (const s of starts) visit(s.index);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: overview ? "interaction-overview" : "activity", partitions, nodes, flows, outs, ins, order, mainFlows, refs: nodes.filter((n) => n.diagram).map((n) => n.diagram) };
}

/** How a node is named in a row of the column and in the words: by its name, or by what it is and where it comes. */
function callName(model, i) {
  const n = model.nodes[i];
  if (n.name) return n.name + (n.state ? ` [${n.state}]` : "");
  const before = model.ins[i].map((f) => model.nodes[f.from]).find((p) => p.name);
  const what = { initial: "the start", decision: "the decision", merge: "the merge", fork: "the fork", join: "the join", final: "the end", "flow-final": "the end of this path" }[n.type];
  return before && !["initial", "final", "flow-final"].includes(n.type) ? `${what} after ${before.name}` : what;
}

/** The graph for graph.cjs. */
function graphOf(model) {
  const { nodes, flows, partitions, mainFlows } = model;
  return {
    nodes: nodes.map((n) => ({ id: n.id, group: n.part == null ? undefined : partitions[n.part].id, ...shape(n, Math.max(model.outs[n.index].length, model.ins[n.index].length)) })),
    edges: flows.map((f) => ({ from: nodes[f.from].id, to: nodes[f.to].id, end: "open", labels: f.guard ? [{ s: `[${f.guard}]`, at: "start" }] : [], still: !mainFlows.has(f.n), first: mainFlows.has(f.n), step: mainFlows.get(f.n) })),
    groups: partitions.map((p) => ({ id: p.id, name: p.name, kind: "lane" })),
  };
}

/** The column for phones: an arrow to the next node when that is its only flow, else a row for each flow. */
function columnOf(model) {
  const { nodes, order, outs, partitions } = model;
  return order.map((i, k) => {
    const n = nodes[i], next = order[k + 1], group = n.part == null ? null : partitions[n.part].name;
    const node = { id: n.id, ...shape(n, Math.max(outs[i].length, model.ins[i].length), PHONE_NODE) };
    const o = outs[i];
    if (o.length === 1 && o[0].to === next && nodes[next].part === n.part) return { node, group, arrow: { end: "open", label: o[0].guard ? `[${o[0].guard}]` : "" }, rows: [] };
    return { node, group, rows: o.map((f) => ({ end: "open", label: f.guard ? `[${f.guard}]` : "", target: `${order.indexOf(f.to) < k ? "back to" : "to"} ${callName(model, f.to)}` })) };
  });
}

/** The steps in words, in the order of the column, and the key to the marks the drawing uses. */
function wordsOf(model) {
  const { nodes, order, outs, partitions } = model;
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const dot = (s) => (/[.?!]$/.test(s) ? s : `${s}.`);
  const lines = order.map((i, k) => {
    const n = nodes[i], o = outs[i], next = order[k + 1];
    const who = n.part == null ? "" : `${esc(partitions[n.part].name)}: `;
    const to = (f) => esc(callName(model, f.to));
    let say;
    switch (n.type) {
      case "initial": say = "Start."; break;
      case "final": say = model.kind === "activity" ? "The activity ends." : "It ends."; break;
      case "flow-final": say = "This path ends; the other paths go on."; break;
      case "decision": say = `Decide: ${o.map((f) => `if ${esc(f.guard)}, go to ${to(f)}`).join("; ")}.`; break;
      case "merge": say = "The paths meet here."; break;
      case "fork": say = `The path splits; these run at the same time: ${o.map(to).join("; ")}.`; break;
      case "join": say = "Wait here until every path that comes in is done."; break;
      case "object": say = `${esc(n.name)}${n.state ? ` (${esc(n.state)})` : ""} is passed on.`; break;
      case "send": say = `Send the signal “${esc(n.name)}”.`; break;
      case "accept": say = `Wait for “${esc(n.name)}”.`; break;
      case "interaction": say = `The interaction “${n.diagram ? `<a href="#dg-${n.diagram}">${esc(n.name)}</a>` : esc(n.name)}” happens here${n.diagram ? "; its steps are in its own diagram" : ""}.`; break;
      default: say = esc(dot(n.name));
    }
    if (o.length === 1 && o[0].to !== next && !["decision", "fork"].includes(n.type)) say += ` Then ${order.indexOf(o[0].to) < k ? "back to" : "go to"} ${to(o[0])}.`;
    return `<li>${who}${cap(say)}</li>`;
  });
  const types = new Set(nodes.map((n) => n.type));
  const used = [];
  if (types.has("initial")) used.push("initial");
  if (types.has("action")) used.push("action");
  if (types.has("interaction")) used.push("interaction");
  if (types.has("decision") || types.has("merge")) used.push("decision");
  if (types.has("fork") || types.has("join")) used.push("bar");
  if (types.has("object")) used.push("object");
  if (types.has("send")) used.push("send");
  if (types.has("accept")) used.push("accept");
  if (types.has("final")) used.push("final");
  if (types.has("flow-final")) used.push("flowFinal");
  used.push("flow");
  if (partitions.length) used.push("partition");
  return `<ol>${lines.join("")}</ol>\n${uml.keyHtml(used, OWN)}`;
}

const OWN = {
  interaction: "A frame marked ref: an interaction whose messages are drawn in its own sequence diagram.",
  action: "A box with round corners: an action, one step of the work.",
  object: "A plain box: a thing that the actions pass on, with its state in brackets.",
  send: "A box with a point: a signal is sent.",
  accept: "A box with a notch: the activity waits for an event.",
  flow: "A solid line with an open arrowhead: the order of the steps. A condition in brackets says when that path is taken.",
  partition: "A column with a name: who does the actions in it.",
  final: "A ring around a filled dot: the activity ends.",
};

const readOverview = (data) => readActivity(data, true);

module.exports = { readActivity, readOverview, graphOf, columnOf, wordsOf, MOST };
