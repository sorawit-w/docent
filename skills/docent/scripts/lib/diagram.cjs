// From diagram data to a drawing: checks the data, picks the form, lays it out, and writes the SVG.
const { ICONS, iconProblem } = require("./icons.cjs");
const { layoutRoute } = require("./route.cjs");
const { toSvg } = require("./svg.cjs");

const FORMS = ["wide", "tall", "plates"];
const MOST = { lanes: 4, parts: 12, legs: 16, name: 32, note: 40, verb: 24, lane: 28 };
const PAGE = 1104; // the widest drawing that fits a full-width well
const WALK = 520; // the widest drawing that fits beside the walkthrough steps
const PHONE = 264; // the widest drawing that fits a 320px screen
const MARKER = /<!-- docent:diagram[ \t]*\n([\s\S]*?)\n[ \t]*-->[\s\S]*?<!-- \/docent:diagram -->/g;

class DataError extends Error {}
const fail = (msg) => { throw new DataError(msg); };

function words(value, what, most, required = true) {
  if (value == null || value === "") return required ? fail(`${what} is missing`) : "";
  if (typeof value !== "string") fail(`${what} must be text`);
  const s = value.trim().replace(/\s+/g, " ");
  if (!s) return required ? fail(`${what} is empty`) : "";
  if (s.length > most) fail(`${what} is ${s.length} characters long; the most is ${most}: "${s}"`);
  return s;
}

const id = (value, what) => (typeof value === "string" && /^[a-z][a-z0-9-]{0,39}$/.test(value) ? value : fail(`${what} must be a short id: small letters, digits and "-", starting with a letter`));

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
    return { index: i, id: id(part.id, `the id of part ${i + 1}`), lane, name: words(part.name, `the name of part ${i + 1}`, MOST.name), note: words(part.note, `the note of part ${i + 1}`, MOST.note, false), icon: iconOf(part.icon, `part "${part.id}"`) };
  });
  unique(model.parts, "parts");
  model.legs = data.legs.map((leg, i) => {
    const from = model.parts.findIndex((p) => p.id === leg?.from), to = model.parts.findIndex((p) => p.id === leg?.to);
    if (from < 0 || to < 0) fail(`leg ${i + 1} goes from "${leg?.from}" to "${leg?.to}"; both must be ids of parts`);
    if (from === to) fail(`leg ${i + 1} starts and ends at the same part`);
    return { n: i + 1, from, to, verb: words(leg.verb, `the verb of leg ${i + 1}`, MOST.verb) };
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
  const icons = [...warnings]; // every warning from the data is about an icon
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
  if (model.place === "walk" && scene.w > WALK) warnings.push(`the drawing is ${scene.w}px wide; beside the walkthrough steps there is room for ${WALK}px, so it will scroll sideways`);
  const id = `dg-${model.id}`, mode = model.place === "walk" ? "walk" : "auto";
  // A route also gets a single-track form for phones. It takes the place of the main form on a screen that is too narrow.
  let phone = null;
  if (model.chain && scene.w > PHONE) {
    try { phone = layoutRoute(model, "track"); } catch (error) { warnings.push(`no phone form: ${error.message}`); }
  }
  const main = toSvg(scene, { id, label: model.label, mode, swap: phone && { phone: `${id}-phone` } });
  const svg = phone ? `${main}\n${toSvg(phone, { id: `${id}-phone`, label: model.label, mode, swap: { main: id, below: Math.max(720, scene.w + 96) } })}` : main;
  return { svg, form: scene.form, warnings, icons, model, scene };
}

/** Finds every diagram block in a document: [{ json, start, end, text }]. */
function findDiagrams(html) {
  return [...html.matchAll(MARKER)].map((m) => ({ json: m[1], text: m[0], start: m.index, end: m.index + m[0].length }));
}

const block = (json, svg) => `<!-- docent:diagram\n${json}\n-->\n${svg}\n<!-- /docent:diagram -->`;

/** Draws every diagram block of a document in place. Returns { html, results: [{ id, form, warnings, error }] }. */
function renderDocument(html) {
  const results = [], seen = new Set();
  let out = "", at = 0;
  for (const found of findDiagrams(html)) {
    const result = { id: null, form: null, warnings: [], error: null };
    let text = found.text;
    try {
      let data;
      try { data = JSON.parse(found.json); } catch (error) { fail(`the data is not valid JSON: ${error.message}`); }
      result.id = data?.id ?? null;
      const drawn = renderDiagram(data);
      if (seen.has(drawn.model.id)) fail(`two diagrams have the id "${drawn.model.id}"`);
      seen.add(drawn.model.id);
      Object.assign(result, { form: drawn.form, warnings: drawn.warnings });
      text = block(found.json, drawn.svg);
    } catch (error) {
      result.error = error.message;
    }
    out += html.slice(at, found.start) + text;
    at = found.end;
    results.push(result);
  }
  return { html: out + html.slice(at), results };
}

module.exports = { readData, formsFor, renderDiagram, renderDocument, findDiagrams, block, DataError, MOST };
