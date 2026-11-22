# Proposal: the plan — boxes placed on both axes

Status: **approved on 2026-11-22**, with the recommended answer to each open decision (see "Decided" near the end). No code is written yet. The approved proposal [`scale-charts.md`](scale-charts.md) left this kind out ("It needs its own proposal, with its own phone form"). This is that proposal.

## The answer first

Build one new kind, `"kind": "plan"`. A plan shows where the parts of a page or a screen sit: what is at the top, what is on the left, and what stands next to what. The author writes it as a **grid of named areas**, in the form that CSS uses for `grid-template-areas`. Column widths are optional numbers; row heights are never drawn to scale.

The phone form is the most difficult part. A plan cannot become one strip, because "next to" and "above" are the whole message. The recommendation is to **draw the same grid again at 264px, and let a narrow column grow until its names fit**. When a column had to grow, the drawing says "not to scale", and the real widths stay written above the columns. When even that cannot fit, `render` refuses and names the column. A second phone form, a stack of boxes with a small map beside each, waits until a real page needs it.

| # | Pull request | Size |
|---|---|---|
| 1 | The plan kind: data, both forms, the table in words, the fit warnings, the docs | Medium |
| 2 | One plan on a real page, so the kind is tested in a document | Small |
| 3 | Only if a real page is refused on a phone: the stack form as a fallback | Medium |

## The obvious answers that would be wrong

**Free positions on two scales (x, y, width and height for each box), as a design tool works.** It looks the most general. But it gives the renderer no structure: it cannot tell rows from columns, so it has no order for a phone and no words for "left" or "top". It also makes small errors easy. An author writes 239 for one edge and 240 for the next, and the drawing shows a 1px gap that means nothing. Section 2 compares the two models in a table.

**Let the desktop drawing scroll, or shrink it, on a phone.** Docent never shrinks a drawing on a screen, and a scale chart never scrolls. A plan that scrolls shows its left part first, and that part looks complete.

---

## 1. The reader's question

**The question:** *Where does each part of this page or screen sit, and what is next to what?* For example: on a documentation page, where are the navigation, the text and the "On this page" list? Or: in an editor, where is the list of files, and where does the output appear?

When the widths are known, the plan also answers *how wide is each column?* It writes each width as a number above its column.

**Use it when** a page or screen has 2 to 8 parts, in rows and columns, and the reader needs the picture to find them.

**Do not use it** in these cases:

| The reader needs | Use |
|---|---|
| Parts along one width only, or exact positions and gaps, or several layouts compared row by row | A layout to scale (`"kind": "layout"`) |
| Several facts about each part, or more than 8 parts | A table |
| What happens in order, or what moves from one part to another | A workflow (no `"kind"`) |
| Which part calls or depends on which | A component or deployment diagram. A plan has no lines between boxes. |
| Two parts only ("the menu is on the left of the text") | A sentence |

## 2. The data

### Grid or free positions

| | A grid of named areas | Free positions on two scales |
|---|---|---|
| What the author writes | Rows of area names, and optional column widths | x, y, width and height for each box |
| Overlaps | Cannot happen: each cell holds one name | Possible; `check` must test every pair of boxes |
| Edges that should meet | Always meet, because they share a grid line | Can miss by 1px, and the drawing shows the miss |
| An order for the phone and for the words | Row by row, left to right | None in general. Some free layouts cannot be cut into rows at all. |
| Words such as "left" and "top" | Come from the row and column numbers | Must be guessed from coordinates |
| Known to authors | CSS `grid-template-areas`, print columns, app shells | Design tools |
| What it cannot draw | Overlapping boxes (a dialog over a page), shapes that are not on a grid | Nothing |

**Decision: the grid.** The phone form needs rows and columns, and only the grid gives them for sure. What the grid cannot draw (a dialog over the page, a floating button) is out of scope anyway: a plan shows where parts sit, not what covers what.

The template form is the right grid form. The other grid form, a row, a column and two spans for each box, needs an overlap check, and it is harder to read. The template is a small picture of the plan in the data itself.

### The fields

The first worked example: a documentation page, 1440px wide.

