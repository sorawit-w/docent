# Proposal: white label and palettes — the host's logo, tagline and colors

Status: **proposed on 2026-11-23, with each open question decided** (see "Decisions" at the end). It waits for review. No code is written yet. A talk on 2026-11-23 settled three things before this proposal: a "Made with Docent" credit stays, as a link by default with an opt-out to plain text; a host's `DESIGN.md` is read into the host tokens only; and diagram colors keep their meaning (green, amber and red mean status, the accent means the current step, the heat steps mean how much).

## The answer first

A host project gets four new things, and each one stays inside a rule that `check` can test:

1. **A logo slot and a tagline slot.** The logo stands in the top bar, before the host's name, 24px high and at most 160px wide. It is inline SVG, cleaned by `check` as icons are. A PNG or WebP logo is allowed as a small data URI. The tagline is one line of muted text in the footer. On paper the logo and the name print once above the title.
2. **A footer credit,** "Made with Docent", with a small one-color mark. "Docent" is a link to the public repo by default; the host can choose plain text. The agent asks once, when it creates the first page.
3. **A short interview,** with answers taken from the host repo where it can: a logo file, a `DESIGN.md`, the README's first line, the `package.json` description. A host `DESIGN.md` fills the six host tokens and nothing else. A new script works out what is missing (a dark accent, a heading color) with fixed rules, so the agent never picks a color by eye.
4. **Built-in palettes.** A palette is a named set of Docent's own tokens, turned toward one hue: a tinted page, tinted grays, its own five heat steps, an accent pair, a heading color and fonts. Docent ships three, Harbor, Plum and Sepia. Every pair is tested in `tests/contrast.py` in light, dark and on paper, and all 64 pairs of each palette pass.

In dark mode the moving dot follows the host's dark accent, and a new token, `--host-dot-dark`, lets a host choose another color. The lamp stays the dot on Docent's own pages.

A light tint of the accent on the lane bands of a drawing is **rejected**: at every tint tested, the band turns darker than the well in light mode, so the order of the three layers of a drawing is reversed, and the accent stops meaning only "the current step".

| # | Pull request | Size |
|---|---|---|
| 1 | The logo and tagline slots, the credit, and the logo check | Medium |
| 2 | The dark-mode dot (`--host-dot-dark`) and three new warnings on a host accent | Small |
| 3 | The interview, and `brand.cjs`, which reads a host `DESIGN.md` into the host tokens | Medium |
| 4 | Palettes: Harbor, Plum and Sepia, in the kit, the drawings, `check` and `tests/contrast.py` | Medium |
| 5 | One branded page in the specimen set, in the "Report a bug" topic | Small |

## The obvious answers that would be wrong

**Copy the host's whole brand palette into the kit's tokens.** It looks like the most complete white label: the host's page color, text color and status colors all come through. It breaks four things that hold today. A brand file has no dark values, so dark mode would show the brand's light page or Docent's dark page with the brand's light text. The kit sets light values in its print block, so paper would lose them. Each drawing carries Docent's light values as its fallback, so a drawing copied out of the page would not match. And `tests/contrast.py` tests fixed pairs: on a beige or light gray brand surface, Docent's green status text falls to 4.33:1 and 4.19:1, below 4.5:1, and the palest heat step merges with the page. Section 4 shows the numbers.

**Tint everything with the accent.** A light wash of the host's accent on the bands, the heat steps and the page looks "branded" right away. But the accent in Docent is a mark that means "here": the link, the dot, the current leg. A page full of it says nothing. The test in section 6 shows that a tinted band in light mode is always darker than the well, so the order of the layers in every drawing is reversed.

**Point an image at the host's logo file.** `<img src="../brand/logo.png">` or a link to a logo on a website is one line. A Docent page is one file that works offline: the image breaks as soon as the page is sent by mail or opened from another folder, and `check` already refuses it.

**Let the agent write a tagline from the README.** The agent can write a good sentence. But a tagline speaks for the host, on every page, and it must be the host's own words. The agent offers lines it found, word for word, and the user picks one or none.

---

## 1. The logo and the tagline

### Where each one shows

| Part | Desktop | Phone (720px and less) | Paper |
|---|---|---|---|
| Logo | In the top bar, before the host's name, 10px apart. 24px high, at most 160px wide. | The same size. The bar already wraps: the logo, the name and the switch stand on the first line. | The top bar does not print today. On paper, the logo and the name print once above the title, at 24px (6.35mm), with no links and no switch. |
| Host name | 14px, weight 600, as today | As today | Beside the logo, above the title |
| Tagline | In the footer, at the left: 14px, muted, one line | In the footer, above the credit, and it wraps | It prints with the footer, at the end of the document |
| Credit | In the footer, at the right (section 3) | Below the tagline | It prints as text. Paper has no link. |

The logo is in the top bar and nowhere else, so it appears once, as Docent's mark does today. A second copy in the footer would repeat it, and two copies of one SVG with a gradient would carry the same `id` twice, which breaks the second copy.

**A wide logo.** A logo keeps its shape. When 24px of height would make it wider than 160px, it gets lower: a logo of 8:1 is 160 × 20px, and one of 10:1 is 160 × 16px. Below 16px a wordmark is hard to read, so `check` warns. On the narrowest phone (320px) the bar has 184px for the logo and the name after the gutters and the switch, so the slot always fits.

**A logo with the name in it.** A symbol stands before the host's name. A wordmark already shows the name, so it stands alone, and its `aria-label` (or the `alt` of a raster logo) carries the name. `check` compares the end of the `<title>` with the host's name in the top bar today; it then reads the name from that label.

**The tagline.** One sentence of at most 90 characters, with no link and no markup. It is the host's own words (section 2). A page without a tagline has an empty left side in the footer, and nothing else changes.

### Light and dark

A logo must show on the page it sits on. There are three cases, and `check` can tell them apart from the colors in the SVG.

| The logo | What the kit does |
|---|---|
| One color | The agent draws it with `fill="currentColor"`, so it takes the heading color in light and the text color in dark. One SVG serves both themes and paper. This is the best case, and the agent offers it when a logo file has one color. |
| One version that reads on both pages | It shows in both themes. `check` passes it when at least one of its colors reaches 3:1 on the light page and one reaches 3:1 on the dark page. |
| A version for each theme | The host gives two SVGs, marked `data-for="light"` and `data-for="dark"`. The kit shows one of them in each of its four places: light, dark by the system, dark by the switch, and print, which takes the light one. |
| Light only, with no dark version | In dark mode the kit puts it on a small tile in the light page color, with corners of 6px and 4px around it. This is the second exception to "never fill an area", after the mark's own tile, for the same reason: a logo must stay clear on any page. The agent says so and offers to use a dark version instead. |

