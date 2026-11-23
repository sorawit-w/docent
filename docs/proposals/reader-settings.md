# Proposal: the reader's own settings — forced colors and more contrast

Status: **proposed on 2026-11-23, with each open question decided** (see "Decisions" at the end). No code is written yet. A talk on 2026-11-23 asked whether Docent should have a "reading mode" for readers with a vision disability, such as color blindness. It settled the direction: no separate mode first; make the default page safe, and follow the settings that readers already set on their own computers.

## The answer first

Build no reading mode now. Follow two settings that the reader's system already gives every page:

- **Forced colors** (`forced-colors: active`), which Windows high contrast mode turns on. The browser replaces the page's colors with a few system colors that the reader chose. Today it hides Docent's status dots, the rail of the walkthrough and its current dot, and leaves the drawings as islands in their own colors, with tracks and outlines at 1.4:1.
- **More contrast** (`prefers-contrast: more`), which a reader asks for in the system settings. Today Docent does nothing with it.

Color blindness needs no mode of its own. Docent's rule that color is never the only sign already serves every reader at once: a word beside each status, a mark in each failed cell of a status grid, a legend, and a table in words under every drawing. The work for these readers is to keep that rule, and `check` already tests most of it.

| # | Pull request | Size |
|---|---|---|
| 1 | Forced colors: the dots, the rail and the current step in system colors; the drawings' lines, text, bands and ground in system colors; the fills that carry meaning keep their own colors; a browser check under emulated forced colors | Medium |
| 2 | More contrast: outlines and tracks in the muted color, muted text in the text color; a browser check under emulated more contrast | Small |

## The obvious answers that would be wrong

**A color-blind mode, with a palette for each kind of color blindness.** There are several kinds (protanopia, deuteranopia, tritanopia, and weaker forms of each), so one mode does not serve them all, and a mode for each is a menu that most readers will never open. Readers seldom look for such a switch on each site they visit. And once a mode exists, the default page tends to lean on color more, "because there is a mode for that". The honest fix is the default: no meaning in color alone.

**A switch in the top bar first.** A switch is one more control on every page, and a reader who needs it has already set the same wish in the system. Following the system works on every page the reader opens, with nothing to find. A switch can come later, and reuse the same styles (decision 4).

**Turning off forced colors for the whole page** (`forced-color-adjust: none` everywhere). It keeps Docent's look, and it takes away exactly what the reader asked for. Only the few fills whose color is their meaning keep their colors (section 2).

---

## 1. What happens today

Measured in Chrome with emulated settings, on `skills/docent/assets/specimen.html` (the scripts and their output are in "Measured" below).

| | Normal | Forced colors (dark system theme) | More contrast |
|---|---|---|---|
| Page and text | Docent's tokens | Black and white, links yellow: the browser forces them | No change |
| Status dots (`.state::before`) | Status colors | **Gone**: the background turns to the page color, with no border. The word stays, so no meaning is lost; the "Planned" ring stays, because it is a border | No change |
| Walkthrough rail and current dot | The rail line, a filled dot on the current step | **The rail is gone**, and the current step's dot turns black. The list no longer shows which step is current; the drawing beside it still does | No change |
| Drawings (SVG) | Docent's tokens | **Not forced**: the browser leaves SVG fills and strokes alone, so each drawing keeps Docent's colors, a dark island on the black page | No change |
| Lane tracks and card outlines, against their band | 1.40:1 light, 1.43:1 dark | 1.43:1 | 1.40:1 |
| Heat step 1 against its band | 1.25:1 light, 1.35:1 dark | 1.35:1 | 1.25:1 |

Nothing fails WCAG's text rules: every word keeps its contrast, and the table in words gives every number. The problems are the marks that disappear and the faint lines that the reader asked to be stronger.

## 2. Forced colors

**What the reader expects.** A reader in high contrast mode chose a few colors, such as white text on black, or yellow on dark blue, and expects every page to use them. CSS names those colors with system color keywords: `Canvas` (the page), `CanvasText` (the text), `LinkText`, `GrayText`, `Highlight` and `HighlightText`.

**The fix, in the kit's styles, under `@media (forced-colors: active)`:**

