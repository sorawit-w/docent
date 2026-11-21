# Page layout for generated documents

2026-11-21. Scope: screen and print layout for Docent pages (guides, reports, incident traces, runbooks), by audience and document type.

## 1. Summary

Docent's text width is right, and the evidence does not support changing it. The 31rem column gives about 63-70 characters per line. Screen studies find that readers prefer and rate as easier lines of about 45-76 characters. No study found that this range hurts speed or comprehension. Longer lines were sometimes read faster, but readers liked them less, and comprehension did not improve.

The real problem is balance on wide screens. On a 1920px screen the text and its notes sit 178px left of the screen center. The best fix is the Tufte pattern: center the text-plus-notes group and let wide blocks grow to the right. This keeps the shared left edge in DESIGN.md. The evidence for this choice is weak. No study compares a centered text axis with a left-aligned one on modern screens. No study tests whether prose and code that share one left edge are easier to scan. The choice rests on convention, on one eye-tracking study, and on arithmetic.

Audience and document type should change density, the width of tables and code, and navigation. They should not change the prose width. A small set of four profiles covers the common cases. When the agent is unsure, it should use the plain single-column profile and tell the author which profile it chose.

For print, Docent should leave paper size to the reader, set body text near 11pt, and keep a prose measure of about 110-130mm. Margin notes already drop below their paragraph on A4 and Letter. Running headers and page numbers work only in Chrome and Edge (since version 131, November 2024). Closed `<details>` elements print closed in browsers, but the kit script already opens them before printing.

Fluid body type has no reading evidence behind it and adds a zoom risk under WCAG 1.4.4. Docent should keep a fixed `1rem` body that follows the user's browser setting.

## 2. Evidence table

Kinds: study (measured research), standard (WCAG, CSS specs, named style frameworks), convention (practice, guidance or expert opinion without its own data), data (usage or support statistics), test (a check run for this report). [secondary] means only an abstract or summary was read.

