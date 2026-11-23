# Proposal: charts on two levels — built-in kinds from data, and hand-drawn figures under a contract

Status: **proposed**. Its open questions are in "Decisions" near the end, each with a recommended answer, for the user to approve. No code is written. It follows the approved proposals [`scale-charts.md`](scale-charts.md) and [`funnels.md`](funnels.md), and it reuses their numeric scale and their two forms. The sample numbers in this proposal are invented.

## The answer first

Docent has no bar chart and no line chart. Today `diagrams.md` tells an author to use a table for amounts compared by size. Business and development reports need both charts often, so they are the largest gap.

Close it on two levels:

1. **Built-in kinds, drawn from data, for the common types.** They share one **chart core**: Docent's numeric scale, labels beside the data instead of a legend, a table in words under every chart, a 640px form for a desktop and for paper, a 264px form for a phone, tabular figures, and no color except the meanings Docent already has. The first two kinds are the **bar chart** (with a **dumbbell** form for two values in each row) and the **line chart** (with a **slopegraph** form for two points in time, and **small multiples** when several series matter equally).
2. **Hand-drawn figures, for the rare types.** The agent may draw an SVG by hand for a type that has no built-in kind, if the drawing keeps a **contract** that `check` tests: page tokens only, no text under 12px, system fonts, no network, an accessible name, a table or list in words beside it, and a marker, `data-drawn="hand"`. This changes a rule that stands today, and the change is decision 1.

A hand-drawn type becomes a built-in kind once two real documents use it.

| # | Pull request | Size |
|---|---|---|
| 1 | The chart core: shared parts move out of the scale kinds into `scripts/lib/chart.cjs`, with no change to any drawing | Medium |
| 2 | The bar chart, with the dumbbell form | Medium |
| 3 | The line chart, with the slopegraph form and small multiples | Large |
| 4 | Hand-drawn figures: the contract in `check`, `SKILL.md`, `DESIGN.md` and `diagrams.md` | Medium |
| 5 | A date scale in the core, so a range chart draws a timeline or a Gantt chart | Medium |
| 6 | The scatter plot, with a strip form for one axis | Medium |
| 7 | The tree, with the org chart | Medium |
| 8 | The database schema | Large |

Items 5 to 8 each start with a short proposal of their own (the data and the forms), as earlier kinds did. Section 7 gives the reasons for this order.

## The obvious answers that would be wrong

**Use diagram-design directly.** It has 39 types, a careful written method, and an MIT license. But its agent writes every SVG by hand, and its look breaks Docent's rules in seven places (section 1). Docent would gain breadth and lose the two things that make it Docent: the same drawing every time, and a page that works offline, on a phone and on paper.

**One general chart kind with a color for each series and a legend.** Authors would soon want a pie chart, a second axis and five colors. Docent has no rules for those, and the approved proposal [`scale-charts.md`](scale-charts.md) already refused this answer. A line chart in particular invites a color for each line. Section 4 shows the Docent answer: the series that the text talks about takes the text color, the others are gray, and each line is named at its end.

**A chart library, such as Vega-Lite or Chart.js.** It is a large script, so the page is no longer one small file that works with no network, and the drawing is no longer made before the page opens. `DESIGN.md` already says that Docent uses no third-party renderer.

---

## 1. Why not use diagram-design directly