- **The dots and the rail.** The status dots, the info dot, the rail of the walkthrough and the route dot of the top bar take `CanvasText`. The current step's dot takes `Highlight`, so the list shows the current step again. The "Planned" ring keeps its shape, with a `CanvasText` border. All status dots then share one color; the word beside each one says which status it is, as it does today for a reader who cannot see the colors.
- **The drawings.** The kit sets the drawing tokens to system colors: `--bg` and `--fig` to `Canvas`, `--text`, `--muted` and `--line` to `CanvasText`, and `--primary` and `--dot` to `Highlight`. Each drawing reads these tokens already, so it turns into the reader's colors with no change to the renderer. Tracks and outlines become full contrast, and the current leg of a walkthrough takes the reader's highlight color.
- **The fills whose color is their meaning keep their own colors:** the heat steps, the boxes of a heat plan, and the cells of a status grid. Five steps of an amount cannot be told in two system colors, and a status grid's marks already tell its states without color. The number on a heat step keeps the kit's own text and page colors, not the system's, because only those are tested against the steps (5.14:1 or more).

**The risk.** Chrome's emulation uses its own default high contrast colors. Real Windows themes vary, and this Mac cannot run them. PR 1 is checked on Windows with at least two themes (white on black, and black on white) before it merges.

## 3. More contrast

**The fix, under `@media (prefers-contrast: more)`:**

- `--line` takes the muted color's value (light `#575d75`, dark `#959bb3`). Lane tracks, card outlines and the rules of tables rise from 1.40:1 to 6.30:1 in light and 6.65:1 in dark: the values that `DESIGN.md` already measures for muted text.
- `--muted` takes the text color's value. Notes, labels and captions move from 6.30:1 to 15.82:1 in light, and from 6.65:1 to 15.14:1 in dark. The difference between a name and a note then rests on size and weight alone, which still holds: names are 14px at weight 600, notes 12px at weight 400.
- **The heat steps do not change.** Step 1 stays 1.25:1 against its band. A darker step 1 would leave less room for the other four steps, and an outline around each cell takes most of an 8.3px phone cell. The legend, the five steps and the table in words already give the amount.

The kit sets these two tokens in one more place, so a host's own tokens (`--host-*`) still win, as they do in light, dark and print. PR 2 checks which browsers report the macOS and Windows settings as `prefers-contrast: more`.

## 4. Color blindness

No change of look. The rule that already serves these readers is written in `DESIGN.md` ("color is never the only sign"), and `check` tests most of it: a part with a state needs a note that says it in words, and every drawing has its table in words. The status grid, once built, gives each failed cell a mark (`docs/proposals/status-grids.md`). The proposal adds one thing to the status grid's building PR: its browser check simulates deuteranopia and protanopia on the drawing, as the status grid proposal measured, so a later change cannot quietly lose the marks.

## 5. What it reuses, and what is new

| From | What it reuses |
|---|---|
| `kit.css` | Its token blocks: the forced colors and more contrast blocks set the same tokens, after the light, dark and print blocks |
| `svg.cjs` | Nothing changes: every drawing already reads the tokens, with the light values as a fallback |
| `tests/browser/check-render.cjs` | The pages and views it opens; two more views: emulated forced colors, and emulated more contrast |
| `tests/contrast.py` | The pairs for more contrast: the line color and muted text at their new values |

New: two blocks in `kit.css`, one sentence in `DESIGN.md` (Colors, Contrast: "With the reader's high contrast mode, the page and the drawings take the reader's system colors, except the fills whose color is their meaning; with more contrast, outlines take the muted color and muted text the text color."), and the browser checks.

## 6. Phases, and what is out of scope

1. **Forced colors** (PR 1, medium): section 2, with a browser check that the dots, the rail and the current step show under emulated forced colors, that a drawing's tracks and text take the system colors, and that heat cells keep theirs. Checked on Windows before it merges.
2. **More contrast** (PR 2, small): section 3, with a browser check of the two tokens and the contrast pairs.

**Out of scope:** a reading-mode switch (decision 4); palettes for kinds of color blindness; larger text, which the browser's zoom and `data-text="large"` already give; and reduced motion, which the kit already follows.

---

## Measured

The scripts ran in Chrome through Playwright, with `emulateMedia` for each setting. They are in the session scratchpad and are not part of the kit. Their output:

