// Component, composite structure and deployment diagrams in UML notation. All three are structural kinds: nothing
// moves and there is no dot.
// - Component: a box marked «component» with the component icon. An interface is a ball: a solid line joins it to the
//   component that provides it, and a component that needs it holds it in a socket (a half circle). One level of
//   components may sit inside another; a «delegate» line hands the outer component's work to a part inside.
// - Composite structure: the outer classifier is a frame; its parts are boxes named "role : Type [multiplicity]"; its
//   ports are small squares on the frame, joined to the parts by connectors.
// - Deployment: a node is a 3D box marked «device» or «executionEnvironment». A node holds artifacts, or nodes that list
//   their artifacts, one level deep. Communication paths are solid lines; «manifest» joins an artifact to a component.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const uml = require("./uml.cjs");
const { wrap, PHONE_NODE } = require("./graph.cjs");

const MOST = { components: 12, interfaces: 16, users: 3, parts: 10, ports: 8, nodes: 10, artifacts: 16, lines: 24, name: 28 };
const NODE_KINDS = ["device", "executionEnvironment", "node"];
const MULT = /^(\d+|\*|\d+\.\.(\d+|\*))$/;
const D = 10; // the depth of a node's 3D box
const BALL = 7; // the radius of an interface's ball
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => String(Math.round(v * 100) / 100);
const obj = (v, what, keys) => (v && typeof v === "object" && !Array.isArray(v) ? v : fail(`${what} must be an object with ${keys}`));
const list = (v, what) => (v == null ? [] : Array.isArray(v) ? v : fail(`"${what}" must be a list`));
const unique = (all, what) => all.forEach((n, i) => { if (all.findIndex((o) => o.id === n.id) !== i) fail(`two ${what} have the id "${n.id}"`); });

/** A box with a keyword above its name and an icon at its upper right: a component or an artifact. */
function keywordShape({ keyword, name, icon, lines = [] }, room = Infinity) {
  const nameLines = textWidth(name, 14, 600) + 64 <= room ? [name] : wrap(name, "name", room - 64);
  const items = lines.flatMap((l) => (textWidth(l, 12) + 44 <= room ? [l] : wrap(l, "sub", room - 44)));
  const w = Math.max(120, textWidth(`«${keyword}»`, 12) + 64, ...nameLines.map((l) => textWidth(l, 14, 600) + 64), ...items.map((l) => textWidth(l, 12) + 44));
  const head = 18 + 18 * nameLines.length + 14, h = head + (items.length ? 8 + 18 * items.length : 0);
  return {
    w, h,
    draw: (cx, cy) => {
      const x = cx - w / 2, y = cy - h / 2;
      let svg = uml.shapes.compartments({ x, y, w, h }, items.length ? [y + head] : []) + icon(x + w - 24, y + 8);
      svg += `<text x="${num(cx)}" y="${num(y + 18)}" class="u-mem" text-anchor="middle">«${esc(keyword)}»</text>`;
      nameLines.forEach((l, k) => (svg += `<text x="${num(cx)}" y="${num(y + 38 + 18 * k)}" class="name" text-anchor="middle">${esc(l)}</text>`));
      items.forEach((l, k) => (svg += uml.signs.artifact(x + 12, y + head + 9 + 18 * k) + `<text x="${num(x + 32)}" y="${num(y + head + 21 + 18 * k)}" class="u-mem">${esc(l)}</text>`));
      return { svg, texts: [] };
    },
  };
}

