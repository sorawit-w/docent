// Flowcharts: steps, decisions and stops, with arrows that branch, skip and go back. The data becomes a model for the
// Plates layout: the main path in the first column, every other node in the second, and no numbers on the arrows.
// A decision is a plate with pointed ends, a stop has a thick outline, and the label of an exit is its verb.
const { fail, words, id } = require("./blocks.cjs");

const MOST = { nodes: 16, edges: 24, decisions: 4, exits: 3, name: 32, ask: 28, when: 16 };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Checks flowchart data and returns a model that the Plates layout and the column form can draw. */
function readFlow(data) {
  if (data.place != null && data.place !== "flow") fail(`a flowchart sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a flowchart has no "form"; the renderer draws it on two columns, and in one column on a phone`);
  for (const key of ["nodes", "edges"]) if (!Array.isArray(data[key])) fail(`"${key}" must be a list`);
  if (data.nodes.length < 2 || data.nodes.length > MOST.nodes) fail(`a flowchart has 2 to ${MOST.nodes} nodes; this one has ${data.nodes.length}`);
  if (data.edges.length < 1 || data.edges.length > MOST.edges) fail(`a flowchart has 1 to ${MOST.edges} edges; this one has ${data.edges.length}`);
  const nodes = data.nodes.map((node, i) => {
    const what = `node ${i + 1}`;
    if (!node || typeof node !== "object" || Array.isArray(node)) fail(`${what} must be an object with "id" and "name", or "id" and "ask"`);
    const nid = id(node.id, `the id of ${what}`);
    if (node.ask != null && node.name != null) fail(`${what} ("${nid}") has both "name" and "ask"; a step has a name, a decision asks a question`);
    if (node.stop != null && typeof node.stop !== "boolean") fail(`"stop" of ${what} must be true or false`);
    if (node.ask != null && node.stop) fail(`${what} ("${nid}") is a decision and a stop; a stop is a step that ends a path`);
    const ask = node.ask != null;
    return { index: i, id: nid, ask, stop: node.stop === true, name: ask ? words(node.ask, `the question of ${what}`, MOST.ask) : words(node.name, `the name of ${what}`, MOST.name) };
  });
  nodes.forEach((n, i) => { if (nodes.findIndex((o) => o.id === n.id) !== i) fail(`two nodes have the id "${n.id}"`); });
  const at = (nid, where) => { const i = nodes.findIndex((n) => n.id === nid); return i < 0 ? fail(`${where} names "${nid}", which is not a node`) : i; };
  const edges = data.edges.map((edge, i) => {
    const what = `edge ${i + 1}`;
    if (!edge || typeof edge !== "object" || Array.isArray(edge)) fail(`${what} must be an object with "from" and "to"`);
    const from = at(edge.from, what), to = at(edge.to, what);
    if (from === to) fail(`${what} starts and ends at "${nodes[from].id}"`);
    const when = words(edge.when, `"when" of ${what}`, MOST.when, false);
    if (nodes[from].ask && !when) fail(`${what} leaves the decision "${nodes[from].id}" with no "when"; each exit of a decision says when it is taken, such as "yes"`);
    if (!nodes[from].ask && when) fail(`${what} leaves the step "${nodes[from].id}" with a "when"; only a decision has exits with a "when"`);
    return { from, to, when };
  });
  edges.forEach((e, i) => { if (edges.findIndex((o) => o.from === e.from && o.to === e.to) !== i) fail(`two edges go from "${nodes[e.from].id}" to "${nodes[e.to].id}"`); });
  const exits = nodes.map((n) => edges.filter((e) => e.from === n.index));
  nodes.forEach((n, i) => {
    if (n.ask && (exits[i].length < 2 || exits[i].length > MOST.exits)) fail(`the decision "${n.id}" has ${exits[i].length} exits; a decision has 2 or 3`);
    if (!n.ask && exits[i].length > 1) fail(`the step "${n.id}" has ${exits[i].length} exits; a step has one, so a choice needs a decision ("ask")`);
    if (n.stop && exits[i].length) fail(`the stop "${n.id}" has an exit; a stop ends a path`);
    if (!exits[i].length && !n.stop && i !== nodes.length - 1) fail(`the path ends at "${n.id}"; a path ends at a stop ("stop": true) or at the last node`);
    if (n.ask && new Set(exits[i].map((e) => e.when.toLowerCase())).size < exits[i].length) fail(`two exits of the decision "${n.id}" have the same "when"`);
  });
  if (nodes.filter((n) => n.ask).length > MOST.decisions) fail(`a flowchart has at most ${MOST.decisions} decisions`);
  // Every node is reached from the first one.
  const seen = new Set([0]), todo = [0];
  while (todo.length) for (const e of exits[todo.pop()]) if (!seen.has(e.to)) { seen.add(e.to); todo.push(e.to); }
  const lost = nodes.find((n) => !seen.has(n.index));
  if (lost) fail(`no path from "${nodes[0].id}" reaches "${lost.id}"`);

  // The main path: from the first node, each node's first exit, until a node repeats or no exit is left.
  const main = [0];
  for (;;) {
    const next = exits[main.at(-1)][0];
    if (!next || main.includes(next.to)) break;
    main.push(next.to);
  }
  const mainEdges = main.slice(1).map((to, i) => edges.find((e) => e.from === main[i] && e.to === to));
  // The rows: the main path in order; after each decision, the nodes of its other exits, each followed by where it leads.
  const order = [];
  const side = (i) => {
    if (order.includes(i) || main.includes(i)) return;
    order.push(i);
    exits[i].forEach((e) => side(e.to));
  };
  for (const i of main) { order.push(i); exits[i].slice(1).forEach((e) => side(e.to)); }
  const lanes = main.length === nodes.length ? [{ id: "main", name: "", icon: null }] : [{ id: "main", name: "", icon: null }, { id: "other", name: "", icon: null }];
  const parts = nodes.map((n) => ({ index: n.index, id: n.id, lane: main.includes(n.index) || lanes.length === 1 ? 0 : 1, name: n.name, note: "", icon: null, state: null, ask: n.ask, stop: n.stop }));
  // The arrows of the main path come first, so the dot travels them; the others keep still.
  const ordered = [...mainEdges, ...edges.filter((e) => !mainEdges.includes(e))];
  const legs = ordered.map((e, i) => ({ n: i + 1, from: e.from, to: e.to, verb: e.when, optional: false, still: i >= mainEdges.length }));
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "flow", form: "plates", place: "flow", lanes, parts, legs, side: [], chain: null, radius: 8, order, hideMarks: true, flat: true, nodes, exits };
}

/** The steps in words: one line for each node, in the order of the rows, with each exit that does not go to the next line. */
function inWords(model) {
  const { nodes, exits, order } = model;
  const lines = order.map((i, k) => {
    const n = nodes[i], next = order[k + 1];
    const say = [esc(n.name) + (n.ask || /[.?!]$/.test(n.name) ? "" : ".")];
    if (n.ask) for (const e of exits[i]) say.push(`If ${esc(e.when)}: ${esc(nodes[e.to].name)}${nodes[e.to].ask ? "" : "."}`);
    else if (exits[i].length && exits[i][0].to !== next) say.push(`Then ${order.indexOf(exits[i][0].to) < k ? "back to" : "go to"}: ${esc(nodes[exits[i][0].to].name)}${nodes[exits[i][0].to].ask ? "" : "."}`);
    if (n.stop) say.push("The path ends here.");
    return `<li>${say.join(" ")}</li>`;
  });
  return `<ol>${lines.join("")}</ol>`;
}

module.exports = { readFlow, inWords, MOST };
