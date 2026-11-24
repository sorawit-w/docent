# Proposal: slide decks — a `deck` profile in the same kit

Status: **approved on 2026-11-24**, as written, with the recommended answer to each decision (see "Decided" near the end). No code is written yet. The items are built in the order of section 10, each in its own pull request. On 2026-11-23 the user decided that the slide deck restriction will be removed, because analysts sometimes need to present their findings. The plan agreed then: a `deck` profile in the same kit, with the same `render`, `stamp` and `check`; and the words "slide decks" leave the "Do not use it for" line in `SKILL.md` when the deck profile is built, not before. This proposal says how. The sample content is invented, on the "Report a bug" topic, and it reuses the bar chart example of [`charts.md`](charts.md).

## The answer first

A deck is a Docent document with `data-profile="deck"`. Each slide is a `<section class="slide">` with one heading and one body: one figure, or at most three points, or up to three large numbers, or one small table. The file opens as a stack of short sections, like any Docent page. A **Present** button in the top bar turns the stack into slides: one slide fills the screen, the arrow keys and a swipe move between slides, and the slide number stays in the corner. With scripts off the deck is still the stack. On paper it prints one slide to a page.

A deck is its own file, not a "present" mode of a report. A report and its deck serve two different readers, and one file cannot be cut into both by a script (section 2).

On a shared screen, AA contrast is not enough. A model of room light, run with Docent's own contrast function, shows that the muted text, the accent and the status colors fall under 4.5:1 first, and that dark mode falls fastest (section 4). So in present mode a slide is always light, muted text takes the text color, and every text pair is 7:1 or more. Text uses the existing six sizes, laid out on a 1280 × 720 frame that grows to fill the screen. Drawings stand at 1.5 times their real size, so their 14px names show at 21px, the smallest size on a slide.

| # | Pull request | Size |
|---|---|---|
| 1 | The deck profile in its reading form: the slide markup, the stack, the starting page `assets/deck.html`, and `check`'s slide rules | Medium |
| 2 | Present mode: the Present button, the 16:9 frame, moving between slides, the slide number, the screen reader, and the projection colors | Large |
| 3 | Figures on a slide: the scale, the form `render` picks for a slide, and what `check` refuses | Medium |
| 4 | Paper: one slide to a page, and each figure's words on the page after it | Medium |
| 5 | Speaker notes | Small |
| 6 | `SKILL.md`, `DESIGN.md` and a sample deck: "slide decks" leaves the "Do not use it for" line | Small |
| 7 | Later: a walkthrough as steps inside one slide; a presenter view in a second window; `check` compares a deck's data with its report's | Each its own |

## The obvious answers that would be wrong

**Add Reveal.js, or another slide library.** It is a large script with its own style sheet, its own look and its own markup. The page is no longer a small file that `check` can read: the library builds the slides when the page opens, so `check` would test markup that nobody sees. Its themes would bring fonts, gradients and colors that Docent does not have, and the reader would get a second look beside the documents. `DESIGN.md` already says that Docent loads no script from outside and draws with no third-party renderer. The parts a deck needs (show one section, move with the keys, scale a frame) are a short new part of `kit.js`, written only into a deck.

**A "present" button on every document, which cuts each section into slides.** It sounds free, because the report already exists. But a report section holds paragraphs, tables and code at reading sizes. A script that cuts it gives slides that are full of text, tables cut between two rows, and headings that name a topic and say nothing. The people in the room then read the screen instead of listening. Section 2 weighs this in full.

**Export to PowerPoint (`.pptx`).** It is a second file format with its own rules. `check` cannot read it, dark mode and the reading form are lost, the table in words under each chart is gone, and the drawings become pictures. An author who needs `.pptx` can use a tool made for it; Docent stays one HTML file.

**Shrink the report's text column to fit a screen.** A deck is not a smaller report. A slide shows one point for a room to see from a distance, so it needs larger text and fewer words, not the same text in less space.

---

## 1. Why a profile, and not a separate tool

A deck needs almost everything that Docent already has: the tokens, the type, the drawings and their phone forms, the table in words, the host's logo and colors, the palettes, the skip link, print styles, and `check`. A separate tool would copy all of that and then drift from it. A profile keeps one kit.

**What a profile does today.** `DESIGN.md` says: "The profile sets the block width and the space; it never changes the text column, the type or the colors." A deck breaks this rule on purpose: in present mode it lays text out on a slide frame at larger sizes, and it sets the projection colors. So the rule needs one more sentence when the deck is built (section 9):

> The Deck profile is the one exception: in present mode it lays out each slide on a frame of its own, with the sizes and colors of "Slides".

The other choice is a separate attribute, such as `data-deck`, so that "profile" keeps its meaning. That is decision 2. A profile is the simpler word for the author: `SKILL.md` already teaches "choose a profile from what the reader does with the page", and a deck is one more thing a reader does with a page.

**What stays the same.** The three scripts, in the same order. `render` draws every diagram from its data. `stamp` puts the kit into the file, and it writes the deck's styles and script only into a deck, as it already writes only the palette that a page names. `check` tests the deck with the rules of every page, and with the slide rules below.

**What is new.** One block in `kit.css` and one in `kit.js`, written only into a deck; a starting page, `assets/deck.html`, because `template.html` holds one of each block of a document and a deck uses few of them; the slide rules in `check`; and a "Slides" part in `DESIGN.md`.

---

## 2. One file, or a document that can also be presented

There are three readers. **The people in the room** see the screen from a distance, for about a minute per slide, while someone talks. **The presenter** needs to know what to say. **The reader afterwards** gets the file by email and reads it alone, with no one to talk them through it.

| | A. A deck is its own file | B. A "present" mode of a report | C. One file holds the report and its slides |
|---|---|---|---|
| The people in the room | Slides written as slides: one point, large, few words | Slides cut by a script: long sections, small tables cut between rows | Slides written as slides |
| The presenter | Speaker notes on each slide (section 8) | The report's text, which is too long to read out | Speaker notes |
| The reader afterwards | A short stack, with notes and a link to the report | The report, which is the best thing to read | The report, with each slide hidden or repeated in it |
| The author | Writes the slides; copies the data blocks from the report, so each chart is the same | Writes nothing more | Writes both in one file; the slides repeat the report's numbers inside it |
| `check` | Tests each slide | Cannot test slides that a script makes when the page opens | Tests two layouts in one file, and must tell which block belongs to which |
| Print | One slide to a page | Which one: the report, or the slides? | Which one? |

**Recommended: A, a deck is its own file** (decision 1). A report and a deck answer different questions. The report says everything, for a reader who has time. The deck says one thing at a time, for a room. A script cannot write the short sentence that a slide needs, so B gives poor slides. C gives each reader the right thing, but it puts two documents in one file: the author edits the same number in two places, a reader with scripts off sees both, and print must choose.