```text
normal        {"forced":false,"more":false,"body":["rgb(251, 251, 254)","rgb(28, 31, 46)"],"line":"rgb(28, 31, 46)","card":["rgb(251, 251, 254)","rgb(211, 214, 227)"],"heat":["rgb(222, 226, 240)","rgb(62, 66, 77)"],"err":"rgb(207, 34, 46)","fig":"rgb(242, 243, 249)","link":"rgb(47, 63, 208)"}
forced-dark   {"forced":true,"more":false,"body":["rgb(0, 0, 0)","rgb(255, 255, 255)"],"line":"rgb(231, 233, 243)","card":["rgb(18, 20, 31)","rgb(45, 49, 70)"],"heat":["rgb(42, 46, 56)","rgb(186, 190, 203)"],"err":"rgb(255, 255, 255)","fig":"rgb(0, 0, 0)","link":"rgb(255, 255, 0)"}
forced-light  {"forced":true,"more":false,"body":["rgb(255, 255, 255)","rgb(0, 0, 0)"],"line":"rgb(28, 31, 46)","card":["rgb(251, 251, 254)","rgb(211, 214, 227)"],"heat":["rgb(222, 226, 240)","rgb(62, 66, 77)"],"err":"rgb(0, 0, 0)","fig":"rgb(255, 255, 255)","link":"rgb(0, 0, 159)"}
contrast-more {"forced":false,"more":true,"body":["rgb(251, 251, 254)","rgb(28, 31, 46)"],"line":"rgb(28, 31, 46)","card":["rgb(251, 251, 254)","rgb(211, 214, 227)"],"heat":["rgb(222, 226, 240)","rgb(62, 66, 77)"],"err":"rgb(207, 34, 46)","fig":"rgb(242, 243, 249)","link":"rgb(47, 63, 208)"}

== normal-light
   ok: bg rgb(26, 127, 55) border rgb(26, 127, 55) 0px
   err: bg rgb(207, 34, 46) border rgb(207, 34, 46) 0px
   plan: bg rgba(0, 0, 0, 0) border rgb(87, 93, 117) 1px
   track on band 1.40:1 | card outline on band 1.40:1 | heat step 1 on band 1.25:1
== normal-dark
   track on band 1.43:1 | card outline on band 1.43:1 | heat step 1 on band 1.35:1
== forced-dark
   ok: bg rgb(0, 0, 0) border rgb(255, 255, 255) 0px
   err: bg rgb(0, 0, 0) border rgb(255, 255, 255) 0px
   plan: bg rgba(0, 0, 0, 0) border rgb(255, 255, 255) 1px
   track on band 1.43:1 | card outline on band 1.43:1 | heat step 1 on band 1.35:1

walkthrough, forced-dark: {"rail":"rgb(0, 0, 0)","ring":"rgb(255, 255, 255)","ringBg":"rgb(0, 0, 0)","leg":"rgb(142, 155, 255)"}
```

The "line" and "card" values under forced colors are the drawing's own tokens in their dark values: the browser does not force SVG paint. The rail and the dot of the current step are backgrounds, so they take the page color.

---

## Decisions

Decided on 2026-11-23, so that the work can go on. Each one can be changed in review, because no code exists yet.

1. **No reading mode now; follow the system settings.** They work on every page with nothing to find, and they are where readers with low vision already said what they need.
2. **Forced colors: system colors for the page, the marks and the drawings' lines, text and ground; own colors for the fills whose color is their meaning.** The reader gets their colors everywhere a color only decorates or separates, and keeps the amount and the state where a color is the content. The other choice was to leave the drawings as they are, as pictures; they would then keep their 1.4:1 tracks in a mode chosen for contrast.
3. **More contrast: two tokens, not a second palette.** Outlines and muted text are where Docent is soft on purpose; raising them gives the most contrast for the least change, and every pair is already measured. The heat steps stay, for the reason in section 3.
4. **A switch in the top bar: not now.** If readers ask for it, it sets one attribute on the page, and the same styles as more contrast apply. It waits for that request.
5. **Color blindness: no mode, and one more test.** The rule "never color alone" stays the fix, and the status grid's browser check simulates color blindness, so the rule is tested, not only written.

## Not in this proposal

- Code. Each phase comes in its own pull request.
- A change to the look in normal settings.
