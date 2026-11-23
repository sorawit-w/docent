# Proposal: status grids — the state of each cell, set by thresholds

Status: **proposed on 2026-11-23, with each open question decided** (see "Decisions" at the end). It waits for review. No code is written yet. An earlier talk settled the direction: data such as server uptime is a status question ("when was it down?"), not an amount, so it needs its own kind and not a green-to-red heat map. The author sets thresholds, each cell takes a state, and each state has a sign that is not color.

## The answer first

Build one new kind, `"kind": "statusgrid"`. A status grid shows the state of each pair of a row and a column, such as the uptime of each part of a service on each day. The author either writes numbers with **thresholds** ("99.9% or more is OK, 99% or more is Warning, below that is Error"), or writes each state directly (`"ok"`, `"warn"`, `"err"`). Both directions work: higher is better (uptime) and lower is better (error rate). A value exactly on a threshold takes the better state.

The look follows one rule: **only the failures stand out.** An OK cell is a plain gray cell in the line color, with no mark. A Warning cell is the same gray cell with one stroke, a slash, in the warning color. An Error cell is filled in the error color, with two strokes, a cross, in the page color. A cell with no data is hollow, as in the heat map. So the states differ in three ways at once: by color, by mark (no stroke, one stroke, two strokes), and by lightness (an Error cell is about 40 L\* darker than an OK cell in light mode, and about 38 L\* lighter in dark mode). The marks and the lightness hold for readers with red-green color blindness and on a printer without color. Section 4 measures this against three other looks.

This needs no new color token. It changes one color rule: the error color may fill an Error cell of a status grid. Green is not used, because OK is the normal case and a page of green cells would make every cell loud. Section 4 gives the exact words for `DESIGN.md`.

The grid, the column labels, the phone form and the table that splits for paper are the heat map's, and the code is shared. A long strip of one thing, such as 90 days of one service, is written as a calendar: weekdays as rows and weeks as columns, so each day is a real cell with room for its mark, also on a phone.

| # | Pull request | Size |
|---|---|---|
| 1 | The status grid: the shared grid code moved out of `heatmap.cjs` (no heat map drawing changes), the kind, both forms, the legend, the table in words, the fit warnings, the `DESIGN.md` change, the docs | Medium |
| 2 | One status grid on the sample page, in its "Report a bug" topic: the uptime of the bug tracker's parts over two weeks | Small |

## The obvious answers that would be wrong

**A heat map from green to red.** It looks like the usual answer, but green would mean "a high number" in the figure and "succeeded" in the status notes beside it. Many readers cannot tell red from green. On a printer without color, Docent's green and red print as almost the same gray: L\* 46.5 and 45.1, a difference of 1.5 (see "Measured"). And a heat map answers "how much", while the reader asks "which ones failed".

**Every cell filled in its status color, as on a service's status page.** It is the look that readers know. But in a real grid almost every cell is OK, so the figure becomes a block of green, and the two red cells are what the reader came for. The fills do not survive the tests either: in gray print, OK and Error differ by 1.5 L\* in light mode, and in dark mode OK and Warning differ by 0.2 L\*. For a reader with deuteranopia, the dark OK and Error fills are only 8.2 apart (ΔE). Only the marks would carry the states. Section 4, option A.

**One long strip of thin bars for 90 days.** On a status page each bar shows its day when the mouse rests on it. Docent has no hover: the page works without scripts and on paper. On a phone, 91 bars in 224px are 2.5px each, too narrow for any mark, so color would be the only sign. A calendar of 13 weeks gives cells 16.2px wide on a phone (section 2).

---

## 1. The reader's question

**The question:** *When, and where, did something fail its target?* For example: on which days was each part of the bug tracker down? Which nightly builds failed this month?

**The name: `"statusgrid"`.** It says what the reader sees, a grid of states, and it is one word like `"heatmap"` and `"usecase"`. `"status"` alone would collide with the status note and with the `state` field of a part. `"uptime"` would fit only one kind of data: builds and error rates are status data too.

**Use it when** there is one state for each pair of a row and a column, 1 to 12 rows and 3 to 24 columns, and the reader needs to find the failures more than to read each number.

**Do not use it** in these cases:

| The reader needs | Use |
|---|---|
| How much, such as errors by day, where 30 and 38 both matter | A heat map (`"kind": "heatmap"`) |
| The state of a few things right now, one state each | A status note for each, or a table with a state column |
| Each exact number, or fewer than 12 cells | A table |
| The news that every cell is OK | A sentence: "Every part was up every day of the month." |
| The state of each step of a workflow, such as where a release stopped | A workflow diagram with a `state` on the parts |
| A trend over time for one series, such as response time by day | A table, or a sentence. Docent has no line chart. |

---

## 2. The data

```json
{
  "id": "tracker-uptime",
  "kind": "statusgrid",
  "label": "Uptime of the bug tracker's parts from 3 to 16 November. On 11 November the API and Search were down for part of the day, and Sign-in was slow. Every other day was OK, except three short slow periods. Email alerts has no data for 14 November.",
  "thresholds": {"better": "higher", "ok": 99.9, "warn": 99, "unit": "%"},
  "columns": ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"],
  "rows": [
    {"name": "Website",      "values": [100, 100, 99.98, 100, 100, 100, 100, 100, 99.95, 100, 100, 100, 100, 100]},
    {"name": "Sign-in",      "values": [100, 100, 100, 100, 100, 100, 100, 100, 99.4, 100, 100, 100, 100, 100]},
    {"name": "API",          "values": [100, 99.99, 100, 100, 100, 100, 100, 100, 98.6, 99.7, 100, 100, 100, 100]},
    {"name": "Email alerts", "values": [100, 100, 100, 99.6, 100, 100, 100, 100, 100, 100, 100, null, 100, 100]},
    {"name": "Search",       "values": [100, 100, 100, 100, 100, 99.97, 100, 100, 97.9, 100, 100, 100, 100, 100]}
  ]
}
```

The numbers are made up for this proposal.

| Field | Needed | What it is |
|---|---|---|
| `thresholds` | when the values are numbers | `better` (`"higher"` or `"lower"`), `ok` (the edge of the OK state), `unit` (at most 12 characters), and optionally `warn` (the edge of the Warning state). Section 3. |
| `columns` | yes | 3 to 24 labels, left to right, each at most 10 characters, all different, as in a heat map. |
| `rows` | yes | 1 to 12 rows, top to bottom. Each has a `name` (at most 20 characters, all different) and `values`: one for each column. With `thresholds`, a value is a number or `null`. Without `thresholds`, a value is `"ok"`, `"warn"`, `"err"` or `null`. At least one value is not `null`. |
| `names` | no | The words for the states, such as `{"ok": "Up", "warn": "Degraded", "err": "Down"}`. Each is at most 12 characters, and all are different. The default words are "OK", "Warning" and "Error". |