**The risk of A is drift:** the report is corrected and the deck is not. Two things reduce it. The author copies the data block of each chart from the report, so both files draw the same chart from the same numbers. And a later `check` option compares the two files (item 7): `check deck.html --report report.html` warns when a data block with the same `id` differs in the two files. The title slide links to the report, so the reader afterwards can find the full text.

---

## 3. What a slide is

**One heading and one body.** The heading is one sentence that says the point of the slide, not a topic: "Sign-in gets the most bug reports", not "Bug reports by area". The body shows the evidence for that sentence. A slide holds one of these bodies, and nothing else:

| Body | Limit | Why this limit |
|---|---|---|
| One figure | One drawing that fits the slide (section 7), and one source line under it (the `.source` line of [`sources.md`](sources.md), once it is built) | One chart per point. Two charts on one slide are two points. |
| Points | At most 3, each at most one line at 30px (about 75 characters) | More than three points is a list to read, not a point to see. |
| Large numbers | A card grid of at most 3 cards: the number at 52px, one line at 21px | Three cards fill a row of the slide (384px each). |
| A small table | At most 4 columns and 5 rows under the heading row, at 21px | It fits the height of a slide (see "Measured"). A larger table belongs in the report. |
| A short paragraph | At most two lines at 30px | One sentence of context, such as a quote from a report form. |
| A code block | At most 8 lines, at 21px | For a developer audience: one command or one error message. |

A slide may also have no body: a heading alone, to start a new part of the talk.

**The title slide** is the first slide. It holds the `<h1>`, the opening paragraph, and a facts list: who presents, the date, and a link to the report.

**The markup.** A slide is a `<section>` with an `id` and a heading, directly inside `<main>`. Each body uses the block that a document already uses, so a reader with scripts off sees a normal Docent page.

```html
<html lang="en" data-profile="deck">
...
<main class="shell" id="content">
  <section class="slide title" id="s1" aria-labelledby="s1-h">
    <h1 id="s1-h">Better bug reports</h1>
    <p class="standfirst">What a good bug report holds, and why it is fixed sooner.</p>
    <ul class="facts">
      <li>Support team review</li>
      <li>The full report: <a href="report-a-bug.html">report-a-bug.html</a></li>
    </ul>
  </section>

  <section class="slide" id="s2" aria-labelledby="s2-h">
    <h2 id="s2-h">Ask for three things in every bug report</h2>
    <ul>
      <li>What you did, step by step</li>
      <li>What you expected to happen</li>
      <li>What happened instead, with the error text</li>
    </ul>
    <details class="notes"><summary>Speaker notes</summary>
      <p>Most reports we get hold only the third point. Ask the team which of the three they miss most often.</p>
    </details>
  </section>

  <section class="slide" id="s3" aria-labelledby="s3-h">
    <h2 id="s3-h">Sign-in gets the most bug reports</h2>
    <figure>
      <div class="fig">
<!-- docent:diagram
{"id": "reports-by-area", "kind": "bar", "label": "Sign-in had the most bug reports in the third quarter, 412. ...", "scale": {"from": 0, "to": 500, "step": 100, "unit": "reports"}, "rows": [...]}
-->
<!-- /docent:diagram -->
      </div>
      <figcaption>Bug reports in the third quarter, from the support queue.</figcaption>
    </figure>
  </section>
</main>
```

**How `check` keeps a slide short.** `check` estimates the height of each slide at slide sizes, with the renderer's own width estimate (`textWidth` in `scripts/lib/text.cjs`): the heading's lines at 52px, the body's lines at 30px or 21px, and a figure at its slide scale. A slide holds 592px inside its margins. A slide that is taller is an **error**, because in present mode its end would be cut off the screen: `slide 4 is about 660px tall, and a slide holds 592px. Cut a point, or move the detail to the speaker notes or to the report`. A heading longer than two lines is an error for the same reason. More than three points, more than one body, or a body that is not in the table above are errors too, each with its message.

The estimate is for the system sans-serif. The heading is in the serif, so `check` estimates it with the sans-serif at weight 600, which is wider than the serif on Apple devices. The build PR checks this in a browser.

**What `check` tests:**

- Every child of `<main>` is a slide, and the first one is the title slide with the `<h1>`. Every slide has a unique `id` and one heading, `<h2>` after the title slide.
- Each slide has at most one body from the table above, within its limits, and fits the slide's height.
- A deck has no widget, no walkthrough (until item 7) and no closed section other than a figure's words and the speaker notes.

`check` cannot tell from the source whether a heading says a point or only names a topic, so it does not try. `SKILL.md` says it instead: "A slide's heading is one sentence that says its point."

---

## 4. Projection: sizes and contrast

### Sizes

The slide is laid out on a frame of 1280 × 720 CSS pixels, with 64px margins, so 1152 × 592 inside. In present mode the whole frame grows to fill the screen, as one picture; on a 1920 × 1080 screen everything is 1.5 times as large. The slide uses three of Docent's six sizes, and adds none:

| On a slide | Size on the frame | Share of the screen's height | On a 1920 × 1080 screen |
|---|---|---|---|
| Heading (the `h1` size) | 52px | 7.22% | 78px |
| Points and a short paragraph (the `h2` size) | 30px | 4.17% | 45px |
| Small text: a source line, a card's line, a table, code, the slide number (the `body-lg` size) | 21px | 2.92% | 31.5px |
| A drawing's names, at 1.5 times | 21px | 2.92% | 31.5px |
| A drawing's notes, at 1.5 times | 18px | 2.50% | 27px |
| For comparison: a document's body text, 16px, at 100% | — | 1.48% | 16px |

So the smallest text on a slide is about 1.7 times the share of the screen that a document's body text takes (2.50% against 1.48%), and the points are about 2.8 times (45px against 16px on the same screen).

