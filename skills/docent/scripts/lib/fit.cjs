// Fit warnings: signs in the data that another kind of diagram, or no diagram, may serve the reader better. They never
// change the drawing; the author decides. render and check report them like the other warnings.

/** The fit warnings for a model of one kind: plain sentences that name the cause and the kind that may fit. A scale chart also
 * passes its desktop drawing, for a warning that depends on how the drawing came out. */
function fitWarnings(kind, model, scene) {
  const out = [];
  if (kind === "sequence") {
    const forward = model.legs.every((l) => l.type !== "reply" && l.from < l.to);
    if (model.legs.length > 1 && forward) out.push("every message goes one way and no reply comes back; this reads as a workflow (a diagram with no \"kind\")");
  }
  if (kind === "activity") {
    const branches = model.nodes.some((n) => ["decision", "merge", "fork", "join", "flow-final"].includes(n.type));
    if (!branches && model.partitions.length <= 1) out.push("the activity has no decision, no fork and at most one partition; this is a numbered list (<ol>), not a diagram");
  }
  if ((kind === "class" && !model.relations.length) || (kind === "object" && !model.links.length)) out.push(`the ${kind} diagram has no ${kind === "class" ? "relations" : "links"}; this is a table of the ${kind === "class" ? "classes" : "objects"} and their members`);
  if (kind === "communication") {
    // One chain: a path through every lifeline. Connected, one link fewer than lifelines, and no lifeline with three links.
    const degree = (l) => model.links.filter((k) => k.a === l || k.b === l).length;
    const seen = new Set([model.lifelines[0]]);
    for (let grew = true; grew; ) { grew = false; for (const k of model.links) if (seen.has(k.a) !== seen.has(k.b)) { seen.add(k.a); seen.add(k.b); grew = true; } }
    const path = seen.size === model.lifelines.length && model.links.length === model.lifelines.length - 1 && model.lifelines.every((l) => degree(l) <= 2);
    if (path) out.push("the links form one chain, so they add little; when the order matters more than the links, a sequence diagram reads better");
  }
  if (kind === "layout" && model.rows.every((r) => r.boxes.length === 1)) out.push("every row has one box; a range chart says this more simply");
  if (kind === "plan") {
    if (model.rows === 1) out.push("the plan has one row; a layout to scale says this more simply");
    if (model.cols === 1) out.push("the plan has one column, so its boxes stand one above another; a list says this more simply");
    if (model.boxes.length === 2) out.push("the plan has 2 boxes; a sentence says where they sit");
  }
  if (kind === "funnel") {
    const { steps } = model, first = steps[0].count, last = steps[steps.length - 1];
    if (steps.length === 2) out.push("the funnel has 2 steps; a sentence says this more simply");
    if (last.count === first) out.push("no step loses anyone; a sentence says this more simply");
    else if (last.count * 100 >= first * 95) out.push(`the last step keeps ${last.ofFirst} of the first, so the bars look almost the same; a table shows small drops better`);
  }
  if (kind === "heatmap") {
    const cells = model.rows.flatMap((r) => r.cells), full = cells.filter(Boolean), empty = cells.length - full.length;
    const steps = new Set(full.map((c) => c.step)), lowest = full.filter((c) => c.step === 0).length;
    if (steps.size === 1) out.push("every number is in one step, so the shades show nothing; a sentence or a table says this more simply");
    else if (lowest * 5 >= full.length * 4) out.push(`${lowest} of ${full.length} cells are in the lowest step; one large number may set the scale. Check "to", or say the large number in the text`);
    if (cells.length < 12) out.push(`the heat map has ${cells.length} cells; a table with the numbers says this more simply`);
    if (empty * 2 > cells.length) out.push(`${empty} of ${cells.length} cells have no data; a table of the cells that have data may say this better`);
    if (scene && scene.labels && scene.labels.every > 1) out.push(`only every ${scene.labels.every}${scene.labels.every === 2 ? "nd" : scene.labels.every === 3 ? "rd" : "th"} column label fits on a desktop; when the columns are names, not a series such as hours, turn the grid so that the names are rows`);
  }
  if (kind === "heatplan") {
    const full = model.boxes.filter((b) => b.value !== null), empty = model.boxes.length - full.length;
    const steps = new Set(full.map((b) => b.step)), lowest = full.filter((b) => b.step === 0).length;
    if (steps.size === 1) out.push("every number is in one step, so the shades show nothing; a plan, with the numbers in a table, says this more simply");
    else if (full.length >= 3 && lowest * 5 >= full.length * 4) out.push(`${lowest} of ${full.length} boxes are in the lowest step; one large number may set the scale. Check "to", or say the large number in the text`);
    if (empty * 2 > model.boxes.length) out.push(`${empty} of ${model.boxes.length} boxes have no data; a plan, with the numbers of the other boxes in a table, may say this better`);
    if (model.boxes.length === 2) out.push("the heat plan has 2 boxes; a sentence says where they sit and how much each got");
  }
  if (kind === "statusgrid") {
    const cells = model.rows.flatMap((r) => r.cells), full = cells.filter(Boolean), empty = cells.length - full.length, { names, thresholds } = model;
    const states = new Set(full.map((c) => c.state));
    if (states.size === 1) { const only = [...states][0]; out.push(`every cell is "${names[only]}"; a sentence says this more simply${only === "ok" ? ', such as "every part was up every day"' : ""}`); }
    if (cells.length < 12) out.push(`the status grid has ${cells.length} cells; a table with a state column says this more simply`);
    // More than half not OK: a threshold is wrong, or the data is an amount.
    const bad = full.filter((c) => c.state !== "ok").length;
    if (thresholds && bad * 2 > full.length) out.push(`${bad} of ${full.length} cells are ${thresholds.warn === null ? names.err : `${names.warn} or ${names.err}`}; check the thresholds, or use a heat map when the question is how much, not which cells failed`);
    if (empty * 2 > cells.length) out.push(`${empty} of ${cells.length} cells have no data; a table of the cells that have data may say this better`);
    // A calendar's columns are weeks, a series, so turning the grid would not help.
    if (!model.calendar && scene && scene.labels && scene.labels.every > 1) out.push(`only every ${scene.labels.every}${scene.labels.every === 2 ? "nd" : scene.labels.every === 3 ? "rd" : "th"} column label fits on a desktop; when the columns are names, not a series such as days, turn the grid so that the names are rows`);
  }
  if (kind === "range" && model.rows.length < 3) out.push(`the range chart has ${model.rows.length} rows; a sentence says this more simply`);
  return out;
}

module.exports = { fitWarnings };
