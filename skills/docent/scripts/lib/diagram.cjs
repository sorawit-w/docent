// From diagram data to a drawing: checks the data, picks the form, lays it out, and writes the SVG.
const { ICONS, iconProblem } = require("./icons.cjs");
const { layoutRoute } = require("./route.cjs");
const { toSvg } = require("./svg.cjs");
const { DataError, fail, words, id, findBlocks, block, replaceBlocks } = require("./blocks.cjs");
const { renderWidget } = require("./widget.cjs");
const { textWidth } = require("./text.cjs");

const FORMS = ["wide", "tall", "plates"];
const STATES = ["ok", "warn", "err"]; // success, needs care, failure: the status colors of the page
const MOST = { lanes: 4, parts: 12, legs: 16, name: 32, note: 40, verb: 24, lane: 28 };
const PAGE = 1104; // the widest drawing that fits a full-width well
const WALK = 520; // the widest drawing that fits beside the walkthrough steps
const PHONE = 264; // the widest drawing that fits a 320px screen
const ROOM = 96; // what the page takes beside a drawing: the page padding and the well padding

/** Checks diagram data and returns the model that the layouts use, with a list of warnings. */
function readData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail("the diagram data must be one JSON object");
  const warnings = [];
  const model = { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), form: data.form ?? "auto", place: data.place ?? "flow" };
  if (!["auto", ...FORMS].includes(model.form)) fail(`"form" must be "auto", "wide", "tall" or "plates"`);
  if (!["flow", "walk"].includes(model.place)) fail(`"place" must be "flow" or "walk"`);
  for (const key of ["lanes", "parts", "legs"]) if (!Array.isArray(data[key])) fail(`"${key}" must be a list`);
  if (data.lanes.length < 1 || data.lanes.length > MOST.lanes) fail(`a diagram has 1 to ${MOST.lanes} lanes; this one has ${data.lanes.length}`);
  if (data.parts.length < 2 || data.parts.length > MOST.parts) fail(`a diagram has 2 to ${MOST.parts} parts; this one has ${data.parts.length}`);
  if (data.legs.length < 1 || data.legs.length > MOST.legs) fail(`a diagram has 1 to ${MOST.legs} legs; this one has ${data.legs.length}`);

  const own = data.icons && typeof data.icons === "object" ? data.icons : {};
  const iconOf = (name, where) => {
    if (name == null) return null;
    const markup = Object.hasOwn(own, name) ? own[name] : ICONS[name];
    if (markup == null) return warnings.push(`${where}: no icon is named "${name}"; it is left out`), null;
    const problem = iconProblem(markup);
    return problem ? (warnings.push(`${where}: the icon "${name}" is left out because ${problem}`), null) : markup;
  };
  const unique = (list, what) => list.forEach((item, i) => { if (list.findIndex((other) => other.id === item.id) !== i) fail(`two ${what} have the id "${item.id}"`); });

  model.lanes = data.lanes.map((lane, i) => ({ id: id(lane?.id, `the id of lane ${i + 1}`), name: words(lane.name, `the name of lane ${i + 1}`, MOST.lane), icon: iconOf(lane.icon, `lane "${lane.id}"`) }));
  unique(model.lanes, "lanes");
  model.parts = data.parts.map((part, i) => {
    const lane = model.lanes.findIndex((l) => l.id === part?.lane);
    if (lane < 0) fail(`part ${i + 1} names the lane "${part?.lane}", which does not exist`);
    const made = { index: i, id: id(part.id, `the id of part ${i + 1}`), lane, name: words(part.name, `the name of part ${i + 1}`, MOST.name), note: words(part.note, `the note of part ${i + 1}`, MOST.note, false), icon: iconOf(part.icon, `part "${part.id}"`), state: part.state ?? null };
    // A state is a status color. Color is never the only sign, so the note must say the status in words.
    if (part.status != null) fail(`part ${i + 1} has the field "status"; the field is named "state"`);
    if (made.state !== null && !STATES.includes(made.state)) fail(`the state of part ${i + 1} must be "ok", "warn" or "err"`);
    if (made.state && !made.note) fail(`part ${i + 1} has a state but no note; the note must say the status in words, because color is never the only sign`);
    return made;
  });
  unique(model.parts, "parts");
  // When every part has the same state, the color tells the reader nothing.
  if (model.parts.every((part) => part.state && part.state === model.parts[0].state)) warnings.push(`every part has the state "${model.parts[0].state}", so the color shows nothing; give a state only to the parts whose status the reader must see`);
  model.legs = data.legs.map((leg, i) => {
    const from = model.parts.findIndex((p) => p.id === leg?.from), to = model.parts.findIndex((p) => p.id === leg?.to);
    if (from < 0 || to < 0) fail(`leg ${i + 1} goes from "${leg?.from}" to "${leg?.to}"; both must be ids of parts`);
    if (from === to) fail(`leg ${i + 1} starts and ends at the same part`);
    // An optional leg is a path that only some readers take. It is drawn as a dashed arrow.
    if (leg.optional != null && typeof leg.optional !== "boolean") fail(`"optional" of leg ${i + 1} must be true or false`);
    return { n: i + 1, from, to, verb: words(leg.verb, `the verb of leg ${i + 1}`, MOST.verb), optional: leg.optional === true };
  });

  // In one diagram, either every part has an icon or no part has one. The same holds for lanes.
  for (const [list, what] of [[model.parts, "part"], [model.lanes, "lane"]]) {
    const with_ = list.filter((item) => item.icon).length;
    if (with_ && with_ < list.length) {
      warnings.push(`only ${with_} of ${list.length} ${what}s have an icon, so the ${what}s are drawn without icons`);
      list.forEach((item) => (item.icon = null));
    }
  }
  model.radius = model.parts[0].icon ? 13 : 8;

  // A chain: each leg starts where the leg before it ended, and every part is visited once.
  const chain = [model.legs[0].from, ...model.legs.map((leg) => leg.to)];
  const isChain = model.legs.every((leg, i) => i === 0 || leg.from === model.legs[i - 1].to) && new Set(chain).size === chain.length && chain.length === model.parts.length;
  model.chain = isChain ? chain : null;
  return { model, warnings };
}

