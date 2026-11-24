// The rules that check tests, each listed once: its ID, its group, and the part of the docs that explains it.
// A guarantee is a promise to the reader of every page: no network, light, dark and paper, contrast, and access with a screen reader
// and a keyboard. House style is a choice Docent made for its own pages, which another team may make differently
// (docs/proposals/repo-config.md, section 4). Every error and warning of check names its rule: say(id, text) writes "[id] text".
const HOUSE = "house style", GUARANTEE = "guarantee";
const H = (id, where) => [id, HOUSE, where], G = (id, where) => [id, GUARANTEE, where];
const D = (part) => `DESIGN.md, "${part}"`, S = (part) => `SKILL.md, "${part}"`, DG = (part) => `diagrams.md, "${part}"`, W = (part) => `widgets.md, "${part}"`;
const LEFT_OUT = ["pie", "donut", "radar", "spider", "polar", "pyramid", "treemap", "bubble", "sankey", "ridgeline"]; // the keys of LEFT_OUT in hand.cjs

const LIST = [
  // The file and the kit
  G("check.file", S("How to work")),
  G("kit.blocks", S("How to work")),
  G("kit.palette", D("Palettes")),
  G("tokens.kit", S("Host colors and fonts")),
  // No network
  G("network.link", D("Do's and Don'ts")),
  G("network.src", D("Do's and Don'ts")),
  G("network.import", D("Do's and Don'ts")),
  G("network.url", D("Do's and Don'ts")),
  G("network.script", D("Do's and Don'ts")),
  G("script.outside", D("Do's and Don'ts")),
  // Host colors and contrast
  G("host.hex", D("Host tokens")),
  G("host.contrast", D("Host tokens")),
  G("host.dark", D("Host tokens")),
  H("accent.status", D("Host tokens")),
  H("accent.gray", D("Host tokens")),
  G("ground.pure", D("Colors")),
  // A flat page and the text
  H("flat.gradient", D("Do's and Don'ts")),
  H("flat.shadow", D("Do's and Don'ts")),
  H("flat.filter", D("Do's and Don'ts")),
  H("flat.pattern", D("Do's and Don'ts")),
  H("text.uppercase", D("Typography")),
  G("text.size", D("Typography")),
  G("text.small", D("Typography")),
  G("text.drawing", DG("Hand-drawn figures")),
  // The frame of the page
  G("frame.lang", S("How to work")),
  G("frame.viewport", S("How to work")),
  G("frame.theme", S("Host colors and fonts")),
  G("frame.h1", D("Layout")),
  G("frame.title", D("Layout")),
  G("frame.profile", S("Choose a profile")),
  G("frame.text", S("Choose a profile")),
  G("skip.link", D("Layout")),
  H("title.format", D("Layout")),
  H("title.h1", D("Layout")),
  H("title.host", D("Layout")),
  H("title.docent", D("Layout")),
  H("profile.missing", S("Choose a profile")),
  H("profile.suggest", S("Choose a profile")),
  // The logo, the tagline and the credit
  G("logo.place", S("Logo, tagline and credit")),
  G("logo.markup", D("Logo, tagline and credit")),
  H("logo.size", S("Logo, tagline and credit")),
  G("logo.slot", D("Logo, tagline and credit")),
  G("logo.sharp", D("Logo, tagline and credit")),
  G("logo.contrast", D("Logo, tagline and credit")),
  G("logo.id", S("Logo, tagline and credit")),
  G("logo.name", S("Logo, tagline and credit")),
  H("credit.missing", D("Logo, tagline and credit")),
  H("tagline.length", D("Logo, tagline and credit")),
  H("tagline.markup", D("Logo, tagline and credit")),
  // Diagrams
  G("diagram.data", DG("The block")),
  G("diagram.id", DG("The block")),
  G("diagram.match", DG("The block")),
  G("diagram.icon", DG("Icons")),
  G("diagram.ref", DG("Interaction overview diagrams")),
  G("diagram.well", DG("Two drawings in one figure")),
  G("diagram.outside", DG("The block")),
  H("diagram.advice", DG("What the renderer says")),
  H("diagram.twice", S("How to work")),
  // Hand-drawn figures
  G("hand.unmade", DG("Hand-drawn figures")),
  G("hand.outside", DG("Hand-drawn figures")),
  G("hand.markup", DG("Hand-drawn figures")),
  G("hand.marker", DG("Hand-drawn figures")),
  G("hand.built", DG("Hand-drawn figures")),
  G("hand.planned", DG("Hand-drawn figures")),
  ...LEFT_OUT.map((type) => H(`hand.left-out.${type}`, D("Layout"))),
  G("hand.classes", DG("Hand-drawn figures")),
  G("hand.text-size", DG("Hand-drawn figures")),
  G("hand.size", DG("Hand-drawn figures")),
  G("hand.font", DG("Hand-drawn figures")),
  G("hand.network", DG("Hand-drawn figures")),
  G("hand.dashed", DG("Hand-drawn figures")),
  G("hand.name", DG("Hand-drawn figures")),
  G("hand.words", DG("Hand-drawn figures")),
  G("hand.look", S("What to tell the user")),
  // Widgets and walkthroughs
  G("widget.data", W("The block")),
  G("widget.id", W("The block")),
  G("widget.match", W("The block")),
  G("widget.key", W("Value picker")),
  G("widget.outside", W("The block")),
  H("widgets.most", W("When to use a widget")),
  G("place.key", W("Value picker")),
  G("place.value", W("Value picker")),
  G("place.unused", W("Value picker")),
  G("walk.count", S("How to work")),
  G("walk.legs", S("How to work")),
  H("steps.heading", D("Voice")),
  // A deck
  G("deck.frame", D("Slides")),
  G("deck.notes", S("Write a deck")),
  G("deck.heading", D("Slides")),
  G("deck.body", D("Slides")),
  G("deck.fit", D("Slides")),
  G("deck.walk", S("Write a deck")),
  G("deck.details", S("Write a deck")),
  G("deck.accent", D("Slides")),
  H("deck.widget", S("Write a deck")),
  // Text blocks
  H("cards.count", D("Card grid")),
  H("facts.joined", D("Layout")),
  H("status.words", S("Text blocks to know")),
  H("findings.count", S("Text blocks to know")),
  H("findings.lead", S("Text blocks to know")),
  H("findings.link", S("Text blocks to know")),
  G("findings.label", S("Text blocks to know")),
  H("quote.outside", S("Text blocks to know")),
  H("quote.speaker", S("Text blocks to know")),
  H("quote.parts", S("Text blocks to know")),
  H("quote.marks", S("Text blocks to know")),
  H("quote.length", S("Text blocks to know")),
  H("quote.speaker-markup", S("Text blocks to know")),
  H("method.parts", S("Choose a profile")),
  // Tables and numbers
  H("table.num", S("Text blocks to know")),
  H("table.total-row", S("Text blocks to know")),
  H("table.foot-rows", S("Text blocks to know")),
  G("table.foot-heading", S("Text blocks to know")),
  G("table.sum", S("Text blocks to know")),
  H("numbers.rounding", D("Numbers")),
  H("numbers.thousands", D("Numbers")),
  G("numbers.minus", D("Numbers")),
  H("numbers.ranges", D("Numbers")),
  H("numbers.points", D("Numbers")),
  H("numbers.change", D("Numbers")),
  H("numbers.dates", D("Numbers")),
  H("numbers.about", D("Numbers")),
  // Sources, source lines and footnotes
  G("source.chart", S("Text blocks to know")),
  H("source.outside", S("Text blocks to know")),
  H("source.empty", S("Text blocks to know")),
  G("footnotes.link", S("Text blocks to know")),
  G("footnotes.back", S("Text blocks to know")),
  G("footnotes.numbers", S("Text blocks to know")),
  G("footnotes.label", S("Text blocks to know")),
  G("footnotes.heading", S("Text blocks to know")),
  H("footnotes.section", S("Text blocks to know")),
  H("footnotes.order", S("Text blocks to know")),
  H("footnotes.length", S("Text blocks to know")),
  G("sources.cite", S("Text blocks to know")),
  G("sources.link-text", S("Text blocks to know")),
  H("sources.uncited", S("Text blocks to know")),
  H("sources.year", S("Text blocks to know")),
  H("sources.order", S("Text blocks to know")),
  H("sources.id", S("Text blocks to know")),
  H("sources.second", S("Text blocks to know")),
  // Personal data
  G("personal.data", S("What to tell the user")),
];
const RULES = new Map(LIST.map(([id, group, where]) => [id, { id, group, where }]));
// The number rules of "Numbers" in DESIGN.md that check tests, by their number there.
const NUMBER_RULES = { 2: "numbers.rounding", 3: "numbers.thousands", 4: "numbers.minus", 5: "numbers.ranges", 6: "numbers.points", 8: "numbers.change", 9: "numbers.dates", 10: "numbers.about" };

/** A line of check's output for one rule: "[id] text". It throws on an ID that is not in the list, so a new rule is listed first. */
function say(id, text) {
  if (!RULES.has(id)) throw new Error(`check has no rule "${id}"; add it to scripts/lib/rules.cjs`);
  return `[${id}] ${text}`;
}
/** The rule and the text of a line that say wrote: { id, text }. */
function split(line) {
  const m = line.match(/^\[([\w.-]+)\] ([\s\S]*)$/);
  return m ? { id: m[1], text: m[2] } : { id: null, text: line };
}
/** The same line with words put before its text, such as the name of the diagram it is about. */
const relabel = (line, before) => { const { id, text } = split(line); return id ? say(id, `${before}${text}`) : `${before}${text}`; };

module.exports = { HOUSE, GUARANTEE, RULES, LEFT_OUT, NUMBER_RULES, say, split, relabel };
