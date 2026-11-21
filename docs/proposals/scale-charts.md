# Proposal: two kinds on one numeric scale — the range chart and the layout to scale

Status: **approved on 2026-11-21**, with the recommended answer to each open decision (see "Decided" near the end). No code is written yet. The worked examples are the three hand-drawn charts in [`docs/research/document-layout.html`](../research/document-layout.html) (the inline SVGs with class `gc`, each under a `GAP` comment).

## The answer first

Build two new kinds, `"kind": "range"` and `"kind": "layout"`, on one shared piece: **a numeric scale** that maps numbers to pixels, places the ticks, and places the labels. Both kinds draw rows of marks against that one scale. They differ in what the reader asks, in where the names go, and in what `check` tests.

| # | Pull request | Size |
|---|---|---|
| 1 | The shared scale, `scripts/lib/scale.cjs`, shipped with the range chart | Medium |
| 2 | The layout to scale | Medium |
| 3 | The research page uses the new kinds, and its `.gc` styles go | Small |
| 4 | `check` refuses a hand-drawn SVG inside a figure well | Small |

Order: 1, 2, 3, 4. The range chart comes first, because it is simpler, and it fixes the design of the scale. Item 4 comes last: if the `check` rule shipped before item 3, `check` would fail on the research page.

A scale chart has one strength that the other kinds lack: **it can change its pixels per unit without changing its text size.** So it never shrinks and never scrolls. It is drawn again at each width, with text at its real size: 658px on a desktop and on paper, and 264px on a phone.

## The obvious answer that would be wrong

**A general chart kind (bars, lines, pies), or a chart library such as Vega-Lite or Chart.js.** A library breaks the same rules that ruled out Mermaid: the page is one file with no network, the drawing is made before the page opens, and it uses only the page tokens. A general chart kind is also wrong, though less clearly. Authors would soon ask it for a pie chart, a second axis and a color for each series. Docent has no rules for those, and the test found no need for them. The test needed two shapes on one axis, so this proposal builds two shapes on one axis.

**A second wrong answer: let `check` accept hand-drawn SVG with a known class.** That keeps the drawing apart from its data. Nobody can run `render` again, and `check` cannot compare the drawing with anything.

## What the hand drawings did that Docent should not

The three charts were drawn quickly, after another plugin's style. They break six Docent rules. The new kinds must not copy them.

1. **A dashed line meant three things:** "only an upper limit" (Figure 1), "the middle of the screen" (Figure 2), and "a contents list" (Figure 2). In Docent a dashed line means one thing only: a path that some readers take.
2. **An upper-limit bar started at the left edge of the scale.** The scale starts at 40, so "up to 70" read as "40 to 70".
3. **Ultramarine marked Docent's own rows** (Figure 1). Ultramarine is only for the current leg and the dot. An author cannot color a diagram.
4. **The lamp dot marked the chosen layout** (Figure 2). The dot means "where you are now", and it moves. A choice is a fact, so it belongs in words.
5. **Four box looks without a key** (Figure 2): a text outline, a muted outline, a dashed outline, and a fill in the outline color. The names inside the boxes already tell them apart.
6. **The A4 page drew fake lines of text** (Figure 4). They are decoration. The reader's question is about the widths, so the drawing should show the widths as numbers.

---

## Rules that both kinds keep

- **The three layers.** The well is the ground. Each group of rows is a band in the page color; with no groups, all rows share one band. The marks are on top. No fill in a color, no gradient, no shadow.
- **Text at real size.** A row name and a group name are 14px. A group name is weight 600; a row name is weight 400, because a chart of 8 rows in bold is heavy. Values, ticks and measures are 12px, muted, with tabular figures.
- **Colors.** Marks and their outlines are in the text color. Grid lines are in the outline color. A named mark on the scale (such as "the middle") is a solid line in the muted color, with its name above it. Nothing is dashed. No status color: a row has no `state`.
- **No dot and no walkthrough.** A scale chart has no order, so nothing moves. `"place": "walk"` is refused.
- **Three forms, one per width.** `render` writes a desktop form 658px wide. The same SVG prints on A4 at real size, with no shrink. `render` also writes a phone form 264px wide. The page shows one of them, as it does for the other kinds.
- **The diagram in words is a table.** It goes in the closed section "The diagram in words" under the figure. A table is the plainest text form for numbers: a screen reader moves through it by row and column, and it prints. The `label` stays a one- or two-sentence summary.
- **The scale.** `"scale": {"from": 40, "to": 100, "step": 10, "unit": "characters"}`. These are the same fields as `time` in a timing diagram. Every value in the data lies between `from` and `to`. Tick labels stand at least 48px apart, as in a timing diagram; when they would be closer, the renderer keeps every second tick, then every fifth.

## The shared scale