`id` and `label` are needed, as for every kind. Other fields are ignored, as in the other kinds, with five exceptions that `render` refuses, because an author who knows the heat map may write them: `scale`, `form`, a `place` other than `"flow"`, `groups`, and `areas`.

### Two ways to give the states

- **Numbers with thresholds,** for anything that is measured: uptime, error rate, response time. The renderer finds each state, the table in words keeps each number, and the line under it names the worst cell.
- **States written directly,** for anything that has no number: a build passed or failed, a check ran or did not. Then the grid has no `thresholds`, and the table in words gives the state names.

One grid uses one way. A grid with `thresholds` and a value of `"ok"` is refused, and so is a grid without `thresholds` and a number. Mixing them would hide which states were measured and which were judged.

### The shapes

**A grid,** such as parts by day: rows are the things, and columns are the times. This is the main shape.

**A short strip of one thing,** such as one service over 24 hours or 14 days: one row. The heat map needs two rows, but one row of states is a real report, so a status grid allows one. Under 12 cells the fit warning still suggests a table.

**A long strip of one thing,** such as 90 days of one service: a calendar, with the weekdays as 7 rows and the weeks as columns, from the oldest week at the left. Time still runs from left to right, as on a status page, and a row shows the same weekday, so a failure that comes back every Monday shows as a line. Up to 24 weeks (168 days) fit the limits. On a phone, 13 weeks give cells 16.2px wide, and 24 weeks give 8.3px, the same as the narrowest heat map. One strip of 91 cells would give 2.5px on a phone and 5.7px on a desktop.

The author folds the strip into the calendar; the renderer does not read dates. Section 9 has the example, and Decision 6 explains why.

### The limits

- 1 to 12 rows, 3 to 24 columns, so at most 288 cells. These are the heat map's limits, except the one row, so the phone grid always fits (24 columns give 9.3px).
- A row name is at most 20 characters, a column label at most 10, the unit and each state name at most 12.
- 2 or 3 states: `warn` is optional.

---

## 3. Thresholds

```json
"thresholds": {"better": "higher", "ok": 99.9, "warn": 99, "unit": "%"}
```

- **`better`** says which way is good. With `"higher"`, a value of `ok` or more is OK, a value of `warn` or more is Warning, and a lower value is Error. With `"lower"`, a value of `ok` or less is OK, a value of `warn` or less is Warning, and a higher value is Error.
- **The edges: a value exactly on a threshold takes the better state.** Targets are written as "at least 99.9%" or "at most 1%", so a value that meets the target exactly has met it. This is the same rule as the heat map's ("a value on an edge takes the higher step") when higher is better, and its mirror when lower is better. The words under the table say the rule.
- **`warn` is optional.** Without it there are two states: a value that meets `ok` is OK, and every other value is Error.
- **`better` is needed, and not read from the order of `ok` and `warn`.** If the renderer took the direction from the order, an author who swapped the two numbers would get a grid where every good day is an Error, and no message. With `better` written, the swap is refused: `with "better": "higher", "ok" must be above "warn"`.
- **Values have no range.** A value can be any number, also outside 0 to 100. Only the thresholds give it meaning.
- **The unit** is needed, as in the heat map, because the legend and the table name it. A unit of `%` stands right after the number ("99.9%"); every other unit follows after a space ("250 ms").

For an error rate, where lower is better:

```json
"thresholds": {"better": "lower", "ok": 1, "warn": 5, "unit": "%"}
```

The legend then says "OK: 1% or less", "Warning: above 1% to 5%" and "Error: above 5%".

---

## 4. The look

`DESIGN.md` says that status colors are "for status only, as a small dot with a word beside it", and that in a diagram "a part that carries a state takes the status color on its outline". A cell of color is a fill, so every option except C changes that rule. Four options:

- **A. Every cell filled in its status color,** with the mark in the page color.
- **B. A pale tint of the status color,** 20% over the page, with a 1.5px outline and the mark in the status color.
- **C. Every cell in the line color, with a status mark in it:** a dot or a shape in the status color. No fill changes.
- **D. Only the failures stand out:** OK is a plain cell in the line color; Warning is the same cell with a slash in the warning color; Error is filled in the error color, with a cross in the page color.

### The marks

Every option needs a sign that is not color. The marks are drawn with 1.5px strokes and round ends, in a square in the middle of the cell. The square is 3px less than the cell's width or height, whichever is smaller, and at most 10px. In the narrowest phone cell (8.3 × 15px) it is 5.3px; in most cells it is 10px.

- **OK: no mark.** OK is the normal case. A mark in 64 of 70 cells would be noise.
- **Warning: one stroke,** a slash from the lower left to the upper right.
- **Error: two strokes,** a cross. It is the slash and one more stroke, so the number of strokes grows with the trouble: none, one, two.
- **No data: no fill,** only a 1px muted outline (section 5).

A dash was the first idea for Warning, but tables use a dash for "nothing here", so a reader could take it for "no data". A check mark for OK was rejected for the reason above. A triangle for Warning does not read at 5.3px with 1.5px strokes: it becomes a dark spot.

### What each option does

| | A. All filled | B. Tint and outline | C. A mark in a gray cell | D. Only failures stand out |
|---|---|---|---|---|
| New tokens | None | 6 tints (3 light, 3 dark) | None | None |
| An Error cell found without searching | Yes, but among many green cells | Weakly: tints are pale | Weakly: a mark of 5 to 10px | Yes: the only filled cells |
| Gray print: OK against Error | 1.5 L\* apart (light) | 1.8 L\* apart | Same cell; the mark tells | 40.7 L\* apart |
| Deuteranopia: OK against Error (ΔE) | 18.6 light, 8.2 dark | 1.3 light, 1.6 dark | Mark against mark: 18.6 and 8.2 | 63.0 light, 74.1 dark |
| Protanopia: OK against Error (ΔE) | 19.2 light, 32.3 dark | 6.0 light, 9.4 dark | 19.2 and 32.3 | 59.5 light, 49.3 dark |
| The weakest mark or fill, non-text contrast | 4.92:1 (cross on green) | 3.74:1 | 3.51:1 (green mark on gray) | 3.70:1 (Error fill against the OK cell) |
| Change to `DESIGN.md` | Large: all three colors fill | Large, and six new tokens | Small | Medium: one color fills one kind of cell |