diagram-design is a skill by Cathryn Lavery, [github.com/cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design), under the MIT license. This proposal read version 2.6.12, which is [commit `66ab67e`](https://github.com/cathrynlavery/diagram-design/tree/66ab67ecc2778084b1a941af44e404f60b8a4fcf/skills/diagram-design). Every link below points at that commit, so the quoted lines stay true. The project has grown since then: on 2026-11-23 its main branch is version 2.6.174 and lists 52 types. Section 6 maps the 39 types of version 2.6.12.

Its own files show seven conflicts with Docent:

| # | diagram-design | Where it says so | Docent's rule |
|---|---|---|---|
| 1 | The agent writes each SVG by hand, from a template and the type's guide. Nothing draws it from data. | [`SKILL.md`](https://github.com/cathrynlavery/diagram-design/blob/66ab67ecc2778084b1a941af44e404f60b8a4fcf/skills/diagram-design/SKILL.md), §6 "Core SVG Primitives" | `render` draws every diagram from data, so it is the same every time, and `check` compares it with its data. |
| 2 | Its templates load fonts from Google Fonts. | [`assets/template.html`](https://github.com/cathrynlavery/diagram-design/blob/66ab67ecc2778084b1a941af44e404f60b8a4fcf/skills/diagram-design/assets/template.html), line 7 | One file, no network, system fonts only. |
| 3 | Most labels are 7 to 9px: sublabels 9px, tags 7 to 8px, arrow labels 8px, axis and value labels 8px. | `SKILL.md`, §5 "Typography"; [`type-bar.md`](https://github.com/cathrynlavery/diagram-design/blob/66ab67ecc2778084b1a941af44e404f60b8a4fcf/skills/diagram-design/references/type-bar.md) | No text under 12px in a drawing, at real size. |
| 4 | The legend is a strip at the bottom of the drawing. | `SKILL.md`, "Legend — horizontal strip at the bottom" | A name stands beside the thing it names, so the eye does not travel between a key and the data. |
| 5 | A funnel is a stack of trapezoids that gets narrower. | [`type-pyramid.md`](https://github.com/cathrynlavery/diagram-design/blob/66ab67ecc2778084b1a941af44e404f60b8a4fcf/skills/diagram-design/references/type-pyramid.md) | Docent ruled out the funnel shape: a narrowing shape makes a drop look larger than it is ([`funnels.md`](funnels.md)). |
| 6 | No phone form and no table in words. A drawing is one fixed `viewBox`, such as `0 0 1000 600`, scaled to the page width but never under 900px. On a phone the reader scrolls a 900px drawing, and an 8px label shows at 7.2px (8 × 900 ÷ 1000). Its words for a screen reader are one `<title>` and one `<desc>`. | `assets/template.html`, line 53 (`svg { width: 100%; min-width: 900px; }`); `SKILL.md`, the accessibility checklist | Each scale chart is drawn again at 264px for a phone, with text at real size, and it writes its data as a table under the drawing. |
| 7 | Its accent is 2.86:1 on its paper, under the 3:1 that WCAG 1.4.11 asks of a graphical object. It says so itself. | [`type-line.md`](https://github.com/cathrynlavery/diagram-design/blob/66ab67ecc2778084b1a941af44e404f60b8a4fcf/skills/diagram-design/references/type-line.md), "Colour" | Every line that carries data passes 3:1. Docent's muted gray is 6.30:1 on the page. |

I measured item 7 again with Docent's own contrast function (`contrast` in `scripts/lib/color.cjs`): `#eb6c36` on `#f5f5f5` is 2.862:1 (see "Measured").

**Its profiles change only the look.** A profile is a saved copy of its style guide ([`references/profiles.md`](https://github.com/cathrynlavery/diagram-design/blob/66ab67ecc2778084b1a941af44e404f60b8a4fcf/skills/diagram-design/references/profiles.md)). The style guide holds colors, fonts, and a few stroke and corner sizes ([`references/style-guide.md`](https://github.com/cathrynlavery/diagram-design/blob/66ab67ecc2778084b1a941af44e404f60b8a4fcf/skills/diagram-design/references/style-guide.md)). The label sizes, the legend, the funnel shape and the missing phone form live in `SKILL.md` and in the type guides, so no profile can fix them.

**What Docent takes from it.** Its written chart rules are good, and several are rules Docent lacks: never cut the value axis short, say how the rows are sorted, say which rows are missing instead of dropping them, never move a point to make room for its label, and draw a gap where data is missing. Sections 3 and 4 take these rules into the bar chart and the line chart, and the docs credit diagram-design (MIT) where they use them. Its type guides also serve as the starting point for each hand-drawn type (section 5).

---

## 2. The shared chart core

The bar chart and the line chart need the same parts. Most of them exist already, spread over the scale kinds. The core gathers them in one new file, `scripts/lib/chart.cjs`, so each chart kind holds only what is its own.

### What every chart keeps

- **Axes on Docent's scale.** `scripts/lib/scale.cjs` already checks a scale (`readScale`), maps numbers to pixels (`makeScale`), keeps tick labels at least 48px apart, and finds a free place for a label (`placeLabel`). Every chart uses it. The line chart adds a value axis that runs up the page; its labels stand at least 24px apart, because a label is 12px tall.
- **Labels beside the data, not a legend.** A bar carries its value at its end. A line carries its name at its end. A dumbbell names its two series above the dots of its first row. No chart has a legend.
- **A label moves; a point never moves.** When two labels would meet, the label moves and a thin muted line joins it to its point. The point stays at its true value, because a point moved for its label is a false number. (This rule is from diagram-design's slopegraph guide.)
- **A table in words under every chart.** It sits in the closed section "The diagram in words", as for every scale chart. A screen reader moves through it by row and column, and it prints. A table too wide for paper splits into narrower tables, each with the row names, as the heat map's table does.
- **Two forms.** One form 640px wide serves a desktop and paper: it prints on A4 at its real size, because an A4 figure well holds about 641.6px. A second form 264px wide serves a phone. Text stays at its real size in both; only the pixels per unit change.
- **Tabular figures.** Every number is 12px, muted, with tabular figures, so digits line up in a column.
- **No new color.** Marks are in the text color, second marks in the muted color, grid lines in the outline color, bands in the page color. A chart has no status color, no heat step, no ultramarine and no dot, because none of these mean anything in a chart. Nothing is dashed: in Docent a dashed line means a path that only some readers take.
- **One line above the chart** says what the numbers count and how to read them: the unit, where the scale starts, and how the rows are sorted. For example: `Reports in the third quarter, bars from 0. Largest first.`

### What moves into the core

Nothing in this list changes a drawing. Item 1 of the build moves the code, and the stored drawings of every existing kind must stay exactly the same.

| Part | From | Used today by |
|---|---|---|
| `WIDE` (640) and `PHONE` (264) | `range.cjs` | every scale kind |
| `wrapName`, `graphemes`, `NO_SPACES`: wrapping a name, also in scripts written without spaces | `range.cjs` | funnel, grid, layout, plan, heat map, status grid |
| `comma` (a comma every three digits) and `share` (a percent that stays honest near 0 and 100) | `funnel.cjs` | funnel, plan |
| `labelsOf` and `onLines`: column labels on one line, then two lines, then every 2nd to 12th label | `grid.cjs` | heat map, status grid |
| `tablesOf` and `gridTables`: the table in words, split for paper | `grid.cjs` | heat map, status grid |
| `esc`, which escapes text for SVG | five copies, in `range.cjs`, `funnel.cjs`, `grid.cjs`, `layout.cjs` and `plan.cjs` | every scale kind |

`scale.cjs` stays where it is: it is already shared. `renderScaleChart` in `diagram.cjs` stays too. It already draws both forms, swaps between them and writes the table in words, so a new chart kind joins its list with no change to the function.

**New in the core:** the value axis that runs up the page (for lines), the label that moves with a thin line to its point, and the one line above the chart.

**The date labels of a line chart need one change.** `labelsOf` refuses a grid when it would keep fewer than three labels. On a phone, 24 monthly points with a year on each January keep only two (measured: it refuses them). A time axis may keep two labels, because the reader knows that the months between them are there, and the table lists every one. So the core's time axis keeps the heat map's steps (every 2nd, 3rd, 4th, 6th, 12th label) and allows two labels as the last step. diagram-design has no rule here, because it has no phone form; this rule is Docent's own.

---

## 3. The bar chart

**The reader's question:** *How large is each amount, and which is largest?* For example: how many bug reports did each area of the app get last quarter?

**Use it when** there are 2 to 16 amounts in one unit, each for one named thing, and the reader compares their sizes. **Do not use it** for:

| The reader needs | Use |
|---|---|
| One or two amounts | A sentence |
| Amounts over time, such as sign-ups each month | A line chart (section 4) |
| The steps of one flow, and where people leave | A funnel |
| Where values or ranges fall on a scale that does not start at 0 | A range chart |
| Each exact number, more than the picture | A table |

### The data

```json
{
  "id": "reports-by-area",
  "kind": "bar",
  "label": "Sign-in had the most bug reports in the third quarter, 412. Search and Checkout had about 250 each. Help pages had the fewest, 18. Notifications has no count, because reports had no area label for it before April.",
  "scale": {"from": 0, "to": 500, "step": 100, "unit": "reports"},
  "order": "largest",
  "rows": [
    {"name": "Sign-in", "value": 412},
    {"name": "Search", "value": 268},
    {"name": "Checkout", "value": 231},
    {"name": "Settings", "value": 97},
    {"name": "Profile", "value": 64},
    {"name": "Help pages", "value": 18},
    {"name": "Notifications", "value": null}
  ]
}
```

| Field | What it is |
|---|---|
| `scale` | As in a range chart: `from`, `to`, `step`, and an optional `unit`. **`from` must be 0** when no value is below 0. With values below 0, `from` is below 0 and `to` is above it, so 0 lies inside the scale. |
| `order` | `"largest"` (the default), `"smallest"`, or `"written"`. `render` sorts the rows and says the order in the line above the chart. `"written"` needs `orderNote`, at most 32 characters, such as `"oldest release first"`, which the line above repeats. |
| `rows` | 2 to 16. Each has a `name` (at most 28 characters) and a `value`: a number on the scale, or `null` when the number is not known. An optional `group` works as in a range chart, at most 3. |

**A missing number is written as `null`, never left out.** The row stays in the chart: its name, and `no data` in muted text where the bar would start. The line under the table names it: "No data: Notifications." A row with no `value` field at all is refused, so that a missing number is a choice the author made and not a typing mistake. (The rule comes from diagram-design's honesty rules: a row that is dropped without a word changes what is being compared.)

### The marks

- A **bar** is the bar of a range chart: the page color inside, a text-color outline, small round corners, 16px high. It starts at 0. A bar below 0 runs to the left of the 0 line.
- The **value** stands 8px after the end of its bar, in 12px muted tabular figures: `412`. When there is no room after the bar, it stands inside the bar, as `placeLabel` decides today.
- The **0 line** is a solid line in the muted color when the scale holds values below 0. With no values below 0, the left edge of the scale is 0, and the tick there says so.
- **Ticks and grid lines** as in a range chart, in the outline color.
- **No mark for the largest bar.** The sort order already puts it first. A bar in another color would be a status or an accent, and a chart has neither.

### The dumbbell form: two values in each row

When the reader compares two values for each thing, such as last year and this year, each row has two values and the chart draws a dumbbell: two marks on one scale, joined by a line.

```json
{
  "id": "days-to-fix",
  "kind": "bar",
  "label": "The median time to fix a bug fell in three of five areas from 2025 to 2026. Settings fell most, from 15 days to 6. Checkout rose from 6 to 8. Profile stayed at 5.",
  "scale": {"from": 0, "to": 20, "step": 5, "unit": "days"},
  "series": ["2025", "2026"],
  "order": "written",
  "orderNote": "as in the app's menu",
  "rows": [
    {"name": "Sign-in", "values": [9, 4]},
    {"name": "Search", "values": [12, 7]},
    {"name": "Checkout", "values": [6, 8]},
    {"name": "Settings", "values": [15, 6]},
    {"name": "Profile", "values": [5, 5]}
  ]
}
```

- `series` names the two values, each at most 16 characters. With `series`, every row has `values`, a list of two numbers or `null`s, in place of `value`.
- The **first value** is a ring: the page color inside and a text-color outline, 10px across. The **second value** is a filled dot in the text color, 10px across. Shape tells them apart, not color, so they stay apart in gray print and for readers who see no color.
- The **line between them** is 2px in the muted color. It shows the gap, not a path: it says nothing about the values between the two years. (From diagram-design's dumbbell guide.)
- **Two equal values** are a smaller dot, 6px across, inside the ring, so the reader sees that both are there.
- **The series names** stand above the ring and the dot of the first row, in 12px muted text. They are the only key, and they stand beside the data.
- **The values** stand outside the pair: the smaller value left of the left mark, the larger right of the right mark.
- `order` may also be `"change"`: the largest change first, by its size, whether it is a rise or a fall. The line above says "Largest change first".
- A row with one `null` draws the known mark alone and writes `no data` for the other. The line under the table names it.
- **The marks never move.** When the two marks would touch (closer than 10px), the dot is drawn over the ring, and both values are still written. On a phone this happens below 1.14 days apart in the example.

Grouped bars and stacked bars are not offered. Two bars side by side in each row say what a dumbbell says with more ink. A stacked bar is hard to read: only its first part starts at 0, so the other parts cannot be compared. A table serves both.

### The forms

| Where | Form |
|---|---|
| Desktop and paper (640px) | The row names in a column at the left, at 14px weight 400, as in a range chart. The scale to the right, with the ticks along the top. Room is kept at the right for the widest value. For the first example: names 83px wide, so the bars run from x = 119 to x = 588, 469px for 500 reports (0.938px per report). Every tick fits: 0, 100, 200, 300, 400, 500. |
| Phone (264px) | Each row name stands on its own line, and its bar runs under it across the full width, as in a range chart. For the first example: the bars run from x = 20 to x = 212, 192px for 500 reports (0.384px per report). The ticks keep every second step: 0, 200, 400. The shortest bar, Help pages with 18, is 6.9px. |
| Screen reader and the words | The `label`, and a table: one row for each bar, with its name and its value, in the order of the drawing. A dumbbell's table has a column for each series and a column for the change. A line under the table names the rows with no data. |

### The limits

- 2 to 16 rows, 3 groups, 20 steps, as in a range chart where the two meet.
- `render` refuses a scale that starts above 0: `a bar starts at 0; a scale from 40 cuts every bar short, so their lengths no longer compare. Start the scale at 0, or use a range chart to show where values fall`. (diagram-design: never cut the value axis short.)
- `render` refuses a value outside the scale, as a range chart does.
- A bar above 0 that would be narrower than 2px is drawn 2px wide, as in a funnel, so it shows. Its number gives the exact value.

### What `check` tests

- The drawing is the one that `render` makes from the data, in both forms, and the table in words matches the data.
- **Fit warnings,** which never change the drawing: `the bar chart has 2 rows; a sentence says this more simply`; `every value is the same; a sentence says this more simply`; and for a dumbbell, `no row changes; a sentence says this more simply`.

---

## 4. The line chart

**The reader's question:** *How did an amount change over time, and when did it rise or fall?* For example: how many bug reports came in each month for each area, and which area changed?

**Use it when** there are 3 to 36 points in time, equally spaced, such as days, weeks or months, and 1 to 5 series in one unit. **Do not use it** for:

| The reader needs | Use |
|---|---|
| Amounts for named things, not for times | A bar chart |
| Two points in time | The slopegraph form, below |
| Which states a thing was in over time, against a clock | A timing diagram |
| The state of each cell, such as uptime each day | A status grid |
| Points that are not equally spaced in time | A table. A line drawn across unequal steps tells the reader a false rate. |

### The data

```json
{
  "id": "reports-by-month",
  "kind": "line",
  "label": "Sign-in reports rose from 62 in January to 138 in June, then fell to 66 in December. Search and Checkout stayed between 28 and 52 all year.",
  "scale": {"from": 0, "to": 150, "step": 50, "unit": "reports"},
  "points": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  "series": [
    {"name": "Sign-in", "focus": true, "values": [62, 70, 81, 95, 120, 138, 131, 112, 96, 84, 71, 66]},
    {"name": "Search", "values": [40, 42, 39, 45, 48, 44, 46, 50, 47, 49, 52, 51]},
    {"name": "Checkout", "values": [30, 28, 35, 33, 31, 36, 34, 30, 29, 33, 32, 35]}
  ]
}
```

| Field | What it is |
|---|---|
| `scale` | As in a range chart. It may start above 0, because a line shows change, not size. Then the line above the chart says so: `The scale starts at 40, not 0.` |
| `points` | 3 to 36 labels for the points in time, at most 10 characters each, such as `Jan`, `W14` or `2026`. They are equally spaced. |
| `series` | 1 to 5. Each has a `name` (at most 20 characters) and `values`, one for each point: a number on the scale, or `null` when it is not known. |
| `focus` | `true` on the one series that the text talks about. At most one series has it. A chart with one series draws it in the text color, with no `focus`. |
| `multiples` | `true` for small multiples (below). |

**The series that the text talks about takes the text color; the others are gray.** The focus line is 2.5px in the text color, with a small dot at each point when the points stand at least 8px apart. Every other line is 1.5px in the muted color, with no dots. The two differ in weight and in tone, and both pass 3:1 on the page: the text color is 15.82:1, the muted color 6.30:1 (14.76:1 and 5.87:1 on the well). So the reader sees the main series first and the others second, and nothing rests on a color the reader must tell apart.

**Each line is named at its end,** at 14px weight 400, 8px after its last point. When two names would be closer than 18px, they move apart, in the order of their lines, and a thin muted line joins each moved name to its line's end. The last point of each line never moves.

**A gap stays a gap.** A `null` breaks the line. A point alone between two gaps is a dot. The renderer never draws a line across missing data. (diagram-design: never connect a gap without showing it.) Lines are straight from point to point and never smoothed, because a curve draws values that nobody measured.

**With several series and no focus, the author must choose.** Data with two or more series, no `focus` and no `multiples` is refused: `say which series the text talks about with "focus", or show each series in its own panel with "multiples": true`. Five gray lines with no main series say what a table says.

### Small multiples: several series that matter equally

With `"multiples": true`, each series gets its own small panel. All panels share one scale and one set of points, so they compare. Each panel names its series above it, at 14px weight 600, and draws its series in the text color. The other series stand behind it as thin lines in the outline color, so the reader sees where this series stands among the others.

The outline color has low contrast: 1.40:1 on the light page and 1.43:1 on the dark page. That is accepted here, as it is for grid lines: those thin lines only repeat data that each panel draws in the text color.

- 2 to 6 panels. `focus` is refused with `multiples`.
- Desktop and paper: up to 3 panels in a row, each 184px wide, with a plot of 152px. Twelve months keep every label (measured).
- Phone: one panel in a row, 224px wide, with a plot of 192px. Twelve months keep every label (measured).

### The slopegraph form: two points in time

When `points` has exactly two labels, the line chart draws a slopegraph: two upright axes, one for each point, and a straight line for each series between them. The reader sees three things at once: which series rose or fell, how steeply, and which series passed another.

- Each line is named at both ends, with its value: name, then value, on the left; value, then name, on the right. Values are 12px muted tabular figures.
- The run between the axes is no wider than the plot is tall, so the slopes keep their angle. (From diagram-design's slopegraph guide.)
- The scale may start above 0. The slopes do not change when both axes move together, and the line above the chart says where the scale starts.
- 2 to 10 series. The focus rule and the rule for names that would meet are as above.
- On a phone the names stand on the right only, and the left axis shows the values alone. For the dumbbell example data drawn as a slopegraph, the run is then 105px.

### The forms

| Where | Form |
|---|---|
| Desktop and paper (640px) | The value labels at the left, 12px muted, each on its grid line. The points along the bottom. The names at the line ends, at the right. For the example: the names need 71px, so the plot runs from x = 52 to x = 549, 497px. Twelve months stand 45px apart and keep every label. Thirty-six months keep every third label, with the year on each January. |
| Phone (264px) | The value labels stand inside the plot, above their grid lines at the left edge, so they take no width. The names stay at the line ends. For the example: the plot runs from x = 20 to x = 173, 153px. Twelve months keep every third label: Jan, Apr, Jul, Oct. A name may be up to 96px before the plot falls under 120px. A longer name wraps onto two lines. |
| Screen reader and the words | The `label`, and a table: one row for each point in time, and one column for each series. A `null` is written `no data`. Under the table, one line for each series, computed from the values: "Sign-in: 62 in Jan, 66 in Dec; highest 138 in Jun; lowest 62 in Jan." |

### The limits

- 3 to 36 points; 1 to 5 series (2 to 6 panels with `multiples`, 2 to 10 series in a slopegraph); 20 steps.
- `render` refuses a value outside the scale, a series whose number of values is not the number of points, and two series with the same name.
- `render` refuses two series that are equal at every point: they cannot be told apart. Write one series and say in the text that both are the same. (diagram-design: never nudge two lines apart.)

### What `check` tests

- The drawing is the one that `render` makes from the data, in all its forms, and the table in words matches the data.
- **Fit warnings:** `the line chart has one series of 3 points; a sentence says this more simply`; `no value changes; a sentence says this more simply`.

---

## 5. Hand-drawn figures: the contract

### The rule today, and the change

Today the rule is strict. `SKILL.md`, step 7, says: "Never write or edit the SVG by hand." It goes on: "Do not draw an SVG of your own in a figure well either, not even for a chart that no kind fits: `check` reports it as an error." `check.cjs` refuses any SVG in a figure well that no diagram block made. So a document that needs a fishbone or a Wardley map gets a table.

This proposal changes that rule. **An agent may draw an SVG by hand in a figure well, for a type in the hand-drawn list (section 6), when the drawing keeps the contract below.** Every other SVG in a figure well is still refused. A hand-drawn bar chart is refused, because the bar chart is a built-in kind: `figure 2 is a hand-drawn bar chart; write its data in a block with "kind": "bar" and run render`.

### The contract

The agent starts from diagram-design's guide for the type: its layout and its anti-patterns. It keeps Docent's look, and `check` tests each rule below.

| # | Rule | What `check` tests |
|---|---|---|
| 1 | **A marker.** The `<svg>` carries `data-drawn="hand"` and `data-type`, the name of a type in the hand-drawn list, such as `data-type="fishbone"`. | Both attributes are there, and the type is in the list. A type with a built-in kind is refused, with the kind to use. |
| 2 | **Page tokens only.** Every color is one of the five drawing tokens: `var(--text)`, `var(--muted)`, `var(--line)`, `var(--bg)` or `var(--fig)`, with or without its light value as a fallback. `none`, `currentColor` and `transparent` are allowed. | Every `fill`, `stroke`, `color` and `stop-color`, in an attribute, a `style` attribute or a `<style>` element, is one of these. A hex value, `rgb()`, `hsl()` or a color name is refused. So are the ultramarine, the status colors and the heat steps: those have their own meanings. |
| 3 | **No text under 12px.** Names 14px, notes 12px, as in every drawing. | Every `font-size` is 12px or more. |
| 4 | **Real size.** The drawing is shown at its real size, so the font sizes are true. | `width` and `height` equal the size of the `viewBox`. The width is at most 1104px, the widest full-width well. |
| 5 | **System fonts, two weights.** The drawing takes the page's sans-serif. | No `font-family`, no `@font-face`, no `@import`. Every `font-weight` is 400 or 600. |
| 6 | **No network and no script.** | No `<script>`, `<foreignObject>`, `<image>`, `<animate>`, `<set>`, event attribute (`on…`), CSS animation or transition. Every `href` and every `url()` points inside the drawing (`#…`). |
| 7 | **Nothing dashed.** In Docent a dashed line means a path that only some readers take. | No `stroke-dasharray`. |
| 8 | **An accessible name.** | `role="img"`; a `<title>` as the first child and a `<desc>`, both not empty; `aria-labelledby` names both. Their ids are unique in the document. |
| 9 | **The diagram in words.** A table or a list beside the drawing says everything the drawing says. | The figure holds a closed section `<details class="dg-words">` with a `<table>`, `<ol>` or `<ul>` that is not empty. |

`check` also prints one line for each hand-drawn figure: `check doc.html: figure 3 is hand-drawn (fishbone); open the page in a browser and look at it at 1280px and at 375px, in light and in dark`. The agent must do that, because of the costs below.

### The costs, said plainly

- **Not the same every time.** Two agents draw the same data in two ways. There is no data block, so `render` cannot draw the figure again, and `check` cannot compare the drawing with anything.
- **No phone form.** A hand-drawn figure scrolls sideways inside its well on a phone, and `render` cannot draw a narrower form. The table or list in words is the phone reader's real form.
- **Mistakes that `check` cannot see.** Text that runs past its shape, two labels over each other, a line that crosses a name, an arrow that points at the wrong box, a number in the drawing that differs from the words. Only a person or an agent looking at the page sees these. So the agent must open the page in a browser, look at both widths and both themes, and fix what it sees.
- **More upkeep.** A change to the data means drawing the figure again by hand.

These costs are why the list of hand-drawn types is short, and why a type moves up to a built-in kind once it is used.

### The promotion rule

**When two real documents use the same hand-drawn type, it becomes a candidate for a built-in kind.** It then gets a proposal of its own, like this one, before it is built. `check`'s line for each hand-drawn figure names the type, so the agent can tell the user each time one is used. A sample page or a test does not count as a real document.

### What changes in `SKILL.md`, `DESIGN.md` and `diagrams.md`

These changes come with build item 4, not with this proposal. A separate session is changing `SKILL.md` and `check.cjs` now, and this proposal edits neither.

**`SKILL.md`, step 7.** The two sentences quoted above become:

> Never write or edit the SVG of a built-in kind by hand: change the data in the block, and `render` replaces the drawing. When the reader needs a type in the hand-drawn list of `references/diagrams.md`, you may draw it by hand: follow the contract there, and `check` tests it. Then open the page in a browser at a desktop and a phone width, in light and in dark, and fix what you see; `check` cannot see a layout mistake. Draw no other SVG in a figure well. When no kind and no hand-drawn type fits, say the gap to the user, and use a table or words.

**`SKILL.md`, the table of the reader's questions.** Two new rows, for the bar chart and the line chart:

| The reader asks | Write |
|---|---|
| How large is each amount, and which is largest? | A bar chart (`"kind": "bar"`), for 2 to 16 amounts that start at 0; with `series`, a dumbbell for two values in each row |
| How did an amount change over time? | A line chart (`"kind": "line"`), for 3 to 36 equally spaced points; a slopegraph for two points |

**`DESIGN.md`, Colors, "Diagrams."** One sentence after "An author cannot give a diagram any other color": "A hand-drawn figure follows the same rule: it uses the drawing tokens and nothing else."

**`DESIGN.md`, Layout.** Two new paragraphs, "Bar charts" and "Line charts", in the style of "Range charts", from sections 3 and 4.

**`diagrams.md`.** Line 3 ("Do not write the SVG by hand") gains "for a built-in kind". The sentence in "Range charts" that says "For amounts compared by size from zero, use a table" points to the bar chart instead. New sections "Bar charts", "Line charts" and "Hand-drawn figures", the last with the contract, the list of types, and the credit to diagram-design (MIT) for the type guides. Under "What the renderer says", the `check` message about a drawing that no block made gains the case of a hand-drawn figure that breaks the contract.

---

## 6. A map of the 39 diagram-design types

Each of the 39 types of diagram-design 2.6.12 goes into one of four groups. The check is against Docent's kinds on 2026-11-23: the workflow diagram (Route wide, Route tall, Plates), the sequence diagram, the flowchart, twelve UML kinds (activity, state machine, interaction overview, timing, use case, class, object, package, profile, component, composite structure, deployment, communication), and seven scale kinds (range chart, layout to scale, plan, funnel, heat map, heat plan, status grid).

### Docent has it already (19)

| Type | In Docent | Why it is enough |
|---|---|---|
| Architecture | Component diagram | Parts, the services they offer and need, and the links between them. |
| IT current-state | Workflow diagram with a lane per department, or a component diagram | The groups are lanes or packages; the pain points go in the notes and the text. |
| Flowchart | Flowchart (`"flow"`) | The same type. |
| Sequence | Sequence diagram | The same type. |
| State machine | State machine diagram | The same type. |
| ER / data model | Class diagram, with attributes and multiplicities | A class diagram already draws entities, their fields and the cardinality at each end (`"multiplicity": ["1", "0..*"]`). **Moved here** from "build"; see below. |
| Swimlane | Workflow diagram | Lanes, parts and numbered legs. |
| Loop / flywheel | Workflow diagram whose last leg goes back to the first part | An arrow back is allowed; it draws as Plates, and the column form on a phone. |
| Layer stack | Workflow diagram with one lane and one part per layer | Approved in [`diagram-kinds.md`](diagram-kinds.md), item 6. |
| High-level data stack | Deployment diagram | Machines, environments and what runs on each. |
| Process | Workflow diagram | Actors are lanes; the data that enters and leaves a step goes in its note. |
| Medallion | Layer stack, as above | Each tier is a layer. |
| Data flow | Workflow diagram | Roles are lanes. |
| DP integration | Component diagram | Sources, a core and consumers, each with its interfaces. |
| DP security matrix | A table | A permission is not a status, so a status grid would mislead. A table with a column for each role says it exactly. |
| Kanban | A table with a column for each state, or a card grid | A kanban board has no connectors: it counts the cards in each state, so it is a table, not a drawing. |
| Deployment | Deployment diagram | The same type. |
| Dependency graph | Package diagram | "What depends on what", with cycles. |
| UML class | Class diagram | The same type. |

### Build as a built-in kind (8)

| Type | Kind | Why |
|---|---|---|
| Bar | `"bar"`, with the dumbbell form | The largest gap. Section 3. |
| Line | `"line"`, with the slopegraph form and small multiples | The second largest gap. Section 4. |
| Scatter | `"scatter"`, with a strip form for one axis | Two measures for each thing, and how they relate, is common in market data. A Cleveland dot plot (one dot in each row) is already a range chart with points; the strip form adds many dots on one axis, to show a spread. |
| Timeline | A range chart on a date scale | One row for each event, with a point at its date, already has two forms and a table. The missing part is a date scale. A long incident timeline stays a table, as `SKILL.md` already says for a brief. |
| Gantt / roadmap | A range chart on a date scale | A task is a range from its start to its end; a phase is a group; a milestone is a point; "today" is a named line. The range chart has all of these but dates. diagram-design caps a Gantt at 12 tasks, and the range chart allows 12 rows. |
| Org chart | `"tree"` | A tree with a role in each note. |
| Tree | `"tree"` | Parent and children, with elbow lines. On a phone it becomes an indented list, the way a file tree reads. |
| Database schema | `"schema"` | Tables with columns, SQL types and keys, and each foreign key joins one column to another column. A class diagram joins boxes, not columns, so it cannot show this. |

Timeline and Gantt are one piece of work, the date scale (build item 5). Org chart and tree are one kind. So the eight types make six pieces of work: bar, line, scatter, the date scale, tree and schema.

**Why ER moved.** The first plan for this proposal put ER and the database schema in one new kind. But Docent's class diagram already draws a conceptual model: entities as boxes with fields, and the cardinality at each end of a relation. A second kind for the same picture would give an author two ways to draw one thing. The database schema stays a new kind, because it needs what a class diagram cannot draw: a line from one column to another. The cost of the move: a business reader may not know the UML marks (`0..*`). The class diagram's table in words says each relation in words. See decision 5.

### Hand-drawn under the contract (7)

| Type | Why not built-in now |
|---|---|
| Quadrant (2×2) | Usually the positions are judgments, not measures. When both axes are measured numbers, it is a scatter plot with two named lines. |
| Nested (containment) | Trust zones and scopes. A deployment diagram covers machines inside environments; other nesting is rare. |
| Venn | Two or three sets that overlap. Rare in reports, and a table of "A only, both, B only" often says it better. |
| Fishbone | Root-cause analysis in an incident report. Real, but rare. |
| Wardley map | A strategy picture whose positions are judgments on two axes. Rare. |
| User journey | Its main line is a feeling at each stage, which is a judgment. A workflow diagram shows the steps. |
| Story map | A backbone of steps, split into releases. Rare outside product planning. |

### Leave out (5)

| Type | Why |
|---|---|
| Radar / spider | Values on spokes at angles. The area of the shape depends on the order of the spokes, so the same data can look large or small. A table or small multiples of bars compare the scores honestly. |
| Polar chart | Length on a circle: the reader compares angles and curved lengths, which the eye reads poorly. A bar chart shows the same values. |
| Pyramid / funnel | A pyramid's layers are a ranked list, and its widths mean nothing. The funnel shape is already ruled out ([`funnels.md`](funnels.md)); Docent's funnel draws bars. |
| Treemap | The reader compares areas of rectangles of different shapes, which the eye reads poorly. A bar chart sorted from largest shows the same parts of a whole. |
| Sankey | **Moved here.** The first plan did not name it among the types to leave out, but [`funnels.md`](funnels.md) already rejected it: it claims to know where each person went next, and its band widths and curves have no Docent rules. Hand-drawing it would bring back a picture that Docent decided against. |

**Variants and looks.** diagram-design also has variants inside these types, and looks that apply to any type. The **dumbbell** and the **slopegraph** are built (sections 3 and 4). The **beeswarm** becomes the scatter plot's strip form. The **bump chart** (rank over several snapshots) is hand-drawn under the contract. The **ridgeline** is left out: its areas overlap on purpose, so one hides another. The **bubble** chart is left out: it adds a size for each circle, and the eye reads areas poorly. **Grouped and stacked bars** are left out (section 3). The **sketchy** and **terminal** looks are left out: Docent has one look.

---

## 7. Order of building

Each item is its own pull request. Each starts after the one before it is merged, except where noted.

1. **The chart core.** The parts in section 2 move into `scripts/lib/chart.cjs`. The test: every stored drawing of every existing kind stays exactly the same, and the tests pass with no change to an expected file. It comes first because items 2 and 3 build on it, and because a move with no visible change is easiest to review alone. Medium.
2. **The bar chart,** with the dumbbell form. It is the simpler chart, and it fixes the shape of the core for the line chart. Tests: both examples as fixtures in both forms; each error message; a value below 0; a `null` value; two equal dumbbell values; marks that touch; each `order`. One bar chart on the sample page, about bug reports. Medium.
3. **The line chart,** with the slopegraph form and small multiples. It adds the value axis that runs up the page, names at the line ends, and the time axis with two labels as its last step. Tests: the example; 36 points; a gap; a single point between gaps; names that must move apart; a slopegraph; small multiples on both forms. Large.
4. **Hand-drawn figures: the contract.** The `check` rules in section 5, the list of types, and the text changes in `SKILL.md`, `DESIGN.md` and `diagrams.md`. It comes after items 2 and 3, so that no agent hand-draws a bar chart or a line chart while those kinds are missing. Those drawings would all need to be redone. It needs the separate session's changes to `SKILL.md` and `check.cjs` to be merged first. Medium.
5. **A date scale in the core,** so a range chart draws a timeline or a Gantt chart. A short proposal first. Medium.
6. **The scatter plot,** with the strip form. A short proposal first. Medium.
7. **The tree,** with the org chart. A short proposal first. Medium.
8. **The database schema.** A short proposal first. It is last because it is the largest, and its audience is the narrowest of the four. Large.

Items 5 to 8 do not depend on each other, so their order can change when a real document needs one of them sooner.

---

## Measured

The widths come from Docent's own code: `textWidth` in `scripts/lib/text.cjs` (14px for names, 12px for notes), `valueWidth` and `makeScale` in `scripts/lib/scale.cjs` (tabular figures and the tick rule), `labelsOf` in `scripts/lib/grid.cjs` (the column label rule), and `contrast` in `scripts/lib/color.cjs`. The scripts are in the session scratchpad and are not part of the kit; they are run from `skills/docent` with `node measure.cjs` and `node measure2.cjs`. Their output, first `measure.cjs`, then `measure2.cjs`:

```text
== contrast
  diagram-design accent #eb6c36 on paper #f5f5f5: 2.862
  text #1c1f2e on page #fbfbfe: 15.82, on well #f2f3f9: 14.76
  muted #575d75 on page #fbfbfe: 6.3, on well #f2f3f9: 5.87
  outline #d3d6e3 on page #fbfbfe: 1.4, on well #f2f3f9: 1.31
  dark text #e7e9f3 on dark page #12141f: 15.14, on dark well #0b0d15: 16.02
  dark muted #959bb3 on dark page #12141f: 6.65, on dark well #0b0d15: 7.04
  dark outline #2d3146 on dark page #12141f: 1.43, on dark well #0b0d15: 1.51
== bar chart
  desktop: widest name 83px; bars from x=119 to 620, 501px for 500, 1.002px per report; ticks 0, 200, 400
    Sign-in         412  bar 412.8px, value "412" 23.8px at x=539.8
    Search          268  bar 268.5px, value "268" 23.8px at x=395.5
    Checkout        231  bar 231.5px, value "231" 23.8px at x=358.5
    Settings         97  bar 97.2px, value "97" 15.8px at x=224.2
    Profile          64  bar 64.1px, value "64" 15.8px at x=191.1
    Help pages       18  bar 18px, value "18" 15.8px at x=145
    Notifications  no data; text "no data" 44px
  phone: bars from x=20 to 244, 224px for 500, 0.448px per report; ticks 0, 200, 400
    Sign-in        bar 184.6px, value ends at x=236.3
    Search         bar 120.1px, value ends at x=171.8
    Checkout       bar 103.5px, value ends at x=155.2
    Settings       bar 43.5px, value ends at x=87.3
    Profile        bar 28.7px, value ends at x=72.5
    Help pages     bar 8.1px, value ends at x=51.9
  smallest bar: Help pages 18 = 8.1px on a phone
== dumbbell
  desktop: names 63px; scale x=123 to 596, 23.65px per day; ticks 0, 5, 10, 15, 20
    Sign-in   9 -> 4: gap 118.3px
    Search    12 -> 7: gap 118.3px
    Checkout  6 -> 8: gap 47.3px
    Settings  15 -> 6: gap 212.9px
    Profile   5 -> 5: gap 0px
  phone: scale x=44 to 220, 8.8px per day; ticks 0, 10, 20; 1 day = 8.8px; dots 10px across touch below 1.1400000000000001 days apart
== line chart
  desktop: value labels 23.8px; end labels (name and last value) need 102.8px; plot x=52 to 517, 465px
    12 points, 42.3px apart: 1 line(s), every 1 label(s) kept: Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
    24 points, 20.2px apart: 2 line(s), every 1 label(s) kept: Jan 25 Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec Jan 26 Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
    36 points, 13.3px apart: 1 line(s), every 3 label(s) kept: Jan 25 Apr Jul Oct Jan 26 Apr Jul Oct Jan 27 Apr Jul Oct
  phone: value labels 23.8px; end labels (name and last value) need 102.8px; plot x=52 to 141, 89px
    12 points, 8.1px apart: 1 line(s), every 4 label(s) kept: Jan May Sep
    24 points: the column labels do not fit on a phone, even on two lines or with every 12th label; the widest is "Jan 25", 41px. Shorten the labels to about 7 characters, or use fewer columns
    36 points: the column labels do not fit on a phone, even on two lines or with every 12th label; the widest is "Jan 25", 41px. Shorten the labels to about 7 characters, or use fewer columns
  end name "Sign-in" 48px
  end name "Search" 47px
  end name "Checkout" 63px
  a long end name "Notifications" 83px; in 88px: 1 line(s); "Help pages" in 88px: Help pages
== small multiples
  desktop: 3 panels of 184px, plot 152px each, 12 months: every 1 label: Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
  phone: 1 panel per row, 224px wide, plot 192.2px, 12 months: every 1 label: Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
== slopegraph
  desktop: names 63px, values 15.8px; left axis x=115, right axis x=525; run 410px
  phone (names on the right only): left axis x=44, right axis x=149; run 105px
```

```text
bar desktop: plot x=119 to 588 (469px), 0.938px per report, ticks 0, 100, 200, 300, 400, 500; Help pages 18 = 16.9px, Sign-in 412 = 386.5px
bar phone: plot x=20 to 212 (192px), 0.384px per report, ticks 0, 200, 400; Help pages 18 = 6.9px, Sign-in 412 = 158.2px
line desktop: names need 71px; plot x=52 to 549, 497px
  12 points, 45.2px apart: 1 line(s), every 1: Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
  24 points, 21.6px apart: 2 line(s), every 1: Jan 25 Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec Jan 26 Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
  36 points, 14.2px apart: 1 line(s), every 3: Jan 25 Apr Jul Oct Jan 26 Apr Jul Oct Jan 27 Apr Jul Oct
line phone (value labels inside): names need 71px; plot x=20 to 173, 153px
  12 points, 13.9px apart: 1 line(s), every 3: Jan Apr Jul Oct
  24 points: refused: the column labels do not fit phone (value labels inside), even on two lines or with every ...
  36 points: refused: the column labels do not fit phone (value labels inside), even on two lines or with every ...
phone: an end name may be up to 96px before the plot falls under 120px; "Notifications" is 83px
```

Notes on the numbers:

- The first script also measured a bar plot that ran to x = 620. There the tick 500 did not fit inside the drawing, and only every second tick stood. The second script keeps room for the widest value at the right, and every tick fits. The proposal uses the second.
- The first script also measured a phone line chart with the value labels outside the plot and the last value after each name. Its plot was 89px wide. The proposal puts the value labels inside the plot and writes names only, which gives 153px.
- The "refused" lines for 24 and 36 points on a phone are the heat map's label rule. They are why the line chart's time axis allows two labels as its last step (section 2).
- `1.1400000000000001 days` is 1.14 days; the extra digits are a rounding error of the script's print, not of the scale.
- The first script's phone dumbbell keeps 24px at each end for the values. The bar chart's phone form keeps room at the right only.
- The slopegraph's desktop run of 410px is the room at full width. The rule "no wider than the plot is tall" makes the real run shorter.

---

## Decisions

Each decision has a recommended answer, which the proposal above follows, and the other choice, so the user can change one.

1. **Allow hand-drawn figures under the contract.** Recommended: yes, for the seven types in the hand-drawn list only. The user asked for diagram-design's breadth, and today a document that needs a fishbone gets a table. The contract keeps the look and the offline page, and `check` tests every rule it can. The other choice: keep today's rule, and build a kind for each type when a document needs it. That is safer and slower, and it leaves rare types as tables.
2. **The scale of a dumbbell.** Recommended: it may start above 0, as a range chart's may, and the line above the chart says where it starts. A dumbbell shows the gap between two values, and a gap does not change when the scale moves. The other choice, diagram-design's rule: a dumbbell's scale always includes 0. That is stricter, but on a scale from 0 two values near 90 and 95 stand close together, and the gap is hard to see.
3. **Horizontal bars only.** Recommended: yes. Names stand at the left at 14px and never turn; on a phone each name has its own line above its bar. Upright bars (columns) need the names under them, and on a 264px phone they turn the names or cut them short. The other choice: upright bars for time, as diagram-design does. Docent draws time as a line chart.
4. **One focus series in a line chart.** Recommended: at most one. Two lines in the text color compete, and the reader no longer knows which one the text is about. Several series that matter equally get small multiples. The other choice: allow two focus series.
5. **ER as a class diagram, not a new kind.** Recommended: yes (section 6, "Why ER moved"). The other choice: an ER kind in a notation that business readers know better, such as crow's feet. It would draw the same picture as the class diagram in a second notation.
6. **The hand-drawn contract after the bar and line charts.** Recommended: yes (section 7, item 4). The other choice: the contract first, because it is smaller and opens all seven rare types sooner. Then agents may hand-draw bar and line charts until items 2 and 3 land.

## Not in this proposal

- Code, and changes to `SKILL.md`, `check.cjs`, `kit.css` or the template. Each build item comes in its own pull request.
- A hand-drawn sample page. It can be added if the user wants to see the forms before approving.
- The detailed data and forms of the scatter plot, the date scale, the tree and the database schema. Each gets a short proposal first.
- Pie and donut charts, a second value axis, area charts, and charts that move.