**Build** `scripts/lib/scale.cjs`. It takes the scale, the room in pixels, and a list of marks, and it gives back:

- pixels per unit, and `x(value)`;
- the ticks that keep 48px between their labels;
- a place for each label: inside its mark when the label fits there, else at the right of the mark, else at the left, else on a second line above. When a label has no free place, the renderer stops with a message that names the label.

The tick code in `timing.cjs` is the starting point. The timing diagram keeps its own code for now; it can move to `scale.cjs` in a later change.

---

## 1. The range chart

**The reader's question:** *Where does each value or range fall on one scale, and does ours fall inside theirs?* For example: does Docent's line length fall inside what the evidence recommends?

**Use it when** there are 3 to 12 values or ranges in one unit. **Do not use it** for one or two values (a sentence says it), for values over time (a timing diagram or a table), or for amounts that start at zero and are compared by size (a table; Docent has no bar chart).

### The marks

| Row | Data | Drawn as | Value text |
|---|---|---|---|
| A range | `"from"` and `"to"` | A bar 16px high, page color inside, text color outline, the corner of a plate | `45–76` |
| A point | `"at"` | A filled circle in the text color, 10px across | `55` |
| An upper limit | `"to"` only | A cap (an upright line 16px high) at the limit, and a 2px line from the cap to the left edge of the scale. The line has no cap there, so it does not claim a lower limit. | `up to 80` |
| A lower limit | `"from"` only | The same, mirrored: a cap at the limit and a line to the right edge | `at least 45` |

The value text is written by `render` from the numbers, so it always matches the mark. A row may add a short `note`, written after the value: `52–64, computed`.

### The data

```json
{
  "id": "line-lengths",
  "kind": "range",
  "label": "Readers prefer 45 to 76 characters in a line, and one study rated 55 easiest. Advice and standards set upper limits from 70 to 90. Docent holds 63 to 70 on screen and 52 to 64 on paper.",
  "scale": {"from": 40, "to": 100, "step": 10, "unit": "characters"},
  "groups": [
    {"id": "evidence", "name": "The evidence"},
    {"id": "docent", "name": "Docent"}
  ],
  "rows": [
    {"name": "Readers prefer", "from": 45, "to": 76, "group": "evidence"},
    {"name": "Rated easiest, Dyson", "at": 55, "group": "evidence"},
    {"name": "A literature review", "to": 70, "group": "evidence"},
    {"name": "Advice for dyslexia", "from": 50, "to": 75, "group": "evidence"},
    {"name": "WCAG 1.4.8, AAA", "to": 80, "group": "evidence"},
    {"name": "Print, Butterick", "from": 45, "to": 90, "group": "evidence"},
    {"name": "Docent on screen", "from": 63, "to": 70, "group": "docent"},
    {"name": "Docent on paper", "from": 52, "to": 64, "note": "computed", "group": "docent"}
  ]
}
```

| Field | What it is |
|---|---|
| `scale` | `from` and `to` are numbers, and `to` is more than `from`. `step` is needed for a range chart; `to` minus `from` is a whole number of steps, at most 20. `unit` is optional, at most 12 characters. `marks` is optional: at most 2 named lines, each with `at` and a `name` of at most 20 characters. |
| `groups` | Optional, at most 3, each with an `id` and a `name` (at most 20 characters), as lanes are written. When there are groups, every row names one, and the rows of one group stand together. |
| `rows` | 2 to 12, top to bottom. Each has a `name` (at most 28 characters) and exactly one of these: `from` and `to`, or `at`, or `to` alone, or `from` alone. A `note` is optional, at most 24 characters. |

The groups replace the ultramarine outline of the hand drawing. "Docent" is a band of its own, under "The evidence", so the reader sees which rows are ours before reading a word.

### The forms

| Where | Form |
|---|---|
| Desktop and paper (658px) | The row names in a column at the left, the scale on the right, ticks along the top. For the example: a name column of 166px, a scale of 444px (7.4px per character), and 48px at the right for the value text. |
| Phone (264px) | Each row name sits on its own line, and the mark sits under it, across the full width. For the example: 3.5px per character, so the ticks keep every 20 characters (40, 60, 80, 100). The narrowest bar, 63–70, is 24px wide. |
| Screen reader | The `label`, and the table in words. |

### The limits

- 2 to 12 rows, 3 groups, 2 named lines, 20 steps.
- `render` refuses a range bar that is narrower than 4px in any form, and says: "the range 63–64 is 3px wide on a phone; write it as a point". It refuses a value outside the scale.
- No two marks on one row. A row with a range and a best value is two rows, or a layout to scale.

### What `check` tests

- The drawing is the one that `render` makes from the data, in both forms, and the table in words matches the data.
- A **fit warning**, as in `fit.cjs`: "the range chart has 2 rows; a sentence says this more simply".