```json
{
  "id": "docs-page",
  "kind": "plan",
  "label": "A documentation page 1440px wide. A header runs across the top and a footer across the bottom. Between them, the navigation is on the left, the text in the middle, and an 'On this page' list on the right.",
  "unit": "px",
  "columns": [240, 960, 240],
  "areas": [
    "header header  header",
    "nav    text    toc",
    "footer footer  footer"
  ],
  "boxes": [
    {"id": "header", "name": "Header"},
    {"id": "nav", "name": "Navigation"},
    {"id": "text", "name": "Text"},
    {"id": "toc", "name": "On this page"},
    {"id": "footer", "name": "Footer"}
  ]
}
```

The second worked example: an editor screen, where the list of files spans two rows.

```json
{
  "id": "editor-screen",
  "kind": "plan",
  "label": "An editor screen 1440px wide. A toolbar runs across the top and a status bar across the bottom. The list of files fills the left side between them. The editor is on the right, with the output under it.",
  "unit": "px",
  "columns": [320, 1120],
  "areas": [
    "toolbar toolbar",
    "files   editor",
    "files   output",
    "status  status"
  ],
  "boxes": [
    {"id": "toolbar", "name": "Toolbar"},
    {"id": "files", "name": "Files"},
    {"id": "editor", "name": "Editor"},
    {"id": "output", "name": "Output", "note": "can be closed"},
    {"id": "status", "name": "Status bar"}
  ]
}
```

| Field | Needed | What it is |
|---|---|---|
| `areas` | yes | 1 to 5 strings, one for each row, top to bottom. Each string has 1 to 4 cells, split by spaces; extra spaces are allowed, so the columns can line up. A cell is a box `id`, or `.` for an empty cell. Every row has the same number of cells. The cells of one box form one rectangle. |
| `boxes` | yes | 2 to 8 boxes. Each has an `id` (as other ids are written) that appears in `areas`, a `name` (at most 20 characters) and, if you want, a `note` (at most 24 characters). The order of this list does not matter: the drawing and the words use the order of `areas`, row by row, left to right. |
| `columns` | no | One width for each column of `areas`, as finite numbers more than 0. With widths, the plan is drawn to scale across, when the names allow it, and each width is written above its column. Without widths, the columns are sized by their names, and the drawing says "not to scale". |
| `unit` | with `columns` | The unit of the widths, at most 12 characters, such as `px` or `mm`. `columns` and `unit` go together: a width needs its unit, and a unit needs widths. |

`id` and `label` are needed, as for every kind. A plan has no `scale`, no ticks and no named marks; section 3 says why. Other fields are ignored, as in the other kinds, with four exceptions that `render` refuses, because an author who knows the layout to scale may write them: `scale`, `rows`, `form`, and a `place` other than `"flow"`.

**Names and notes.** A name sits inside its box at 14px, weight 400. It wraps at its spaces, onto at most three lines of 18px. A note sits under the name at 12px, on at most two lines of 16px. A word never breaks. A name or note written without spaces, as in Thai or Chinese, breaks between characters. When a name or a note needs more lines than that at the width its box gets, `render` refuses the plan and names the box.

**Row heights** are not data. The rows are as tall as their names need, and the words say "the rows are not drawn to scale". When a height matters, write it in the box's `note` ("64px high") and in the `label`.

### The limits

- 1 to 5 rows, 1 to 4 columns, 2 to 8 boxes. A row or a column of empty cells only is refused.
- No box inside a box. To show what is inside "Text", write a second plan for it.
- Box ids are unique. Every box id in `areas` is in `boxes`, and every box in `boxes` is in `areas`.

### The error messages

Each message names the field and says what to change:

- `"areas" must be a list of 1 to 5 strings, one for each row`
- `row 2 of "areas" has 2 cells, and row 1 has 3; every row needs the same number of cells`
- `the box "files" does not form one rectangle in "areas": it takes rows 2 and 3 in column 1, and row 3 in column 2. A box takes a block of whole rows and whole columns`
- `"areas" names "sidebar", which is not in "boxes"`
- `the box "toc" is in "boxes" but not in "areas"`
- `column 3 of "areas" holds only empty cells; remove it`
- `a plan has 2 to 8 boxes; this one has 9`
- `two boxes have the id "nav"`
- `"columns" has 3 widths, and "areas" has 4 columns`
- `width 2 of "columns" is -960; a width is a number more than 0`
- `"columns" and "unit" go together: a width needs its unit, and a unit needs widths`
- `a plan has no "scale"; write the widths of the columns in "columns", and their unit in "unit"`
- `a plan has no "rows"; write each row as a string in "areas"`
- `a plan has no "form"; the renderer draws it 640px wide, and 264px wide on a phone`
- `a plan sits in the text flow; "place" must be "flow"`
- `the name of the box "toc" needs 4 lines in its 53px box on a phone; a name has at most 3. Shorten it`
- `the widths 960 and 24 above columns 2 and 3 need a third line on a phone; widen the narrow column, or write the gap in a note`
- `the plan does not fit a phone: its columns need 311px, and a phone has 240px. The widest names are "Navigation" (column 1) and "Sign-ups" (column 3). Shorten them, or use fewer columns`

The last message is the one an author meets most. It names the columns and the names that set their widths.

---

## 3. The forms

### Rules that both forms keep

- **The three layers.** The well is the ground. The plan is one band in the page color: the page or screen itself. The boxes sit on it. An empty cell shows the band.
- **Every box looks the same,** as in a layout to scale: the page color inside, a text-color outline, corners of 4px. Two boxes that touch in the data stand 4px apart in the drawing (2px from each edge), so each box keeps its own outline.
- **Text at real size.** A box name is 14px, weight 400, at the upper left of its box, 8px from its edges. A note is 12px, muted, under the name. Widths are 12px, muted, with tabular figures.
- **One line above the plan** says how to read it, in 12px muted text: `Widths in px` when the form is to scale, `Widths in px, not to scale` when a column had to grow, and `Not to scale` when the data has no widths.
- **The widths above the columns.** With `columns`, each width is written above the middle of its column, and kept 12px inside the edges of the drawing. When two widths would come closer than 4px, the second goes to a second line, as the measures of a layout do. A third line is refused, with the two widths that meet.
- **No ticks.** The widths above the columns already give every number. On a form that is not to scale, ticks would claim a scale that the drawing does not keep.
- **No dot, no walkthrough, no state, nothing dashed, no icons.** A plan has no order, so nothing moves. Names tell the boxes apart, so no box has a look of its own.

### The sizing rule

The same steps run for both forms. Only the room changes: 616px on a desktop and on paper, and 240px on a phone.

1. **Weights.** Each column's weight is its width in `columns`. With no `columns`, every column has the weight 1.
2. **What each box needs.** A box needs room for its widest piece that cannot break (in its name at 14px or its note at 12px), plus 16px of room and the 4px gap, and at least 40px. In text with spaces, a piece is a word. In text written without spaces, a piece is a run of characters: the name split into three runs of about equal length, because a name has at most three lines, or the note split into two runs, because a note has at most two. The widest run is the piece. For example, a name of 16 Chinese characters needs the width of 6 characters, not 16. The line limits are tested again at the final width, and a box that breaks them is refused, as section 2 says.
3. **Least widths.** Every column starts at a least width of 0. Each box that lies in one column raises that column's least width to what the box needs. Then each box that spans columns, the narrowest spans first, is tested against the sum of its columns' least widths. When the sum is short, the shortfall is added to those columns, in proportion to their weights. Least widths only grow, so at the end every box has what it needs.
4. **Refuse or go on.** When the least widths add up to more than the room, `render` refuses the plan. The message gives the width the columns need, and names the widest names and their columns.
5. **Final widths.** Each column starts at its share of the room by weight. A column below its least width is set to its least width. The other columns become narrower, in proportion to their weights, to make room. This repeats until no column is below its least width. Every final width is at least the least width, so every box keeps what it needs.
6. **To scale or not.** When step 5 changed no column, and the data has widths, the form is to scale.

This rule may refuse a plan that a cleverer split could fit. It never gives a box too little room, and it gives the same result every time.

**Row heights.** A row is at least 40px tall. A box needs 10px above its name, its name lines, its note lines with 2px between, and 10px below. Each box that lies in one row raises that row to what the box needs. Then each box that spans rows, when its rows add up to less than it needs, makes the last of its rows taller.

### Desktop and paper (640px)