ΔE is the CIE76 color difference after the simulation: below about 10, two small cells are hard to tell apart; below about 3, they look the same.

### A. Every cell filled in its status color

- **Contrast.** It passes: each fill is 4.92:1 or more against the page, and the cross in the page color is 4.92:1 or more on its fill, in light, dark and paper.
- **Color blindness.** With deuteranopia, the light Warning and Error fills are 11.0 apart, and the dark OK and Error fills 8.2. Only the marks tell those cells apart.
- **Gray print.** Green prints at 53% ink, the warning color at 63% and the error color at 55%. OK and Error are 1.5 L\* apart: the same gray.
- **The page.** Seventy cells of strong green turn a quiet page loud, for the normal case.

**Rejected:** the colors carry no order once hue is gone, and the green fills spend the reader's attention on the cells that need none.

### B. A pale tint and a status outline

- **Contrast.** The outlines pass (3.74:1 or more on the tint), but the tints are all near L\* 87 in light and L\* 17 to 20 in dark.
- **Color blindness and print.** With deuteranopia, the light OK and Error tints are 1.3 apart: the same color. In gray print they are within 3 L\*. The 1.5px outline is most of an 8.3px phone cell.
- **Tokens.** Six new fixed tints, or tints mixed in the browser, which `check` and the contrast test cannot test.

**Rejected:** the tints fail exactly the readers that this kind is for.

### C. A status mark in every gray cell

- **Contrast.** Every mark passes 3:1 on the line color: the weakest is the green mark in light, 3.51:1.
- **The rule.** It barely changes: the status colors stay marks.
- **The cost.** Every cell has the same fill, so a failure is a 5 to 10px mark among others, and the reader must search for it. In gray print the cells are all the same, and only the shape of the mark tells.

**The fallback:** if the color rule must not change at all, C is the honest choice. Its price is that failures do not stand out.

### D. Only the failures stand out

- **Contrast.** The Error fill is 5.18:1 against the page in light, 5.47:1 in dark and 5.36:1 on paper, and 3.70:1 or more against the OK cell. The cross in the page color is 5.18:1, 5.47:1 and 5.36:1 on the fill. The Warning slash is 4.89:1 on the OK cell in light and on paper, and 5.08:1 in dark. Every mark passes the 3:1 that WCAG asks of a graphic.
- **Color blindness.** The OK cell and the Error fill are 49.3 to 74.1 apart under both simulations, because they differ in lightness, not only in hue. The slash is 70 or more from its cell. The slash and the Error fill are 11.0 apart with deuteranopia, but a slash on gray and a filled cell are two different shapes.
- **Gray print.** OK prints at 14% ink and Error at 55%, with a white cross. Warning prints as the OK cell with a dark slash. Three levels, which no fill can lose.
- **Dark mode.** The OK cell is the dark line color (L\* 20.8), and the Error fill is L\* 58.3, so the failure is still the cell that stands out most from the dark page, as the most is in a heat map.
- **The page.** Only the cells that failed have strong color. A grid of 70 cells with 2 Errors shows two red cells and three slashes.
- **Tokens.** None: the cells use the line, warning, error, page and muted colors, which the kit already sets in its four places (light, dark by the system, dark by the switch, and print). A host cannot set them.

### Recommendation: D

D is the only option where the failures stand out in color, in gray print and for readers with red-green color blindness, and it needs no new token. Its cost is a deliberate change to the color rule: the error color fills a cell. And OK is gray, not green. A reader who expects a status page will see fewer colors than they are used to; the legend names each state, and the table in words says each one.

**The risk:** the light-mode warning color (`#7d4e00`) is a dark brown, chosen for text. As a slash on gray it reads well (4.89:1), but it is less bright than the amber that readers expect. It is never a fill in D, which avoids the worse problem: a brown Warning fill would print darker than the red Error fill (63% against 55% ink).

### The change to `DESIGN.md`

No token is added.

**In Colors, the bullet Status,** at the end:

> In a status grid, each cell shows its state: an OK cell is filled in the outline color with no mark, a Warning cell is the same cell with a slash in the warning color, and an Error cell is filled in the error color with a cross in the page color. This is the one place where a status color fills a shape. Success green is not used there, because OK is the normal case and only failures should stand out. The mark and the lightness tell the states apart without color.

**In Colors, the paragraph Diagrams,** the sentence "Two other colors can appear in a diagram: a status color, on the outline of a part that carries a state (see Status above), and the heat steps, in the cells of a heat map (see Heat steps above)." becomes:

> Other colors can appear in a diagram only in three places: a status color, on the outline of a part that carries a state; the warning and error colors, in the cells of a status grid (see Status above); and the heat steps, in the cells of a heat map (see Heat steps above).

**In Colors, the paragraph Contrast,** at the end:

> The cells of a status grid: the Error fill 5.18 against the page in light, 5.47 in dark and 5.36 on paper, and its cross the same on the fill; the Warning slash 4.89 on the OK cell in light and on paper, and 5.08 in dark.

**In Layout,** a new paragraph after **Heat maps**:

> **Status grids.** A status grid shows the state of each pair of a row and a column, such as the uptime of each part of a service by day. It has the heat map's grid, column labels, forms and table in words. Each cell takes its state from the author's thresholds, or from the data: OK, a plain cell in the outline color; Warning, the same cell with a slash in the warning color; Error, a cell filled in the error color with a cross in the page color. The marks are 1.5px strokes with round ends, in a square 3px smaller than the cell and at most 10px. A cell with no data is hollow, as in a heat map. A legend above the grid shows each state as a small cell with its mark, its name and its threshold. Cells never show numbers. A long strip of one thing, such as 90 days of one service, is drawn as a calendar, with weekdays as rows and weeks as columns. Its states and numbers are also written as a table under the drawing.

**In Do's and Don'ts,** the line "Don't use green, amber or red for anything except status. They mean the same thing inside the diagrams." gains one clause, and one line follows it:

> - Don't use green, amber or red for anything except status. They mean the same thing inside the diagrams, and only the error color fills a shape: an Error cell of a status grid.
> - Don't use a status grid for an amount. Thresholds hide the differences inside a state; a heat map shows them.

---

## 5. No data

A cell with no data is **hollow, as in the heat map**: no fill, the band inside a 1px outline in the muted color. No reason was found to change it, and one reason to keep it: a reader who learns the hollow cell in one kind reads it the same way in the other.

The outline stands at 6.30:1 against the page (6.65:1 in dark, 6.51:1 on paper) and at 4.49:1 against the OK cell (4.65:1 in dark). A hollow cell is a ring; an OK cell is solid. The two differ by shape, also at 8.3px and in gray print.

