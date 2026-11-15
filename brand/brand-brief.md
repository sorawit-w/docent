# Brand Strategy Brief: Docent

## Executive Summary

Docent is a design kit for documents: self-contained HTML guides and reports. This workshop gave it a name meaning, a tagline, a simple mark and a starter design spec. The brand is quiet on purpose, because Docent styles other projects' documents and the content must lead. The identity is one ink (ultramarine), one light (the lamp dot), serif headings on system fonts, and a flat off-white page. The design spec in [`../DESIGN.md`](../DESIGN.md) is the main result; the mark and the texts support it.

## Inputs

- **Name:** Docent. A docent is a museum guide who walks visitors through the exhibits. The word comes from the Latin *docēre*, "to teach".
- **What it is:** A project-independent design kit for self-contained HTML guides and reports.
- **Core features:** Step-by-step walkthroughs that light the current part, workflow diagrams with a moving dot, light and dark themes, clean print. An optional local agent guide may follow later.
- **Audience:** Developers, testers, managers and business stakeholders. Many read English as a second language.
- **Constraints:**
  - The design spec is the main deliverable. The mark is simple and the tagline is short.
  - Quiet brand: it must not compete with a host project's name or colors.
  - Light is the default theme; dark is supported.
  - At the time of the workshop, diagrams were planned to come from a third-party renderer with a fixed palette of cool grays with green, amber and red.
  - System fonts only. Every document is one file with nothing to download.
  - It must print cleanly and respect reduced motion.
  - Docent has its own look and its own name. It copies neither from another product.
  - It is not tied to any host project's brand.
  - House visual rules: the accent is a mark and never a fill, the page is flat, the background is never pure white or pure black, and only `transform` and `opacity` animate.

## Positioning

Docent is for teams that write long technical guides and reports for mixed readers. It plays in the category of documentation design kits. Its one difference is guidance: the document shows the reader where to look, one step at a time, instead of leaving the reader to find the path. It stays quiet so that the host project's content and name lead.

## Voice & Tone

- Plain words. When a common word exists, use it.
- One idea per sentence. Short sentences.
- A step heading is one sentence of at most six words, with a verb.
- Say what happens, not how to feel about it. No praise words, no hype.
- Write for a reader whose first language is not English. No idioms.

## Workshop Transcript

### Step 1 — Strategic foundation

**@senior-brand-strategist:** The challenge is unusual. Most brands want attention; this one must give attention away to the document. I want Docent to be perceived as the calm guide beside the exhibit, not the exhibit. The archetypes are the Sage (it teaches) and the Caregiver (it looks after the reader). The attributes are: clear, calm, guiding, precise, modest.

### Step 2 — Verbal exploration

**@senior-copywriter:** Seven tagline candidates, each from a different angle:

1. "A guide inside every document." — direct
2. "Documents that show the way." — benefit
3. "Follow the dot." — playful, from the moving dot
4. "Read it like a guided visit." — aspiration
5. "Every document, guided." — short
6. "Long documents, made easy to follow." — benefit
7. "The guide is in the page." — category-challenging

The tone is plain and exact. The name has no bad reading that I can find: in Dutch "docent" means teacher, and the German "Dozent" means lecturer. Both help.

### Step 3 — Visual direction

**@lead-visual-designer:** Three concepts for the mark.

```
Concept 1: "Route D"
Shape/Form: A letter D drawn as one stroke that stops before it closes. A dot sits at the open corner.
Symbolism: A route with a moving dot, as in a workflow diagram. The dot is the guide's lamp.
Negative Space: The gap between the stroke and the dot. The eye closes the D.
Style: Minimalist, geometric
Colors: White stroke and lamp dot on an ultramarine tile
```

```
Concept 2: "Spotlight D"
Shape/Form: A solid D with a round hole placed off-center.
Symbolism: A spotlight on one part of a page.
Negative Space: The round hole is the lit area.
Style: Minimalist, negative space
Colors: Ultramarine on off-white
```

```
Concept 3: "Page and beam"
Shape/Form: A rounded page with a quarter-circle of light from one corner.
Symbolism: A lamp held to a document.
Negative Space: The beam is cut out of the page.
Style: Geometric
Colors: Ultramarine with a lamp beam
```

For color I propose ultramarine `#2f3fd0` as the single ink. It is the classic blue of painting, so it fits a museum guide. It is far from green, amber and red, which mean status inside the diagrams. It is also not the usual link blue. The second color is a lamp yellow `#f2b824`, used only as a dot. The neutrals are the cool grays that the diagram renderer already uses, so figures and pages match.

For type, system fonts only. I pair a serif for headlines (Charter on Apple devices, Sitka on Windows) with the system sans-serif for body text and a monospace for small labels. The serif headline is what makes a Docent page recognizable without a brand font.

**@lead-ux-ui-designer:** Concept 1 survives at 16 pixels if the stroke is heavier and the dot is larger, so the favicon gets its own form. Lamp yellow on the light page has a contrast of only 1.74:1, so it must never carry meaning there. It works on the ultramarine tile (4.25:1) and on the dark page (10.51:1). All text pairs pass AA in both themes; the numbers are in `DESIGN.md`. The dark theme needs a lighter ultramarine, `#8e9bff`.