/** The forms to try, in order. The renderer picks from where the diagram sits and what it shows. */
function formsFor(model) {
  if (model.form !== "auto") return [model.form];
  if (!model.chain) return ["plates"];
  if (model.place === "walk") return ["tall", "plates"];
  if (model.parts.some((part) => part.note.length > 28)) return ["plates"];
  if (model.legs.length > 5) return ["tall", "plates"];
  return ["wide", "tall", "plates"];
}

function layout(model, form) {
  if (form === "plates") return require("./plates.cjs").layoutPlates(model);
  if (!model.chain) fail(`Route ${form} needs a route: each leg must start where the leg before it ended, and every part must be visited once. Use "plates" for paths that branch.`);
  return layoutRoute(model, form);
}

/** Draws one diagram. Returns { svg, form, warnings }. Throws when the data is wrong or no form keeps the rules. */
function renderDiagram(data) {
  const { model, warnings } = readData(data);
  const icons = warnings.filter((w) => !w.startsWith("every part has the state")); // these warnings are about icons; check reports them as errors
  const forms = formsFor(model);
  let scene = null, reason = null;
  for (const form of forms) {
    try {
      const made = layout(model, form);
      if (forms.length > 1 && form === "wide" && made.w > PAGE) { reason = new Error(`Route wide is ${made.w}px wide; a full-width well holds ${PAGE}px`); continue; }
      scene = made;
      break;
    } catch (error) {
      if (error instanceof DataError || forms.length === 1) throw error;
      reason = error;
    }
  }
  if (!scene) throw reason;
  if (model.place === "walk" && scene.w > WALK) {
    // Say what makes the drawing wide: each lane is as wide as its widest name or note.
    const widest = model.parts.flatMap((part) => [[part.name, textWidth(part.name, 14, 600)], [part.note, textWidth(part.note, 12, 400)]]).filter(([text]) => text).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([text]) => `"${text}"`);
    const lanes = scene.form === "tall" && model.lanes.length > 2 ? ` It has ${model.lanes.length} lanes, and two lanes fit there.` : "";
    // Data that is not a route is drawn as Plates. Then the cause is the extra path, not the texts, and the author must choose.
    const cause = model.chain
      ? `${lanes} The widest texts are ${widest.join(" and ")}; shorter names and notes make the drawing narrower`
      : ` Its data is not a route (a path branches, or a leg does not start where the leg before it ended), so it is drawn as Plates, which needs more room. A walkthrough needs a route. Choose one: take the extra path out and keep the walkthrough, or keep the path, put the diagram in the text flow and write the steps as a numbered list`;
    warnings.push(`the drawing is ${scene.w}px wide; beside the walkthrough steps there is room for ${WALK}px, so it will scroll sideways.${cause}`);
  }
  const id = `dg-${model.id}`, mode = model.place === "walk" ? "walk" : "auto";
  const withStates = (drawing) => {
    for (const part of drawing.parts) part.state = model.parts.find((p) => p.id === part.id).state;
    for (const leg of drawing.legs) leg.optional = model.legs[leg.n - 1].optional;
    return drawing;
  };
  withStates(scene);
  // A route also gets a single-track form. It takes the place of the main form on a screen or a sheet of paper that is too narrow.
  let phone = null;
  if (model.chain && scene.w > PHONE) {
    try { phone = withStates(layoutRoute(model, "track")); } catch (error) { warnings.push(`no phone form: ${error.message}`); }
  }
  // A drawing with no phone form scrolls sideways on a phone. It misleads when a whole arrow is off the first screen while both of its parts show there.
  if (!phone && scene.w > PHONE) {
    const left = (part) => (part.shape === "card" ? part.x : part.cx - part.r);
    for (const leg of scene.legs) {
      const ends = [leg.from, leg.to].map((end) => scene.parts.find((part) => part.id === end));
      if (leg.pts.every(([x]) => x > PHONE) && ends.every((part) => left(part) < PHONE)) warnings.push(`on a phone this drawing scrolls sideways, and leg ${leg.n} ("${leg.verb.s}") is not on the first screen: its two parts show there, but its arrow does not. Say this path in the text too`);
    }
  }
  const main = toSvg(scene, { id, label: model.label, mode, swap: phone && { phone: `${id}-phone` } });
  const svg = phone ? `${main}\n${toSvg(phone, { id: `${id}-phone`, label: model.label, mode, swap: { main: id, below: scene.w + ROOM } })}` : main;
  return { svg, form: scene.form, warnings, icons, model, scene };
}

/** Draws every diagram block and builds every widget block of a document, in place. Returns { html, results, widgets }: one result for each block, { id, form, warnings, error }. */
function renderDocument(html) {
  const diagrams = replaceBlocks(html, "diagram", (data) => {
    const drawn = renderDiagram(data);
    return { id: drawn.model.id, out: drawn.svg, form: drawn.form, warnings: drawn.warnings };
  });
  const widgets = replaceBlocks(diagrams.html, "widget", (data) => {
    const built = renderWidget(data);
    return { id: built.id, out: built.html, form: built.kind, warnings: built.warnings };
  });
  return { html: widgets.html, results: diagrams.results, widgets: widgets.results };
}

const findDiagrams = (html) => findBlocks(html, "diagram");

module.exports = { readData, formsFor, renderDiagram, renderDocument, findDiagrams, block, DataError, MOST };