/** A node of a deployment: a 3D box, its keyword and name, and the artifacts it lists. */
function nodeShape(n, room = Infinity) {
  const kw = `«${n.type}»`;
  const nameLines = textWidth(n.name, 14, 600) + 24 + D <= room ? [n.name] : wrap(n.name, "name", room - 24 - D);
  const items = n.listed.flatMap((a) => (textWidth(a.name, 12) + 44 + D <= room ? [a.name] : wrap(a.name, "sub", room - 44 - D)));
  const w = Math.max(132, textWidth(kw, 12) + 24 + D, ...nameLines.map((l) => textWidth(l, 14, 600) + 24 + D), ...items.map((l) => textWidth(l, 12) + 44 + D));
  const head = D + 18 + 18 * nameLines.length + 10, h = head + (items.length ? 18 * items.length + 6 : 0);
  return {
    w, h,
    draw: (cx, cy) => {
      const x = cx - w / 2, y = cy - h / 2, fx = x + (w - D) / 2;
      let svg = uml.shapes.node({ x, y, w: w - D, h }, D);
      svg += `<text x="${num(fx)}" y="${num(y + D + 18)}" class="u-mem" text-anchor="middle">${esc(kw)}</text>`;
      nameLines.forEach((l, k) => (svg += `<text x="${num(fx)}" y="${num(y + D + 38 + 18 * k)}" class="name" text-anchor="middle">${esc(l)}</text>`));
      items.forEach((l, k) => (svg += uml.signs.artifact(x + 12, y + head + 3 + 18 * k) + `<text x="${num(x + 32)}" y="${num(y + head + 15 + 18 * k)}" class="u-mem">${esc(l)}</text>`));
      return { svg, texts: [] };
    },
  };
}

/** An interface: a ball, its name above it to the right. Lines meet it at the middle of each side. */
function ballShape(name, provided) {
  const tw = textWidth(name, 12);
  const w = 2 * (BALL + 6 + tw) + 2, h = 48;
  return {
    w, h, ports: "mid",
    hit: (side, off, v) => ({ top: [v.cx, v.cy - BALL], bottom: [v.cx, v.cy + BALL], left: [v.cx - BALL, v.cy], right: [v.cx + BALL, v.cy] }[side]),
    draw: (cx, cy) => ({
      svg: (provided ? `<circle cx="${num(cx)}" cy="${num(cy)}" r="${BALL}" class="u-face"/>` : "") + `<text x="${num(cx + BALL + 6)}" y="${num(cy - BALL - 6)}" class="u-mem">${esc(name)}</text>`,
      texts: [],
    }),
  };
}

/** A part of a composite structure: a box named "role : Type [multiplicity]". */
function partShape(p, room = Infinity) {
  const title = partTitle(p);
  const lines = textWidth(title, 14, 600) + 32 <= room ? [title] : wrap(title, "name", room - 32);
  const w = Math.max(120, ...lines.map((l) => textWidth(l, 14, 600) + 32)), h = 24 + 18 * lines.length;
  return {
    w, h,
    draw: (cx, cy) => ({ svg: uml.shapes.compartments({ x: cx - w / 2, y: cy - h / 2, w, h }) + lines.map((l, k) => `<text x="${num(cx)}" y="${num(cy - h / 2 + 26 + 18 * k)}" class="name" text-anchor="middle">${esc(l)}</text>`).join(""), texts: [] }),
  };
}
const partTitle = (p) => `${p.name} : ${p.type}${p.multiplicity ? ` [${p.multiplicity}]` : ""}`;

/** A frame: a plain box, its title at the upper left, and an icon after the title. */
const frameDraw = (title, icon) => (r) => {
  let svg = uml.shapes.compartments(r);
  if (icon) svg += icon(r.x + 20 + textWidth(title, 14, 600), r.y + 8);
  return { svg, texts: [{ x: r.x + 12, y: r.y + 22, s: title, cls: "name", anchor: "start" }] };
};
/** The frame of a node that holds things: a 3D box, its keyword and name at the upper left of its front. */
const nodeFrameDraw = (title) => (r) => ({ svg: uml.shapes.node({ x: r.x, y: r.y, w: r.w - D, h: r.h }, D), texts: [{ x: r.x + 12, y: r.y + D + 20, s: title, cls: "name", anchor: "start" }] });

