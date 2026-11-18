// Fit warnings: signs in the data that another kind of diagram, or no diagram, may serve the reader better. They never
// change the drawing; the author decides. render and check report them like the other warnings.

/** The fit warnings for a model of one kind: plain sentences that name the cause and the kind that may fit. */
function fitWarnings(kind, model) {
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
    const degree = (l) => model.links.filter((k) => k.a === l || k.b === l).length;
    if (model.lifelines.every((l) => degree(l) <= 2)) out.push("the links form one chain, so they add little; when the order matters more than the links, a sequence diagram reads better");
  }
  return out;
}

module.exports = { fitWarnings };