"No data" is not a state. A monitor that was off is not the same as a service that was down, and the reader should not count it as either. The table says "no data" for each such cell, and the lines under it count them.

---

## 6. The forms

**Everything that is not about color is the heat map's,** and the code is shared (section 10):

- 640px on a desktop and on paper, with the row names in a column at the left; 264px on a phone, where each row name stands on its own line above its row of cells, and the columns still line up.
- Columns share the grid's width equally. Cells are 2px apart, or 1px when they are narrower than 16px, with corners of 2px. Rows are 24px high on a desktop; on a phone a row of cells is 16px high.
- Column labels: every label on one line, then on two lines, then every second, third, fourth, sixth or twelfth label, never fewer than three, then a refusal that names the widest label.
- Row names are 14px, weight 400, in the text color. A long name wraps on a phone.
- No dot, no walkthrough, no part state, nothing dashed, no icons, no grid lines, and nothing moves.

**What differs from the heat map:**

- **No numbers in the cells.** In a heat map a number in the cell helps because a step holds a wide range. In a status grid the state is the answer, and the mark fills the cell. A percentage like "99.95" needs 35.7px and the mark 10px more, so numbers would fit only in grids of about 8 columns or fewer on a desktop, and never on a phone. The table in words gives every number.
- **The legend** is a row of keys, not a row of steps (section 7).
- **One row is allowed.**

---

## 7. The legend, the table in words, and the lines under it

### The legend

The legend stands above the grid, at the left, as in the heat map. Each key is a small cell, 16 × 12px, drawn exactly as a cell of its state with its mark, then 6px, then the words at 12px in the muted color. Keys stand 16px apart.

- With thresholds, the words are the name and its range: "OK: 99.9% or more", "Warning: 99% to below 99.9%", "Error: below 99%". When lower is better: "OK: 1% or less", "Warning: above 1% to 5%", "Error: above 5%". Without `warn`, the Error key says "below 99.9%" or "above 1%".
- With states written directly, the words are the names alone: "Passed", "Failed".
- The legend shows every state that the data can take: with thresholds, the 2 or 3 states they define, also when no cell is in one (a legend with an Error key and no red cell says "nothing failed"); with states written directly, OK and Error, and Warning when a cell has it. When a cell has no data, a hollow key "No data" follows.
- Keys flow into lines: a key that does not fit on the line goes to the next line, from the left. A key wider than the whole line wraps its words at their spaces onto a second line, as a row name does on a phone. So the legend is never refused. For the uptime example, the legend is one line of 570px on a desktop and three lines on a phone.

### The table in words

A table in the closed section under the drawing, with the same rows and columns as the drawing, as for the heat map. Each cell holds:

- with thresholds: its number, and the state name when the state is not OK, such as "100", "99.4 Warning", "98.6 Error";
- with states written directly: the state name;
- "no data" for a cell with no data.

OK cells carry no word in the numbered form, as they carry no mark in the drawing. The first line under the table says so. This keeps the cells short ("100" is 23.8px; "OK, 100" would be 50px), so fewer tables are needed on paper. A grid too wide for a sheet of paper is split into tables of fewer columns, each with the row names, by the heat map's code; on a narrow screen each table scrolls inside itself.

### The lines under it

Computed from the data. For the uptime example:

> Each number is in %. A cell is OK at 99.9 or more, Warning from 99 to below 99.9, and Error below 99; a value on a threshold takes the better state. A cell with no state word is OK.
>
> 64 cells are OK, 3 are Warning and 2 are Error. 1 cell has no data.
>
> Error: API, 11 (98.6); Search, 11 (97.9).
>
> The worst is 97.9 (Search, 11).

- The first line is there only with thresholds. It names the unit as written ("Each number is in ms.") and does not guess what is measured; the `label` says that.
- The second line counts each state with its name, and the cells with no data.
- The third line lists each Error cell, when there are 1 to 6, because "when did it fail?" is the reader's question, and a screen reader should not search a table of 91 cells for it. With more than 6: "Error in 14 cells; the table shows each." With none: "No cell is Error."
- The fourth line is there only with thresholds: the lowest value when higher is better, the highest when lower is better. When two or more cells hold it: "The worst is 97.9, in 3 cells", as the heat map writes it.

The `label` stays a one- or two-sentence summary that says when and where things failed, as the example does.

---

## 8. What `render`, `check` and the fit warnings do

**`render`** reads the data, draws both forms, and writes the table in words. It reports how the labels fit, from the heat map's note:

- `render doc.html: diagram 6 ("tracker-uptime") drawn as statusgrid; column labels on two lines on a phone`
- `render doc.html: diagram 7 ("website-13-weeks") drawn as statusgrid; column labels on two lines on a desktop; every 4th column label on a phone`

**The refusals.** The grid's messages are the heat map's, with "a status grid" in place of "a heat map":

- `a status grid sits in the text flow; "place" must be "flow"`
- `a status grid has no "form"; the renderer draws it 640px wide, and 264px wide on a phone`
- `a status grid has no "groups"; each row is one row of cells`
- `a status grid has no "areas"; for the areas of a page, write a plan, and its states in a table`
- `"rows" must be a list of 1 to 12 rows, top to bottom, each with a "name" and its "values"`
- `a status grid has 1 to 12 rows; this one has 14`
- `"columns" must be a list of 3 to 24 labels, one for each column`
- `a status grid has 3 to 24 columns; this one has 31`
- `the label of column 3 is 11 characters long; the most is 10: "Wednesday 2"`
- `the name of row 4 is 23 characters long; the most is 20: "Image upload and resize"`
- `two rows have the name "API"` and `two columns have the label "Mon"`
- `row 3 ("API") has 13 values, and "columns" has 14`
- `the column labels do not fit on a phone, even on two lines or with every 12th label; the widest is "WWWWWWWWWW", 117px. Shorten the labels to about 7 characters, or use fewer columns`

New messages, for the states:

- `a status grid has no "scale"; write "thresholds" with "better", "ok" and "unit", or write each state as "ok", "warn" or "err"`
- `"thresholds" must have "better", "ok" and "unit", and may have "warn"`
- `"better" must be "higher" or "lower"`
- `"ok" in "thresholds" must be a number` (and the same for `"warn"`)
- `with "better": "higher", "ok" must be above "warn"; here "ok" is 99 and "warn" is 99.9. Swap them, or write "better": "lower"`
- `with "better": "lower", "ok" must be below "warn"; here "ok" is 5 and "warn" is 1. Swap them, or write "better": "higher"`
- `"ok" and "warn" are both 99.9; for two states, leave out "warn"`
- `the unit of the thresholds is 14 characters long; the most is 12: "ms per request"` (the message of `words`)
- `row 2 ("Sign-in") has the value "ok" in column "11"; with "thresholds" a value is a number, or null for no data`
- `row 2 ("Sign-in") has the value 99.4 in column "11"; without "thresholds" a value is "ok", "warn" or "err", or null for no data`
- `row 2 ("Sign-in") has the value "fail" in column "11"; a state is "ok", "warn" or "err", or null for no data`
- `"names" may name "ok", "warn" and "err"; "down" is not a state`
- `the name of the state "err" is 14 characters long; the most is 12: "Out of service"`
- `two states have the name "Down"`
- `every cell has no data; a status grid needs at least one state`