---

## 2. The layout to scale

**The reader's question:** *Where does each part sit, how wide is it, and how big are the gaps?* For example: where do the text, the notes and the wide blocks sit on a 1920px screen, in each of four layouts? Or: how is an A4 page split into margins, a text column and a note column?

**Use it when** the parts sit along one measured width, such as a screen, a page, a time slot or a memory range, and their positions are known numbers. **Do not use it** for a two-dimensional layout (a page with a header, two columns and a footer); this kind has one axis only. Do not use it for steps in order (a workflow) or for states over time (a timing diagram).

### The marks

- A **row** is one thing being compared: a layout, a page, a screen. It has a `name` (14px, weight 600) and an optional `note` (12px, muted) in the name column.
- A **box** is one part, from `from` to `to`. All boxes look the same: page color inside, text color outline, 24px high. Its name sits inside it when the name fits. When it does not, the name sits above the box, joined to the box's left edge by a short tick. A row has one or two **tracks**, so a wide block can sit under the text it lines up with.
- A **measure** row, under a row with `"measure": true`, writes the length of every stretch between box edges on track 1, from `scale.from` to `scale.to`, gaps included. This replaces the fake text lines of the A4 drawing: the reader sees 18, 112, 8, 50 and 18, and the unit once, at the left of the measure row.

The chosen layout gets no dot. Its `note` says so: "Tufte, chosen".

### The data

The four layouts on a 1920px screen. The numbers come from the hand drawing, read back from its pixels (x = 120 + 0.4 × value).

```json
{
  "id": "wide-layouts",
  "kind": "layout",
  "label": "On a 1920px screen today, the text and its notes sit left of the middle. Layout A centers them and lets wide blocks grow to the right. Layout B centers the text and the wide blocks, so the left edge splits. Layout C adds a contents list on the left.",
  "scale": {"from": 0, "to": 1920, "step": 480, "unit": "px", "marks": [{"at": 960, "name": "the middle"}]},
  "rows": [
    {"name": "Now", "note": "a 1200px box", "boxes": [
      {"name": "Text", "from": 400, "to": 896},
      {"name": "Notes", "from": 944, "to": 1164},
      {"name": "Wide blocks", "from": 400, "to": 1520, "track": 2}
    ]},
    {"name": "A", "note": "Tufte, chosen", "boxes": [
      {"name": "Text", "from": 578, "to": 1074},
      {"name": "Notes", "from": 1122, "to": 1342},
      {"name": "Wide blocks", "from": 578, "to": 1698, "track": 2}
    ]},
    {"name": "B", "note": "Distill", "boxes": [
      {"name": "Text", "from": 712, "to": 1208},
      {"name": "Notes", "from": 1256, "to": 1476},
      {"name": "Wide blocks", "from": 400, "to": 1520, "track": 2}
    ]},
    {"name": "C", "note": "MDN", "boxes": [
      {"name": "Contents", "from": 454, "to": 654},
      {"name": "Text", "from": 702, "to": 1198},
      {"name": "Notes", "from": 1246, "to": 1466}
    ]}
  ]
}
```

The A4 page, with measures and no ticks:

```json
{
  "id": "a4-notes",
  "kind": "layout",
  "label": "An A4 page is 210mm wide: an 18mm margin, a 112mm text column, an 8mm gap, a 50mm note column, and an 18mm margin.",
  "scale": {"from": 0, "to": 210, "unit": "mm"},
  "rows": [
    {"name": "A4 page", "measure": true, "boxes": [
      {"name": "Text", "from": 18, "to": 130},
      {"name": "Notes", "from": 138, "to": 188}
    ]}
  ]
}
```

| Field | What it is |
|---|---|
| `scale` | As in the range chart, but `step` is optional. With no `step` there are no ticks; then at least one row needs `"measure": true`, so the drawing has numbers. |
| `rows` | 1 to 6, top to bottom. Each has a `name` (at most 16 characters), an optional `note` (at most 24 characters), `boxes`, and optional `"measure": true`. |
| `boxes` | 1 to 6 in a row. Each has a `name` (at most 16 characters), `from` and `to`, and an optional `track` (1, the default, or 2). |

### The forms

| Where | Form |
|---|---|
| Desktop and paper (658px) | Row names in a column at the left, the scale on the right, ticks along the top. For the 1920px example: 0.28px per pixel. "Text" (139px) and "Wide blocks" (314px) hold their names; "Notes" (62px) holds its name with 7px to spare; "Contents" (56px) does not, so its name sits above it. |
| Phone (264px) | The row name and note sit on a line above the row, and the boxes use the full width. For the 1920px example: 0.13px per pixel. "Notes" (28px) and "Contents" (26px) put their names above, on a second line where two names would meet. For the A4 page: 1.18px per mm, and every measure fits under its stretch ("8" is 7px wide in a 9px gap). |
| Screen reader | The `label`, and the table in words: row, box, from, to, and width. A measured row adds its stretches. |