A dark-only logo, with no light version, gets the same tile in the dark page color in light mode and on paper.

### What `check` does with a logo

The logo goes through the same kind of check as an icon (`iconProblem` in `scripts/lib/icons.cjs`), with a longer list, because a logo is the host's own artwork:

- **Allowed elements:** `svg`, `g`, `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`, `title`, `desc`, `defs`, `clipPath`, `linearGradient`, `radialGradient`, `stop`, and `use` that points at an `id` inside the same logo.
- **Allowed attributes:** the shape attributes, `viewBox`, `fill`, `stroke` and its widths, joins and ends, `opacity`, `fill-opacity`, `stroke-opacity`, `fill-rule`, `clip-rule`, `transform`, `id`, `offset`, `stop-color`, `gradientUnits`, `gradientTransform`, `role`, `aria-label`, `aria-hidden`, and `data-for`.
- **Refused:** `script`, `style`, a `style` or `on…` attribute, `foreignObject`, `image`, `a`, `filter`, `pattern`, `mask`, animation, `text` and `tspan` (a logo in text depends on a font the reader may not have; the agent turns the letters into paths), any `href` that is not `#id`, and any `url()` that is not `url(#id)`.
- **Size:** at most 24,000 characters.
- **Gradients.** The page is flat, and `check` refuses a gradient anywhere today. A host's logo is the one place where a gradient is allowed, because it is the host's mark and not part of Docent's page. A filter or a shadow stays refused.
- **Contrast:** the light and dark cases in the table above. `currentColor` always passes.

A logo that fails is not left out silently: `check` reports an error that names the element or attribute, as it does for a bad icon, and the agent fixes the SVG or asks the user.

### A raster logo

Many projects have their logo only as a PNG. Two options:

- **Refuse it.** Every logo is then clean SVG that `check` can read. But the agent must then trace the PNG by hand, which gives a poor copy of someone else's mark, or leave the logo out, which leaves the host without its brand.
- **Allow a small data URI.** A PNG holds no script, so it is safe. It cannot follow the theme, and it blurs when it is too small for the screen or the paper.

**Recommendation: allow PNG and WebP as a data URI**, in an `<img>` with `width`, `height` and `alt`, at most 24,000 characters, and at least three times the size it shows at (72px high), so it stays sharp on a phone screen and on paper. A flat 4:1 logo at 3x is about 1,100 characters, so the limit leaves room for a detailed logo. `check` refuses JPEG (it has no transparent parts, so it shows a box on the off-white page), GIF, and an SVG inside a data URI (`check` cannot read inside it, so an inline SVG is needed). A raster logo follows the same rules for light and dark: a version for each theme, or the tile.

---

## 2. The interview and the repo scan

The agent asks about the brand **once per repo**: when it creates the first Docent page there. After that, it copies the brand from the newest Docent page it finds (the logo, the host tokens, the tagline and the credit), and asks one question only: "Use the same brand as `docs/onboarding.html`?" The page itself is the record of the choices, so no new file is written into the host repo.

### The scan

Before it asks, the agent reads (and changes nothing):

- **Docent pages** already in the repo, found by the `docent:kit` marker.
- **A `DESIGN.md`** at the root or in `docs/`.
- **Logo files:** `logo*.svg`, `*-logo.svg`, `favicon.svg`, and SVG files in folders named `brand`, `logo`, `public`, `static` or `assets`. It skips images in `node_modules` and in build folders. A PNG is offered only when no SVG is found.
- **Lines for a tagline:** the first line of the README under its title, the `description` in `package.json`, `pyproject.toml` or `Cargo.toml`, and the repo description when the `gh` tool is set up.
- **The host's name:** the `name` in the same files, or the README's title.

### The questions, in order

The agent sends one message with four questions (the size of one question card) and says the name it will use as a plain fact. The user answers only what they want to change.

| # | Question | Choices offered | When the user skips it |
|---|---|---|---|
| — | "The top bar will say **Example project** (from `package.json`)." | A fact, not a question. The user can correct it. | That name. With no name found, the folder name, and the agent says so. |
| 1 | "Which logo should the top bar show?" | Up to three files found, then "No logo". | No logo: the name stands alone, as today. |
| 2 | "Which colors should the page use?" | "From your DESIGN.md (accent #…)" when one exists; each palette by name; "Docent's own colors". | Docent's own colors. |
| 3 | "Which tagline should the footer show?" | Each line found, word for word, then "No tagline". The user may type their own. | No tagline. The agent never writes one. |
| 4 | "The footer says 'Made with Docent'. Keep 'Docent' as a link to the public repo, or plain text?" | "A link (Recommended)", "Plain text". | A link. |

The order follows what a reader sees first: the name and the logo in the top bar, the colors across the page, then the footer. Each skip leads to the choice that adds nothing invented.

After the answers, the agent builds the page, runs `check`, and reports in one or two lines what it worked out and what it did not use, for example: "Your DESIGN.md has no dark accent, so I worked one out: #5ab08d. I did not use its page and status colors; Docent keeps its own, so dark mode and print stay readable."

**A logo that needs work.** When the chosen logo has one color, the agent offers to draw it with `currentColor`. When it has text, the agent turns the letters into paths. When it shows only on a light page, the agent says that dark mode puts it on a tile and asks for a dark version. The agent never draws or changes the shapes of a logo beyond these steps.

---

## 3. The footer credit

The footer changes from Docent's mark, "Docent" and "A guide inside every document." to two parts:

- **At the left,** the host's tagline, or nothing.
- **At the right,** the credit: a 16px mark in one color, then "Made with Docent", at 14px in the muted color. "Docent" is a link to `https://github.com/sorawit-w/docent` by default. When the host chooses plain text, it is the same words with no link.

**The one-color mark.** Today the footer shows the mark's tile: an ultramarine square with a lamp dot. On a page in a host's green, or in the Plum palette, that tile is the one spot of Docent's color, and it does not match the page. The credit draws the mark's route and dot in `currentColor` instead, so it takes the muted color like the words beside it. The tile stays the favicon, the mark on Docent's own pages, and the cover of a deck, where the mark stands alone.

