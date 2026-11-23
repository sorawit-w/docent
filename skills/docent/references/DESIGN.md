---
version: alpha
name: Docent
description: A quiet design kit for self-contained documents. Ultramarine ink and lamp light on gallery white, serif headings, and one dot that travels along a route.
colors:
  primary: "#2f3fd0"            # Ultramarine — a mark only: links, underlines, the route dot, the focus ring
  secondary: "#1b2260"          # Ink — the title and section headings, as text only
  tertiary: "#f2b824"           # Lamp — a dot only: in the mark, and the route dot in dark mode
  neutral: "#f2f3f9"            # Well — the ground of figures and code, one step darker than the page
  surface: "#fbfbfe"            # Page background; never pure white
  on-surface: "#1c1f2e"         # Body text
  on-surface-muted: "#575d75"   # Notes, captions, secondary text
  outline: "#d3d6e3"            # The few lines: the route, table rules, the line above a margin label
  success: "#1a7f37"
  warning: "#7d4e00"
  error: "#cf222e"
  heat-1: "#c6e9ef"             # Heat steps — the cells of a heat map and the boxes of a heat plan only, from the least (1) to the most (5)
  heat-2: "#86c9d5"
  heat-3: "#3da6b6"
  heat-4: "#00707e"
  heat-5: "#004a53"
  dark-surface: "#12141f"       # Dark page; one step lighter than the dark well
  dark-neutral: "#0b0d15"       # Dark well; one step darker than the dark page
  dark-on-surface: "#e7e9f3"
  dark-on-surface-muted: "#959bb3"
  dark-outline: "#2d3146"
  dark-primary: "#8e9bff"
  dark-success: "#3fb950"
  dark-warning: "#d29922"
  dark-error: "#f85149"
  dark-heat-1: "#093339"
  dark-heat-2: "#054e58"
  dark-heat-3: "#006b78"
  dark-heat-4: "#36a0b1"
  dark-heat-5: "#80cad7"
  paper-heat-1: "#dee2f0"       # On paper the heat steps are five grays
  paper-heat-2: "#babecb"
  paper-heat-3: "#9498a5"
  paper-heat-4: "#616571"
  paper-heat-5: "#3e424d"
typography:
  h1:
    fontFamily: Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif
    fontSize: 3.25rem
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: -0.02em
  h2:
    fontFamily: Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 1.2
  h1-compact:                   # the title on a phone
    fontFamily: Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: -0.02em
  h2-compact:                   # a section heading on a phone
    fontFamily: Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif
    fontSize: 1.625rem
    fontWeight: 700
    lineHeight: 1.2
  h3:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.35
  body-lg:
    fontFamily: Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif
    fontSize: 1.3125rem
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.65
  label-sm:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: ui-monospace, "SF Mono", "Cascadia Code", Consolas, Menlo, monospace
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  none: 0
  sm: 6px
  md: 10px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  "3xl": 72px
---

# Docent — DESIGN.md

## Overview

Docent is a design kit for documents: self-contained HTML guides and reports. A docent is a museum guide. The kit does the same job for a long document. It shows the reader where to look, one step at a time.

The look is quiet on purpose. Docent styles other projects' documents, so the content and the host project's name come first. The page should feel like a well-lit gallery wall: off-white, flat and calm, with one ink color that points the way.

One idea ties the kit together: **a dot travels along a route.** The mark is a letter D drawn as a route with a dot. A Route diagram draws a workflow as stops on a route, and a dot travels the current leg. The top bar's line is the route through the document, and a dot marks the current section. The walkthrough has a rail, and a dot marks the current step.

Readers are developers, testers, managers and business stakeholders. Many of them read English as a second language. The page must be easy to scan, easy to print, and readable with JavaScript turned off.

Docent belongs to no single project. It carries no host brand colors. The sample page in [`../assets/specimen.html`](../assets/specimen.html) shows every rule in this file.

## Colors

The palette is one ink, one light, and Docent's own grays, with one teal for the heat steps on screen. Every gray leans slightly toward ultramarine, so the grays and the ink read as one family.