| Claim | Source | Kind | Confidence |
|---|---|---|---|
| 1920x1080 is about 28% of desktop screens; 2560x1440 is under 4% (Oct 2026) | https://gs.statcounter.com/screen-resolution-stats/desktop/worldwide | data | high |
| Worldwide page views: mobile 59.9%, desktop 38.5%; US desktop 52.4% (Oct 2026) | https://gs.statcounter.com/platform-market-share/desktop-mobile-tablet | data | high |
| GOV.UK, Dec 2025: 61% mobile, 38% desktop, 1% tablet | https://insidegovuk.blog.gov.uk/2026/01/28/how-people-used-gov-uk-in-2025/ | data | high |
| Steam users, Oct 2026: 2560x1440 21.8%, 3840x2160 5.1% (gamer sample) | https://store.steampowered.com/hwsurvey/ | data | medium |
| A 1920 screen at 125% scaling reports 1536x864; browser width was 1408 | https://experienceleaguecommunities.adobe.com/t5/adobe-analytics-questions/monitor-resolution-and-browser-width-are-affected-by-windows/td-p/592122 | data | medium |
| On-call apps let staff triage alerts on a phone (vendor claim; no runbook device data) | https://www.pagerduty.com/blog/mobile-incident-management/ | convention | low |
| 91.3% of screen reader users use one on mobile | https://webaim.org/projects/screenreadersurvey10/ | data | high |
| 95 cpl read fastest; no reliable preference [secondary] | https://webarchive.library.unt.edu/eot2008/20090113170816/http:/usability.gov/pubs/082006news.html | study | medium |
| 45/76/132 cpl: no speed difference; adults preferred medium; none chose full width [secondary] | https://journals.sagepub.com/doi/10.1177/154193120304701112 | study | medium |
| 55 cpl rated easiest; long lines rated least easy [secondary] | https://journals.uc.edu/index.php/vl/article/view/5671 | study | medium |
| Longer lines helped visual search; shorter lines got better ratings [secondary] | https://research.tees.ac.uk/en/publications/the-influence-of-font-type-and-line-length-on-visual-search-and-i/ | study | medium |
| Literature review: keep lines under about 70 cpl | https://journals.uc.edu/index.php/vl/article/view/5765 | study | medium |
| Reading preference does not predict reading speed (fonts) | https://jeffhuang.com/papers/Readability_TOCHI22.pdf | study | high |
| ESL adults (N=459): font width and spacing changes had little effect; line length not tested | https://stars.library.ucf.edu/etd2024/62 | study | medium |
| Dyslexia and general readers: sizes up to 18pt read better; 12pt was slower [secondary] | https://de.slideshare.net/mpielot/make-it-big-the-effect-of-font-size-and-line-spacing-on-online-readability-62004998 | study | medium |
| Dyslexia line length 50-75 cpl (no study cited) | https://dyslexiascotland.org.uk/dyslexia-friendly-typed-formats | convention | low |
| Older adults: 19px / 14pt body text | https://health.gov/healthliteracyonline/display/full | convention | medium |
| WCAG 1.4.10: reflow at 320 CSS px; side columns stack | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | standard | high |
| WCAG 1.4.4: text resizes to 200%; vw parts do not grow with zoom; max ≤ 2.5× min passes | https://smashingmagazine.com/2023/11/addressing-accessibility-concerns-fluid-type | standard + convention | medium |
| Root size `100%`; never set max font below 2× base | https://adrianroselli.com/2019/12/responsive-type-and-zoom.html | convention | medium |
| 80% of fixations on the left half at 1920px; peak near 600px from the left | https://www.nngroup.com/articles/horizontal-attention-leans-left/ | study | high |
| Centered, left-fixed and fluid layouts: no performance difference (2001, old screens) | https://www.humanfactors.com/newsletters/web_site_layout.asp | study | low |
| Right-rail contents lists: "caution advised" (qualitative) | https://www.nngroup.com/articles/table-of-contents/ | convention | medium |
| MDN centers a 1440px page: nav left, contents right, content 31-48rem | https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-columns | convention | high |
| Tufte CSS: shared left edge, notes right, wide blocks grow right, body shifted to balance | https://edwardtufte.github.io/tufte-css/tufte.css | convention | high |
| Observable: prose 640px, code 960px, same left edge, contents list right | https://github.com/observablehq/framework/blob/main/src/style/global.css | convention | high |
| Distill: text centered, symmetric wide tracks, notes gutter right | https://distill.pub/template.v2.js | convention | high |
| Sidenotes should be visible by default; narrow fallbacks vary | https://gwern.net/sidenote | convention | medium |
| Reference is consulted, not read; a how-to is a sequence | https://diataxis.fr/reference/ | standard | high |
| Users read at most 28% of words on a page (2008) | https://www.nngroup.com/articles/how-little-do-users-read/ | study | medium |
| Readers scan headings when headings are distinct | https://www.nngroup.com/articles/layer-cake-pattern-scanning/ | study | medium |
| Hard text on phones: about 30 ms/word slower, same comprehension | https://www.nngroup.com/articles/mobile-content/ | study | medium |
| Surface cues detect genre about as well as deep features | https://aclanthology.org/P97-1005/ | study | medium |
| Zero-shot LLMs often match trained models on web genre | https://arxiv.org/html/2511.07989v2 | study | medium |
| Diataxis classifier: rules first, LLM only when unsure, LLM capped at medium | https://rolfedh.github.io/doc-utils/tools/classify-guides | convention | medium |
| Readability formulas can only warn; remove headings and lists first | https://www.ahrq.gov/talkingquality/resources/writing/tip6.html | standard | medium |
| Print body 10-12pt; 45-90 characters per line | https://practicaltypography.com/point-size.html | convention | high |
| 1in = 96px = 72pt, so 16px = 12pt | https://www.w3.org/TR/css-values-4/#absolute-lengths | standard | high |
| `@page` size and margin work in Chrome, Firefox and Safari 18.2+ (Dec 2024) | https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/page.json | data | high |
| Margin boxes and `counter(page)`: Chrome 131+ only; Firefox and Safari no (2026-11-21) | https://developer.chrome.com/blog/print-margins | data | high |
| `orphans`/`widows`: Chrome and Safari; never Firefox | https://caniuse.com/css-widows-orphans | data | high |
| `print-color-adjust` is advisory; the user's setting wins | https://developer.mozilla.org/en-US/docs/Web/CSS/print-color-adjust | standard | high |
| Closed `<details>` prints with only the summary | https://bugzilla.mozilla.org/show_bug.cgi?id=1825244 | data | medium |
| Break rules are hints; grid and flex split poorly across pages | https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/ | convention | medium |
| A4 print width: margin notes drop below their paragraph, nothing overflows (viewport emulation, not a real PDF) | Coordinator check, headless Chrome, 2026-11-21 | test | medium |