**Offline.** A link is not a download. The page loads nothing from it, and `check` already lets an `<a href>` point outside the file, because a link for the reader to follow loads nothing. Offline, the link simply does not open.

**What `check` does.** It warns when the footer has no "Made with Docent". It does not refuse the page, because Docent is MIT-licensed and a host may remove the line; the warning makes sure that the removal is a choice and not a mistake.

---

## 4. Reading a host `DESIGN.md`

A host `DESIGN.md` fills the six host tokens and nothing else:

| Host token | Taken from | When it is missing or fails |
|---|---|---|
| `--host-accent` | `colors.primary` | When it is below 4.5:1 on the page or the well, `brand.cjs` keeps its hue and lowers its lightness until it reaches 4.6:1, and the agent shows both values. A yellow `#f2b824` becomes `#8c6800`. |
| `--host-accent-dark` | `colors.dark-primary` or `colors.primary-dark` | Worked out from the light accent (below). |
| `--host-ink` | `colors.secondary`, when it reaches 4.5:1 on the page and its CIELAB lightness is 35 or less, so it reads as a heading color | The accent's hue at the lightness of Docent's ink (L\* 16.6). For a green accent `#0b6e4f`, this gives `#003020` at 14.08:1. |
| `--host-serif` | `typography.h1.fontFamily` (the face of the title and headings, also when it is a sans-serif) | Docent's serif |
| `--host-sans` | `typography.body-md.fontFamily`, or the first `body-*` | Docent's sans-serif |
| `--host-mono` | `typography.code.fontFamily` | Docent's monospace |

A font is kept by name, with Docent's own stack after it. The page loads no font, so a brand font shows only where the reader has it installed, and Docent's stack is used everywhere else.

Everything else in the file is not used: `tertiary`, `neutral`, `surface`, `on-surface`, `error`, `success` and `warning`, `rounded`, `spacing` and `components`. The agent names them in one line, so the user knows they were read and left out on purpose.

### Why not the whole palette

- **Dark mode.** The shared `DESIGN.md` format has no keys for dark mode. screenwright's schema reference lists the keys it knows (`version`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, `components`), and the color names are `primary`, `secondary`, `tertiary`, `neutral`, `surface`, `on-surface` and `error`. Neither screenwright nor brand-workshop writes a dark value. A copied page color would have no dark form.
- **Print.** The kit sets its light values again in its print block, so a value set in a page's own style is lost on paper.
- **The drawings.** Each drawing carries Docent's light values as its fallback (`LIGHT` in `scripts/lib/svg.cjs`), so a drawing copied out of the page keeps its colors. With a host page color, the fallback would no longer match the page it came from.
- **The contrast guarantees.** `tests/contrast.py` tests fixed pairs. On a beige brand surface (`#f3ece0`) Docent's green status text is 4.33:1, and on a light gray one (`#e9e9ec`) it is 4.19:1, both below 4.5:1. The palest heat step stands at 1.10:1 and 1.07:1 against those pages, so it merges with them. On a navy surface (`#0f172a`) the body text is 1.09:1. A host who wants a tinted page has palettes for it (section 6), which are tested before they ship.

### A dark accent, when the file has none

`brand.cjs` keeps the accent's CIELAB hue and chroma, and raises its lightness until the accent reaches 7:1 on the dark page. 7:1 is about the contrast of Docent's own dark accent (7.23:1). The result is never below 4.5:1 on the dark page and the dark well. The first draft stopped at 4.6:1, and the results were much darker than colors a person would pick: L\* 53 against 67 and 78. At 7:1 they come within 10.8 and 13.1 (CIE76) of the hand-picked values:

| Light accent | Worked out | Hand-picked today | Distance |
|---|---|---|---|
| Docent ultramarine `#2f3fd0` | `#a291ff` (7.01:1) | `#8e9bff` (7.23:1) | 10.8 |
| The green of the SKILL.md example `#0b6e4f` | `#5ab08d` (7.01:1) | `#6fd3a8` (10.09:1) | 13.1 |
| A red `#c8102e` | `#ff7570` (7.01:1) | — | — |

In CIELAB a blue moves a little toward violet as it gets lighter, as the first row shows. Item 3 may use OKLCH for this step if it holds blue better; the rule (same hue, 7:1) stays.

### When values are missing: the interview, or another design skill

Docent needs no other skill. With no `DESIGN.md`, the interview asks for colors, and a palette or Docent's own colors are always a full answer. Three installed skills can propose values when the host wants its own:

- **screenwright** reads a `DESIGN.md` or makes one. In a repo with no `DESIGN.md`, it infers tokens from the repo's styles and **writes a `DESIGN.md` into the repo**. Outside a project it fetches a template from GitHub or works from a described mood. The agent offers it only for a repo that has styles, and asks first, because it writes a file.
- **impeccable**, with its `document` command, writes a `DESIGN.md` from the project's existing code.
- **brand-workshop** makes a new brand from a business description: a logo in SVG, a tagline, a favicon set and a starter `DESIGN.md`. It is for a project with no brand at all, and it is much more than a document needs. The agent offers it only when the user says they have no brand and want one.

Whichever source fills the values, `check` stays the last gate: it tests each host color's contrast, and refuses a page that fails.

---

## 5. The dark-mode dot

Today the dot is the host's accent in light mode and on paper, and always the lamp (`#f2b824`) in dark mode. On a branded page in dark mode, the lamp is the last spot of Docent's own color. Next to a green accent it is a second accent color on the page (a CIE76 distance of 78.8), and in a drawing the current leg is green while the dot on it is yellow.

Three options:

- **D1. Keep the lamp always.** No change. A branded page keeps two accent colors in dark mode.
- **D2. The dot follows the dark accent.** `--dot` in dark mode becomes `var(--host-accent-dark, #f2b824)`. This matches light mode, where the dot already follows the accent. The dot does not vanish on a leg of the same color, because it has a 2.5px ring in the band color around it (`.pulse` in `svg.cjs`), as it does in light mode today.
- **D3. D2, plus a token of its own.** `--dot` in dark mode becomes `var(--host-dot-dark, var(--host-accent-dark, #f2b824))`. A host that wants a dot apart from its links, for example its own gold, or the lamp, sets `--host-dot-dark`.

**Recommendation: D3.** A host gets one color in dark mode, as in light, with no extra step, and a host with a second brand color can still use it. Docent's own pages, with no host accent, keep the lamp.