- **Primary — Ultramarine (#2f3fd0):** A mark, never a fill. Use it for links, the underline of a highlighted term, the route dot, the rail dot, the dot of a chosen option and the focus ring. Two or three marks in one view are enough. It is never a button, banner or block background.
- **Secondary — Ink (#1b2260):** The title and section headings, as text only. It is the dark form of the primary.
- **Tertiary — Lamp (#f2b824):** The docent's lamp, and always a dot. It is the dot in the mark, and the route dot, the rail dot and the dot of a chosen option in dark mode. Lamp on the light page has a contrast of 1.74:1, so it is not used there; the dots in light mode are ultramarine.
- **Neutral — Well (#f2f3f9):** The ground of figures and code. A well is one step darker than the page in both themes, and it has no outline.
- **Status:** `success`, `warning` and `error` are for status only, as a small dot with a word beside it. Two more kinds of status note have no status color: plain information has a muted dot, and a thing that is planned, or not turned on yet, has a muted ring. The ring differs from the dot by its shape, so it does not need a color. A status label wraps on a narrow screen. In a diagram, a part that carries a state takes the status color on its outline and gets the same small dot; its note says the status in words. In a status grid, each cell shows its state. On screen an OK cell is filled in the success color, a Warning cell in the warning color with a slash in the page color, and an Error cell in the error color with a cross in the page color. On paper an OK cell and a Warning cell take the outline color, the Warning slash takes the warning color, and the Error cell keeps its fill and its cross, so in gray print only the failures stand out. This is the one place where the status colors fill a shape. The marks, not the colors, tell the states apart for readers who cannot see the colors.
- **Heat steps (heat-1 to heat-5):** Five steps of one teal on screen, and five of Docent's grays on paper, for the cells of a heat map and the boxes of a heat plan, and nothing else. Teal means nothing else on the page: it is far from the status green (70°) and from the ultramarine (85°), and it does not change with a host's accent. Each teal step has the lightness of its gray, so the contrast of a number on it stays the same. Step 1 holds the least and step 5 the most. In light the steps grow darker, and in dark they grow lighter, so the most is always the step that stands out most from the page. A step is a fill, but it is not a mark and not a status: a heat map has no ultramarine, no lamp, and no green, amber or red. A number on steps 1 to 3 takes the text color, and a number on steps 4 and 5 takes the page color; so do the name and the note of a heat plan's box. Every heat map and heat plan has a legend, and its exact numbers are in the table in words.

**Diagrams.** Docent draws its own diagrams, in three forms (see Layout). A diagram uses the page's tokens and nothing else: lines, parts and names in the text color, notes in the muted color, tracks in the outline color, lane bands in the page color, and the well as its ground. Because it reads the tokens, one drawing serves both themes. Each drawing carries its own styles, with the light values as a fallback, so a drawing that is copied out of the page keeps the light colors. Ultramarine marks the current leg, and the dot on it is ultramarine in light and lamp in dark. Other colors can appear in a diagram only in three places: a status color, on the outline of a part that carries a state; the status colors, in the cells of a status grid (see Status above); and the heat steps, in the cells of a heat map and the boxes of a heat plan (see Heat steps above). An author cannot give a diagram any other color. Docent does not use a third-party diagram renderer.

**Themes.** A document follows the reader's system setting: light on a light system, dark on a dark one. A switch lets the reader choose the other theme. That choice wins over the system and is remembered. Every `dark-*` token is the dark value of the token with the same name. The page is never pure white and never pure black.

**Contrast.** All text pairs meet WCAG AA (4.5:1). Checked values on the page: body text 15.82 (light) and 15.14 (dark); muted text 6.30 and 6.65; primary 7.41 and 7.23; status colors 4.59 or higher on every surface they use. The number on a heat step: 5.62 or higher in light, 5.14 or higher in dark, and 5.68 or higher on paper. The cells of a status grid on screen: each fill 4.92 or higher against the page in light and 5.47 or higher in dark, and each mark in the page color the same on its fill. On paper: the Error fill 5.36 against the page and 3.70 against the OK cell, its cross 5.36, and the Warning slash 4.89 on the OK cell.

## Typography

Docent uses system fonts only, because every document is one file with nothing to download. The identity comes from the pairing, not from a brand font.

- **Six sizes, no more:** 52, 30, 21, 18, 16 and 14 pixels at the browser's usual text size. On a phone the title is 32 and section headings are 26. The kit writes them in rem (52px is 3.25rem), as it writes the text column. A reader who sets a larger text size in the browser then gets larger text, and each line keeps its length in characters.
- **Title and section headings (h1, h2):** A serif — Charter on Apple devices, Sitka on Windows, Cambria or Georgia elsewhere — at weight 700, in ink. A title is at most two lines.
- **Opening paragraph (body-lg):** The same serif at 21px, regular weight. It says what the document is for.
- **Step and block headings (h3) and body (body-md):** The system sans-serif. Body text is 16px with a line height of 1.65. The text column is 31rem wide, which gives about 65 to 70 characters in a line.
- **Small text (label-sm):** 14px sans-serif, for notes, captions, table headings and the top bar. A label is written in sentence case. Docent uses no uppercase letter-spaced labels and no text below 14px on screen. The one exception is inside a diagram, where notes and step numbers are 12px. On paper the body is 11pt, so small text is about 9.6pt.
- **Code (code):** Monospace, for code and commands only. Step numbers, captions and labels are never monospace.
- **Numbers** in tables, step counters and dates use tabular figures.

## Layout

**No label above a heading.** The title leads, across the page. Facts about the document (its kind, reading time, date and owner) sit in the margin beside the opening paragraph, not above the title.

**The window title.** The `<title>` of a document is `Document title — Host project`. It does not name Docent. When the title is long, the window title may be a shorter form of it, made of the title's own words in the same order: "Report a bug — Host project" for the title "How to report a bug and get a fix".

**Two widths.** A block is either as wide as the text column (31rem) or as wide as the block width of the profile (see Profiles). Text, notes in the flow and warnings use the text column. Wells, tables and card grids use the block width, so their edges line up down the page. A drawing sits in the middle of its well at its real size. A drawing that is wider than the block keeps its size, and its well grows with it.

**One left edge.** Every block starts at the same left edge, so the eye returns to one line down the page. On a wide screen the text column and its margin notes sit in the middle of the screen as a group, and a wide block grows to the right of them, up to the block width of the profile. On a narrower screen the page keeps 40px on each side, and 20px on a phone.

**Profiles.** A page names its profile on `<html>` (`data-profile`), from what the reader does with it. The profile sets the block width and the space; it never changes the text column, the type or the colors.

- **Standard** (the default): an explanation, a tutorial, a policy or a guide. The block ends at the right edge of the notes, so the page is balanced around the text.
- **Task**: a how-to, a runbook or troubleshooting. The block ends at the right edge of the notes. Sections and steps are closer together.
- **Reference**: commands, options, an API, settings, a log or a trace. The block is up to 1120px wide, and table rows are tighter, so more fits on a screen.
- **Brief**: a report for managers, an incident report or release notes. The block is up to 1120px wide, for timeline tables.

A page for the public or for older readers also has `data-text="large"`: the body is 18px, and every size grows with it.

**Text column and margin column.** A margin column of 220px sits beside the text column. The margin holds the guide's remarks: a note, or the facts about the document. A margin label starts with one line above it and a short bold word. On narrow screens the margin label moves below its paragraph.

**Facts about one item go in the margin.** When an item, such as an event in a log or a case in a report, has a few short facts (its time, its source, a reference), list them in a margin note beside the item, as a facts list (`<ul class="facts">`). The item's heading may stand in the text column of the row when the item has no text of its own. Do not join the facts into one line of text with `|` or `·`: that line fills the text column and leaves the margin empty.

**The route.** The top bar holds the host project's name, the section links and the theme switch. Its bottom line is the route through the document. A dot sits on that line under the current section. On a phone the bar is not fixed, and the links wrap instead of scrolling.

**The walkthrough.** Steps sit on a rail: one thin line with a small ring per step. One dot marks the current step and slides to the next. The other steps use the muted text color. The figure stays in view beside the steps on wide screens. On narrow screens and in print the figure comes first and the steps follow. With JavaScript off, every step has the full text color.

**Sequence diagrams.** A sequence diagram is a UML kind (see UML diagrams). It shows messages between 2 to 6 lifelines, in time order. Each lifeline is a plain box at the top with a track below it. Each message is a level arrow, with its numbered mark in the first gap after the sender and its verb above the mark. A call that waits for its answer has a filled arrowhead, a message that does not wait has an open one, and a reply is a dashed line with an open arrowhead. A thin bar on a track shows that the lifeline is busy with a call, from the call to its last reply. A call to itself is a loop to the right of the track, ending on a short bar beside the first. A message that creates a lifeline points at its box, which starts at that row; a message that ends one stops at a cross where its track stops. A combined fragment (alt, opt, loop, par, break, critical) is a frame with its operator in a tab at the upper left and each guard in brackets; the cases of an alt or a par are split by a dashed line, and a fragment holds at most one more inside it. A ref is a frame across the lifelines it covers, with the name of the diagram it stands for. On a phone it is a script, one row for each message, and each case of a fragment is a band named by its operator and guard; on paper the desktop form shrinks to the sheet while it keeps 80% of its size. Its steps are also written in words, in a closed section under the drawing, with a key to the marks it uses.

**Flowcharts.** A flowchart shows steps, decisions and stops, with paths that split, end early or go back. The main path (each node's first exit) stands in the first column, and every other node in the second; each node has its own row, as in Plates. A decision is a plate with pointed ends, and a stop is a plate with a thick outline. The arrows have no numbers: the label of a decision's exit sits beside its arrow. An arrow back runs between the columns and never crosses a plate. One dot travels the main path, twice; the other arrows keep still. On a phone and on paper a flowchart takes the column form, and its steps are also written in words under the drawing.

**Range charts.** A range chart shows values and ranges on one numeric scale, one row each. A range is a bar with a small round corner, a point is a filled circle, and a limit is a line from the edge of the scale to a cap at the limit, with no cap at the edge. Each group of rows is a band. Row names are 14px at weight 400, because 8 to 12 bold rows are heavy; group names are 14px at weight 600. Values and ticks are 12px, muted, with tabular figures. Grid lines take the outline color, and a named line takes the muted color; nothing is dashed, and nothing moves. A bar, and a box in a layout to scale, is solid, and each line that passes through it is drawn over it in the outline color, so the reader sees where the bar meets the line; a line that would cross the name inside a box is left out of that box. A scale can change its pixels per unit without changing its text size, so the chart is drawn again at each width: 640px for a desktop and for paper, where it fits an A4 figure well with no shrink, and 264px for a phone, with each row name above its mark. Its rows are also written as a table under the drawing.

**Layouts to scale.** A layout to scale shows where parts sit along one measured width, one row each, on one or two tracks. Every box looks the same: the page color inside and a text-color outline. A name that does not fit in its box stands above it, joined by a short tick, so the boxes need no key. A measured row writes the length of every stretch in numbers, in place of drawn lines of text. Row names are 14px at weight 600, box names 14px at weight 400, and measures 12px, muted, with tabular figures. It keeps the range chart's colors and its two forms, 640px and 264px, and its boxes are also written as a table under the drawing.

**Plans.** A plan shows where the parts of a page or a screen sit, on both axes, as a grid of named areas. It uses the look of a layout to scale: one band in the page color for the page itself, and on it boxes that all look the same, 4px apart, with the name at the upper left at 14px and weight 400, and a note under it, muted. One line above the plan says how to read it ("Widths in px", or "not to scale"), and each column's width stands above it in 12px muted tabular figures. A plan has no ticks, no lines between boxes, no state and no dot. On a phone it keeps its grid, because "next to" and "above" are its message: a narrow column grows until its names fit, and the drawing then says it is not to scale. Only when the grid still cannot fit does a phone get a stack: one band per box, with a 40px map of the plan where that box is filled in the text color and the other boxes have thin muted outlines. Its boxes are also written as a table under the drawing.

**Funnels.** A funnel shows how many people reach each step of one flow, and how many leave between two steps. Each step is a row with a bar that starts at 0, on one scale that ends at the first step's count, so every bar starts at the same left edge and the lengths can be compared. A funnel is never drawn as a funnel shape or as bands that split: a narrowing shape makes a drop look larger than it is. A kept bar is the bar of a range chart. The part that a step lost follows it on the same row, up to the length of the bar above, filled in the line color with no outline: a soft gray block that shows what the step lost, and stays visible in dark mode. The drop is written above that part in numbers: the count, and its share of the step before. The counts and their shares of the first step stand in two columns of tabular figures beside the names. A drop is not a status, so a funnel has no color, no state and no dot, and the renderer marks no drop as the largest. Two short lines above the bars say what they count and what each share is of. It keeps the range chart's two forms, 640px and 264px, and its steps are also written as a table under the drawing.

**Heat maps.** A heat map shows one number for each pair of a row and a column, such as sign-ups by weekday and hour, as a grid of cells on one band. Each cell is filled with the heat step of its number: 3 to 5 steps of equal size on one scale that the author fixes. A legend above the grid shows each step, with the numbers at its edges and the unit; the unit, and a "no data" key, take a second line when they do not fit at the right. Cells are 2px apart (1px when they are narrower than 16px), with corners of 2px. A cell with no data has no fill: it shows the band inside a 1px outline in the muted color, so a hollow cell never looks like the palest step. When every number fits inside its cell, each cell shows its number at 12px with tabular figures; when one does not fit, no cell shows one. Row names are 14px at weight 400 in a column at the left. Column labels are 12px, muted, just above the grid, further from the legend than from the grid so the two never read as one, and stay 12px inside the drawing. When they do not all fit on one line, they take two lines; when two lines are not enough, every second, third, fourth, sixth or twelfth label stands, and never fewer than three. Nothing moves, and nothing is dashed. It has the two forms of a range chart: 640px on a desktop and on paper, and 264px on a phone, where each row name stands on its own line above its row of cells and the columns still line up. Its numbers are also written as a table under the drawing; a table too wide for paper is split into tables of fewer columns, each with the row names, and on a narrow screen each table scrolls inside itself.

**Heat plans.** A heat plan shows how much happens in each area of a page or a screen, such as the clicks on each part of a product page. It is a plan whose boxes each hold a number: it keeps the plan's grid, its band, its line on the widths and its two forms, and puts the legend of a heat map above it. Each box with a number is filled with the heat step of its number, keeps the plan's text-color outline, and shows its value at 12px with tabular figures under its name; on a step the name, the value and the note take the text color, or the page color on steps 4 and 5, and a note is not muted there, because the muted color is too faint on the darker steps. A box with no data keeps the plan's look and says "no data" under its name, so the legend needs no key for it. When the grid cannot fit a phone, each box stands on its own band, with its value and unit, beside a small map where every box is filled with its step and the band's own box has a 2px outline in the text color with a 1px line in the page color inside it, so the outline shows on the darkest step too. A plan keeps its rule that every box looks the same; the heat plan is the one kind whose boxes are filled. It is never a blurred glow over a screenshot: that draws numbers that were never measured, and gives no exact value. Its boxes are also written as a table under the drawing, which scrolls inside itself on a narrow screen.

**Status grids.** A status grid shows the state of each pair of a row and a column, such as the uptime of each part of a service by day. It has the heat map's grid, column labels, forms and table in words, and it may have one row. Each cell takes its state from the author's thresholds, or from the data: OK, Warning or Error. On screen each cell is filled in its status color, and a Warning cell has a slash and an Error cell a cross, in the page color. On paper OK and Warning cells take the outline color, the slash takes the warning color, and an Error cell keeps its fill and its cross. The marks are 1.5px strokes with round ends, in a square 3px smaller than the cell and at most 10px. A cell with no data is hollow, as in a heat map. A legend above the grid shows each state as a small cell with its mark, then its name and its threshold; the keys flow into lines, and a key too wide for a line wraps its words, so a legend is never refused. Cells never show numbers. A long strip of one thing, such as 90 days of one service, is drawn as a calendar, with the weekdays as rows and the weeks as columns. Its states and numbers are also written as a table under the drawing, with lines that count the states and name each Error cell.

**UML diagrams.** A UML kind is a diagram kind named after one of the 14 diagram types of UML 2.5.1. Every mark it draws follows the UML notation, and it draws a chosen subset of the notation, never a look-alike (`docs/proposals/uml.md` lists the subset for each kind). Inside a UML kind:

- Lines and arrowheads mean what UML says. A dashed line is a reply, a dependency, a realization, an «include» or an «extend». The rule "a dashed line means a path that only some readers take" holds for every other diagram, and one drawing never mixes the two meanings.
- A mark may be filled in the text color: the initial node, the centre of a final node, a fork or join bar, a junction, a composition diamond, a filled arrowhead. Every other mark has the page color inside and the text color on its outline. Ultramarine is never a fill, and an author cannot color a UML diagram.
- UML text keeps its form: stereotypes in guillemets («interface»), guards in brackets ([valid]), constraints in braces ({ordered}), the visibility marks + - # ~, and an object's name underlined. Names stay 14px and notes 12px.
- Lines are 1.5px. An end mark has a straight run of at least 28px behind it, as an arrowhead does. A line stops where its end mark starts, so no line shows inside a hollow triangle or diamond.
- The dot travels only a kind that has an order: the messages of a sequence or communication diagram, and the main path of an activity diagram, a state machine or an interaction overview. A structural kind (class, object, component, composite structure, deployment, package, profile, use case) has no dot and no walkthrough.
- The UML kinds other than sequence and timing share one layout (`scripts/lib/graph.cjs`): nodes in rows, everything on a 12px lattice, lines with right angles that never run on another line and cross only at a right angle, and each label in the first free place beside its line. A group of nodes (a partition, a package, a node of a deployment) owns its columns, so a frame never holds a node of another group. When there is no room, the gaps grow; the result is the same every time.
- Every UML kind has a phone form that fits 320px, and its steps or facts are written in words under the drawing. The words end with a key to the marks: one plain sentence for each mark the drawing uses, and none for the marks it does not use, so a reader who does not know UML can still read it.

**Diagrams have three forms.** All three show the same data: lanes (a person, a machine, a system), parts, and numbered legs from one part to the next. Each form has its own strength, and the renderer picks the form from where the diagram sits and what it must show. An author can name a form to override the choice. A document does not draw the same thing twice; the sample page is the one exception, because it shows one workflow in all three forms.

| Form | What it looks like | Use it when |
|---|---|---|
| **Route, wide** | Lanes are tracks across the page. Each part is a ring on its track, with its icon inside. | A short workflow sits in the text flow. It is low, so the text stays in view. |
| **Route, tall** | The same route, running down the page. | The diagram sits beside the walkthrough steps, or the workflow is long. |
| **Plates** | Each lane is a panel. Each part is a plate with a name and a note. | The parts matter more than the order, a part needs more text, or the paths branch. |

**How the renderer picks.** Paths that branch give Plates. A diagram beside walkthrough steps gives Route tall. A route with more than five legs gives Route tall. Any other route gives Route wide. When the picked form cannot keep the spacing rules, or is wider than the page, the renderer tries the next form; so a long note gives Plates only when no route form can hold it. A diagram has at most 5 lanes, 12 parts and 16 legs. A figure holds one drawing, or two drawings for two separate chains: side by side when both fit, one below the other when they do not. One drawing numbers its legs in one order, so two unrelated chains are never one drawing.

**On a phone.** A route also has a single-track form. The route runs straight down, each visit to a lane is a band, and each leg that changes lane has its mark in the gap between two bands. This form takes the place of the main form on a screen that is too narrow for it, and it fits a screen of 320px. The same holds on paper: a route that is wider than the sheet prints in its single-track form. Data that is not a route (paths that branch, a leg that skips a part, an arrow back) has a **column form** in its place. The parts stand in one column, in the order of Plates, each visit to a lane is a band, and a leg to the next part is an arrow straight down. Every other leg is a go-to row under the part where it starts: its numbered mark, its verb, and "to" or "back to" with the name of the part where it goes. No line crosses another. A part where no leg starts has a filled ring. The mark of an optional go-to row is dashed. The column form takes the place of Plates on a narrow screen and on paper, like the single-track form. It fits a screen of 320px when the part names have up to about 20 characters. When a drawing is wider than its well, one line of small text under the well says so, because the part that shows can look complete.

**Three layers.** Every diagram has the well as its ground, a band or panel for each lane in the page color, and the drawing on top. The ground has no pattern. The layers show which parts belong together before the reader reads a word.

**Spacing rules.** A diagram must never look crowded. The renderer keeps these rules:

- An arrowhead has a straight run of at least 28px behind it. It never sits on a bend.
- A numbered mark sits in the gap between two lanes when a leg crosses lanes, and at the middle of the leg when it stays in one lane. It is at least 16px clear of every arrowhead, bend and part.
- A leg may have no verb, when it means "and then"; it keeps its numbered mark. A drawing in which no leg has a verb shows only the order, and a numbered list does that better.
- A verb sits beside its mark and stays 6px clear of every line. It sits to the right of a mark on an upright or steep leg, and above a mark on a level or shallow leg. One exception: in Route wide, on a lane whose labels sit above the track, the verb of a level leg sits below the line, on the free side.
- A leg inside one lane is at least 72px long, so its mark and its arrowhead both fit.
- Nothing overlaps: no text on a line, no mark on an arrowhead, no dot on a mark. In Plates two legs may cross at a right angle; they never share a line.
- In Plates one leg meets the side of a plate at the middle of that side. Two legs on one side sit 14px above and 14px below the middle, and a third leg takes the middle. The renderer leaves this rule only when another line is in the way. A leg that leaves the top or the bottom of a plate for another lane starts near the corner on the side of that lane, so that its path has one bend.
- The moving dot passes under a numbered mark, never over it, so the number stays readable.
- A leg that only some readers take is drawn as a dashed arrow. In a UML kind a dashed line follows UML instead (see UML diagrams).
- A side leg, beside a route in Route tall, goes straight across to an extra part in another lane, level with the part where it starts. It is dashed, it has no number, and no step lights it. It lets a walkthrough show one short branch and keep its route. Its verb, or the text beside the figure, says who takes it.

**Size and motion.** A diagram is shown at its real size, so names are 14px and notes are 12px. It is never stretched to fill a wider space, and on a screen it never shrinks to fit a narrower one. On paper, which cannot scroll, a drawing that is wider than the paper or taller than a page shrinks to fit. The dot moves in every diagram except a structural UML kind, in one of two ways:

- **In a walkthrough,** the leg of the current step takes the ultramarine color and the dot travels along that leg.
- **Anywhere else,** one dot travels the whole route by itself, leg by leg in the order of the numbers. Only one dot is in flight at a time, so the motion shows the order. The run plays twice and then rests, so the page is calm while the reader reads.

**Lists.** A list sits in the text column, with an indent of 24px and 4px between its lines. Points are a list with bullets. Steps that one actor does are a list with numbers. Steps with two or more actors are a walkthrough, because its figure shows who acts and what moves. When a step of one actor holds a code block, a table or a widget, each step is a numbered block heading: the number stands before the heading in the muted color, as in a walkthrough. The styles count the steps; with JavaScript on, the page script writes each number as text, so that a screen reader reads it.

**Small headings and definitions.** A small heading (h4) names a part inside a block heading's part: 16px, weight 600, with 24px above it and 4px below it. A definition list holds terms and their meanings, in the text column: each term in weight 600, its meaning on the next line, and 12px between two pairs. Use it for a glossary or for fields and what they mean; use a table when each term has more than one fact.

**Code blocks.** A code block sits in a well. With JavaScript on, a small button in its upper right corner copies the code. The button is part of the well: it has the well's ground, and a thin line on its left and lower edge. Its word changes from "Copy" to "Copied" for two seconds. It does not move.

**Widgets.** A widget is a part of the page that the reader uses. Docent has four: a chooser, a value picker, a checklist and a decision helper (see Widgets). A widget sits in the text flow and has no box. Its text uses the text column; a code block inside a chooser uses the block width, like any code block.

**Tables use the block width.** On a phone a figure, a table or a code block scrolls sideways inside itself; the page never scrolls sideways. Code in a table cell may break at any character, so a long path does not make the table wider. A closed section that holds a table, a code block or a figure takes the block width, like those blocks do outside it; its text keeps the text column.

**Spacing.** More space goes above a heading than below it: 72px above a section (less on Task, Reference and Brief pages), 16px below its heading. Blocks inside a section are 24px to 32px apart, and two paragraphs are 16px apart. A block heading (h3) in the text flow has 32px above it and 8px below it. No block touches the block before it.

**Print** is a first-class layout. The page prints in light colors on white paper, without the top bar, and without any moving part. A closed section opens for printing, so its text is on the paper. On paper the body text is 11pt, and the page margin (18mm) is the edge. Each margin note sits beside its text again: an A4 page holds a 112mm text column, an 8mm gap and a 50mm note column. Code and tables use the full width of the paper on every profile, and a long line of code wraps. The lines of a paragraph keep together across a page break. Chrome and Edge print page numbers; other browsers print their own footer. The page sets no paper size, so the reader's choice wins.

## Shapes

Corners are soft and consistent. Controls use `sm` (6px). Code blocks use `md` (10px). Figure wells use `lg` (12px). Use `full` only for dots. Do not mix sharp and round corners in one view.

## Do's and Don'ts

- Do let the content lead. Docent's mark appears once, small, in the footer or the cover.
- Do use the dot to show where the reader is: the current section, the current step and the chosen option.
- Do keep WCAG AA contrast (4.5:1 for text, 3:1 for large text and for the focus ring).
- Do keep the page readable with JavaScript off and in print.
- Do separate blocks with space. Lines are for four things only: the route under the top bar, the rules of a table, the line above a margin label, and the line above a card. A card is a label of the same kind as a margin note.
- Do style the parts the browser draws: the text selection, the caret, the focus ring, the underline offset and the scrollbar of a scrolling block.
- Don't draw a box around a block. A figure or code block sits in a well; a note sits in the margin; a warning is a dot and a word.
- Don't fill an area with `primary`, `secondary` or `tertiary`. The mark's own tile is the one exception, because a favicon must stay clear on any background.
- Don't use gradients, drop shadows or glass effects. The page is flat.
- Don't use `tertiary` (lamp) for status, links or body text.
- Don't use green, amber or red for anything except status. They mean the same thing inside the diagrams, and only the cells of a status grid are filled with them.
- Don't use a status grid for an amount. Thresholds hide the differences inside a state; a heat map shows them.
- Don't use a heat step outside the cells of a heat map and the boxes of a heat plan, and don't use a step to make a part stand out. A heat step says how much, and nothing else.
- Don't add a host project's colors to these tokens. A project that needs its own accent, heading color or fonts sets the `--host-*` tokens (see Host tokens). There is no token for the page, the text or the status colors.
- Don't color a short code or a label. A code is `code`, in its small well; a status is a state, a dot and a word. A colored badge is a fill, and green, amber and red mean status only.
- Don't color the words of code by kind. A code block has two colors: the text color, and the muted color for a comment line. More colors would add a palette that the page does not have.
- Don't load fonts, scripts or images from the network.
- Don't use more than two font weights per typeface: 400 and 700 for the serif, 400 and 600 for the sans-serif.

## Voice

- Plain words. When a common word exists, use it.
- One idea per sentence. Short sentences.
- A step heading is one sentence of at most six words, with a verb: "The worker picks up the job."
- Say what happens, not how to feel about it. No praise words, no hype.
- Write for a reader whose first language is not English. No idioms.

## Motion

Motion in Docent has one job: to show where to look or what comes next. If a motion does neither, remove it. The dot is the one moving part that belongs to Docent.

| Motion | Purpose | Timing | Reduced motion |
|---|---|---|---|
| The rail dot slides to the next step | Shows the current step | 320ms, `cubic-bezier(0.23, 1, 0.32, 1)` | The dot changes place with no movement |
| The route dot slides to the next section | Shows position in the document | 320ms, the same curve | The dot changes place with no movement |
| The dot travels the current leg of a diagram | Shows the current step and its direction | A 2.4s loop: the dot crosses the leg, rests at the stop, then starts again | The dot rests on the leg; arrowheads show direction |
| One dot travels the whole route of a diagram outside a walkthrough | Shows the order of the legs | 1.6s for each leg. The run plays twice when the diagram comes into view, then rests. It plays again when the reader points at the diagram or moves focus to it. | No dot; numbers and arrowheads show the order |
| A section opens | Keeps the reader's place | The arrow turns in 150ms | Opens at once |
| Theme switch | — | No animation | — |
| A widget changes: a case shows, a line is ticked, an answer appears | — | No animation | — |

Animate `transform` and `opacity` only. Nothing animates when the page loads or when content scrolls into view; the dots take their first place without sliding. Every animated state has a still form that carries the same information.

## Widgets

A widget lets the reader do one small thing on the page. Docent has four widgets and no others, and a script builds each one from data, so a widget looks and behaves the same in every document.

**When a widget is allowed.** Only when the reader must do one of three things. In every other case, text, a table or a closed section is better.

| The reader must | Widget | What it looks like |
|---|---|---|
| Choose one case of several | **Chooser** | A short label, then one option for each case. Below them, the text of the chosen case only. |
| Choose one case, where many small values in the text and the code differ | **Value picker** | A short label, then one option for each case, and a line that names the chosen case. Every place in the text that shows a value changes with the choice. The table of all values sits in a closed block. |
| Track what is done | **Checklist** | A label, then one line for each thing, each with a box. Below the list, a count and a button that clears the ticks. |
| Decide between answers | **Decision helper** | A label, then one to three questions with options. Below them, the one answer that fits. The table of all cases sits in a closed block. |

A document has few widgets. More than four is a sign that some are not needed.

**The look.**

- An option is a control: 32px high, a thin outline, corners of 6px, and a small ring before its name. The chosen option has a darker outline, and its ring becomes the dot. The dot is ultramarine in light and lamp in dark, like every dot in Docent.
- A box is 18px, with a thin outline and corners of 6px. The tick is drawn in the text color. A ticked line takes the muted color, the same way as a step that is not the current one.
- The answer of a decision helper is a dot, a bold title and one or two sentences, like a status note.
- The label of a widget is small text (14px, weight 600, muted).
- A widget has no box, no fill and no line of its own. The accent is never a fill here: a chosen option is not a filled button.
- A widget does not move. Nothing in it is animated.

**Still forms.** Every widget is readable with JavaScript off and on paper, and it carries the same information there.

| Widget | With JavaScript off | On paper |
|---|---|---|
| Chooser | It works: the styles alone show the chosen case. | Every case prints, one below the other, each under its name. |
| Checklist | The boxes can be ticked, and the button clears them. There is no count and no memory. | The lines print with their boxes. |
| Decision helper | The table of all cases, open. | The table of all cases, at the width of the sheet. |
| Value picker | The options are hidden. The text shows the values of the first case, a line names that case, and the table of all values is open. | The line that names the chosen case, and the table of all values. |

**Memory.** A chooser and a value picker remember the choice, and a checklist remembers the ticks of this document. The page keeps them in the reader's own browser; nothing leaves the file. Choosers with the same cases change together, so the reader picks once; the same holds for value pickers.

**A place that shows a value.** A place is a `var` element. It keeps the font of its line, upright, with a dotted muted line under it, so the reader sees that it changes with the choice. Inside code it is code like the rest of the line, and the copy button copies the value that shows.

**Keyboard.** Options are radio buttons and boxes are checkboxes, so the arrow keys, the space key and the Tab key work as in any form. The focus ring is the ultramarine ring of the page.

**Text only.** A widget holds text: paragraphs, code, lists and short lines. It holds no markup of the author's own, and no script.

## Card grid

A card grid shows 3 to 8 short items side by side, when the reader should see them together: the parts of a good report, or three numbers that sum up a result. Each card is a heading (16px, weight 600) or a large number (30px serif, in ink), and one line of small muted text. A card has a line above it and no box, like a margin note. At most four cards stand in a row; on a phone two, and on the narrowest screen one. A card grid uses the block width. When the items need more than one line each, or the reader must compare facts across them, use a list or a table.

## Host tokens

A host project may set five things of its own, and nothing else: an accent, an accent for dark mode, a heading color, and the fonts. Each is a token that the kit reads and never sets, so a value set anywhere in the document holds in light, in dark and on paper.

| Token | Takes the place of | Rule |
|---|---|---|
| `--host-accent` | `primary` (light and print), and the dot in light | Contrast 4.5:1 or more on the page and on the well. |
| `--host-accent-dark` | `dark-primary` | Contrast 4.5:1 or more on the dark page and the dark well. |
| `--host-ink` | `secondary`, the color of the title and section headings | Contrast 4.5:1 or more on the page. |
| `--host-serif`, `--host-sans`, `--host-mono` | The three font stacks | Fonts in the file or on the reader's system only; nothing from the network. |

A drawing keeps the system sans-serif, because the renderer estimates its text widths for that font. The lamp dot of dark mode stays.

**A fixed theme.** A document that must stay light (or dark) writes `data-theme="light"` (or `"dark"`) on `<html>`. Then the switch is hidden, and neither the reader's system nor a saved choice changes the theme. Print stays light.

## Icons

An icon lets the reader tell the parts of a diagram apart before reading a word. Icons are used inside diagrams only: one for each part and one for each lane.

**Where an icon comes from.** A document can be about anything, so the icons are not all known in advance. The writing agent chooses in this order:

1. **The built-in set.** Docent ships a small set for the kinds that appear in most documents: a person, a team, a computer, a server, a data store, a document, a message, a timer, a key, a branch, a release. It also has four more: inspect, check, commit and merge. The agent picks by kind.
2. **A drawn icon.** When no built-in icon fits, the agent draws one for this part, to the rules below.
3. **No icon.** When no clear picture exists, the part is shown as a plain ring or plate. A wrong picture is worse than none.

**Rules for every icon, built-in or drawn:**

- A 16 by 16 grid, with a stroke of 1.5, round ends and round joins, and no fill.
- One idea in one icon, in at most six shapes. It must read at 16px.
- No letters, numbers or words. No logo and no brand mark.
- It takes the text color. An icon never carries a status color, also inside a part that has a state.
- Two parts of the same kind share one icon. Two parts of different kinds never share one.
- In one diagram, either every part has an icon or no part has one.

**The check.** The renderer accepts an icon only if it is made of plain shapes (`path`, `circle`, `rect`, `line`, `polyline`) and nothing else: no script, style, link or image. An icon that fails the check is left out. Then every part of that diagram is shown without an icon, because either every part has one or no part has one.
