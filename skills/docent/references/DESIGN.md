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
  dark-surface: "#12141f"       # Dark page; one step lighter than the dark well
  dark-neutral: "#0b0d15"       # Dark well; one step darker than the dark page
  dark-on-surface: "#e7e9f3"
  dark-on-surface-muted: "#959bb3"
  dark-outline: "#2d3146"
  dark-primary: "#8e9bff"
  dark-success: "#3fb950"
  dark-warning: "#d29922"
  dark-error: "#f85149"
typography:
  h1:
    fontFamily: Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif
    fontSize: 52px
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: -0.02em
  h2:
    fontFamily: Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
  h1-compact:                   # the title on a phone
    fontFamily: Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: -0.02em
  h2-compact:                   # a section heading on a phone
    fontFamily: Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.2
  h3:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
  body-lg:
    fontFamily: Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif
    fontSize: 21px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.65
  label-sm:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: ui-monospace, "SF Mono", "Cascadia Code", Consolas, Menlo, monospace
    fontSize: 14px
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

The palette is one ink, one light, and Docent's own grays. Every gray leans slightly toward ultramarine, so the grays and the ink read as one family.

- **Primary — Ultramarine (#2f3fd0):** A mark, never a fill. Use it for links, the underline of a highlighted term, the route dot, the rail dot, the dot of a chosen option and the focus ring. Two or three marks in one view are enough. It is never a button, banner or block background.
- **Secondary — Ink (#1b2260):** The title and section headings, as text only. It is the dark form of the primary.
- **Tertiary — Lamp (#f2b824):** The docent's lamp, and always a dot. It is the dot in the mark, and the route dot, the rail dot and the dot of a chosen option in dark mode. Lamp on the light page has a contrast of 1.74:1, so it is not used there; the dots in light mode are ultramarine.
- **Neutral — Well (#f2f3f9):** The ground of figures and code. A well is one step darker than the page in both themes, and it has no outline.
- **Status:** `success`, `warning` and `error` are for status only, as a small dot with a word beside it. In a diagram, a part that carries a state takes the status color on its outline and gets the same small dot; its note says the status in words.

**Diagrams.** Docent draws its own diagrams, in three forms (see Layout). A diagram uses the page's tokens and nothing else: lines, parts and names in the text color, notes in the muted color, tracks in the outline color, lane bands in the page color, and the well as its ground. Because it reads the tokens, one drawing serves both themes. Each drawing carries its own styles, with the light values as a fallback, so a drawing that is copied out of the page keeps the light colors. Ultramarine marks the current leg, and the dot on it is ultramarine in light and lamp in dark. The one other color in a diagram is a status color, on the outline of a part that carries a state (see Status above). An author cannot give a diagram any other color. Docent does not use a third-party diagram renderer.

**Themes.** A document follows the reader's system setting: light on a light system, dark on a dark one. A switch lets the reader choose the other theme. That choice wins over the system and is remembered. Every `dark-*` token is the dark value of the token with the same name. The page is never pure white and never pure black.

**Contrast.** All text pairs meet WCAG AA (4.5:1). Checked values on the page: body text 15.82 (light) and 15.14 (dark); muted text 6.30 and 6.65; primary 7.41 and 7.23; status colors 4.59 or higher on every surface they use.

## Typography

Docent uses system fonts only, because every document is one file with nothing to download. The identity comes from the pairing, not from a brand font.

- **Six sizes, no more:** 52, 30, 21, 18, 16 and 14 pixels. On a phone the title is 32 and section headings are 26.
- **Title and section headings (h1, h2):** A serif — Charter on Apple devices, Sitka on Windows, Cambria or Georgia elsewhere — at weight 700, in ink. A title is at most two lines.
- **Opening paragraph (body-lg):** The same serif at 21px, regular weight. It says what the document is for.
- **Step and block headings (h3) and body (body-md):** The system sans-serif. Body text is 16px with a line height of 1.65. The text column is 31rem wide, which gives about 65 to 70 characters in a line.
- **Small text (label-sm):** 14px sans-serif, for notes, captions, table headings and the top bar. A label is written in sentence case. Docent uses no uppercase letter-spaced labels and no text below 14px. The one exception is inside a diagram, where notes and step numbers are 12px.
- **Code (code):** Monospace, for code and commands only. Step numbers, captions and labels are never monospace.
- **Numbers** in tables, step counters and dates use tabular figures.

## Layout

**No label above a heading.** The title leads, across the page. Facts about the document (its kind, reading time, date and owner) sit in the margin beside the opening paragraph, not above the title.

**The window title.** The `<title>` of a document is `Document title — Host project`. It does not name Docent.

**Two widths.** A block is either as wide as the text column (31rem) or as wide as the page. Text, notes in the flow and warnings use the text column. Wells and tables use the full width, so their edges line up down the page. A drawing sits in the middle of its well at its real size.

**Text column and margin column.** A margin column of 220px sits beside the text column. The margin holds the guide's remarks: a note, or the facts about the document. A margin label starts with one line above it and a short bold word. On narrow screens the margin label moves below its paragraph.

**The route.** The top bar holds the host project's name, the section links and the theme switch. Its bottom line is the route through the document. A dot sits on that line under the current section. On a phone the bar is not fixed, and the links wrap instead of scrolling.

**The walkthrough.** Steps sit on a rail: one thin line with a small ring per step. One dot marks the current step and slides to the next. The other steps use the muted text color. The figure stays in view beside the steps on wide screens. On narrow screens and in print the figure comes first and the steps follow. With JavaScript off, every step has the full text color.

**Diagrams have three forms.** All three show the same data: lanes (a person, a machine, a system), parts, and numbered legs from one part to the next. Each form has its own strength, and the renderer picks the form from where the diagram sits and what it must show. An author can name a form to override the choice. A document does not draw the same thing twice; the sample page is the one exception, because it shows one workflow in all three forms.

| Form | What it looks like | Use it when |
|---|---|---|
| **Route, wide** | Lanes are tracks across the page. Each part is a ring on its track, with its icon inside. | A short workflow sits in the text flow. It is low, so the text stays in view. |
| **Route, tall** | The same route, running down the page. | The diagram sits beside the walkthrough steps, or the workflow is long. |
| **Plates** | Each lane is a panel. Each part is a plate with a name and a note. | The parts matter more than the order, a part needs more text, or the paths branch. |

**How the renderer picks.** Paths that branch, and a note longer than 28 characters, give Plates. A diagram beside walkthrough steps gives Route tall. A route with more than five legs gives Route tall. Any other route gives Route wide. When the picked form cannot keep the spacing rules, or is wider than the page, the renderer tries the next form. A diagram has at most 4 lanes, 12 parts and 16 legs.

**On a phone.** A route also has a single-track form. The route runs straight down, each visit to a lane is a band, and each leg that changes lane has its mark in the gap between two bands. This form takes the place of the main form on a screen that is too narrow for it, and it fits a screen of 320px. The same holds on paper: a route that is wider than the sheet prints in its single-track form. Paths that branch have no single-track form; their Plates drawing scrolls sideways inside its well on a narrow screen, and it shrinks to fit the sheet on paper.

**Three layers.** Every diagram has the well as its ground, a band or panel for each lane in the page color, and the drawing on top. The ground has no pattern. The layers show which parts belong together before the reader reads a word.

**Spacing rules.** A diagram must never look crowded. The renderer keeps these rules:

- An arrowhead has a straight run of at least 28px behind it. It never sits on a bend.
- A numbered mark sits in the gap between two lanes when a leg crosses lanes, and at the middle of the leg when it stays in one lane. It is at least 16px clear of every arrowhead, bend and part.
- A verb sits beside its mark and stays 6px clear of every line. It sits to the right of a mark on an upright or steep leg, and above a mark on a level or shallow leg. One exception: in Route wide, on a lane whose labels sit above the track, the verb of a level leg sits below the line, on the free side.
- A leg inside one lane is at least 72px long, so its mark and its arrowhead both fit.
- Nothing overlaps: no text on a line, no mark on an arrowhead, no dot on a mark. In Plates two legs may cross at a right angle; they never share a line.

**Size and motion.** A diagram is shown at its real size, so names are 14px and notes are 12px. It is never stretched to fill a wider space, and on a screen it never shrinks to fit a narrower one. The dot moves in every diagram, in one of two ways:

- **In a walkthrough,** the leg of the current step takes the ultramarine color and the dot travels along that leg.
- **Anywhere else,** one dot travels the whole route by itself, leg by leg in the order of the numbers. Only one dot is in flight at a time, so the motion shows the order. The run plays twice and then rests, so the page is calm while the reader reads.

**Widgets.** A widget is a part of the page that the reader uses. Docent has three: a chooser, a checklist and a decision helper (see Widgets). A widget sits in the text flow and has no box. Its text uses the text column; a code block inside a chooser uses the full width, like any code block.

**Tables use the full width.** On a phone a figure, a table or a code block scrolls sideways inside itself; the page never scrolls sideways.

**Spacing.** More space goes above a heading than below it: 72px above a section, 16px below its heading. Blocks inside a section are 24px to 32px apart.

**Print** is a first-class layout. The page prints in light colors on white paper, without the top bar, and without any moving part. A closed section opens for printing, so its text is on the paper.

## Shapes

Corners are soft and consistent. Controls use `sm` (6px). Code blocks use `md` (10px). Figure wells use `lg` (12px). Use `full` only for dots. Do not mix sharp and round corners in one view.

## Do's and Don'ts

- Do let the content lead. Docent's mark appears once, small, in the footer or the cover.
- Do use the dot to show where the reader is: the current section, the current step and the chosen option.
- Do keep WCAG AA contrast (4.5:1 for text, 3:1 for large text and for the focus ring).
- Do keep the page readable with JavaScript off and in print.
- Do separate blocks with space. Lines are for three things only: the route under the top bar, the rules of a table, and the line above a margin label.
- Do style the parts the browser draws: the text selection, the caret, the focus ring, the underline offset and the scrollbar of a scrolling block.
- Don't draw a box around a block. A figure or code block sits in a well; a note sits in the margin; a warning is a dot and a word.
- Don't fill an area with `primary`, `secondary` or `tertiary`. The mark's own tile is the one exception, because a favicon must stay clear on any background.
- Don't use gradients, drop shadows or glass effects. The page is flat.
- Don't use `tertiary` (lamp) for status, links or body text.
- Don't use green, amber or red for anything except status. They mean the same thing inside the diagrams.
- Don't add a host project's colors to these tokens. A project that needs its own accent overrides `primary` in one place.
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

A widget lets the reader do one small thing on the page. Docent has three widgets and no others, and a script builds each one from data, so a widget looks and behaves the same in every document.

**When a widget is allowed.** Only when the reader must do one of three things. In every other case, text, a table or a closed section is better.

| The reader must | Widget | What it looks like |
|---|---|---|
| Choose one case of several | **Chooser** | A short label, then one option for each case. Below them, the text of the chosen case only. |
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

**Memory.** A chooser remembers the choice, and a checklist remembers the ticks of this document. The page keeps both in the reader's own browser; nothing leaves the file. Choosers with the same cases change together, so the reader picks once.

**Keyboard.** Options are radio buttons and boxes are checkboxes, so the arrow keys, the space key and the Tab key work as in any form. The focus ring is the ultramarine ring of the page.

**Text only.** A widget holds text: paragraphs, code, lists and short lines. It holds no markup of the author's own, and no script.

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