## What the evidence says, question by question

### Screens and devices by audience

Most desktop screens are wide enough for Docent's two-column layout. The layout needs about 844 CSS px, and every common desktop width in October 2026 is 1280px or more ([StatCounter](https://gs.statcounter.com/screen-resolution-stats/desktop/worldwide)). Operating-system scaling makes the real viewport smaller than the screen. A 1920 screen at 125% gives a browser about 1408-1521px wide ([Adobe community](https://experienceleaguecommunities.adobe.com/t5/adobe-analytics-questions/monitor-resolution-and-browser-width-are-affected-by-windows/td-p/592122)). The narrow cases are split windows, portrait tablets and zoomed laptops. In those cases the notes must stack.

The general public reads mostly on phones: 61% on GOV.UK ([GOV.UK](https://insidegovuk.blog.gov.uk/2026/01/28/how-people-used-gov-uk-in-2025/)). For public documents, the single column is the main layout, not a fallback.

There is no measured 2024-2026 device data for developer docs, for on-call staff reading runbooks, or for managers reading reports. Developers probably have larger screens; Steam's sample shows about 1 in 4 at 2560px or wider ([Steam](https://store.steampowered.com/hwsurvey/)). Gamers are not developers, so this is a rough guide, not a measurement. On-call tools send alerts to phones ([PagerDuty](https://www.pagerduty.com/blog/mobile-incident-management/)), so the top of a runbook should work at 360px. My estimate is that viewports wider than 1600px are at most about 13% of page views on the general web (0.385 desktop share × about 0.33 of screens ≥1920 wide). No public viewport data exists to confirm this.

### Line length: studies versus conventions

Studies:
- Speed: Duchnicky and Kolers (1983) and Shaikh (2005) found longer lines read faster ([HFI summary](https://humanfactors.com/newsletters/optimal_line_length.html); [usability.gov archive](https://webarchive.library.unt.edu/eot2008/20090113170816/http:/usability.gov/pubs/082006news.html)). Bernard (2002) found no speed difference ([HFES](https://journals.sagepub.com/doi/10.1177/154193120304701112)).
- Preference: Bernard, Dyson and Kipping, and Ling and van Schaik all found readers prefer short to medium lines.
- Task type: Ling and van Schaik (2006) found longer lines helped visual search ([Teesside](https://research.tees.ac.uk/en/publications/the-influence-of-font-type-and-line-length-on-visual-search-and-i/)). This weakly supports wider tables and code, not wider prose.
- Most of these studies are old and small, and sample sizes were not available. I found no 2015-2026 study of line length on modern screens or on phones.

Reader groups:
- ESL readers: no study tests line length. The one large study (N=459) found that typography changes barely matter; content and language matter more ([Rashid 2024](https://stars.library.ucf.edu/etd2024/62)).
- Dyslexia: the evidence is about font size. Rello's studies found sizes up to 18pt read better than 12pt ([slides](https://de.slideshare.net/mpielot/make-it-big-the-effect-of-font-size-and-line-spacing-on-online-readability-62004998)). Line-length advice for dyslexia (50-75 or 60-70 cpl) is convention ([Dyslexia Scotland](https://dyslexiascotland.org.uk/dyslexia-friendly-typed-formats)). I could not confirm a BDA line-length figure.
- Low vision: guidance comes from WCAG, not studies. A rem measure used as a `max-width` already meets 1.4.10 ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)).
- Older adults: no line-length study. Guidance asks for 19px body text ([health.gov](https://health.gov/healthliteracyonline/display/full)). This is convention.

The strongest evidence-based concern is body size, not width. Docent's 16px (12pt) is at the low end of the dyslexia and older-adult evidence. Because sizes are in rem, a reader who raises the browser default gets larger text at the same characters per line. Respecting that setting matters more than a bigger default.

### Wide-screen patterns in strong sites

Most docs sites center a capped page of about 1440px. They put navigation on the left and an "On this page" list on the right, so the text ends up near the screen center ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-columns); [Observable](https://github.com/observablehq/framework/blob/main/src/style/layout.css)). Sites with no side columns, such as mdBook and Distill, center the text itself. The sites that keep one left edge for text and wide blocks always put something in the right-hand space. Tufte CSS shifts the whole body right so text plus notes is near the center ([tufte.css](https://edwardtufte.github.io/tufte-css/tufte.css)). Observable uses a contents list. GOV.UK uses a related-links column.

The breakout grid (wide blocks span extra grid tracks) is symmetric by default ([Comeau](https://www.joshwcomeau.com/css/full-bleed/); [Mulligan](https://ryanmulligan.dev/blog/layout-breakouts/)). Named grid lines can also make it one-sided, and Distill mixes both kinds in one grid ([Distill](https://distill.pub/template.v2.js)).

On the shared left edge, the only eye-tracking evidence is NN/g's left-side study. At 1920px, 80% of fixations fell on the left half, with the peak near 600px from the left edge ([NN/g](https://www.nngroup.com/articles/horizontal-attention-leans-left/)). Docent's text starts at 400px today. This study does not argue for pushing text to the far left. It shows readers look left within the content area. **No study tests a shared left edge for prose and code. No study compares centered and left-aligned reading columns on modern wide screens.** The F-pattern makes a shared edge plausible, but that is an inference.

### Document types and audiences (Diataxis)

Diataxis splits docs into study mode (tutorial, explanation) and work mode (how-to, reference) ([Diataxis](https://diataxis.fr/compass/)). Reference is "consulted, not read", and a how-to is a sequence of actions ([reference](https://diataxis.fr/reference/); [how-to](https://diataxis.fr/how-to-guides/)). Diataxis gives no layout numbers, so every layout mapping below is inference. Runbooks and incident reports are outside Diataxis. Google SRE describes playbooks by content, not layout ([SRE Workbook](https://sre.google/workbook/on-call/)). Incident templates share a short summary, impact numbers and a UTC timeline table ([PagerDuty](https://docs.pagerduty.com/ops-guides/incident-response-guide/postmortem-template)). Readers scan headings when headings are clear ([NN/g](https://www.nngroup.com/articles/layer-cake-pattern-scanning/)). That helps every type more than any width choice does. "Experts prefer dense layouts" is design-system convention, not a tested finding ([BASIS](https://design.basis.com/foundations/density)).

### Fluid type and zoom

No study shows that fluid type helps reading. It is a design convention. Its accessibility risk is documented: the `vw` part of `clamp()` does not grow with browser zoom, so text can fail to reach 200% under WCAG 1.4.4 ([Barvian](https://smashingmagazine.com/2023/11/addressing-accessibility-concerns-fluid-type); [Roselli](https://adrianroselli.com/2019/12/responsive-type-and-zoom.html)). The working rules are:
- Keep the root at `100%`, never a px value.
- Keep the body at `1rem`. This carries no 1.4.4 risk.
- If headings become fluid, use `rem + vw` in the middle value and keep each max at or below 2× its min. That meets both Roselli's and Barvian's rules.
- Test at 200% and 400% zoom in Chrome, Firefox and Safari.

## 3. Wide-screen strategies

The obvious default would be "center everything, like most docs sites". That is wrong for Docent if the owner wants to keep the shared left edge, because a symmetric grid gives up that edge. Below are four options. All positions are computed from the CSS values for a 1920px viewport. Browser measurements were not taken.

**A. Tufte style: center the text-plus-notes group, wide blocks grow right.** The group (764px) starts at x=578 and ends at 1342. Wide blocks start at 578 and end at 1698. The left edge stays shared. The left offset needs a clamp so wide blocks never pass the right edge: `max(40px, min((100vw - 764px)/2, 100vw - 40px - 1120px))`. With that clamp the group is centered at 1920px and only 58px left of center at 1440px.
- For: smallest change; keeps the DESIGN.md rule; matches Tufte CSS and Observable; text starts near NN/g's measured fixation peak.
- Against: wide blocks look off-center (their center is 178px right of the screen center); a page with many wide blocks looks shifted right.

**B. Symmetric centered breakout grid (Distill style).** The text (496px) is centered at 712-1208. Notes sit in a right gutter at 1256-1476. Wide blocks are centered at 400-1520.
- For: the most common convention; every wide block is balanced; it is easy to add more track widths.
- Against: drops the shared left edge (code starts 312px left of prose); the text-plus-notes group sits 134px right of center; DESIGN.md must change.

**C. Three-part layout: contents list on the left, notes on the right (MDN style).** A 200px contents list, the text and the notes make 1012px. At 1920 the list starts at 454 and the text at 702. The list should appear only above about 1100px and stay in the body below that.
- For: fills both sides with useful content; helps long reference pages; a left contents list is safer than a right one under NN/g's "right-rail blindness" caution ([NN/g](https://www.nngroup.com/articles/table-of-contents/)).
- Against: more structure for short pages; a sticky side list needs care in a single file; the list repeats the in-body contents list.

**D. Wider or fluid measure.** Let the prose grow toward 80-95 characters on wide screens.
- For: uses the space; longer lines were sometimes read faster.
- Against: readers rate long lines worse; no study shows better comprehension; WCAG 1.4.8 (AAA) caps lines at 80 characters ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html)). Only tables and code should get wider.

**Recommendation: A.** The evidence for A over B is weak. It rests on convention (Tufte, Observable), on NN/g's left-side fixation data, and on arithmetic. A keeps the current rule and fixes the measured imbalance with a small change. C is worth adding later as an option for the Reference profile only. D is not supported.

## 4. Layout profiles by document type and audience

The profiles change density, wide-block width and navigation. All four keep the 31rem prose measure, because no evidence supports a different measure per type.

| Profile | Used for | Text width | Density | Body size | Code / table width | Navigation |
|---|---|---|---|---|---|---|
| Standard (default) | Explanation, tutorial, policy, public guides, unclear cases | 31rem (~65 cpl) | Relaxed | 1rem; consider 1.125rem for public and older readers | Up to text + notes (764px); scroll inside the box | In-body contents list at the top when long |
| Task | How-to, runbook, troubleshooting | 31rem | Compact between steps | 1rem | Up to text + notes; each command in its own copyable block | Short step list at the top; no side columns; first screen works at 360px |
| Reference | API, config and option lists | 31rem for prose | Dense rows; never smaller text | 1rem | Full width (1120px) | In-body list plus a side contents list on wide screens (strategy C) |
| Brief | Manager reports, incident reports, release notes | 31rem | Medium | 1rem | Timeline tables full width; scroll sideways on phones | Summary and impact first; contents list when long |

Content signals the agent can count (my synthesis from doc-utils and the templates above; not tested):
- Numbered steps and sentences that start with imperative verbs point to Task.
- An alert name, a severity, "mitigate" or "rollback", and many shell commands point to Task (runbook).
- Many HH:MM UTC timestamps, plus "impact", "root cause" or "action items", point to Brief (incident).
- Many tables, flag or parameter names, and little prose point to Reference.
- Long paragraphs, "why" or "how X works", diagrams and few commands point to Standard.
- A summary or recommendation first, plus money, dates and few code blocks, points to Brief.
- "must", "may not", "applies to" and defined terms point to Standard (policy).
- The share of text in code blocks signals audience: high for developers, near zero for managers or the public. Jargon density may help too. No source tests either signal for audience.
- Readability scores are a weak signal. Use them only when two profiles score the same. Remove code, tables, headings and lists before scoring ([AHRQ](https://www.ahrq.gov/talkingquality/resources/writing/tip6.html)).

Decision rule:
1. If the author declares a type, use it.
2. If the rule scores give one clear winner, use it.
3. If the rules are unsure, ask the LLM, but treat its answer as medium confidence at most ([doc-utils](https://rolfedh.github.io/doc-utils/tools/classify-guides)).
4. If it is still unsure or two types tie, use Standard. Name the chosen profile in the output so the author can change it.
5. Ask the author first only when the choice is hard to undo, for example a document meant for print or for phones only.

The wrong default to avoid is "the page has code, so use a dense, wide developer layout". Tutorials and runbooks contain code too, and they need a plain single column. For mixed documents, such as an incident report with a runbook section, use the page profile and change only section-level traits (a wide table, copyable commands).

## 5. Print

Page size and margins:
- Do not set `size: A4` or `size: letter`. The reader's paper choice should win.
- Keep `@page { margin: 18mm }`. It works in all three engines (Safari since 18.2, December 2024) ([BCD](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/page.json)).

Body size and measure:
- Set print body text to 11pt. Print norms are 10-12pt ([Butterick](https://practicaltypography.com/point-size.html)). Today's 16px prints at exactly 12pt ([CSS Values 4](https://www.w3.org/TR/css-values-4/#absolute-lengths)).
- The kit sets body and label sizes in px, not rem (`body { font: 400 16px/1.65 … }` in `kit.css`). So a print rule that sets only the root to 11pt changes the measure but not the text. The print styles must set the body and the 14px labels too, or the kit must move its sizes to rem first. (Fixed later: the kit now sets every text size in rem.)
- With an 11pt root, 31rem becomes about 120mm, which holds about 56-69 characters. A full-width column (174mm on A4, 180mm on Letter) at 11pt holds about 82-103 characters. That is past Butterick's 90-character limit ([line length](https://practicaltypography.com/line-length.html)). So keep the rem measure on paper, and let only tables and code use the full width.
- The character counts assume an average glyph width of 0.45-0.55em. This factor is an assumption from the notes, not measured on Docent's fonts.

Margin notes:
- Today, on A4 and Letter widths, the 900px breakpoint stacks each note below its paragraph. Nothing overflows (coordinator check, headless Chrome, 2026-11-21, viewport emulation only).
- Option 1: keep the stacked notes and style them for paper (a small label or rule, 9-9.5pt). This is safe and already works.
- Option 2: a Tufte-style print layout with a 112mm text column, an 8mm gap and a 50mm note column at 8.5-9pt, which fits A4's 174mm. It keeps the screen design, but long notes can collide with the next note.
- Switch the text-plus-notes grid to block layout in print, because grid and flex split poorly across pages ([Andrew](https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/)).

Breaks:
- Keep `break-inside: avoid` on figures, tables and code, and `break-after: avoid` on h2 and h3. Browsers treat them as hints.
- Add `orphans: 2; widows: 2` on `p` and `li`. Chrome and Safari support them; Firefox never has ([caniuse](https://caniuse.com/css-widows-orphans)).
- A code well taller than a page must split anyway. Give it a border so both parts still read as code.

Running headers and page numbers:
- `@page` margin boxes with `counter(page)` work in Chrome and Edge 131+ (November 2024) only. Firefox and Safari do not support them as of 2026-11-21 ([Chrome blog](https://developer.chrome.com/blog/print-margins); [Mozilla bug](https://bugzilla.mozilla.org/show_bug.cgi?id=856371); [WebKit bug](https://bugs.webkit.org/show_bug.cgi?id=85062)).
- Use them only as an enhancement. Browsers also print their own header and footer, which the user controls. Which margin boxes Chrome's own footer uses is [unverified].

Link targets:
- Print external URLs only. Skip `#` and same-document links. Set the URL at 8.5-9pt with `overflow-wrap: anywhere`.
- Because Docent builds the HTML, it could instead number links and print a link list at the end with no runtime script. Skip the URL when the link text is already the URL (this needs a build-time class).

`<details>`:
- Closed `<details>` prints with only the summary ([Mozilla bug 1825244](https://bugzilla.mozilla.org/show_bug.cgi?id=1825244)).
- Docent already handles this: `kit.js` opens every closed `<details>` on `beforeprint` and closes them again on `afterprint`. A Docusaurus issue asks for the same thing so that pages print with their `<details>` open ([issue](https://github.com/meta/docusaurus/issues/10140)).
- A CSS rule on `::details-content` may avoid the script, but it is [unverified] and needs a test in all three engines.

Colour:
- Reset colour tokens to the light theme in print. Whether browsers apply dark-mode styles in print is [unverified].
- Keep `print-color-adjust: exact` only where colour carries meaning, such as status dots. The user's background setting can still win ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/print-color-adjust)). Give code wells a thin border so they still show when backgrounds are dropped.

## 6. Open questions for a human decision

1. Should DESIGN.md keep the shared left edge? Strategy A keeps it; strategy B drops it. No study settles this.
2. Should margin notes on paper stay stacked under their paragraph, or move to a printed side margin?
3. Should the Standard profile raise body text to about 18px for public or older readers, or keep 16px and rely on the user's browser setting?
4. Should the agent choose a profile on its own and report it, or ask the author every time?
5. Should long Reference pages get a side contents list, and on which side?
6. Should print body text be 11pt (fewer pages, print norm) or stay 12pt (same as screen)?
7. Are Chrome-only page numbers worth the extra CSS, given that Firefox and Safari readers get the browser's own footer?