**How far away can the room sit?** There is a standard for this: ANSI/INFOCOMM V202.01, "Display Image Size for 2D Content in Audiovisual Systems" ([AVIXA](https://www.avixa.org/resources/standards/display-image-size-for-2d-content)). It relates the height of the smallest element to the distance of the farthest viewer. This proposal did not read the standard's formula, so it takes no number from it. The shares above are what a room planner needs to apply it. Decision 9 asks whether the build PR should check the sizes against it.

A deck ignores `data-text="large"` in present mode, because its text is already large. In the reading form it follows the setting, as any page does.

### Contrast

On a projector, the room's light falls on the screen, and it adds the same light to every color. The dark colors become lighter, and the contrast falls. The model: add a share `a` of the screen's white to the luminance of both colors, and compute the WCAG contrast again. The luminance comes from Docent's own `contrast` function in `scripts/lib/color.cjs` (the contrast of a color with black is (L + 0.05) / 0.05). The values of `a` are examples, not measures of a real room: 0.05, 0.1 and 0.2.

| Pair | Clean | +0.05 | +0.1 | +0.2 |
|---|---|---|---|---|
| Light: text on page | 15.82 | 9.34 | 6.80 | 4.60 |
| Light: heading (ink) on page | 14.08 | 8.73 | 6.48 | 4.47 |
| Light: accent on page | 7.41 | 5.70 | 4.71 | 3.61 |
| Light: muted on page | 6.30 | 5.05 | **4.27** | 3.37 |
| Light: OK (success) on page | 4.92 | **4.15** | 3.64 | 2.99 |
| Light: Error on page | 5.18 | **4.33** | 3.77 | 3.07 |
| Light: line on page | 1.40 | 1.38 | 1.35 | 1.32 |
| Light: line in the muted color, as with more contrast | 6.30 | 5.05 | 4.27 | 3.37 |
| Dark: text on page | 15.14 | 8.55 | 6.15 | 4.15 |
| Dark: accent on page | 7.23 | **4.33** | 3.27 | 2.39 |
| Dark: muted on page | 6.65 | **4.02** | 3.06 | 2.26 |
| Dark: Error on page | 5.47 | **3.39** | 2.63 | 1.99 |

Bold marks the first value under 4.5:1. Solved for the point where each text pair falls to 4.5:1: light text at +0.21, the light accent at +0.11, light muted at +0.08; dark text at +0.17, the dark accent and dark muted at +0.04.

**What this means:**

- **AA is not enough on a shared screen.** A pair that passes 4.5:1 with little to spare fails as soon as the room has some light. Docent's text and heading colors keep 4.5:1 until the room adds about a fifth of the screen's white; the muted color, the accent and the status colors fail much sooner.
- **Dark mode fails fastest,** because its page is close to black, and the room's light lifts it the most. Its accent and muted colors fall under 4.5:1 at +0.04.
- **The thin lines vanish in both themes:** 1.40:1 on a clean screen. With the muted color, as the reader's "more contrast" setting already gives, the lines start at 6.30:1 and keep 3:1 beyond +0.2.

**The rules for a slide in present mode:**

1. **Always light** (decision 3). The presenter's laptop may be in dark mode; the projector should not follow it. The reading form still follows the reader's theme, as every page does.
2. **The "more contrast" tokens are on.** `--line` takes the muted color, and `--muted` takes the text color, as in the existing block for `prefers-contrast: more` (decision 4). A note and a name then differ by size and weight, which still holds on a slide. The block exists already, so this is one more selector, not new colors.
3. **A status word takes the text color**, and only its dot takes the status color. The word then has 15.82:1. The dot is a mark and needs 3:1: OK keeps 3.64:1 at +0.1 and 2.99:1 at +0.2. The word beside it always says the status.
4. **Every text pair on a slide is 7:1 or more on a clean screen,** WCAG's AAA level. With rules 1 to 3 the pairs are: text 15.82, heading 14.08, accent 7.41. `tests/contrast.py` gains these pairs.
5. **The heat steps do not change.** Step 1 against the band is 1.25:1 on a clean screen, as on the page. The legend, the numbers in the cells and the table in words already give each amount (as in [`reader-settings.md`](reader-settings.md), section 3).

The model leaves out the projector's own black level and its color. The build PR (item 2) looks at the sample deck on one real projector or shared screen before it merges.

**What `check` tests:** a host's accent in a deck should have 7:1 on the light page, not only 4.5:1. `check` warns, and does not refuse, because `brand.cjs` darkens a host's accent only to 4.6:1 and the host may not want a darker one: `in a deck the accent should have 7:1 on the page, because a projector lowers contrast; #… has 5.1:1`. Links are rare on a slide, so the warning matters most for the dots.

---

## 5. Moving between slides

**Entering and leaving.** The top bar of a deck holds the host's logo and name, a **Present** button, and the theme switch; it has no section links, because a deck has many short sections. The Present button is a control like the theme switch: 32px high, a thin outline, corners of 6px. It asks the browser for the full screen and shows the current slide; when the browser refuses the full screen, the slide fills the window. **Escape** leaves present mode and returns to the stack, at the same slide. Leaving the full screen with the browser's own key also leaves present mode, so one key does both.

**Keyboard.**

| Key | What it does |
|---|---|
| Right arrow, Down arrow, Page Down, Space | The next slide |
| Left arrow, Up arrow, Page Up, Shift + Space | The previous slide |
| Home, End | The first slide, the last slide |
| Escape | Leaves present mode |

Page Down and Page Up are listed because most hand-held clickers send them. Tab moves between the controls of the frame and the links on the slide; the focus ring is the page's ring.

**Touch.** A swipe to the left shows the next slide, and a swipe to the right the previous one. A tap does nothing, so a tap on a link opens the link.

**The slide number** stands at the lower right of the frame: "4 / 12", at 21px in the text color, with tabular figures. Beside it are two buttons, Previous and Next, 44px square on the frame, with a thin outline; a pointer or a finger can use them, and they are the way a mouse moves without the keys. They have no fill, so they stay quiet on the slide.

**The address.** The address ends with the slide's `id` (`#s4`), so a reload keeps the place and a link can open one slide. The script replaces the address and does not add to the browser's history, so the Back button leaves the deck instead of stepping through slides.

**What a screen reader hears.** In present mode the slides that do not show are hidden, so a screen reader cannot wander into them. Each slide is a group named as a slide: `role="group"`, `aria-roledescription="slide"` and `aria-label="4 of 12"`, the pattern for a carousel in the WAI-ARIA Authoring Practices. When the slide changes, the focus moves to the new slide, so the screen reader reads "4 of 12, slide", then the heading. The visible number "4 / 12" is hidden from the screen reader, so it is not read twice. In the reading form a deck is a page of sections with headings, and a screen reader moves through it as through any page.

**Motion.** A slide changes at once, with no slide, fade or zoom, in every setting, not only with reduced motion. Docent's rule is that motion must show where to look or what comes next, and the new slide already shows both. The one moving part is Docent's own: a diagram's dot travels the route twice when its slide shows, as it does when a diagram comes into view on a page, and with reduced motion there is no dot. `DESIGN.md`'s Motion table gains one row: "A slide changes — No animation".

**What `check` tests:** nothing here; the source cannot show behavior. The browser test of item 2 presses each key, swipes, reads the address and the focus, and checks the names that a screen reader gets, in Chrome, Safari and Firefox.

---

## 6. With scripts off, and on paper

**With scripts off** there is no present mode and no Present button. The deck is the stack: a title block and a column of short sections, each with its heading and body at reading sizes, like any Docent page. Each slide's number stands before its heading in the muted color, as the number of a step does, so a reader can follow "on slide 4" in an email. The speaker notes are closed sections (section 8). The figures keep their drawings and their words. Nothing is lost except the full-screen view.

(A deck could fake slides without a script, with CSS scroll snap: each section as tall as the window. It was left out: the arrow keys and the slide number would not work, and a reader who scrolls would be pushed back to the start of each section.)

**On paper** a deck prints one slide to a page, in the slide form, not the stack: each slide is the frame of present mode, as large as the page allows. The deck sets `@page { size: landscape }`, which keeps the reader's choice of A4 or Letter, and each slide breaks to a new page. Paper is light, as it is for every page. The top bar, the Present button, the Previous and Next buttons and the speaker notes do not print. The slide number prints at the lower right of each slide.

**A figure's words on paper.** A slide has no room for its table in words: an A4 page in landscape holds the slide at about 261mm by 147mm, which leaves about 27mm. So each figure's words print on the page after its slide, under the heading "Slide 4 in words" (decision 6). The other choices: all the words together at the end, or no words on paper. A reader of gray print needs the exact numbers of a heat map, so they should print, and next to their slide is easier to find than at the end.

**The risk.** The frame must grow to the width of the sheet without a script. CSS can do it in several ways (container query units, `zoom`, a transform), and the three browsers print them differently. Item 4 tests the print preview in Chrome, Safari and Firefox, on A4 and on Letter. A browser that cannot scale the frame prints the stack instead, which is still complete.

**What `check` tests:** nothing new; the print rules are in `kit.css`, and the browser test of item 4 opens the print preview.

---

## 7. Charts and diagrams on a slide

**The scale.** A drawing on a slide stands at 1.5 times its real size, so its 14px names show at 21px and its 12px notes at 18px. A 640px chart is then 960px wide, inside the slide's 1152px. Without the scale, the names would be 14px on a 1280px frame: 1.9% of the screen's height, about a third smaller than the slide's smallest text.

**The room.** Under a heading of one line and above one source line, a slide has 473px for a drawing, so 315px at its real size; under a heading of two lines, 418px, so 278px. The width allows 768px at its real size.

**What fits.** Measured on the desktop form of every drawing that the tests store (`tests/expected`, 58 drawings):

| Rule | Fits | Which |
|---|---|---|
| 1.5 times, heading of two lines | 12 of 58 | Plans, short heat maps and status grids, the dumbbell of 5 rows, a layout of one row, a wide route of 3 legs |
| 1.5 times, heading of one line | 18 of 58 | Also the bar chart of 7 rows, the funnel, the line charts, the slopegraph, the calendar status grid |
| 1.5 times, or down to 1.25 times when needed, heading of one line | 23 of 58 | Also the wide route of the workflow examples (858px wide, at 1.34 times), the timing diagram (1.34), the communication diagram (1.31) and the screen layout (1.28) |

**Recommended: 1.5 times, or less down to 1.25 times when a drawing needs it** (decision 5). At 1.25 times the names are 17.5px on the frame, 2.43% of the screen's height, still larger than every text of a document on that screen. The gain is the wide workflow route, which is Docent's own diagram and the one an analyst will most often want to show. The other choice, 1.5 times only, keeps one size on every slide and loses the route.

**What does not fit,** and why that is right: Route tall and Plates (500px or taller), the sequence diagram, the flowchart and the activity diagram, and the structural UML kinds (class, component, deployment and the others). These show a whole system or a long process. On a slide they would be too small to read from the back of the room. The report holds them, and the slide can show a part: a sequence diagram of three messages instead of eleven, or a wide route of five legs.

**What `render` does on a slide.** It knows that a block is on a slide from the `<section class="slide">` around it. It picks the form by the usual rule, and then by the room on the slide: Route wide before Route tall, because Route wide is low. A scale chart keeps its 640px form; its height comes from its rows, so the author fits it by the number of rows. When no form fits at 1.25 times, `render` refuses the drawing and says the numbers: `slide 6: the sequence diagram is 746 × 496px; a slide holds 921 × 378px at 1.25 times. Show fewer messages on the slide, and the full diagram in the report`.

**A hand-drawn figure** follows the same rule: at most 640 × 831px on a page, and on a slide it must fit at 1.25 times or more. `check` tests its size against the slide.

**The table in words.** Every drawing keeps its closed section "The diagram in words". In the reading form it stays under the drawing, as on any page. In present mode it does not show on the slide: the room cannot read a table at that size, and the drawing's `label` is still its name for a screen reader. On paper it prints on the page after the slide (section 6).

**The walkthrough** is not on a slide in the first version, because it lights one step at a time as the reader scrolls, and a slide does not scroll. Item 7 turns it into steps inside one slide: the Next key lights the next leg before it moves to the next slide, and the number says "4 / 12, step 2 of 3". With reduced motion the leg lights and the dot rests, as on a page.

**What `check` tests:** each drawing on a slide fits at 1.25 times or more; the drawing is the one `render` makes from its data, as on any page; the figure has at most one source line under it.

---

## 8. Speaker notes

**The markup.** A slide may end with one closed section of notes:

```html
<details class="notes"><summary>Speaker notes</summary>
  <p>Most reports we get hold only the third point. Ask the team which of the three they miss most often.</p>
</details>
```

It holds text only: paragraphs and lists. It is a `<details>`, not an `<aside>`, so it is closed with scripts off too.

**Where the notes show:**

| Where | The notes |
|---|---|
| Present mode, on the shared screen | Hidden. Nothing on the projected slide shows them, and the screen reader skips them there. |
| The reading form, with scripts on or off | A closed section at the end of the slide, "Speaker notes" (decision 7) |
| Paper | Hidden. The print styles leave them out, also when the section is open. The kit's script opens every closed section before printing; it skips the notes. |

**How the presenter reads them.** In the first version, the presenter opens the same file twice: present mode on the projector, and the reading form in a second window on the laptop's own screen, with the notes open. Nothing joins the two windows, so the presenter moves both. A presenter view, where the second window follows the first, is item 7. It waits for a browser test, because two windows opened from a file (`file://`) may not be allowed to talk to each other in every browser, and Docent must work from a file.

**Notes are not secret.** Anyone who has the file can open them, and anyone can read the source. `SKILL.md` says so: "Write nothing in the speaker notes that the readers of the file must not see."

**What `check` tests:** at most one notes section per slide, as the slide's last child; text only (no figure, table, widget or code block); a warning when a note looks like it holds personal data, as for the rest of the page.

---

## 9. The `SKILL.md` and `DESIGN.md` changes, when it is built

These changes come with item 6, after items 1 to 4 are merged, so that an agent never chooses a deck that the kit cannot yet show or print. Items 1 to 5 each add their own part of `DESIGN.md` as they land, behind the profile, and the starting page; the opening of `SKILL.md` waits for item 6.

**`SKILL.md`, the description.** "Do not use it for app screens, slide decks or marketing pages." becomes "Do not use it for app screens or marketing pages." One sentence is added before it: "It also makes a short slide deck, to present a report's findings in a meeting."

**`SKILL.md`, "When to use it".** One bullet:

> - The user asks for slides to present findings in a meeting or on a shared screen: write a deck (`data-profile="deck"`), and start from `assets/deck.html`.

The line "Do not use it for app screens, slide decks or marketing pages." becomes "Do not use it for app screens or marketing pages." In "Choose a profile", the sentence "When the user asks for an app screen, a slide deck or a marketing page, say that Docent is not made for it" drops "a slide deck".

**`SKILL.md`, "Choose a profile".** One row:

| Profile | For | Write first | On the page |
|---|---|---|---|
| `deck` | Slides to present findings in a meeting | One point per slide, as a sentence in the heading; the evidence below it | A stack of short sections; Present shows one slide on the full screen |

**When an agent chooses a deck.** A new short part, "Write a deck":

- Write a deck only when the user asks for slides, a deck, or something to present or share on a screen. Never choose a deck on your own for a report: the reader afterwards needs the report.
- When the user asks for a report and slides, write the report first. Then write the deck from it, and copy each chart's data block from the report, with the same `id`.
- One point per slide. The heading is one sentence that says the point. The body is one figure, at most three points, up to three large numbers, or one small table.
- Put what you would say in the speaker notes, not on the slide. Write nothing in the notes that the readers of the file must not see.
- Link the report from the title slide.
- Look at the deck in present mode, in the reading form, and in print preview. `check` cannot see a slide.

**`DESIGN.md`.** The sentence in "Profiles" that names the exception (section 1), and a Deck line in the list of profiles. A new part, "Slides", after "Card grid": the frame, the sizes of section 4, the bodies and their limits of section 3, present mode, and the projection colors. In "Contrast": the deck's pairs at 7:1. In "Motion": the row for a slide change. In "Print": one slide to a page, and the words on the page after.

**`PRODUCT.md`.** "guides and reports" becomes "guides, reports and the decks that present them", in Product Purpose.

---

## 10. Order of building

Each item is its own pull request, and each starts after the one before it is merged, except where noted.

1. **The deck profile in its reading form.** `data-profile="deck"`, `section.slide`, the title slide, slide numbers before the headings, the starting page `assets/deck.html`, `stamp` writing the deck block only into a deck, and `check`'s slide rules of section 3 (structure, one body, the limits, the height estimate). It comes first because the markup and the rules decide everything after it, and because a deck that reads as a stack is already useful to send by email. Tests: a fixture deck that passes, and one fixture for each error. Medium.
2. **Present mode.** The Present button, the full screen, the 1280 × 720 frame and its scale, the keys, the swipe, the slide number and its buttons, the address, the screen reader names and the focus, always light, the "more contrast" tokens and the status word in present mode, and the 7:1 rule for a host's accent in `check`. Tests: a browser test in Chrome, Safari and Firefox (section 5), the new pairs in `tests/contrast.py`, and a look at one real projector or shared screen. Large.
3. **Figures on a slide.** The scale from 1.5 down to 1.25 times, `render`'s choice of form by the room on the slide, its refusal with the numbers, the figure's words hidden in present mode, and `check`'s size test, also for a hand-drawn figure. It can be built at the same time as item 2, because it touches `render` and `check`, and item 2 touches `kit.css` and `kit.js`. Tests: each kind of the "What fits" table on a fixture slide, and the refusal. Medium.
4. **Paper.** One slide to a page in landscape, the frame scaled to the sheet, the words on the page after the slide, the stack as the fallback. Tests: print preview in three browsers, on A4 and Letter. Medium.
5. **Speaker notes.** The closed section, hidden in present mode and on paper, skipped when the script opens sections for printing, and `check`'s rules. It is small, and it can follow item 1 at any time. Small.
6. **`SKILL.md`, `DESIGN.md`, `PRODUCT.md` and a sample deck** (`assets/specimen-deck.html`, on the "Report a bug" topic, with the bar chart of `charts.md`). The words "slide decks" leave the "Do not use it for" line here, and not before. Small.
7. **Later, each with a short proposal first:** a walkthrough as steps inside one slide; a presenter view, after a browser test of two windows opened from a file; and `check deck.html --report report.html`, which warns when a data block with the same `id` differs.

---

## Measured

Two scripts, run with Node 24.20.0 from this repo. They use Docent's own code: `contrast` in `skills/docent/scripts/lib/color.cjs` and `textWidth` in `skills/docent/scripts/lib/text.cjs`, and they read the stored drawings in `tests/expected`. They are not part of the kit. Run the first from `skills/docent` and the second from the repo root:

```bash
cd skills/docent && node measure-deck.cjs
```

```bash
node fit-slide.cjs
```

<details><summary>measure-deck.cjs</summary>

```js
// Run from skills/docent: node <path>/measure-deck.cjs
const path = require("path");
const lib = path.resolve(process.cwd(), "scripts/lib");
const { contrast } = require(path.join(lib, "color.cjs"));
const { textWidth } = require(path.join(lib, "text.cjs"));
const r2 = (x) => Math.round(x * 100) / 100;

console.log("== slide frame: 1280 x 720 CSS px, 64px margins, so 1152 x 592 inside");
const W = 1152, H = 720, M = 64;
for (const [name, px] of [["heading (h1 token)", 52], ["points (h2 token)", 30], ["small (body-lg token)", 21], ["drawing name x1.5", 21], ["drawing note x1.5", 18]]) {
  console.log(`  ${name.padEnd(22)} ${px}px = ${r2(px / H * 100)}% of the slide height; on a 1920x1080 screen ${r2(px * 1080 / H)} device px`);
}
console.log("  document body 16px on a 1920x1080 screen at 100%: 16 device px, " + r2(16 / 1080 * 100) + "% of the screen height");

console.log("== how much fits on one line, by the renderer's width estimate (system sans; the serif heading is estimated with the sans at weight 600)");
const sample = "Most bug reports arrive without the steps that show the bug again";
const avg = (size, weight) => textWidth(sample, size, weight) / sample.length;
for (const [name, size, weight] of [["heading 52px", 52, 600], ["points 30px", 30, 400], ["small 21px", 21, 400]]) {
  const per = avg(size, weight);
  console.log(`  ${name}: ${r2(per)}px per character, about ${Math.floor(W / per)} characters in 1152px`);
}
const heads = ["Most bug reports lack the steps to repeat the bug", "A report with steps is fixed in half the time", "Ask for three things in every bug report"];
for (const h of heads) console.log(`  heading "${h}" (${h.length} chars, ${h.split(" ").length} words): ${r2(textWidth(h, 52, 600))}px at 52px`);
const pts = ["What you did, step by step", "What you expected to happen", "What happened instead, with the error text"];
for (const p of pts) console.log(`  point "${p}" (${p.length} chars): ${r2(textWidth(p, 30))}px at 30px`);

console.log("== room for a drawing on a slide");
const headingBlock = Math.round(52 * 1.06 * 2), gap = 32, caption = Math.round(21 * 1.5);
const room = H - 2 * M - headingBlock - gap - caption;
console.log(`  heading of two lines ${headingBlock}px + gap ${gap}px + one source line ${caption}px: ${room}px left for the drawing at x1.5, so ${Math.floor(room / 1.5)}px at its real size`);
const room1 = H - 2 * M - Math.round(52 * 1.06) - gap - caption;
console.log(`  with a heading of one line: ${room1}px, so ${Math.floor(room1 / 1.5)}px at real size`);
console.log(`  width: a 640px drawing at x1.5 is 960px, inside 1152px; at x1.8 it would be ${640 * 1.8}px`);

console.log("== contrast, clean, and with room light added to both colors (a share of the screen's white)");
const lum = (hex) => 0.05 * contrast(hex, "#000000") - 0.05; // contrast with black is (L + 0.05) / 0.05
const washed = (a, b, add) => { const [x, y] = [lum(a) + add, lum(b) + add].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const L = { page: "#fbfbfe", well: "#f2f3f9", text: "#1c1f2e", muted: "#575d75", line: "#d3d6e3", primary: "#2f3fd0", ink: "#1b2260", ok: "#1a7f37", warn: "#7d4e00", err: "#cf222e", heat1: "#c6e9ef", heat5: "#004a53" };
const D = { page: "#12141f", well: "#0b0d15", text: "#e7e9f3", muted: "#959bb3", line: "#2d3146", primary: "#8e9bff", ink: "#e7e9f3", ok: "#3fb950", warn: "#d29922", err: "#f85149", lamp: "#f2b824", heat1: "#093339", heat5: "#80cad7" };
const adds = [0, 0.05, 0.1, 0.2];
console.log("  pair".padEnd(34) + adds.map((a) => `+${a}`.padStart(8)).join(""));
const pairs = [];
for (const [mode, t] of [["light", L], ["dark", D]]) {
  for (const fg of ["text", "ink", "muted", "primary", "ok", "warn", "err"]) pairs.push([`${mode} ${fg} on page`, t[fg], t.page, 4.5]);
  pairs.push([`${mode} muted on well`, t.muted, t.well, 4.5]);
  pairs.push([`${mode} line on page`, t.line, t.page, 3]);
  pairs.push([`${mode} line=muted (more) on page`, t.muted, t.page, 3]);
  pairs.push([`${mode} heat-1 on page`, t.heat1, t.page, 0]);
  pairs.push([`${mode} heat-5 on page`, t.heat5, t.page, 0]);
}
pairs.push(["dark lamp dot on page", D.lamp, D.page, 3]);
for (const [label, a, b, need] of pairs) {
  const vals = adds.map((add) => washed(a, b, add));
  const first = adds.find((add, i) => need && vals[i] < need);
  console.log(`  ${label.padEnd(32)}` + vals.map((v) => r2(v).toFixed(2).padStart(8)).join("") + (need ? `   needs ${need}; ${first === undefined ? "holds to +0.2" : "falls under at +" + first}` : ""));
}
console.log("== the room light at which each text pair falls to 4.5:1 (solve (Lf+a+0.05)/(Lb+a+0.05) = 4.5)");
for (const [mode, t] of [["light", L], ["dark", D]]) for (const fg of ["text", "muted", "primary"]) {
  const hi = Math.max(lum(t[fg]), lum(t.page)), lo = Math.min(lum(t[fg]), lum(t.page));
  console.log(`  ${mode} ${fg} on page: +${r2((hi + 0.05 - 4.5 * (lo + 0.05)) / 3.5)}`);
}
console.log("== AAA (7:1) today, clean");
for (const [mode, t] of [["light", L], ["dark", D]]) for (const fg of ["text", "ink", "muted", "primary", "ok", "warn", "err"]) {
  const c = contrast(t[fg], t.page); if (c < 7) console.log(`  ${mode} ${fg} on page ${r2(c)} < 7`);
}
```

</details>

<details><summary>fit-slide.cjs</summary>

```js
// Run from the repo root: node <path>/fit-slide.cjs
// Reads the first <svg> (the desktop form) of each stored drawing in tests/expected and asks whether it fits a slide.
const fs = require("fs"), path = require("path");
const { textWidth } = require(path.resolve("skills/docent/scripts/lib/text.cjs"));
const INNER_W = 1152, ROOM_TWO = 418, ROOM_ONE = 473; // from measure-deck.cjs
const fit = (w, h, room, min) => { const s = Math.min(1.5, INNER_W / w, room / h); return s >= min ? Math.floor(s * 100) / 100 : null; };
const rows = [];
for (const f of fs.readdirSync("tests/expected").filter((n) => n.endsWith(".svg")).sort()) {
  const tag = fs.readFileSync(path.join("tests/expected", f), "utf8").match(/<svg\b[^>]*>/)[0];
  const w = +tag.match(/\bwidth="([\d.]+)"/)[1], h = +tag.match(/\bheight="([\d.]+)"/)[1];
  rows.push({ f: f.replace(".svg", ""), w, h, a2: fit(w, h, ROOM_TWO, 1.5), a1: fit(w, h, ROOM_ONE, 1.5), b1: fit(w, h, ROOM_ONE, 1.25) });
}
const show = (v) => (v ? `x${v}` : "no").padStart(6);
console.log("drawing".padEnd(24), "size".padEnd(10), "1.5 / 2-line", "1.5 / 1-line", "1.25-1.5 / 1-line");
for (const r of rows) console.log(r.f.padEnd(24), `${r.w}x${r.h}`.padEnd(10), show(r.a2).padStart(12), show(r.a1).padStart(12), show(r.b1).padStart(17));
const count = (k) => rows.filter((r) => r[k]).length;
console.log(`fit: ${count("a2")} / ${count("a1")} / ${count("b1")} of ${rows.length}`);
console.log("== example slide headings at 52px (one line holds 1152px)");
for (const h of ["Sign-in gets the most bug reports", "Ask for three things in every bug report", "Reports with steps are fixed in fewer days", "Better bug reports"]) console.log(`  ${h.padEnd(46)} ${Math.round(textWidth(h, 52, 600))}px, ${Math.ceil(textWidth(h, 52, 600) / INNER_W)} line(s)`);
```

</details>

The output of `measure-deck.cjs`:

```text
== slide frame: 1280 x 720 CSS px, 64px margins, so 1152 x 592 inside
  heading (h1 token)     52px = 7.22% of the slide height; on a 1920x1080 screen 78 device px
  points (h2 token)      30px = 4.17% of the slide height; on a 1920x1080 screen 45 device px
  small (body-lg token)  21px = 2.92% of the slide height; on a 1920x1080 screen 31.5 device px
  drawing name x1.5      21px = 2.92% of the slide height; on a 1920x1080 screen 31.5 device px
  drawing note x1.5      18px = 2.5% of the slide height; on a 1920x1080 screen 27 device px
  document body 16px on a 1920x1080 screen at 100%: 16 device px, 1.48% of the screen height
== how much fits on one line, by the renderer's width estimate (system sans; the serif heading is estimated with the sans at weight 600)
  heading 52px: 27.75px per character, about 41 characters in 1152px
  points 30px: 14.46px per character, about 79 characters in 1152px
  small 21px: 10.12px per character, about 113 characters in 1152px
  heading "Most bug reports lack the steps to repeat the bug" (49 chars, 10 words): 1342px at 52px
  heading "A report with steps is fixed in half the time" (45 chars, 10 words): 1160px at 52px
  heading "Ask for three things in every bug report" (40 chars, 8 words): 1071px at 52px
  point "What you did, step by step" (26 chars): 383px at 30px
  point "What you expected to happen" (27 chars): 428px at 30px
  point "What happened instead, with the error text" (42 chars): 611px at 30px
== room for a drawing on a slide
  heading of two lines 110px + gap 32px + one source line 32px: 418px left for the drawing at x1.5, so 278px at its real size
  with a heading of one line: 473px, so 315px at real size
  width: a 640px drawing at x1.5 is 960px, inside 1152px; at x1.8 it would be 1152px
== contrast, clean, and with room light added to both colors (a share of the screen's white)
  pair                                  +0   +0.05    +0.1    +0.2
  light text on page                 15.82    9.34    6.80    4.60   needs 4.5; holds to +0.2
  light ink on page                  14.08    8.73    6.48    4.47   needs 4.5; falls under at +0.2
  light muted on page                 6.30    5.05    4.27    3.37   needs 4.5; falls under at +0.1
  light primary on page               7.41    5.70    4.71    3.61   needs 4.5; falls under at +0.2
  light ok on page                    4.92    4.15    3.64    2.99   needs 4.5; falls under at +0.05
  light warn on page                  6.86    5.38    4.50    3.50   needs 4.5; falls under at +0.2
  light err on page                   5.18    4.33    3.77    3.07   needs 4.5; falls under at +0.05
  light muted on well                 5.87    4.72    4.01    3.18   needs 4.5; falls under at +0.1
  light line on page                  1.40    1.38    1.35    1.32   needs 3; falls under at +0
  light line=muted (more) on page     6.30    5.05    4.27    3.37   needs 3; holds to +0.2
  light heat-1 on page                1.25    1.23    1.22    1.20
  light heat-5 on page                9.66    6.87    5.44    3.99
  dark text on page                  15.14    8.55    6.15    4.15   needs 4.5; falls under at +0.2
  dark ink on page                   15.14    8.55    6.15    4.15   needs 4.5; falls under at +0.2
  dark muted on page                  6.65    4.02    3.06    2.26   needs 4.5; falls under at +0.05
  dark primary on page                7.23    4.33    3.27    2.39   needs 4.5; falls under at +0.05
  dark ok on page                     7.22    4.32    3.26    2.38   needs 4.5; falls under at +0.05
  dark warn on page                   7.26    4.34    3.28    2.39   needs 4.5; falls under at +0.05
  dark err on page                    5.47    3.39    2.63    1.99   needs 4.5; falls under at +0.05
  dark muted on well                  7.04    4.14    3.12    2.29   needs 4.5; falls under at +0.05
  dark line on page                   1.43    1.23    1.16    1.10   needs 3; falls under at +0
  dark line=muted (more) on page      6.65    4.02    3.06    2.26   needs 3; falls under at +0.2
  dark heat-1 on page                 1.35    1.19    1.13    1.08
  dark heat-5 on page                 9.91    5.75    4.24    2.98
  dark lamp dot on page              10.18    5.90    4.34    3.04   needs 3; holds to +0.2
== the room light at which each text pair falls to 4.5:1 (solve (Lf+a+0.05)/(Lb+a+0.05) = 4.5)
  light text on page: +0.21
  light muted on page: +0.08
  light primary on page: +0.11
  dark text on page: +0.17
  dark muted on page: +0.04
  dark primary on page: +0.04
== AAA (7:1) today, clean
  light muted on page 6.3 < 7
  light ok on page 4.92 < 7
  light warn on page 6.86 < 7
  light err on page 5.18 < 7
  dark muted on page 6.65 < 7
  dark err on page 5.47 < 7
```

The output of `fit-slide.cjs`:

```text
drawing                  size       1.5 / 2-line 1.5 / 1-line 1.25-1.5 / 1-line
activity                 696x1056             no           no                no
bar-days                 640x266            x1.5         x1.5              x1.5
bar-reports              640x308              no         x1.5              x1.5
branch.plates            780x546              no           no                no
bug-report.plates        780x546              no           no                no
bug-report.tall          468x568              no           no                no
bug-report.wide          858x264              no           no             x1.34
class                    552x720              no           no                no
communication            504x360              no           no             x1.31
component                696x1104             no           no                no
composite                264x432              no           no                no
dense.plates             1218x638             no           no                no
deployment               1116x672             no           no                no
five.plates              1170x512             no           no                no
five.tall                1068x576             no           no                no
five.wide                822x636              no           no                no
flow                     780x1228             no           no                no
funnel                   640x300              no         x1.5              x1.5
heatmap-errors           640x254            x1.5         x1.5              x1.5
heatmap-signups          640x278            x1.5         x1.5              x1.5
heatplan-help            640x274            x1.5         x1.5              x1.5
heatplan-product         640x382              no           no                no
interaction-overview     504x912              no           no                no
layout-a4                640x96             x1.5         x1.5              x1.5
layout-screen            640x368              no           no             x1.28
line-months              640x296              no         x1.5              x1.5
line-multiples           640x388              no           no                no
line-reports             640x296              no         x1.5              x1.5
line-slope               640x308              no         x1.5              x1.5
long-route.tall          506x883              no           no                no
long-route.wide          1360x264             no           no                no
object                   480x576              no           no                no
order.plates             1102x546             no           no                no
order.tall               734x574              no           no                no
order.wide               878x388              no           no                no
package                  672x528              no           no                no
pipeline.plates          780x546              no           no                no
pipeline.tall            440x568              no           no                no
pipeline.wide            858x264              no           no             x1.34
plan-dashboard           640x168            x1.5         x1.5              x1.5
plan-docs                640x208            x1.5         x1.5              x1.5
plan-editor              640x248            x1.5         x1.5              x1.5
plan-none                640x172            x1.5         x1.5              x1.5
profile                  648x384              no           no                no
range                    640x388              no           no                no
review.plates            380x522              no           no                no
review.tall              226x433              no           no                no
review.wide              638x140            x1.5         x1.5              x1.5
sequence                 746x496              no           no                no
side.tall                468x568              no           no                no
skip.plates              540x648              no           no                no
state                    1056x1200            no           no                no
statusgrid-builds        640x192            x1.5         x1.5              x1.5
statusgrid-calendar      640x280              no         x1.5              x1.5
statusgrid-uptime        640x216            x1.5         x1.5              x1.5
timing                   694x352              no           no             x1.34
uml-marks                576x384              no           no                no
usecase                  888x504              no           no                no
fit: 12 / 18 / 23 of 58
== example slide headings at 52px (one line holds 1152px)
  Sign-in gets the most bug reports              917px, 1 line(s)
  Ask for three things in every bug report       1071px, 1 line(s)
  Reports with steps are fixed in fewer days     1145px, 1 line(s)
  Better bug reports                             501px, 1 line(s)
```

Notes on the numbers:

- A heading of about 41 characters fits one line at 52px, and about 80 characters fit two. "Ask for three things in every bug report" is 1071px, so one line; "Most bug reports lack the steps to repeat the bug" is 1342px, so two lines.
- The room for a drawing counts the heading at its line height (52 × 1.06), a 32px gap, and one source line at 21 × 1.5. The build PR measures it in a browser.
- The scale in `fit-slide.cjs` is the largest of 1.5, the width allows, and the height allows. A drawing "fits" when that scale is at least the minimum of the rule.
- The heights of the scale charts come from their rows: `bar-reports` has 7 rows and is 308px high; `bar-days`, a dumbbell, has 5 and is 266px. `review.wide` is a route of 4 parts and 3 legs; `layout-a4` has one row.
- The small table of section 3 at 21px: a heading row and 5 rows of 21 × 1.5 + 2 × 12 = 55.5px each, about 333px, under the 418px of a slide with a heading of two lines.
- The contrast model adds room light to both colors and nothing else. It is a model, not a measure of a projector: section 4 says what it leaves out.
- `light ok on page` is 4.92 here; `DESIGN.md` says the status colors have "4.59 or higher on every surface they use". Both are true: 4.59 is the lowest of the surfaces.

---

## Decisions

Each decision has a recommended answer, which the proposal above follows, and the other choice, so the user can change one.

1. **A deck is its own file.** Recommended: yes (section 2). The room and the reader afterwards need different things, and a script cannot write a slide's sentence. The other choice: a "present" mode on every document, which costs the author nothing and gives slides full of text.
2. **Call it a profile, and add one exception to the profile rule in `DESIGN.md`.** Recommended: yes (section 1). Authors already choose a profile from what the reader does with the page. The other choice: a separate attribute, `data-deck`, so that a profile still never changes the type.
3. **Present mode is always light.** Recommended: yes (section 4). Dark mode loses contrast fastest under room light. The reading form still follows the reader. The other choice: present mode follows the theme, and the presenter switches it.
4. **On a slide, muted text takes the text color, the lines take the muted color, and a status word takes the text color.** Recommended: yes (section 4). It reuses the existing "more contrast" block, and every text pair on a slide reaches 7:1. The other choice: keep the page's colors on a slide, and accept that notes, sources and lines fade on a projector.
5. **A drawing on a slide at 1.5 times, or down to 1.25 times when it needs room.** Recommended: yes (section 7): 23 of the 58 stored drawings fit, with the wide workflow route among them. The other choice: 1.5 times only, one size on every slide, 18 drawings fit, and the wide route does not.
6. **A figure's words on paper go on the page after its slide.** Recommended: yes (section 6). The other choices: all the words at the end of the deck, or no words on paper.
7. **Speaker notes show in the reading form, as a closed section.** Recommended: yes (section 8). The reader afterwards gets the full sentences, and the presenter can read them in a second window. The other choice: notes show nowhere but the source, which keeps private remarks out of sight but hides the most useful text from the reader afterwards, and they are in the source anyway.
8. **The walkthrough, the presenter view and the comparison with a report come later.** Recommended: yes (item 7), each with a short proposal. A deck without them is complete. The other choice: build the walkthrough as steps inside a slide in item 3, because it is Docent's own way to show a process.
9. **Check the slide sizes against ANSI/INFOCOMM V202.01 before item 2 merges.** Recommended: yes, if a copy of the standard can be read; it is the one outside rule for text size on a shared screen, and this proposal did not read its formula. The other choice: keep the sizes of section 4, which are larger than a document's text, without an outside check.

## Decided

Approved on 2026-11-24, each with the recommended answer:

1. **A deck is its own file,** not a "present" mode of a report.
2. **The deck is a profile,** `data-profile="deck"`, and the profile rule in `DESIGN.md` gains one exception for it.
3. **Present mode is always light.** The reading form still follows the reader's theme.
4. **On a slide, muted text takes the text color, the lines take the muted color, and a status word takes the text color,** from the existing "more contrast" block, so every text pair reaches 7:1.
5. **A drawing on a slide stands at 1.5 times its real size, or down to 1.25 times when it needs room.**
6. **A figure's words on paper go on the page after its slide.**
7. **Speaker notes show in the reading form, as a closed section,** and never on the shared screen or on paper.
8. **The walkthrough inside a slide, the presenter view and the comparison with a report come later,** each with a short proposal of its own.
9. **The slide sizes are checked against ANSI/INFOCOMM V202.01 before item 2 merges,** if a copy of the standard can be read.

## Not in this proposal

- Code, and changes to `SKILL.md`, `DESIGN.md`, `check.cjs`, `kit.css`, `kit.js` or the template. Each build item comes in its own pull request.
- Slide transitions, builds that move, themes for decks, and a slide size other than 16:9.
- A deck that runs by itself on a timer, and recording a talk.
- Export to PowerPoint, Keynote or PDF files other than the browser's own print.
- A presenter view, the walkthrough as steps inside a slide, and the comparison of a deck with its report: item 7, each with its own short proposal.