**The contrast rule.** The dot is a mark, not text, so it needs **3:1 on the dark page and on the dark well** (WCAG 1.4.11), the rule that `tests/contrast.py` already applies to the lamp (10.18:1). `check` tests a hex value of `--host-dot-dark`, as it tests the host colors today. A deep blue `#1b2260` is 1.26:1 and is refused; a muted gold `#8a6d1f` is 3.74:1 and passes. When the dot follows the dark accent, it passes already, because the accent needs 4.5:1.

**One change for existing pages.** A branded page that sets `--host-accent-dark` today gets a dot in that color, instead of the lamp, the next time `stamp` runs. The note for the release says so, with the one line that keeps the lamp: `--host-dot-dark: #f2b824`.

### Three new warnings on a host accent

The measures for this section found three things that a host accent can get wrong without failing contrast. `check` warns on each:

- **The accent is close to a status color** (a CIE76 distance under 25 from `ok`, `warn` or `err`). A red brand `#c8102e` is 4.3 from Docent's red: its dots and links would read as errors. The green of the SKILL.md example, `#0b6e4f`, is 23.9 from the green of `ok`, so item 2 changes that example to another color.
- **The accent has almost no color** (chroma under 10). A near-black accent looks like the body text, so a link is told apart by its underline only.
- **`--host-accent` is set and `--host-accent-dark` is not.** Dark mode then shows Docent's ultramarine links on a branded page. The warning names the value that `brand.cjs` would give.

---

## 6. Palettes

### What a palette is

Docent calls these **palettes**, not themes. In Docent a "theme" is light or dark already (`data-theme`, the switch, the "Themes" paragraph of `DESIGN.md`), and two meanings of one word would confuse both authors and the agent. A page names its palette on `<html>`: `data-palette="harbor"`.

A palette is a named set of **Docent's own tokens**, not of host tokens: the page, the well, the line, the muted and text colors, the five heat steps, the accent pair, the heading color and the fonts, each in light and dark. This is the difference that makes palettes safe. A host's own colors are not known in advance, so they may only touch the host tokens, and `check` tests them on each page. A palette is known in advance, so it may touch more, because `tests/contrast.py` tests every pair before it ships.

The host tokens still work with a palette: a host may use Plum with its own accent. `check` then tests that accent against Plum's page and well, not Docent's.

### Two ways to add color, tested

**T1. A light tint of the accent on the lane bands of a drawing.** The band would be `color-mix(in srgb, accent 6–14%, page)`.