**`check`** tests what it tests for every kind: the drawing is the one that `render` makes from the data, in both forms; the table in words matches the data; the data passes every rule above. No token is new, so the list of kit tokens that a style must not set does not change.

**Fit warnings,** in `fit.cjs`. They never change the drawing:

- `every cell is "OK"; a sentence says this more simply, such as "every part was up every day"` (with the author's name for the state; the same for any one state: `every cell is "Error"; a sentence says this more simply`)
- `the status grid has 9 cells; a table with a state column says this more simply` (fewer than 12 cells)
- `47 of 72 cells are Warning or Error; check the thresholds, or use a heat map when the question is how much, not which cells failed` (only with thresholds, when more than half of the cells with a number are not OK: either a threshold is wrong, or the data is an amount)
- `40 of 72 cells have no data; a table of the cells that have data may say this better` (more than half)
- `only every 3rd column label fits on a desktop; when the columns are names, not a series such as days, turn the grid so that the names are rows` (the heat map's warning)

---

## 9. Worked examples

### The uptime of a bug tracker's parts by day

The data is in section 2: 5 rows, 14 columns, three states.

| | Desktop and paper | Phone |
|---|---|---|
| Grid | 114px to 620px, 506px (after "Email alerts", 78px) | 20px to 244px, 224px |
| Each column | 36.1px; cell 34.1 × 22px, 2px apart | 16px; cell 15 × 15px, 1px apart |
| Marks | 10px | 10px |
| Column labels | Every day | Two lines: "10" to "16" need 19.8px, more than 16px |
| Legend | One line of 570px | Three lines: "OK"; "Warning"; "Error" and "No data" |
| Height | About 220px | About 350px |

The cells: 64 OK, 3 Warning (Sign-in on 11, API on 12, Email alerts on 6), 2 Error (API and Search on 11), and 1 with no data (Email alerts on 14). On the drawing, the column for 11 November holds the two red cells and one slash, so the incident shows as one column.

### One service over 13 weeks, as a calendar

The bug tracker's website over the 13 weeks from 24 August to 22 November (91 days). The weekdays are the rows, and the weeks are the columns, named by their week numbers (weeks 35 to 47).

```json
{
  "id": "website-13-weeks",
  "kind": "statusgrid",
  "label": "Uptime of the bug tracker's website over 13 weeks, weeks 35 to 47, from 24 August to 22 November. It was down on Friday 4 September and on Tuesday 13 October, and slow on three other days. Weekends were always OK.",
  "thresholds": {"better": "higher", "ok": 99.9, "warn": 99, "unit": "%"},
  "columns": ["Week 35", "Week 36", "Week 37", "Week 38", "Week 39", "Week 40", "Week 41", "Week 42", "Week 43", "Week 44", "Week 45", "Week 46", "Week 47"],
  "rows": [
    {"name": "Monday",    "values": [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 99.3]},
    {"name": "Tuesday",   "values": [100, 100, 100, 100, 100, 100, 100, 98.2, 100, 100, 100, 100, 100]},
    {"name": "Wednesday", "values": [100, 100, 100, 99.5, 100, 100, 100, 100, 100, 100, 100, 100, 100]},
    {"name": "Thursday",  "values": [100, 100, 100, 100, 100, 100, 100, 99.8, 100, 100, 100, 100, 100]},
    {"name": "Friday",    "values": [100, 97.4, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]},
    {"name": "Saturday",  "values": [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]},
    {"name": "Sunday",    "values": [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]}
  ]
}
```

| | Desktop and paper | Phone |
|---|---|---|
| Grid | 114px to 620px, 506px (after "Wednesday", 78px) | 20px to 244px, 224px |
| Each column | 38.9px; cell 36.9 × 22px | 17.2px; cell 16.2 × 15px |
| Marks | 10px | 10px |
| Column labels | Two lines: "Week 35" needs 51.8px, more than 38.9px | Every fourth week: weeks 35, 39, 43 and 47 |
| Legend | One line of 486px (no "No data" key) | Three lines |
| Height | About 284px | About 414px |

The cells: 86 OK, 3 Warning, 2 Error. The lines under the table say: "Error: Friday, Week 36 (97.4); Tuesday, Week 42 (98.2)." and "The worst is 97.4 (Friday, Week 36)." A cell is named by its row and its column, as in the heat map. So the columns are week numbers and not the date of each Monday: "Friday, Aug 31" would read as a date, and 31 August is a Monday. The `label` gives the real dates. Decision 6 weighs this cost.

The data must be whole weeks. "The last 90 days" up to a Wednesday would leave days in the last column that have not happened, and `null` would draw them as "no data", which is not true. So the calendar ends with the last whole week, and the label says so. Decision 6.

### Nightly builds, with states written directly

```json
{
  "id": "nightly-builds",
  "kind": "statusgrid",
  "label": "Nightly builds of four projects in the week of 16 November. The mobile app failed on Tuesday and Wednesday; every other build passed.",
  "names": {"ok": "Passed", "err": "Failed"},
  "columns": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "rows": [
    {"name": "Server",     "values": ["ok", "ok", "ok", "ok", "ok", "ok", "ok"]},
    {"name": "Web app",    "values": ["ok", "ok", "ok", "ok", "ok", "ok", "ok"]},
    {"name": "Mobile app", "values": ["ok", "err", "err", "ok", "ok", "ok", "ok"]},
    {"name": "Docs",       "values": ["ok", "ok", "ok", "ok", "ok", "ok", null]}
  ]
}
```

The legend has three keys, "Passed", "Failed" and "No data", 221px in one line on both forms. The table gives "Passed" or "Failed" in each cell. The lines under it say: "25 cells are Passed and 2 are Failed. 1 cell has no data." and "Failed: Mobile app, Tue; Mobile app, Wed."

---

## 10. What it reuses, and what is new

| From | What the status grid reuses |
|---|---|
| `heatmap.cjs` | The checks of `columns` and `rows` (counts, lengths, names that differ, one value for each column, at least one value); `onLines` and `labelsOf` for the column labels; the sizing of both forms (the name column, the pitch, the gap, the phone's name lines, the band); the hollow cell and its `h0` style; `tablesOf` for the paper split, `cellsWith` for "(Search, 11)" and "in 3 cells", and the label half of `scaleNote` |
| `range.cjs` | `wrapName`, for a row name on a phone and for a legend key that is too wide |
| `scale.cjs` | `fmt`, `isNum`, `num` and `valueWidth` |
| `blocks.cjs` | `fail`, `words` and `id` |
| `diagram.cjs` | `renderScaleChart`: the two forms, the swap between them, the table in words and the note. The status grid joins it as a sixth kind. |
| `svg.cjs` | The styles for `row` and `val`, and the `h0` hollow cell. The light values of the line, warning and error colors are already in `LIGHT`. |
| `fit.cjs` | The fit warnings, as five more lines |
| `kit.css` | Nothing: every color it needs is set in its four places already |
| `tests/contrast.py` | Nine more pairs: the Error fill against the page, its cross on it, and the Warning slash on the OK cell, in light, dark and paper |

**New,** in `scripts/lib/statusgrid.cjs`:

- Reading `thresholds` and `names`, and the state of each value.
- The marks: the slash and the cross, and their size.
- The legend of keys, its lines and its wrapped keys.
- The cells of the table in words, and the four lines under it.

**Moved:** the grid parts of `heatmap.cjs` named above go to a shared `scripts/lib/grid.cjs`, which both kinds use. The heat map's expected drawings do not change, and its tests show that.

---

## 11. Phases, and what is out of scope

1. **The status grid.** The shared `grid.cjs`, moved out of `heatmap.cjs` with every heat map test unchanged; `scripts/lib/statusgrid.cjs`; the dispatch in `diagram.cjs`; the styles in `svg.cjs` for the three states and their marks; the fit warnings; the `DESIGN.md` change in section 4; a section "Status grids" in `references/diagrams.md`; a row in the table of reader's questions and a line under "Limits to know" in `SKILL.md`. Tests: the three worked examples as fixtures, with their expected SVG; one test for each refusal; tests for both directions, a value on each threshold, two states, one row, a long key that wraps, every cell OK, and `check` on a drawing edited by hand; the contrast pairs; and a look in print preview and with a color-blindness filter in the browser's tools. Medium.
2. **One status grid on the sample page.** The sample page shows every rule, and its topic is "Report a bug". Figure 6, in "Triage results" after the heat map, shows the uptime of the bug tracker's parts over two weeks (the first worked example), with a status note: a report filed while the API was down may be lost, so check that it arrived. Small.

**Out of scope:**

- A green-to-red heat map, or any heat map with status colors.
- Numbers in the cells (section 6), until a real report needs them.
- Dates in the data, and a renderer that folds a strip of days into weeks (Decision 6).
- A cell for "outside the period", drawn as no cell at all, until a real report needs a calendar that is not whole weeks.
- More than three states, or states the author defines. The three states are Docent's states everywhere.
- A tooltip or hover for each cell. The page works without scripts, and the table in words holds every value.
- Route maps, and the heat plan, which have their own items.

---

## Measured

The colors come from a script with the WCAG formula for contrast, the CIELAB formula for lightness, the CIE76 formula for color difference (ΔE), and the color-blindness simulation of Machado, Oliveira and Fernandes (2009) at full strength, applied in linear RGB. Gray print is taken as 100 minus L\*, so the tint drops out. The sizes come from Docent's own text measure (`textWidth` in `scripts/lib/text.cjs` and `valueWidth` in `scripts/lib/scale.cjs`), and the grid, the pitch and the column labels come from the heat map's own `drawHeatmap`, given the same rows and columns. The scripts are in the shared notes folder of this work and are not part of the kit. Their output:

```text
== the status colors in CIELAB, and as gray print (ink = 100 - L*)
   light ok   #1a7f37 L* 46.5 a -44.2 b  31.0 | vs page  4.92:1 | gray ink   53%
   light warn #7d4e00 L* 37.5 a  14.4 b  46.5 | vs page  6.86:1 | gray ink   63%
   light err  #cf222e L* 45.1 a  64.5 b  38.9 | vs page  5.18:1 | gray ink   55%
   light line #d3d6e3 L* 85.7 a   1.4 b  -6.7 | vs page  1.40:1 | gray ink   14%
   dark  ok   #3fb950 L* 66.8 a -55.3 b  43.0 | vs page  7.22:1 | gray ink   33%
   dark  warn #d29922 L* 67.0 a  11.5 b  64.7 | vs page  7.26:1 | gray ink   33%
   dark  err  #f85149 L* 58.3 a  63.0 b  40.7 | vs page  5.47:1 | gray ink   42%
   dark  line #2d3146 L* 20.8 a   4.2 b -13.6 | vs page  1.43:1 | gray ink   79%

== option A: every cell filled in its status color; the mark in the page color
  light
   ok   fill #1a7f37 vs page  4.92:1 | mark (page color) on fill  4.92:1 | number (page color)  4.92:1 ok
   warn fill #7d4e00 vs page  6.86:1 | mark (page color) on fill  6.86:1 | number (page color)  6.86:1 ok
   err  fill #cf222e vs page  5.18:1 | mark (page color) on fill  5.18:1 | number (page color)  5.18:1 ok
   pairs, as the reader sees each fill:
      normal ok L*46.5 warn L*37.5 err L*45.1 | ok-warn dE  61.3, ok-err dE 109.0, warn-err dE  51.3
      protan ok L*48.3 warn L*34.8 err L*35.3 | ok-warn dE  14.3, ok-err dE  19.2, warn-err dE  18.9
      deutan ok L*45.1 warn L*39.3 err L*50.3 | ok-warn dE  19.6, ok-err dE  18.6, warn-err dE  11.0
      gray   ok-warn dL*  9.0, ok-err dL*  1.5, warn-err dL*  7.6
  dark
   ok   fill #3fb950 vs page  7.22:1 | mark (page color) on fill  7.22:1 | number (page color)  7.22:1 ok
   warn fill #d29922 vs page  7.26:1 | mark (page color) on fill  7.26:1 | number (page color)  7.26:1 ok
   err  fill #f85149 vs page  5.47:1 | mark (page color) on fill  5.47:1 | number (page color)  5.47:1 ok
   pairs, as the reader sees each fill:
      normal ok L*66.8 warn L*67.0 err L*58.3 | ok-warn dE  70.2, ok-err dE 118.5, warn-err dE  57.4
      protan ok L*69.1 warn L*63.8 err L*49.2 | ok-warn dE  16.0, ok-err dE  32.3, warn-err dE  43.1
      deutan ok L*65.0 warn L*69.0 err L*63.4 | ok-warn dE  25.8, ok-err dE   8.2, warn-err dE  18.4
      gray   ok-warn dL*  0.2, ok-err dL*  8.4, warn-err dL*  8.6
  paper
   ok   fill #1a7f37 vs page  5.08:1 | mark (page color) on fill  5.08:1 | number (page color)  5.08:1 ok
   warn fill #7d4e00 vs page  7.09:1 | mark (page color) on fill  7.09:1 | number (page color)  7.09:1 ok
   err  fill #cf222e vs page  5.36:1 | mark (page color) on fill  5.36:1 | number (page color)  5.36:1 ok
   (pairs as in light)

== option B: a pale tint (20% of the status color over the page) and a 1.5px outline in the status color
  light: tints ok #cee2d6 L*88.1, warn #e2d8cb L*86.8, err #f2d0d4 L*86.4
   ok   tint vs page 1.31:1 | outline vs tint 3.74:1 | mark (status color) on tint 3.74:1
   warn tint vs page 1.36:1 | outline vs tint 5.04:1 | mark (status color) on tint 5.04:1
   err  tint vs page 1.38:1 | outline vs tint 3.76:1 | mark (status color) on tint 3.76:1
   pairs of the tints:
      normal ok L*88.1 warn L*86.8 err L*86.4 | ok-warn dE  11.0, ok-err dE  21.5, warn-err dE  12.4
      protan ok L*88.8 warn L*86.3 err L*85.2 | ok-warn dE   3.3, ok-err dE   6.0, warn-err dE   7.0
      deutan ok L*87.8 warn L*87.1 err L*87.0 | ok-warn dE   5.4, ok-err dE   1.3, warn-err dE   4.3
      gray   ok-warn dL*  1.3, ok-err dL*  1.8, warn-err dL*  0.4
  dark: tints ok #1b3529 L*19.8, warn #382f20 L*20.0, err #402027 L*16.8
   ok   tint vs page 1.39:1 | outline vs tint 5.21:1 | mark (status color) on tint 5.21:1
   warn tint vs page 1.39:1 | outline vs tint 5.21:1 | mark (status color) on tint 5.21:1
   err  tint vs page 1.27:1 | outline vs tint 4.31:1 | mark (status color) on tint 4.31:1
   pairs of the tints:
      normal ok L*19.8 warn L*20.0 err L*16.8 | ok-warn dE  16.3, ok-err dE  30.1, warn-err dE  17.8
      protan ok L*20.7 warn L*19.4 err L*15.1 | ok-warn dE   4.5, ok-err dE   9.4, warn-err dE  12.6
      deutan ok L*19.3 warn L*20.3 err L*17.9 | ok-warn dE   8.2, ok-err dE   1.6, warn-err dE   7.8
      gray   ok-warn dL*  0.2, ok-err dL*  3.0, warn-err dL*  3.1

== option C: every cell in the line color; the state is a mark in its status color
  light: cell #d3d6e3 vs page 1.40:1
   ok   mark #1a7f37 on the cell 3.51:1 ok (non-text, needs 3:1)
   warn mark #7d4e00 on the cell 4.89:1 ok (non-text, needs 3:1)
   err  mark #cf222e on the cell 3.70:1 ok (non-text, needs 3:1)
   (pairs of the marks as in option A, light)
  dark: cell #2d3146 vs page 1.43:1
   ok   mark #3fb950 on the cell 5.04:1 ok (non-text, needs 3:1)
   warn mark #d29922 on the cell 5.08:1 ok (non-text, needs 3:1)
   err  mark #f85149 on the cell 3.82:1 ok (non-text, needs 3:1)
   (pairs of the marks as in option A, dark)
  paper: cell #d3d6e3 vs page 1.45:1, marks as in light

== option D: only the failures stand out. OK: the line color, no mark. Warning: the line color and a slash in the warning color. Error: filled in the error color, a cross in the page color
  light
   ok   cell #d3d6e3 vs page 1.40:1 | number (text color) on it 11.28:1
   warn cell #d3d6e3, slash #7d4e00 on it 4.89:1 | number (text color) on it 11.28:1
   err  fill #cf222e vs page 5.18:1, vs the OK cell 3.70:1 | cross (page color) on it 5.18:1 | number (page color) 5.18:1 ok
   no data: muted outline #575d75 vs page 6.30:1, vs the OK cell 4.49:1
   pairs of the cell grounds (ok and warn share one; the slash tells them apart):
      normal ok L*85.7 err L*45.1 | ok-err dE  87.9
      protan ok L*86.0 err L*35.3 | ok-err dE  59.5
      deutan ok L*85.7 err L*50.3 | ok-err dE  63.0
      gray   ok-err dL* 40.7
   the warning slash against its cell, and the error fill:
      normal cell L*85.7 slash L*37.5 err L*45.1 | cell-slash dE  73.0, cell-err dE  87.9, slash-err dE  51.3
      protan cell L*86.0 slash L*34.8 err L*35.3 | cell-slash dE  71.5, cell-err dE  59.5, slash-err dE  18.9
      deutan cell L*85.7 slash L*39.3 err L*50.3 | cell-slash dE  70.3, cell-err dE  63.0, slash-err dE  11.0
      gray   cell-slash dL* 48.3, cell-err dL* 40.7, slash-err dL*  7.6
  dark
   ok   cell #2d3146 vs page 1.43:1 | number (text color) on it 10.58:1
   warn cell #2d3146, slash #d29922 on it 5.08:1 | number (text color) on it 10.58:1
   err  fill #f85149 vs page 5.47:1, vs the OK cell 3.82:1 | cross (page color) on it 5.47:1 | number (page color) 5.47:1 ok
   no data: muted outline #959bb3 vs page 6.65:1, vs the OK cell 4.65:1
   pairs of the cell grounds (ok and warn share one; the slash tells them apart):
      normal ok L*20.8 err L*58.3 | ok-err dE  88.4
      protan ok L*21.3 err L*49.2 | ok-err dE  49.3
      deutan ok L*20.4 err L*63.4 | ok-err dE  74.1
      gray   ok-err dL* 37.5
   the warning slash against its cell, and the error fill:
      normal cell L*20.8 slash L*67.0 err L*58.3 | cell-slash dE  91.2, cell-err dE  88.4, slash-err dE  57.4
      protan cell L*21.3 slash L*63.8 err L*49.2 | cell-slash dE  91.6, cell-err dE  49.3, slash-err dE  43.1
      deutan cell L*20.4 slash L*69.0 err L*63.4 | cell-slash dE  91.7, cell-err dE  74.1, slash-err dE  18.4
      gray   cell-slash dL* 46.2, cell-err dL* 37.5, slash-err dL*  8.6
  paper
   ok   cell #d3d6e3 vs page 1.45:1 | number (text color) on it 11.28:1
   warn cell #d3d6e3, slash #7d4e00 on it 4.89:1 | number (text color) on it 11.28:1
   err  fill #cf222e vs page 5.36:1, vs the OK cell 3.70:1 | cross (page color) on it 5.36:1 | number (page color) 5.36:1 ok
   no data: muted outline #575d75 vs page 6.51:1, vs the OK cell 4.49:1
   (pairs as in light)

== option D with the warning cell filled too (D2): warn fill vs err fill
   light:
      gray   ok-warn dL* 48.3, ok-err dL* 40.7, warn-err dL*  7.6
   dark:
      gray   ok-warn dL* 46.2, ok-err dL* 37.5, warn-err dL*  8.6
```

The sizes:

```text
uptime by part desktop: grid 114..620 (506px), 14 columns, pitch 36.1px, gap 2, cell 34.1 x 22px, mark 10px; widest number 35.7px -> numbers in cells: no; column labels: every label; legend 570px in 1 line(s); about 220px tall
uptime by part phone  : grid 20..244 (224px), 14 columns, pitch 16px, gap 1, cell 15 x 15px, mark 10px; widest number 35.7px -> numbers in cells: no; column labels: two lines; legend 570px in 3 line(s); about 350px tall
   states: {"ok":64,"warn":3,"err":2,"none":1} | worst: 97.9
   warn Sign-in, 11: 99.4
   err API, 11: 98.6
   warn API, 12: 99.7
   warn Email alerts, 6: 99.6
   none Email alerts, 14: null
   err Search, 11: 97.9
13 weeks, calendar desktop: grid 114..620 (506px), 13 columns, pitch 38.9px, gap 2, cell 36.9 x 22px, mark 10px; widest number 27.8px -> numbers in cells: no; column labels: two lines; legend 486px in 1 line(s); about 284px tall
13 weeks, calendar phone  : grid 20..244 (224px), 13 columns, pitch 17.2px, gap 1, cell 16.2 x 15px, mark 10px; widest number 27.8px -> numbers in cells: no; column labels: every 4; legend 486px in 3 line(s); about 414px tall
   states: {"ok":86,"warn":3,"err":2} | worst: 97.4
   one strip of 91 days, desktop: pitch 5.7px
   one strip of 91 days, phone: pitch 2.5px
   one row of 24 cells on a phone: pitch 9.3px, cell 8.3px, mark 5.3px
legend lower is better, 640px: keys 109, 173, 117; 431px; 1 line(s)
legend lower is better, 264px: keys 109, 173, 117; 431px; 3 line(s)
legend states only, own names, 640px: keys 64, 57, 68; 221px; 1 line(s)
legend states only, own names, 264px: keys 64, 57, 68; 221px; 1 line(s)
key widths ex1: 134, 197, 123, 68
longest key widths: 411, 611, 400 | phone room 232px
a long real key: 371
12-char names: 'Image upload'  92 | 'Email alerts' 78
words cells: 'Error, 97.9%' 78 | 'Warning, 99.95%' 105 | 'OK, 100%' 63
```

The "numbers in cells" lines test a mark of 10px, 4px, the number and 8px against the cell's width; they show why section 6 leaves numbers out. The longest keys allowed (411px to 611px) are wider than a phone's 232px, so a key wraps instead of being refused (section 7). The heights follow the heat map's layout with this legend, and are estimates until item 1 draws the forms.

---

## Decisions

Decided on 2026-11-23, so that the work can go on while the user is away. Each choice puts the report reader first: the failures found without searching, the states readable without color, and the page working on a phone, on paper and with a screen reader. Each one can be changed in review, because no code exists yet.

1. **The look: D, only the failures stand out.** OK is a plain gray cell, Warning a gray cell with a slash, Error a red cell with a cross, and no data a hollow cell. It is the only option where OK and Error stay far apart in gray print (40.7 L\*) and for readers with deuteranopia (ΔE 63.0 in light, 74.1 in dark), and it needs no new token. **This differs from the agreed direction in one point, and the user should confirm it:** an OK cell is gray, not green. Green fills would make most cells loud, and green and red print as the same gray. If the user wants green OK cells, option A is the way, and its marks must then carry the states alone in print. If the color rule must not change at all, option C is the fallback.
2. **The name: `"statusgrid"`.** One word, like `"heatmap"`. `"status"` collides with the status note and the `state` field; `"uptime"` fits only one kind of data.
3. **The data: numbers with thresholds, or states written directly, one way per grid.** Builds and checks have no number; uptime and error rates do. A mixed grid is refused, so the reader can trust that every state came the same way.
4. **The edges: a value on a threshold takes the better state.** Targets are written "at least" or "at most", so meeting one exactly is meeting it.
5. **The direction: `better` is written, not read from the order of the thresholds.** A swap of `ok` and `warn` is then refused with a message, instead of turning every good day red.
6. **A long strip: written as a calendar of whole weeks.** The author folds the days into weekdays and weeks; the renderer reads no dates. Dates would bring time zones, partial weeks and a new kind of empty cell into the renderer, for a fold that a short script does. A calendar that ends in the middle of a week waits for a real report; then a value for "outside the period", drawn as no cell, can come without breaking any data. The cost is in the words: a cell is named by its row and column, so the reader of the lines under the table sees "Friday, Week 36", not "Friday 4 September". **The user may prefer the renderer to fold a list of days and name each cell by its date**; it is the second point to confirm.
7. **No numbers in the cells.** They would fit only in grids of about 8 columns on a desktop and never on a phone, and the mark is the cell's message. The table in words gives every number.
8. **The state names: "OK", "Warning" and "Error" by default, and the author may rename them.** "Up", "Degraded" and "Down" read better for uptime, and "Passed" and "Failed" for builds. The colors and marks never change with the names.
9. **No data: hollow, as in the heat map.** A reader learns one sign for both kinds.
10. **The legend is never refused.** Keys flow into lines, and a key wider than a line wraps its words.
11. **One row is allowed.** A strip of one service over a day or two weeks is a real report.

## Not in this proposal

- Code. Item 1 comes in its own pull request.
- A change to the heat map's look or data. Only its code is shared.
- Any color other than the line, warning, error, page and muted colors. A status grid has no field for a color.