**@product-designer:** In a document, the brand shows in three places: the serif headings, the ultramarine line beside the current step, and the moving dot. The mark itself appears once, small. Notes and warnings should be a line and a label, not tinted boxes, to keep the page flat.

### Step 4 — Cultural and market check

**@regional-cultural-advisor:** Ultramarine has no negative reading in the main markets; blue reads as trust and calm. Yellow is positive in Thailand and most of Asia. Keep yellow away from status meanings, because many readers link it with caution. The word "docent" is not common in everyday English, so the tagline should say plainly what it is.

**@growth-strategist:** Concept 1 can be drawn from memory: a D and a dot. It also repeats what the product does, which helps people remember it. "Follow the dot" is the most memorable line, but it explains nothing to a first-time reader. Use it as a secondary line, not the tagline.

### Step 5 — Convergence

**@senior-brand-strategist:** The tagline is "A guide inside every document." It explains the uncommon name and states the product in five words. The mark is Concept 1, "Route D".

Votes:

- **@senior-copywriter:** Tagline 1. It is the clearest for a second-language reader.
- **@lead-visual-designer:** Route D. It is the only concept that shows motion in a still image.
- **@lead-ux-ui-designer:** Route D, with the separate favicon form.
- **@product-designer:** Route D. The dot links the mark to the diagrams.
- **@growth-strategist:** Route D and tagline 1, with "Follow the dot" kept as a second line.
- **@regional-cultural-advisor:** No objection to either.

## Final Concept

### Tagline

> "A guide inside every document."

Rationale: The name "Docent" is not a common word. The tagline explains it and states the product in five plain words.

### Logo Concept

"Route D": a letter D drawn as one white stroke on an ultramarine tile. The stroke stops before it closes, and a lamp-yellow dot sits at the open corner. The stroke is a route, and the dot is the moving dot of a workflow diagram and the guide's lamp. The eye closes the letter.

Files: [`logos/mark.svg`](logos/mark.svg), [`logos/logo.svg`](logos/logo.svg) (mark and wordmark), [`favicons/favicon.svg`](favicons/favicon.svg) (heavier form for 16 pixels).

The tile is the one place where ultramarine fills an area. A favicon has to stay clear on any browser background, so the mark carries its own ground.

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary — Ultramarine | `#2f3fd0` (dark theme `#8e9bff`) | A mark only: links, underlines, the line beside the current step, the focus ring |
| Secondary — Ink | `#1b2260` | The cover title and strong headings, as text |
| Tertiary — Lamp | `#f2b824` | A dot only: in the mark, and the current-step dot in dark mode |
| Neutral — Well | `#f2f3f9` (dark theme `#0b0d15`) | The ground of figures and code, one step darker than the page |
| Surface | `#fbfbfe` (dark theme `#12141f`) | Page background |
| Text | `#1c1f2e` (dark theme `#e7e9f3`) | Body text |

### Typography

- Headlines: `Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif`, weight 700.
- Opening paragraph: the same serif at regular weight.
- Body, block headings and small text: the system sans-serif. Labels are written in sentence case.
- Code: the system monospace, for code and commands only.

The refined rules, including the dot-and-route idea, the margin column and the six type sizes, are in [`../DESIGN.md`](../DESIGN.md). The sample page [`../skills/docent/assets/specimen.html`](../skills/docent/assets/specimen.html) shows them.

## Decisions After the Workshop

- **Docent draws its own diagrams.** The workshop assumed diagrams from a third-party renderer, with its fixed palette. A trial showed three problems: the result did not look like Docent's own, its text was too small in a document, and its notes had a contrast below the 4.5:1 rule. Docent now draws workflows in its own Route style and uses no third-party renderer. The rules are in [`../DESIGN.md`](../DESIGN.md).
- **Docent has its own grays.** The first grays matched the third-party renderer. With that renderer gone, every gray now leans slightly toward ultramarine.
- **The theme follows the reader's system.** The workshop made light the default. A document now opens in the theme of the reader's system, and the switch sets a choice that wins.
- **The dot and the route became the main idea.** The mark, the top bar, the walkthrough rail and the Route diagram all show a dot on a route.

## Rejected Alternatives

- **"Follow the dot."** Memorable, but it does not explain the product to a first-time reader. Kept as a secondary line.
- **"Spotlight D" and "Page and beam".** Both show light, but neither shows a path or motion, and both lose their detail at 16 pixels.
- **Indigo or violet as the primary.** Too close to the common look of AI products.
- **Teal as the primary.** A common action color in host projects; Docent must not look tied to one project.
- **A warm orange or red as the primary.** It sits near the red and amber that mean status inside the diagrams.
- **Lamp yellow as a text highlight.** It would be a filled area, and the contrast on the light page is too low.
- **A brand web font.** Every document is one self-contained file, so the kit uses system fonts.