The plan uses 616px of the 640px, with 12px at each side. For the documentation page that is 0.43px for each px of the page, and no column has to grow. The columns are about 103px, 411px and 103px. "Navigation" (70px) fits on one line in its 103px box. "On this page" (85px) wraps onto two lines. The form is to scale, and the line above it says `Widths in px`.

For the editor screen the columns are 137px and 479px, also to scale.

### The phone (264px)

The plan uses 240px. A two-dimensional drawing cannot become one strip, as a range chart or a layout to scale does on a phone. Three honest options:

**A. The same grid, sized by the names.** The renderer draws the grid again at 240px with the sizing rule above. The widths stay written above the columns.

- It keeps the picture, and the picture is the reason for the figure.
- When the names allow it, the phone form is to scale too. The editor screen is: 53px and 187px, for 320 and 1120.
- When they do not, the narrow columns grow. On the documentation page "Navigation" needs 90px, but its true share is 40px. The columns become 90px, 97px and 53px. The text column is still the widest, but the ratio is lost. The line above says `Widths in px, not to scale`, and "240", "960" and "240" stay above the columns.
- Its limit is the room. With columns of equal width, the widest word can be about 100px in two columns (about 13 characters), 60px in three (about 8 characters) and 40px in four (about 5 characters). A column with short names gives room to a column with long ones, so many real plans fit beyond these numbers. A four-column dashboard with ordinary names ("Navigation", "Revenue", "Sign-ups", "Open tickets") does not: it needs 311px.

**B. A stack, with a small map beside each box.** Each box becomes a band of its own, in the order of `areas`.

- The text: the box name (14px, weight 600), then its note and its width (12px, muted). The text wraps in the 180px to the right of the map, as a row name wraps on a phone today.
- The map: the whole plan in miniature, 40px wide, at the left of the band. It is to scale across when the data has widths, with each column at least 3px wide so none disappears. With no widths, its columns are equal.
- The highlight: every box in the map has a thin outline, and this band's box is filled in the text color, as a point in a range chart is.

Its trade-offs:

- It fits at any number of columns, because the text runs beside the map and wraps there. Its maps keep the true proportions, except for a column narrower than 3px.
- It loses the whole picture. The reader must build it from five or eight small maps.
- It says nearly what the table in words says. A phone reader can already open that table under every drawing.

**C. Both: A when it fits, B when it does not.** The renderer picks, as it picks the single-track or the column form for a workflow on a phone. `render` says which form it drew.

- The reader gets the best form that fits, every time, and no plan is refused on a phone.
- It is two phone forms to build, to test and to document. The author cannot see in advance which form a phone gets.

**Recommendation: A now, and C only when a real page needs it.** A keeps the picture, and it fits the common plans: the two worked examples, and most pages with two or three columns. B on its own repeats the table in words, which the reader already has. Building B before a page is refused would add code that nothing uses. So item 1 ships A with a clear refusal, and item 3 adds B as the fallback only when a real document meets that refusal. This follows the approved proposal, where "a wider desktop form comes only if a real page needs it".

**The risk:** until item 3, a plan with four columns of ordinary names is refused on a phone, although it fits a desktop. The author can shorten the names, split the plan in two, or use a table. The refusal says which names set the width.

---

## 4. Paper, dark mode, and the diagram in words

**Paper.** The 640px form prints at its real size, as a scale chart does: an A4 figure well holds about 641.6px. The kit also caps a drawing on paper at 220mm (about 831px) tall. A plan stays below that: five rows of the tallest boxes (three name lines and two note lines) and the lines above the plan come to about 620px. The phone form never prints. When the desktop form had to widen a column, the paper shows the same form and the same line, `Widths in px, not to scale`.

**Dark mode.** The plan uses the classes of the layout to scale (`box` for a box, `row` for a box name at 14px and weight 400, `sub` for a note and the line above, `val` for a width) and the page tokens only. It adds no color. One change is needed: `svg.cjs` writes the styles for `box`, `row` and `val` only when the drawing is a layout or a range chart, so the plan joins that list. The contrast tests that cover the layout then cover the plan.

**The diagram in words** is a table in the closed section under the drawing. It lists each box once, in the order of `areas`, and leaves empty cells out. It names places in plain words, by fixed rules:

- A box in one row: `top` for the first row, `bottom` for the last, `middle` for the second of three, and `row 2`, `row 3` or `row 4` otherwise.
- A box in one column: `left`, `right`, `middle` for the second of three, and `column 2` or `column 3` otherwise.
- A box across all rows or all columns: `full height` or `full width`.
- A box across some rows or columns: `rows 2 to 3` or `columns 1 to 2`, always in numbers, so the range is exact.

For the documentation page:

| Box | Row | Column | Width |
|---|---|---|---|
| Header | top | full width | 1440 |
| Navigation | middle | left | 240 |
| Text | middle | middle | 960 |
| On this page | middle | right | 240 |
| Footer | bottom | full width | 1440 |

Under the table, one line gives the unit, and one line says which forms are to scale, from the sizing result of each form: "Widths are in px. The rows are not drawn to scale. On a phone the columns are not drawn to scale either." A plan with no `columns` has no Width column. A box with a note adds a Note column.

The `label` stays a one- or two-sentence summary. It should say the picture in words, as the worked examples do: what runs across the top, and what stands on the left and on the right.

---

## 5. What it reuses, and what is new

The plan draws no scale, so it takes little from `scale.cjs`, and most of its look from `layout.cjs`.

| From | What the plan reuses |
|---|---|
| `scale.cjs` | `valueWidth`, `fmt`, `diff`, `num` and `isNum`, for the widths and their labels |
| `layout.cjs` | The box (`rect`, `rx` 4, class `box`), the refusal of `place` and `form`, `onLines` for widths that meet, and the pattern of `wordsOf`. `onLines` is not exported today; it is exported, or moved to `scale.cjs`. |
| `range.cjs` | `wrapName`, with a change. Today it measures at 14px and weight 600, and it breaks any word that is wider than the room, so "Files" can become "File" and "s". The plan needs 14px, weight 400 for names and 12px for notes, and a break inside a word only for text without spaces. `wrapName` takes the size, the weight and the break rule as arguments, and the range chart and the layout keep their present behaviour. |
| `blocks.cjs` | `fail`, `words` and `id`, for every check of the data |
| `svg.cjs` | The styles for `box`, `row` and `val`. The plan joins the list of forms that get them. |
| `diagram.cjs` | `renderScaleChart`: the two forms, the swap between them, and the table in words. The plan joins it as a third kind, with one change: it passes both drawings to `wordsOf`, so the table can say which forms are to scale. |
| `fit.cjs` | The fit warnings, as three more lines |

**New,** in `scripts/lib/plan.cjs`:

- Reading `areas`: split the cells, check the rows, and test that each box forms one rectangle.
- The sizing rule in section 3, which returns the column widths and whether the form is to scale.
- The rows: their heights, from the names and notes at the final widths.
- The words for a place: `top`, `left`, `full width` and the rest.

`readScale`, `makeScale`, `drawHead` and `drawGrid` are not used, because a plan has no ticks and no named marks.

---

## 6. What `render`, `check` and the fit warnings do

**`render`** reads the data, draws both forms, and writes the table in words. It refuses a plan with any of the errors in section 2, and a plan whose columns cannot fit 240px on a phone or 616px on a desktop. It reports the form, as for the other kinds, and adds which forms are not to scale: `render doc.html: diagram 2 ("docs-page") drawn as plan; not to scale on a phone`. Today `render.cjs` prints only the form, so it gains this short addition, from a flag on each drawing.

**`check`** tests what it tests for every kind:

- The drawing is the one that `render` makes from the data, in both forms, and the table in words matches the data.
- The data passes every rule in section 2.

To show one page on a desktop and on a phone, write two plans in **two figures**, one after the other. Do not put both in one well. `DESIGN.md` allows two drawings in one well only for two separate chains of a workflow, and two 640px plans would stand one below the other anyway. Two figures look the same and need no change to the rule.

**Fit warnings,** as in `fit.cjs`. They never change the drawing:

- `the plan has one row; a layout to scale says this more simply`
- `the plan has one column, so its boxes stand one above another; a list says this more simply`. When this plan shows the phone form of a page, beside a wider plan of the same page, the author keeps it. The warning cannot read the figure's purpose.
- `the plan has 2 boxes; a sentence says where they sit`

---