### The limits

- 1 to 6 rows, 6 boxes in a row, 2 tracks, 2 named lines, 20 steps.
- Two boxes on one track never overlap. They may touch.
- A box narrower than 4px in any form is refused, with a message that names it.
- When names above the boxes need more than two lines in a row, `render` refuses the form and names the boxes. The author shortens a name or moves a box to track 2.

### What `check` tests

- The drawing is the one that `render` makes from the data, in both forms, and the table in words matches the data.
- Every value lies on the scale; no two boxes on one track overlap; a layout with no `step` has a measured row.
- A **fit warning**: "every row has one box; a range chart says this more simply".

---

## 3. The research page uses the new kinds

The three `gc` SVGs in `docs/research/document-layout.html` become three diagram blocks: Figure 1 a range chart, Figures 2 and 4 layouts to scale, with the data above. The `.gc` styles leave the page head, because each drawing carries its own styles. The captions lose "A dashed bar has only an upper limit" and "The dot marks the layout that was chosen", because the drawings now say both in words.

---

## 4. `check` refuses a hand-drawn SVG in a figure well

Today `check` reports an SVG with class `dg` outside a diagram block. A hand-drawn SVG with any other class passes. That is how the three `gc` charts passed.

**The rule:** inside a `.fig` well, every `<svg>` comes from a diagram block. Any other SVG there is an error: "figure 2 holds a drawing that no diagram block made; write its data in a block and run render". Small icons outside wells (the theme switch, the arrow of a closed section) are not touched.

**When.** Ship it after item 3, so the research page passes on the day the rule starts.

---

## Measured

The widths above come from Docent's own text measure (`textWidth` in `scripts/lib/text.cjs`), at 14px for names and 12px for values. The script is in the session scratchpad and is not part of the kit. Its output:

```text
range: widest row name 14px = 142 px; name column = 166
 desktop 8px/unit: plot 480px, 8.00 px per character; 63-70 bar = 56px; label "63–70" = 40px; tick step for 48px gaps = 6 chars
 paper: plot 444px, 7.40 px per character; 63-70 bar = 52px; label "63–70" = 40px; tick step for 48px gaps = 7 chars
 phone (name above bar): plot 208px, 3.47 px per character; 63-70 bar = 24px; label "63–70" = 40px; tick step for 48px gaps = 14 chars
layout 1920 desktop: 0.400 px per px; Text 198px box vs name 46px; Notes 88px box vs name 55px; Wide blocks 448px box vs name 97px; Contents 80px box vs name 76px
layout 1920 paper: 0.280 px per px; Text 139px box vs name 46px; Notes 62px box vs name 55px; Wide blocks 314px box vs name 97px; Contents 56px box vs name 76px
layout 1920 phone: 0.129 px per px; Text 64px box vs name 46px; Notes 28px box vs name 55px; Wide blocks 145px box vs name 97px; Contents 26px box vs name 76px
A4 desktop: 3.00 px per mm; "18" 14px in 54px; "112mm, the text" 93px in 336px; "8" 7px in 24px; "50mm, notes" 74px in 150px; "18" 14px in 54px
A4 phone: 1.18 px per mm; "18" 14px in 21px; "112mm, the text" 93px in 132px; "8" 7px in 9px; "50mm, notes" 74px in 59px; "18" 14px in 21px
```

"Desktop" in these lines is the width of the hand drawing (480px and 768px of scale). The proposal uses the "paper" line for desktop too, because one 658px form serves both. A box name needs its text width plus 16px of room. The A4 lines measure the hand drawing's long labels; with measures, only the numbers remain ("112", "50"), and they fit at both widths.

---

## Decided

Approved on 2026-11-21, each with the recommended answer:

1. **The name of the second kind.** `"layout"`, because authors see kinds and not file names. `DESIGN.md` also says "layout" for the graph layout code; `"plan"` was the other choice.
2. **One 658px form for desktop and paper.** One form now, because it fits every profile and prints with no shrink. A wider desktop form comes only if a real page needs it. On a Reference or Brief page, the chart uses about half of the 1120px block.
3. **Row names in weight 400 in a range chart.** 400 for rows and 600 for groups, because 8 to 12 bold rows are heavy and the groups need to stand out. Other diagrams set names in weight 600.

## Not in this proposal

- A bar chart, a line chart and a pie chart. No test needed them.
- A two-dimensional layout (boxes placed on both axes). It needs its own proposal, with its own phone form.
- A per-box look (muted, dashed, filled). The names do that job.
- A `width` field. The renderer sizes the chart, as it sizes every other kind.