const header = (data, kind) => {
  if (data.place != null && data.place !== "flow") fail(`${kind} sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`${kind} has no "form"; the renderer draws it, and a list on a phone`);
};

/** Checks component diagram data and returns the model. */
function readComponent(data) {
  header(data, "a component diagram");
  const components = list(data.components, "components").map((c, i) => {
    const what = `component ${i + 1}`;
    obj(c, what, `"id" and "name"`);
    return { id: id(c.id, `the id of ${what}`), name: words(c.name, `the name of ${what}`, MOST.name), inside: c.in ?? null };
  });
  if (components.length < 1 || components.length > MOST.components) fail(`a component diagram has 1 to ${MOST.components} components; this one has ${components.length}`);
  unique(components, "components");
  const at = (cid, where) => components.find((c) => c.id === cid) || fail(`${where} names "${cid}", which is not a component`);
  for (const c of components) {
    if (c.inside == null) continue;
    const outer = at(c.inside, `the "in" of "${c.id}"`);
    if (outer === c) fail(`the component "${c.id}" is in itself`);
    if (outer.inside != null) fail(`the component "${c.id}" is in "${outer.id}", which is itself in a component; components nest one level deep`);
  }
  for (const c of components) c.holds = components.filter((o) => o.inside === c.id);
  const interfaces = list(data.interfaces, "interfaces").map((f, i) => {
    const what = `interface ${i + 1}`;
    obj(f, what, `"id", "name", and "provider" or "users"`);
    const users = list(f.users, `the users of ${what}`).map((u) => at(u, `the users of ${what}`));
    const provider = f.provider == null ? null : at(f.provider, what);
    if (!provider && !users.length) fail(`${what} has no "provider" and no "users"; say which component offers it, or which ones need it`);
    if (users.length > MOST.users) fail(`${what} has ${users.length} users; at most ${MOST.users}, since a ball has room for four lines`);
    if (provider && users.includes(provider)) fail(`the component "${provider.id}" both offers and needs ${what}`);
    if (new Set(users).size !== users.length) fail(`${what} names a user twice`);
    if (f.port != null && !provider) fail(`${what} has a "port" but no "provider"; a port sits on the component that offers the interface`);
    return { id: id(f.id, `the id of ${what}`), name: words(f.name, `the name of ${what}`, MOST.name), provider, users, port: f.port == null ? null : words(f.port, `the port of ${what}`, MOST.name) };
  });
  if (interfaces.length > MOST.interfaces) fail(`a component diagram has at most ${MOST.interfaces} interfaces`);
  unique([...components, ...interfaces], "components or interfaces");
  const dependencies = list(data.dependencies, "dependencies").map((d, i) => {
    const what = `dependency ${i + 1}`;
    obj(d, what, `"from" and "to"`);
    const from = at(d.from, what), to = at(d.to, what);
    if (from === to) fail(`${what} goes from "${from.id}" to itself`);
    if (from.inside === to.id || to.inside === from.id) fail(`${what} joins "${from.id}" to the component around it; use a delegation`);
    return { from, to };
  });
  const delegations = list(data.delegations, "delegations").map((d, i) => {
    const what = `delegation ${i + 1}`;
    obj(d, what, `"from" (the outer component) and "to" (a component inside it)`);
    const from = at(d.from, what), to = at(d.to, what);
    if (to.inside !== from.id) fail(`${what} goes from "${from.id}" to "${to.id}", which is not inside it; a delegation hands work to a part inside`);
    return { from, to, port: d.port == null ? null : words(d.port, `the port of ${what}`, MOST.name) };
  });
  if (interfaces.length * 2 + dependencies.length + delegations.length > MOST.lines * 2) fail(`a component diagram has too many lines; split it`);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "component", components, interfaces, dependencies, delegations };
}

/** Checks composite structure data and returns the model. */
function readComposite(data) {
  header(data, "a composite structure diagram");
  const classifier = words(data.classifier, `"classifier" (the name of the class whose inside the diagram shows)`, MOST.name);
  const parts = list(data.parts, "parts").map((p, i) => {
    const what = `part ${i + 1}`;
    obj(p, what, `"id", "name" (its role) and "type"`);
    const multiplicity = p.multiplicity == null ? "" : words(String(p.multiplicity), `the multiplicity of ${what}`, 12);
    if (multiplicity && !MULT.test(multiplicity)) fail(`the multiplicity "${multiplicity}" of ${what} is not a UML multiplicity, such as "1", "0..1", "*" or "1..*"`);
    return { kind: "part", id: id(p.id, `the id of ${what}`), name: words(p.name, `the name (role) of ${what}`, MOST.name), type: words(p.type, `the type of ${what}`, MOST.name), multiplicity };
  });
  if (parts.length < 1 || parts.length > MOST.parts) fail(`a composite structure diagram has 1 to ${MOST.parts} parts; this one has ${parts.length}`);
  const ports = list(data.ports, "ports").map((p, i) => {
    const what = `port ${i + 1}`;
    obj(p, what, `"id" and "name"`);
    return { kind: "port", id: id(p.id, `the id of ${what}`), name: words(p.name, `the name of ${what}`, MOST.name) };
  });
  if (ports.length > MOST.ports) fail(`a composite structure diagram has at most ${MOST.ports} ports`);
  unique([...parts, ...ports], "parts or ports");
  const all = [...parts, ...ports];
  const at = (x, where) => all.find((o) => o.id === x) || fail(`${where} names "${x}", which is not a part or a port`);
  const connectors = list(data.connectors, "connectors").map((c, i) => {
    const what = `connector ${i + 1}`;
    obj(c, what, `"from" and "to"`);
    let from = at(c.from, what), to = at(c.to, what);
    if (from === to) fail(`${what} goes from "${from.id}" to itself`);
    if (from.kind === "port" && to.kind === "port") fail(`${what} joins two ports; a connector joins a port to a part inside, or two parts`);
    if (to.kind === "port") [from, to] = [to, from];
    return { from, to, label: words(c.label, `the label of ${what}`, MOST.name, false) };
  });
  if (connectors.length > MOST.lines) fail(`a composite structure diagram has at most ${MOST.lines} connectors`);
  for (const p of ports) if (!connectors.some((c) => c.from === p)) fail(`the port "${p.id}" has no connector; join it to the part that does its work`);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "composite", classifier, parts, ports, connectors };
}

/** Checks deployment diagram data and returns the model. */
function readDeployment(data) {
  header(data, "a deployment diagram");
  const nodes = list(data.nodes, "nodes").map((n, i) => {
    const what = `node ${i + 1}`;
    obj(n, what, `"id" and "name"`);
    const type = n.type ?? "device";
    if (!NODE_KINDS.includes(type)) fail(`the type of ${what} must be one of ${NODE_KINDS.join(", ")}`);
    return { kind: "node", id: id(n.id, `the id of ${what}`), name: words(n.name, `the name of ${what}`, MOST.name), type, inside: n.in ?? null };
  });
  if (nodes.length < 1 || nodes.length > MOST.nodes) fail(`a deployment diagram has 1 to ${MOST.nodes} nodes; this one has ${nodes.length}`);
  const nodeAt = (x, where) => nodes.find((n) => n.id === x) || fail(`${where} names "${x}", which is not a node`);
  for (const n of nodes) {
    if (n.inside == null) continue;
    const outer = nodeAt(n.inside, `the "in" of "${n.id}"`);
    if (outer === n) fail(`the node "${n.id}" is in itself`);
    if (outer.inside != null) fail(`the node "${n.id}" is in "${outer.id}", which is itself in a node; nodes nest one level deep`);
  }
  const artifacts = list(data.artifacts, "artifacts").map((a, i) => {
    const what = `artifact ${i + 1}`;
    obj(a, what, `"id", "name" and "in" (the node it is deployed on)`);
    const on = a.in == null ? null : nodeAt(a.in, what);
    return { kind: "artifact", id: id(a.id, `the id of ${what}`), name: words(a.name, `the name of ${what}`, MOST.name), on };
  });
  if (artifacts.length > MOST.artifacts) fail(`a deployment diagram has at most ${MOST.artifacts} artifacts`);
  const components = list(data.components, "components").map((c, i) => {
    const what = `component ${i + 1}`;
    obj(c, what, `"id" and "name"`);
    return { kind: "component", id: id(c.id, `the id of ${what}`), name: words(c.name, `the name of ${what}`, MOST.name) };
  });
  unique([...nodes, ...artifacts, ...components], "nodes, artifacts or components");
  for (const n of nodes) { n.nodes = nodes.filter((o) => o.inside === n.id); n.artifacts = artifacts.filter((a) => a.on === n); }
  // A node inside a node lists its artifacts by name; a node at the top draws them as boxes inside its frame.
  for (const n of nodes) n.listed = n.inside ? n.artifacts : [];
  const manifests = list(data.manifests, "manifests").map((m, i) => {
    const what = `manifest ${i + 1}`;
    obj(m, what, `"artifact" and "component"`);
    const artifact = artifacts.find((a) => a.id === m.artifact) || fail(`${what} names "${m.artifact}", which is not an artifact`);
    const component = components.find((c) => c.id === m.component) || fail(`${what} names "${m.component}", which is not a component`);
    if (artifact.on && artifact.on.inside) fail(`${what} starts at "${artifact.id}", which a node inside a node lists by name; put the artifact in a node at the top to draw its «manifest» line`);
    return { artifact, component };
  });
  for (const c of components) if (!manifests.some((m) => m.component === c)) fail(`the component "${c.id}" has no «manifest» line; a deployment diagram shows a component only as what an artifact makes real`);
  const paths = list(data.paths, "paths").map((p, i) => {
    const what = `path ${i + 1}`;
    obj(p, what, `"from" and "to" (two nodes)`);
    const from = nodeAt(p.from, what), to = nodeAt(p.to, what);
    if (from === to) fail(`${what} goes from "${from.id}" to itself`);
    if (from.inside === to.id || to.inside === from.id) fail(`${what} joins "${from.id}" to the node around it; a node already reaches the node it is in`);
    return { from, to, protocol: words(p.protocol, `the protocol of ${what}`, MOST.name, false) };
  });
  if (paths.length + manifests.length > MOST.lines) fail(`a deployment diagram has at most ${MOST.lines} lines`);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "deployment", nodes, artifacts, components, manifests, paths };
}

// Internal ids hold "_", which a data id never does, so they never meet the ids in the data.
const frameId = (x) => `frame_${x}`;
const icons = { component: (x, y) => uml.signs.component(x, y), artifact: (x, y) => uml.signs.artifact(x + 2, y) };
const componentShape = (c, room) => keywordShape({ keyword: "component", name: c.name, icon: icons.component }, room);
const artifactShape = (a, room) => keywordShape({ keyword: "artifact", name: a.name, icon: icons.artifact }, room);

/** The graph for graph.cjs. */
function graphOf(model) {
  if (model.kind === "component") {
    const endId = (c) => (c.holds.length ? frameId(c.id) : c.id);
    const inner = (f) => { const all = [f.provider, ...f.users].filter(Boolean); return all.every((c) => c.inside && c.inside === all[0].inside) ? frameId(all[0].inside) : undefined; };
    return {
      nodes: [
        ...model.components.filter((c) => !c.holds.length).map((c) => ({ id: c.id, group: c.inside ? frameId(c.inside) : undefined, ...componentShape(c) })),
        ...model.interfaces.map((f) => ({ id: f.id, group: inner(f), ...ballShape(f.name, Boolean(f.provider)) })),
      ],
      edges: [
        ...model.interfaces.flatMap((f) => [
          ...f.users.map((u) => ({ from: endId(u), to: f.id, end: "socket", still: true })),
          ...(f.provider ? [{ from: f.id, to: endId(f.provider), still: true, port: f.port ? "end" : null, labels: f.port ? [{ s: f.port, at: "end", near: true }] : [] }] : []),
        ]),
        ...model.dependencies.map((d) => ({ from: endId(d.from), to: endId(d.to), end: "open", dashed: true, still: true })),
        ...model.delegations.map((d) => ({ from: frameId(d.from.id), to: d.to.id, end: "open", still: true, port: "start", labels: [{ s: "«delegate»", at: "mid" }, ...(d.port ? [{ s: d.port, at: "start", near: true }] : [])] })),
      ],
      groups: model.components.filter((c) => c.holds.length).map((c) => ({ id: frameId(c.id), name: `«component» ${c.name}`, kind: "box", nameExtra: 24, draw: frameDraw(`«component» ${c.name}`, icons.component) })),
    };
  }
  if (model.kind === "composite") {
    const F = "classifier_frame";
    const endId = (x) => (x.kind === "port" ? F : x.id);
    return {
      nodes: model.parts.map((p) => ({ id: p.id, group: F, ...partShape(p) })),
      edges: model.connectors.map((c) => ({ from: endId(c.from), to: endId(c.to), still: true, port: c.from.kind === "port" ? "start" : null, labels: [...(c.from.kind === "port" ? [{ s: c.from.name, at: "start", near: true }] : []), ...(c.label ? [{ s: c.label, at: "mid" }] : [])] })),
      groups: [{ id: F, name: model.classifier, kind: "box", draw: frameDraw(model.classifier) }],
    };
  }
  const framed = (n) => !n.inside && (n.nodes.length || n.artifacts.length);
  const endId = (n) => (framed(n) ? frameId(n.id) : n.id);
  const title = (n) => `«${n.type}» ${n.name}`;
  return {
    nodes: [
      ...model.nodes.filter((n) => !framed(n)).map((n) => ({ id: n.id, group: n.inside ? frameId(n.inside) : undefined, ...nodeShape(n) })),
      ...model.artifacts.filter((a) => !a.on || !a.on.inside).map((a) => ({ id: a.id, group: a.on ? frameId(a.on.id) : undefined, ...artifactShape(a) })),
      ...model.components.map((c) => ({ id: c.id, ...componentShape(c) })),
    ],
    edges: [
      ...model.paths.map((p) => ({ from: endId(p.from), to: endId(p.to), still: true, labels: p.protocol ? [{ s: p.protocol, at: "mid" }] : [] })),
      ...model.manifests.map((m) => ({ from: m.artifact.id, to: m.component.id, end: "open", dashed: true, still: true, labels: [{ s: "«manifest»", at: "mid" }] })),
    ],
    groups: model.nodes.filter(framed).map((n) => ({ id: frameId(n.id), name: title(n), kind: "box", tab: D, draw: nodeFrameDraw(title(n)) })),
  };
}

/** The list for phones. */
function columnOf(model) {
  if (model.kind === "component") {
    const rows = (c) => [
      ...model.interfaces.filter((f) => f.provider === c).map((f) => ({ end: null, label: f.port ? `offers, at the port ${f.port}` : "offers", target: f.name })),
      ...model.interfaces.filter((f) => f.users.includes(c)).map((f) => ({ end: "socket", label: "needs", target: f.name })),
      ...model.dependencies.filter((d) => d.from === c).map((d) => ({ end: "open", dashed: true, label: "depends on", target: d.to.name })),
      ...model.delegations.filter((d) => d.from === c).map((d) => ({ end: "open", label: "«delegate»", target: d.to.name })),
    ];
    return model.components.filter((c) => !c.inside).flatMap((c) => [
      { node: { id: `${c.id}-phone`, ...componentShape(c, PHONE_NODE) }, rows: rows(c) },
      ...c.holds.map((q) => ({ node: { id: `${q.id}-phone`, ...componentShape(q, PHONE_NODE) }, group: `«component» ${c.name}`, rows: rows(q) })),
    ]);
  }
  if (model.kind === "composite") {
    const rows = (p) => model.connectors.filter((c) => c.from === p || c.to === p).map((c) => { const o = c.from === p ? c.to : c.from; return { end: null, label: c.label || (o.kind === "port" ? "at the port" : "linked to"), target: o.kind === "port" ? o.name : partTitle(o) }; });
    return model.parts.map((p) => ({ node: { id: `${p.id}-phone`, ...partShape(p, PHONE_NODE) }, group: model.classifier, rows: rows(p) }));
  }
  const rows = (n) => model.paths.filter((p) => p.from === n || p.to === n).map((p) => ({ end: null, label: p.protocol || "linked to", target: (p.from === n ? p.to : p.from).name }));
  const items = [];
  for (const n of model.nodes.filter((q) => !q.inside)) {
    items.push({ node: { id: `${n.id}-phone`, ...nodeShape({ ...n, listed: n.artifacts }, PHONE_NODE) }, rows: rows(n) });
    for (const q of n.nodes) items.push({ node: { id: `${q.id}-phone`, ...nodeShape(q, PHONE_NODE) }, group: `inside ${n.name}`, rows: rows(q) });
  }
  for (const a of model.artifacts.filter((x) => !x.on)) items.push({ node: { id: `${a.id}-phone`, ...artifactShape(a, PHONE_NODE) }, rows: [] });
  for (const m of model.manifests) items.push({ node: { id: `${m.component.id}-${m.artifact.id}-phone`, ...componentShape(m.component, PHONE_NODE) }, rows: [{ end: "open", dashed: true, label: "made real by", target: m.artifact.name }] });
  return items;
}

/** The diagram in words, and the key to the marks it uses. */
function wordsOf(model) {
  const used = [];
  const ul = (lines) => (lines.length ? `<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>\n` : "");
  if (model.kind === "component") {
    used.push("componentBox");
    const lines = model.components.map((c) => `The component ${esc(c.name)}${c.inside ? `, inside ${esc(model.components.find((o) => o.id === c.inside).name)}` : ""}.`);
    const faces = model.interfaces.map((f) => {
      const say = [];
      if (f.provider) say.push(`${esc(f.provider.name)} offers it${f.port ? ` at the port ${esc(f.port)}` : ""}`);
      if (f.users.length) say.push(`${f.users.map((u) => esc(u.name)).join(", ")} ${f.users.length > 1 ? "need" : "needs"} it`);
      return `The interface ${esc(f.name)}: ${say.join(", and ")}.`;
    });
    const deps = model.dependencies.map((d) => `${esc(d.from.name)} depends on ${esc(d.to.name)}.`);
    const dels = model.delegations.map((d) => `${esc(d.from.name)} hands its work${d.port ? ` at the port ${esc(d.port)}` : ""} to ${esc(d.to.name)}, inside it.`);
    if (model.interfaces.some((f) => f.provider)) used.push("lollipop");
    if (model.interfaces.some((f) => f.users.length)) used.push("socket");
    if (model.interfaces.some((f) => f.port) || model.delegations.length) used.push("port");
    if (deps.length) used.push("dependency");
    if (dels.length) used.push("delegate");
    return `${ul(lines)}${ul(faces)}${ul([...deps, ...dels])}${uml.keyHtml(used, OWN)}`;
  }
  if (model.kind === "composite") {
    used.push("frame", "part");
    const parts = model.parts.map((p) => `The part ${esc(p.name)}, of type ${esc(p.type)}${p.multiplicity ? `, ${esc(p.multiplicity)} of them` : ""}.`);
    const links = model.connectors.map((c) => (c.from.kind === "port" ? `The port ${esc(c.from.name)} on ${esc(model.classifier)} connects to ${esc(c.to.name)}` : `${esc(c.from.name)} connects to ${esc(c.to.name)}`) + (c.label ? `: ${esc(c.label)}.` : "."));
    if (model.ports.length) used.push("port");
    used.push("connector");
    return `<p>The inside of ${esc(model.classifier)}.</p>\n${ul(parts)}${ul(links)}${uml.keyHtml(used, OWN)}`;
  }
  used.push("node");
  const kind = { device: "device", executionEnvironment: "execution environment", node: "node" };
  const nodes = model.nodes.map((n) => `The ${kind[n.type]} ${esc(n.name)}${n.inside ? `, inside ${esc(model.nodes.find((o) => o.id === n.inside).name)}` : ""}${n.artifacts.length ? `, runs ${n.artifacts.map((a) => esc(a.name)).join(", ")}` : ""}.`);
  const loose = model.artifacts.filter((a) => !a.on).map((a) => `The artifact ${esc(a.name)}, not yet on a node.`);
  const paths = model.paths.map((p) => `${esc(p.from.name)} talks to ${esc(p.to.name)}${p.protocol ? ` over ${esc(p.protocol)}` : ""}.`);
  const mans = model.manifests.map((m) => `The artifact ${esc(m.artifact.name)} makes the component ${esc(m.component.name)} real.`);
  if (model.artifacts.length) used.push("artifactBox");
  if (paths.length) used.push("path");
  if (mans.length) used.push("componentBox", "manifest");
  return `${ul([...nodes, ...loose])}${ul([...paths, ...mans])}${uml.keyHtml(used, OWN)}`;
}

const OWN = {
  componentBox: "A box marked «component», with the component icon: a part of the system that can be replaced as a whole.",
  lollipop: "A ball on a line: a service, an interface, that the component at the line's other end offers.",
  socket: "A half circle around a ball: the component at the line's other end needs that service.",
  port: "A small square on a border: a port, the point where the thing connects to the outside.",
  dependency: "A dashed line with an open arrowhead: the component at the line's start needs the one at the arrowhead.",
  delegate: "A line marked «delegate»: the outer component hands the work to the part inside it.",
  frame: "The frame: the class whose inside the diagram shows.",
  part: "A box named role : Type: a part, the role a thing of that type plays inside the class.",
  connector: "A solid line: the two connect, so they can talk to each other.",
  node: "A 3D box: a node, a computer or a runtime, marked «device» or «executionEnvironment».",
  artifactBox: "A box marked «artifact», with the page icon: a file, such as a program, that runs on a node.",
  path: "A solid line between nodes: a communication path, with its protocol when known.",
  manifest: "A dashed line marked «manifest»: the artifact makes the component real.",
};

module.exports = { readComponent, readComposite, readDeployment, graphOf, columnOf, wordsOf, MOST };