- The text on the band stays readable: the muted notes keep 5.03:1 or more, and the body text 11.48:1 or more.
- **In light mode the band turns darker than the well at every tint tested,** also at 6% (L\* 95.0 against the well's 95.9). The three layers of a drawing are the well as the ground, a lighter band on it, and the drawing on the band. With a tint, the band becomes darker than the ground. At 6% the band and the well are almost one color (1.01:1 and 1.02:1), so the band disappears.
- The current leg, drawn in the accent, loses contrast on a band tinted with the same accent: for the green example, from 5.58:1 at 6% to 4.92:1 at 14%. The one mark that says "this step" gets weaker exactly where it matters.
- The band becomes a fill in the accent. `DESIGN.md` says the accent is "a mark, never a fill", and the accent would mean both "the current step" and "a lane".
- The tint is computed in the browser from the host's accent, so neither `check` nor `tests/contrast.py` can test it in advance.

**Rejected.** It fails on the layers in light mode, and it takes away the accent's one meaning.

**T2. Built-in palettes with their own heat steps.** Each palette turns Docent's grays and five heat steps toward its own hue, with **the same CIELAB lightness** as Docent's. The page and the well take the tint at 1.6 to 2 times Docent's chroma. The line keeps a chroma of at most 10, and the muted and text colors at most 6, so a note never looks like a link. Because the lightness of each step is the same as Docent's, the rule for a number on a heat step holds unchanged: steps 1 to 3 take the text color, steps 4 and 5 the page color. The steps stay 12.8 to 20.1 apart in L\*, as Docent's do.

A custom host accent cannot tint the heat map, because its steps would have to be tested before they ship, and a host's color is not known until the page is written. So the heat steps change only with a palette.

**Recommendation: T2.** It gives a page more color everywhere (the page, the well, the bands, the heat map) without making the accent a fill. The layers keep their order, because the band is still the page color. And every pair is tested.

### The three sample palettes

The fonts are system fonts only, as Docent's are: Iowan Old Style ships with Apple devices and Palatino Linotype with Windows.

| | Harbor | Plum | Sepia |
|---|---|---|---|
| Mood | Cool blue-green, for engineering and operations | Deep violet-red, for product and design | Warm paper, for long reading and policy |
| Gray hue (CIELAB) | 225 | 330 | 75 |
| Page, light / dark | `#f6fcfe` / `#01181d` | `#fefafe` / `#1f0f1d` | `#fffbf6` / `#1e1301` |
| Well, light / dark | `#e9f6fa` / `#001013` | `#faf1f8` / `#160914` | `#fcf2e8` / `#150c00` |
| Line, light / dark | `#c0dbe3` / `#1e363c` | `#e3d1e0` / `#3c2e3a` | `#e3d4c4` / `#3b3024` |
| Muted, light / dark | `#526064` / `#8f9ea3` | `#645b63` / `#a399a1` | `#645d54` / `#a39a91` |
| Text, light / dark | `#152225` / `#dcecf1` | `#251d24` / `#f1e6ef` | `#251f18` / `#f1e8de` |
| Accent, light / dark | `#0a5f8a` / `#72c2ee` | `#86307f` / `#e49ad9` | `#2b4f8c` / `#93b4ef` |
| Heading color | `#0d3550` | `#3d1640` | `#3a2a1a` |
| Heat steps, light | `#c8e8f2` `#a5c3cd` `#7f9da7` `#4c6a72` `#2a464e` | `#f1dcee` `#ccb9c9` `#a693a3` `#72606f` `#4e3d4b` | `#f5dfc7` `#cfbba5` `#a9957f` `#74624e` `#4f3f2d` |
| Heat steps, dark | `#163239` `#324b52` `#4b656d` `#7c98a0` `#a5c3cd` | `#382936` `#52424f` `#6d5c6a` `#a08e9d` `#ccb9c9` | `#392c1a` `#534533` `#6f5e4c` `#a3907c` `#cfbba5` |
| Headings | The system sans-serif | Iowan Old Style, Palatino | Iowan Old Style, Palatino |
| Body | The system sans-serif | The system sans-serif | The system sans-serif |

The status colors and the dark dot follow the rules of every page: green, amber and red stay Docent's own, and the dark dot is the palette's dark accent.

**Measured contrast.** Each palette is tested on the 64 pairs that `tests/contrast.py` tests for Docent, in light, dark and on paper: text, muted, accent, heading, and the three status colors on the page and the well; the dot; the number on each heat step; and the outline of a cell with no data. **No pair fails.**

| | Harbor | Plum | Sepia | Docent today |
|---|---|---|---|---|
| Accent on the page / the well | 6.72 / 6.31 | 7.41 / 6.93 | 7.84 / 7.31 | 7.41 / 6.91 |
| Dark accent on the dark page / well | 9.28 / 9.84 | 8.67 / 9.16 | 8.72 / 9.24 | 7.23 / 7.65 |
| Heading on the page | 12.35 | 14.65 | 13.36 | 14.08 |
| Muted on the page, light / dark | 6.30 / 6.60 | 6.31 / 6.67 | 6.30 / 6.61 | 6.30 / 6.65 |
| The lowest pair | ok on the well, 4.60 | ok on the well, 4.60 | ok on the well, 4.60 | ok on the well, 4.59 |
| Muted against the accent (CIE76), light / dark | 26.3 / 28.5 | 48.0 / 37.8 | 44.9 / 39.9 | 74.0 / 42.0 |
| Accent to the nearest status color (CIE76) | 72.4 (ok) | 68.8 (err) | 84.5 (warn) | 116.9 (err) |

The lowest pair in every palette is the green status text on the well, at 4.60:1, the same as Docent's own (4.59:1). This is because the well keeps Docent's lightness.

**Harbor was changed once.** Its first accent was a teal, `#0b6574`. It passed contrast, but the muted gray of a teal palette stood only 8.4 from it, so a note looked like a link. A teal cannot be both dark enough for text and strongly colored in sRGB: the strongest teal tried at that lightness reached a chroma of 26.4. Harbor moved to a blue-green, `#0a5f8a` (chroma 30.9), at 26.3 from its muted gray. Item 4 adds this distance to `tests/contrast.py` as a rule: a palette's muted color stands at least 25 from its accent.

### What a palette costs

- **The kit.** Each palette is four blocks of tokens in `kit.css` (light, dark by the system, dark by the switch, print), as Docent's own tokens are. `stamp` writes only the palette that the page names, so a page carries one palette and not three. The kit is 26,621 bytes today.
- **The drawings.** `render` reads `data-palette` and writes that palette's light values as the fallback in each drawing, so a drawing copied out of the page keeps its palette.
- **`check`** refuses a palette name it does not know, tests host colors against the palette's page and well, and still warns when a page sets a kit token by hand: a palette is the one way to change those tokens.
- **`tests/contrast.py`** loops over Docent and each palette.

---

## 7. What it reuses, and what is new

| From | What it reuses |
|---|---|
| `scripts/lib/icons.cjs` | The pattern of `iconProblem`: a list of allowed elements and attributes, and an error that names what failed |
| `check.cjs` | `luminance` and `contrast`, the test of a host color, `local()` for a data URI, the warning on a kit token, and the rule that compares the `<title>` with the host's name |
| `kit.css` | The four places that set tokens, now with palettes, the logo variants and the dark dot |
| `svg.cjs` | `LIGHT`, the fallback colors, now chosen by palette |
| `tests/contrast.py` | The list of pairs, now run for each palette, with the new rule on the muted color |

**New:**

- `scripts/lib/logo.cjs`: the logo check, the raster rules, and the light and dark test.
- `scripts/brand.cjs`: reads a host `DESIGN.md` and prints the host tokens, with each value it mended or worked out and each key it did not use. It writes nothing; the agent copies its output into the page. A small reader for the front matter (the `colors` and `typography` keys only), with no new dependency.
- The interview in `SKILL.md`, as a short section with the order of the questions.

---

## 8. Phases, and what is out of scope

1. **The logo and tagline slots, the credit, and the logo check.** The template's top bar and footer; the kit's styles for the logo, its variants and the tile, and the top bar's form on paper; `scripts/lib/logo.cjs` and its use in `check`; the warning when the credit is missing; the name of a wordmark read from its label. `DESIGN.md`: the mark in the footer, the logo, the tile exception, and the gradient exception for a logo. `SKILL.md`: the slots. Tests: each refused element and attribute, a raster logo of each type, the size limit, each case of light and dark, a wordmark, and a page with no credit. Medium.
2. **The dark-mode dot and the accent warnings.** `--host-dot-dark` in the kit's two dark places, its contrast test in `check`, and the three warnings in section 5. The SKILL.md example moves away from green. The release note names the one change for existing pages. Small.
3. **The interview and `brand.cjs`.** The scan, the four questions, and the rules for a skipped question in `SKILL.md`; `scripts/brand.cjs` with its tests: each mapping, a light accent that fails, a missing dark accent, a missing heading color, a font that is not installed, and a file with no front matter. Medium.
4. **Palettes.** Harbor, Plum and Sepia in `kit.css`, written by `stamp` one at a time; the fallbacks in `svg.cjs`; `check` on palette names and on host colors against a palette; the loop in `tests/contrast.py`, with the rule on the muted color; a "Palettes" section in `DESIGN.md` and the interview's palette choice. Medium.
5. **One branded page in the specimen set.** A copy of the specimen in the "Report a bug" topic, with a generic logo drawn for it, a tagline, and the Harbor palette, so the slots and a palette are seen beside real content. Small.

**Out of scope:**

- A favicon in the browser tab. `check` refuses every `<link>` today. A later item could allow one `<link rel="icon">` with a data URI.
- A host's own page color, text color or status colors outside a palette (section 4).
- Palettes made by a host. A host who needs one asks for it to be added to Docent, where it is tested.
- Accent tints on bands, heat steps or any area (section 6).
- A logo in a drawing. Icons in drawings keep their rule: no logo and no brand mark.
- Docent's own pages: the specimen and the docs keep Docent's mark, colors and lamp.

---

## Measured

The colors come from short Python scripts with the WCAG formula for contrast, the CIELAB formula for lightness and hue, and the CIE76 formula for the distance between two colors. Mixing follows CSS `color-mix(in srgb)`. The logo sizes follow the kit's top bar (56px high, 20px gutters on a phone). The scripts are in the session scratchpad and are not part of the kit. Their output:

```text
### accent
== a dark accent worked out from the light one (same CIELAB hue, lightness raised until 4.6:1 on the dark page and the dark well)
   Docent ultramarine       #2f3fd0 L*35.4 C 87.9 h300.4 -> #736bff L*53.4 C 84.6 h300.4  on dark page 4.61, dark well 4.87 | the hand-picked value #8e9bff: 7.23 on the dark page, L*66.8
   SKILL.md example green   #0b6e4f L*40.9 C 35.8 h163.8 -> #388f6e L*53.6 C 35.7 h163.9  on dark page 4.65, dark well 4.92 | the hand-picked value #6fd3a8: 10.09 on the dark page, L*77.8
   a red brand              #c8102e L*42.5 C 75.0 h 28.5 -> #eb3d47 L*53.4 C 74.9 h 28.2  on dark page 4.62, dark well 4.89
   a teal brand             #0f766e L*44.5 C 29.0 h186.7 -> #318d84 L*53.4 C 29.2 h186.2  on dark page 4.60, dark well 4.87
   a near-black brand       #111111 L* 5.1 C  0.0 h296.8 -> #808080 L*53.6 C  0.0 h296.8  on dark page 4.64, dark well 4.91
== a light accent that fails on the page, mended (lightness lowered until 4.6:1 on the page and the well)
   a yellow brand           #f2b824 1.63:1 on the well -> #8c6800 4.63:1, L* 78.0 -> 46.3, hue 83.2 -> 83.3
   a bright blue brand      #3b82f6 3.32:1 on the well -> #046bd9 4.61:1, L* 55.6 -> 46.4, hue 285.2 -> 285.4
   an orange brand          #f97316 2.53:1 on the well -> #b64e00 4.65:1, L* 63.7 -> 46.2, hue 55.2 -> 55.1
== a host accent close to a status color (CIE76 distance; under about 25 the two read as the same family)
   SKILL.md example green   #0b6e4f: to ok  23.9, to warn  61.0, to error 103.1
   Docent ultramarine       #2f3fd0: to ok 139.3, to warn 126.0, to error 116.9
   a red brand              #c8102e: to ok 110.3, to warn  52.9, to error   4.3
   a teal brand             #0f766e: to ok  37.7, to warn  66.3, to error 102.5
== the same, aiming at 7:1, the contrast of Docent's own dark accent (7.23:1); the lowest result is kept at 4.5:1 or more
   Docent ultramarine       #2f3fd0 -> #a291ff L*65.9 C 61.2 h300.6  7.01:1 on the dark page, 7.42:1 on the dark well; distance to the hand-picked value 10.8
   SKILL.md example green   #0b6e4f -> #5ab08d L*65.9 C 35.9 h163.8  7.01:1 on the dark page, 7.42:1 on the dark well; distance to the hand-picked value 13.1
   a red brand              #c8102e -> #ff7570 L*65.9 C 59.4 h 28.7  7.01:1 on the dark page, 7.42:1 on the dark well
   a teal brand             #0f766e -> #57afa5 L*66.1 C 29.1 h185.9  7.05:1 on the dark page, 7.46:1 on the dark well
   a near-black brand       #111111 -> #a0a0a0 L*65.9 C  0.0 h296.8  7.01:1 on the dark page, 7.42:1 on the dark well
== an accent with almost no color looks like the text: chroma of each accent
   #2f3fd0: C 87.9
   #0b6e4f: C 35.8
   #111111: C 0.0
   #1c1f2e: C 10.9
### tint
== T1, light: the band is color-mix(in srgb, accent p, page)
   Docent ultramarine  6% band #eff0fb L*95.0 (well L*95.9, darker than the well): band vs well 1.02 (page vs well 1.07) | text 14.42 | notes (muted) 5.74 | current leg (accent) 6.76 | warn outline 6.26 | hue of band 287, C 5.7
   Docent ultramarine 10% band #e7e8f9 L*92.4 (well L*95.9, darker than the well): band vs well 1.10 (page vs well 1.07) | text 13.47 | notes (muted) 5.36 | current leg (accent) 6.31 | warn outline 5.84 | hue of band 289, C 8.8
   Docent ultramarine 14% band #dee1f8 L*89.9 (well L*95.9, darker than the well): band vs well 1.17 (page vs well 1.07) | text 12.63 | notes (muted) 5.03 | current leg (accent) 5.92 | warn outline 5.48 | hue of band 286, C 12.0
   SKILL.md green      6% band #edf3f4 L*95.4 (well L*95.9, darker than the well): band vs well 1.01 (page vs well 1.07) | text 14.58 | notes (muted) 5.80 | current leg (accent) 5.58 | warn outline 6.32 | hue of band 213, C 2.2
   SKILL.md green     10% band #e3edec L*93.0 (well L*95.9, darker than the well): band vs well 1.08 (page vs well 1.07) | text 13.69 | notes (muted) 5.45 | current leg (accent) 5.24 | warn outline 5.94 | hue of band 191, C 3.6
   SKILL.md green     14% band #d9e7e6 L*90.6 (well L*95.9, darker than the well): band vs well 1.15 (page vs well 1.07) | text 12.86 | notes (muted) 5.12 | current leg (accent) 4.92 | warn outline 5.58 | hue of band 193, C 5.0
== T1, dark: the band is color-mix(in srgb, dark accent p, dark page)
   Docent ultramarine  6% band #191c2c: band vs well 1.15 (page vs well 1.06) | text 13.95 | notes (muted) 6.12 | current leg 6.66 | lamp dot 9.37 | warn 6.69
   Docent ultramarine 10% band #1e2235: band vs well 1.23 (page vs well 1.06) | text 12.99 | notes (muted) 5.70 | current leg 6.20 | lamp dot 8.73 | warn 6.23
   Docent ultramarine 14% band #23273e: band vs well 1.32 (page vs well 1.06) | text 12.12 | notes (muted) 5.32 | current leg 5.79 | lamp dot 8.14 | warn 5.81
   SKILL.md green      6% band #181f27: band vs well 1.17 (page vs well 1.06) | text 13.72 | notes (muted) 6.03 | current leg 9.14 | lamp dot 9.22 | warn 6.58
   SKILL.md green     10% band #1b272d: band vs well 1.27 (page vs well 1.06) | text 12.62 | notes (muted) 5.54 | current leg 8.41 | lamp dot 8.48 | warn 6.05
   SKILL.md green     14% band #1f2f32: band vs well 1.40 (page vs well 1.06) | text 11.48 | notes (muted) 5.04 | current leg 7.65 | lamp dot 7.72 | warn 5.51
== the dark-mode dot, today and with a host value; a dot is a mark, so it needs 3:1 on the dark page and the dark well (WCAG 1.4.11)
   lamp                 #f2b824: on the dark page 10.18, on the dark well 10.77 -> ok
   Docent dark accent   #8e9bff: on the dark page  7.23, on the dark well  7.65 -> ok
   SKILL.md dark green  #6fd3a8: on the dark page 10.09, on the dark well 10.68 -> ok
   a muted brand gold   #8a6d1f: on the dark page  3.74, on the dark well  3.96 -> ok
   a deep brand blue    #1b2260: on the dark page  1.26, on the dark well  1.33 -> refused
== the lamp dot beside a host accent in dark mode (distance in CIELAB): two accent colors on one page
   lamp vs SKILL.md dark green #6fd3a8: 78.8
   lamp vs teal dark #57afa5: 87.3
   lamp vs red dark #ff7570: 64.4
### palette
== Docent's own pairs on host surfaces (the kit's text, muted, warn and the heat-4 number keep their values)
   Docent page            #fbfbfe: text 15.82 | muted 6.30 | warn 6.86 | ok 4.92 | heat-4 number in the page color 5.63 | heat-1 vs page 1.25
   a beige brand surface  #f3ece0: text 13.92 | muted 5.54 | warn 6.04 | ok 4.33 | heat-4 number in the page color 4.96 | heat-1 vs page 1.10
   a gray brand surface   #e9e9ec: text 13.49 | muted 5.37 | warn 5.85 | ok 4.19 | heat-4 number in the page color 4.80 | heat-1 vs page 1.07
   a navy brand surface   #0f172a: text  1.09 | muted 2.74 | warn 2.52 | ok 3.52 | heat-4 number in the page color 3.07 | heat-1 vs page 13.81
== a heading color worked out from the accent: the accent's hue at the lightness of Docent's ink
   Docent ink #1b2260: L*16.6 C42.7 h298, 14.08:1 on the page
   SKILL.md green       #0b6e4f -> ink #003020, 14.08:1 on the page; hand-picked #0b3d2e: 11.81:1, distance 5.9
   a red brand          #c8102e -> ink #5a000c, 14.12:1 on the page
   Docent ultramarine   #2f3fd0 -> ink #1b1f6a, 14.02:1 on the page; hand-picked #1b2260: 14.08:1, distance 8.7
### logo
== the logo slot: 24px high, at most 160px wide; a wider logo keeps its shape and gets lower, down to 16px
   shape     1:1 ->  24.0 x 24.0px
   shape     2:1 ->  48.0 x 24.0px
   shape     4:1 ->  96.0 x 24.0px
   shape  6.67:1 -> 160.0 x 24.0px
   shape     8:1 -> 160.0 x 20.0px
   shape    10:1 -> 160.0 x 16.0px
   shape    12:1 -> 160.0 x 13.3px  (below 16px: check warns)
== room in the top bar on the narrowest phone (320px): 320 - 2 x 20 gutter - theme button about 80px - gap 16px = 184 px for the logo and the name
== on paper: 24px is 6.35 mm high
== Docent's own mark as inline SVG: 301 bytes
== a 4:1 raster logo at 2x (192 x 48px): PNG 489 bytes, as a data URI 674 characters
== a 4:1 raster logo at 3x (288 x 72px): PNG 820 bytes, as a data URI 1118 characters
```

The raster logo above is a flat test drawing (a symbol and six letter-like bars, smoothed at the edges), so a real logo with fine detail is larger. The limit of 24,000 characters is a judgment, not a measure: it allows about 20 times the test logo.

The palettes, from a second script that turns Docent's grays and heat steps to each hue and runs every pair of `tests/contrast.py`:

```text
== Harbor: gray hue 225, chroma x1.6; accent #0a5f8a / #72c2ee; ink #0d3550; headings: system sans
   light grays: page #f6fcfe well #e9f6fa line #c0dbe3 muted #526064 text #152225
   dark grays:  page #01181d well #001013 line #1e363c muted #8f9ea3 text #dcecf1
   heat light:  #c8e8f2 #a5c3cd #7f9da7 #4c6a72 #2a464e
   heat dark:   #163239 #324b52 #4b656d #7c98a0 #a5c3cd
   page L*/C: light 98.6/2.3 (Docent 98.7/1.5), dark 6.8/8.7 (Docent 6.6/8.2)
   pairs 64, fails 0; the five closest to their limit:
     light ok on well         #1a7f37 on #e9f6fa  4.60 (min 4.5)
     paper ok on well         #1a7f37 on #e9f6fa  4.60 (min 4.5)
     light err on well        #cf222e on #e9f6fa  4.85 (min 4.5)
     paper err on well        #cf222e on #e9f6fa  4.85 (min 4.5)
     light ok on page         #1a7f37 on #f6fcfe  4.90 (min 4.5)
   accent on page 6.72 / well 6.31; dark accent 9.28 / 9.84; ink 12.35; muted 6.30 / 6.60; warn 6.42 / 7.68
   heat steps light dL*: 13.1, 14.1, 20.0, 14.9; step 1 vs page 1.25
   muted vs accent (CIE76): light 26.3, dark 28.5 (Docent: 74.0 and 42.0)
   accent distance to status (light): ok 72.4, warn 79.5, err 99.4; dark accent to lamp 106.3
== Plum: gray hue 330, chroma x1.6; accent #86307f / #e49ad9; ink #3d1640; headings: Iowan Old Style, Palatino
   light grays: page #fefafe well #faf1f8 line #e3d1e0 muted #645b63 text #251d24
   dark grays:  page #1f0f1d well #160914 line #3c2e3a muted #a399a1 text #f1e6ef
   heat light:  #f1dcee #ccb9c9 #a693a3 #72606f #4e3d4b
   heat dark:   #382936 #52424f #6d5c6a #a08e9d #ccb9c9
   page L*/C: light 98.7/2.5 (Docent 98.7/1.5), dark 6.5/12.6 (Docent 6.6/8.2)
   pairs 64, fails 0; the five closest to their limit:
     light ok on well         #1a7f37 on #faf1f8  4.60 (min 4.5)
     paper ok on well         #1a7f37 on #faf1f8  4.60 (min 4.5)
     light err on well        #cf222e on #faf1f8  4.85 (min 4.5)
     paper err on well        #cf222e on #faf1f8  4.85 (min 4.5)
     light ok on page         #1a7f37 on #fefafe  4.91 (min 4.5)
   accent on page 7.41 / well 6.93; dark accent 8.67 / 9.16; ink 14.65; muted 6.31 / 6.67; warn 6.42 / 7.68
   heat steps light dL*: 12.8, 14.1, 20.1, 14.9; step 1 vs page 1.25
   muted vs accent (CIE76): light 48.0, dark 37.8 (Docent: 74.0 and 42.0)
   accent distance to status (light): ok 108.4, warn 80.2, err 68.8; dark accent to lamp 99.8
== Sepia: gray hue 75, chroma x2.0; accent #2b4f8c / #93b4ef; ink #3a2a1a; headings: Iowan Old Style, Palatino
   light grays: page #fffbf6 well #fcf2e8 line #e3d4c4 muted #645d54 text #251f18
   dark grays:  page #1e1301 well #150c00 line #3b3024 muted #a39a91 text #f1e8de
   heat light:  #f5dfc7 #cfbba5 #a9957f #74624e #4f3f2d
   heat dark:   #392c1a #534533 #6f5e4c #a3907c #cfbba5
   page L*/C: light 98.8/2.9 (Docent 98.7/1.5), dark 6.7/10.1 (Docent 6.6/8.2)
   pairs 64, fails 0; the five closest to their limit:
     light ok on well         #1a7f37 on #fcf2e8  4.60 (min 4.5)
     paper ok on well         #1a7f37 on #fcf2e8  4.60 (min 4.5)
     light err on well        #cf222e on #fcf2e8  4.85 (min 4.5)
     paper err on well        #cf222e on #fcf2e8  4.85 (min 4.5)
     light ok on page         #1a7f37 on #fffbf6  4.93 (min 4.5)
   accent on page 7.84 / well 7.31; dark accent 8.72 / 9.24; ink 13.36; muted 6.30 / 6.61; warn 6.42 / 7.67
   heat steps light dL*: 13.0, 14.1, 20.1, 14.9; step 1 vs page 1.25
   muted vs accent (CIE76): light 44.9, dark 39.9 (Docent: 74.0 and 42.0)
   accent distance to status (light): ok 87.4, warn 84.5, err 95.7; dark accent to lamp 107.9
all themes, fails: 0
Docent itself: muted vs accent 74.0 42.0
```

The first draft of Harbor, with a teal accent and grays at hue 200, measured this, which is why Harbor changed:

```text
Harbor muted vs accent 8.4
#0b6574 C 23.9 h 220 page 6.52 well 6.06 vs muted #526161 18.4 to ok 53.6
#00687f C 26.0 h 230 page 6.2 well 5.76 vs muted #526161 21.1 to ok 58.3
#006d82 C 26.4 h 226 page 5.81 well 5.4 vs muted #526161 21.4 to ok 56.5
#0a5f8a L 38.0 C 30.9 h 258 page 6.76 well 6.28 vs muted #526161 28.4 vs Docent 68.4
```

---

## Decisions

Decided on 2026-11-23, so that the work can go on while the user is away. Each choice puts the reader and the host first: the host's brand shows clearly, the page stays readable in light, dark and on paper, and nothing is invented for the host. Each one can be changed in review, because no code exists yet.

1. **The logo: in the top bar, once, 24px high and at most 160px wide.** The top bar is where a reader looks for whose page this is, and one copy keeps the rule that a mark appears once. The footer then holds the tagline and the credit.
2. **A raster logo: allowed as a small PNG or WebP data URI, at three times its size.** Refusing it would leave many hosts without their logo, or with a traced copy of it. A PNG holds no script, so it is safe, and the size rule keeps it sharp on paper.
3. **A logo that shows on one page only: a tile in dark mode, never a hidden logo.** The reader keeps seeing the host's mark. The agent first offers a one-color version or a dark version, which look better than the tile.
4. **The credit: "Made with Docent" with a one-color mark; "Docent" is a link by default.** This is what the talk decided, with one addition: the mark's tile turns into a one-color mark, so the footer carries no Docent color on a branded page. `check` warns, and does not refuse, when the credit is missing.
5. **The interview: once per repo, four questions in one message, and the page as the record.** Later pages copy the brand from the newest page, so the user answers once. No new file goes into the host repo.
6. **A host `DESIGN.md`: six host tokens only, through `brand.cjs`.** The measures in section 4 show what breaks when a brand's page and status colors replace Docent's. A script, not the agent, works out a dark accent and a heading color, so the same file always gives the same page.
7. **A missing dark accent: same hue, 7:1 on the dark page.** It comes close to the values a person picks (10.8 and 13.1 away), where the 4.5:1 rule gave colors that were too dark.
8. **The dark dot: D3, the host's dark accent by default, and `--host-dot-dark` for another color, at 3:1.** One accent color in each theme, as light mode has today. Docent's own pages keep the lamp. Existing branded pages change on their next `stamp`, and the release note gives the line that keeps the lamp.
9. **The name: palettes, not themes.** "Theme" means light or dark in Docent already.
10. **Color: palettes that turn Docent's own tokens to a hue (T2); no accent tint on bands (T1).** T1 reverses the order of the layers in light mode and makes the accent a fill. T2 gives more color across the page with every pair tested in advance.
11. **Three palettes: Harbor, Plum and Sepia.** They cover a cool, a warm-violet and a warm-paper mood. Each hue is far from green, amber and red (68.8 or more), so no accent reads as a status. All 64 pairs of each pass.

**Where the user's view is most needed:**

- **Decision 8** changes the dark dot of pages that already set `--host-accent-dark`. The alternative is D1, which keeps the lamp everywhere and changes no existing page.
- **Decision 4** turns the footer's tile mark into a one-color mark. The alternative keeps the tile, so Docent's color shows on every page.
- **Decision 9** uses the word "palette", where the request said "themes".

## Not in this proposal

- Code. Item 1 comes in its own pull request.
- A change to the diagram kinds, the widgets or the heat map's rules.
- Palettes beyond the three samples. More can be added later, each tested in `tests/contrast.py` before it ships.