## 7. Phases, and what is out of scope

1. **The plan kind.** `scripts/lib/plan.cjs`; the dispatch in `diagram.cjs`; the changes to `wrapName`, `onLines`, `svg.cjs` and the `render` message; the fit warnings; a section "Plans" in `references/diagrams.md` and a paragraph in `DESIGN.md`. Tests: the two worked examples as fixtures, with their expected SVG; one test for each error message; and tests for a box that spans rows and columns, a plan with no widths, a plan that is to scale on a phone and one that is not, names that wrap, a name without spaces, and `check` on a drawing that was edited by hand. The range chart and layout tests must still pass after the `wrapName` change. Medium.
2. **One plan on a real page.** The research page [`docs/research/document-layout.html`](../research/document-layout.html) describes a documentation site with the navigation on the left and a contents list on the right. A plan of that layout tests the kind in a real document, with real neighbours. Small.
3. **The stack form as a fallback**, only when a real document is refused on a phone. Medium.

**Out of scope:**

- Free positions, and boxes that overlap: a dialog over the page, a floating button, a tooltip.
- A box inside a box. Write a second plan for the inside.
- Rows to scale, and a `rows` field for heights. A height goes in a note.
- Ticks and named marks. A layout to scale has them.
- Lines or arrows between boxes. A workflow or a component diagram has them.
- Controls inside boxes (buttons, fields, lines of text): a plan is not a wireframe.
- Icons, states, colors, and a look of its own for a box.
- More than 4 columns, 5 rows or 8 boxes.

---

## Measured

The widths above come from Docent's own text measure (`textWidth` in `scripts/lib/text.cjs`), at 14px for names. The script is in the session scratchpad and is not part of the kit. Its output:

```text
== docs page: columns 240 + 960 + 240
   least widths (longest word + 16 + 4, at least 40): 90, 50, 53
 desktop and paper, 616px: to scale, columns 103, 411, 103
 phone, 240px: not to scale, columns 90, 97, 53
== editor screen: columns 320 + 1120
   least widths (longest word + 16 + 4, at least 40): 51, 66
 desktop and paper, 616px: to scale, columns 137, 479
 phone, 240px: to scale, columns 53, 187
== dashboard, 4 columns: columns 360 + 360 + 360 + 360
   least widths (longest word + 16 + 4, at least 40): 90, 78, 79, 64
 desktop and paper, 616px: to scale, columns 154, 154, 154, 154
 phone, 240px: DOES NOT FIT: needs 311px
== longest word that fits, columns of equal width
 desktop and paper, 2 columns: 288px
 desktop and paper, 3 columns: 185px
 desktop and paper, 4 columns: 134px
 phone, 2 columns: 100px
 phone, 3 columns: 60px
 phone, 4 columns: 40px
== sample words at 14px
   Text           30px, 4 characters
   Toolbar        51px, 7 characters
   Contents       60px, 8 characters
   Navigation     70px, 10 characters
   Notifications  83px, 13 characters
```

In the editor screen, "Files" (31px) gets 53px on a phone, to scale. In the documentation page, "On this page" is limited by its widest word, "page" (33px), so its column needs only 53px; the name wraps onto three lines there, and the row grows.

---

## Decided

Approved on 2026-11-22, each with the recommended answer:

1. **The name of the kind.** `"plan"`, as a floor plan shows rooms side by side. It was the other choice for the layout to scale, and it fits two axes better than one. The other choices were `"areas"`, after the field, and `"grid"`, which is close to Docent's card grid and may confuse.
2. **The phone form.** A now, and C when a real page needs it. The other choices were C at once, so no plan is refused on a phone, and B alone, so one phone form always fits.
3. **Row heights.** None in the data for now; a height goes in a note. The other choice was an optional `rows` field, with each height written at the right of its row. It would cost about 32px of the 240px on a phone.
4. **A plan with no widths.** Allowed, so an author never makes up numbers to draw a picture. The drawing then says "not to scale". The other choice was to make `columns` needed, so every plan carries numbers.

## Not in this proposal

- Code. Item 1 comes in its own pull request.
- A change to the layout to scale. It keeps its one axis.
- A responsive plan that changes with the page width. To show a page on a desktop and on a phone, write two plans in two figures.
