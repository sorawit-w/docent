# Proposal: sources and number rules — where a number comes from, and how sure it is

Status: **approved on 2026-11-24**, as written, with the recommended answer to each decision (see "Decided" near the end). No code is written yet. The items are built in the order of section 10, each in its own pull request. On 2026-11-23 the user set Docent's audiences: software development and business first (especially customer and market data analysis), and research third, once source features exist. A team review then found that Docent cannot show where a number comes from. The sample numbers in this proposal are invented, on the "Report a bug" topic, and they agree with the bar chart example in [`charts.md`](charts.md) (section "Measured" shows the arithmetic).

## The answer first

A business reader who sees "1,090 reports, up 12%" asks three questions: where does this come from, compared with what, and how sure is it? Docent gives an author no place to answer them. Add seven small parts. None of them adds a color, a script or a new kind of drawing.

1. **A source line** under a chart or a table: where the data comes from, its dates, and its size (n). It is one line in the caption. `check` warns when a chart drawn from data has none.
2. **Footnotes:** a number in brackets in the line, such as `[1]`, at full text size, and the notes at the end of the section, each with a link back. Plain links, so they work with scripts off, on paper and with a screen reader.
3. **A list of sources** for a document that cites outside work, in one simple author-year style, the one `DESIGN.md` already uses.
4. **A "Method and limits" section,** with four fixed parts: method, data, what was left out, and how sure the result is. It comes after the findings in every profile.
5. **Rules for writing numbers,** each as a short do and don't: units, rounding, thousands, minus, ranges, percent against percentage points, n, change against a period, dates, and "about". `check` warns about the five that a source can show.
6. **A number with its change,** in a card or a sentence: the value, then the direction as a word, the amount, and the period it is compared with. No green, no red, no arrow alone.
7. **How sure a result is:** rules for writing a range in words, and one new row type in the range chart, an **estimate**, which is a point inside its interval.

| # | Pull request | Size |
|---|---|---|
| 1 | The source line: `.source` in a caption, under a figure or a table; a `check` warning for a chart with none; the template and the sample page | Small |
| 2 | The number rules: a "Numbers" part in `DESIGN.md`'s Voice, a summary in `SKILL.md`, and five `check` warnings | Medium |
| 3 | A number with its change: `.change` in a card, and its `check` test | Small |
| 4 | Footnotes: the mark, the notes, the link back, and `check` tests of the links and numbers | Medium |
| 5 | The list of sources and "Method and limits": styles, the template, `SKILL.md` for each profile, and `check` tests | Medium |
| 6 | The estimate row in the range chart | Medium |

Items 1 to 3 serve the first two audiences, so they come first. Items 4 to 6 lean toward research. Section 10 gives the order.

## The obvious answers that would be wrong

**A raised, small footnote number (`<sup>1</sup>`).** This is what most sites do, and `check` already refuses it: `<sup>` makes text smaller than its line, and no text in Docent is below 14px outside a drawing. A raised 10px digit is also hard to read for a reader of English as a second language, hard to hit with a finger, and easy to read as an exponent next to a number ("18%²"). Section 3 uses a full-size `[1]` instead.

**Many citation styles, or a citation manager.** APA, Chicago, IEEE and the others differ in punctuation and order, not in what the reader learns. A tool that formats them (a CSL processor with its style files) is a large script and a set of data files, so the page is no longer one small file that works with scripts off. Docent's readers need who, when, what and where to find it. One style says that (section 4).

**A green arrow up and a red arrow down for a change.** Up is not always good: more bug reports is bad news. In Docent, green, amber and red mean status only, and a color is never the only sign. The direction is a word, and whether it is good news is the author's sentence (section 7).

**"Method and limits" in a closed section at the end.** It looks tidy, but the reader who most needs the limits is the one who never opens it. The section stays open, and the one limit that could change a decision also stands beside the finding (section 5).

---

## 1. What Docent has today

| Part | What it does now | What this proposal needs from it |
|---|---|---|
| Caption (`figcaption`) | A bold "Figure n" and one sentence, 14px, muted | A second line for the source |
| The line above a chart | Inside the drawing: what the numbers count, where the scale starts, the order of the rows | Nothing. It says how to read the chart, not where the data comes from |
| The diagram in words (`details.dg-words`) | Every number of a chart, as a table under the drawing | Nothing. It stays the full record of the numbers |
| Facts list (`ul.facts`) | Short facts about the document in the title's margin note | One more fact: the data and its dates |
| Card grid (`ul.cards`, `p.big`) | A large number and one muted line | A third line for the change |
| Range chart | One mark per row: a range, a point or a limit | A point and a range on one row |
| `check`, rule 5 | Refuses `<small>`, `<sub>` and `<sup>` | Keep it: footnote marks stay at full size |
| `check`, rule 10 | Finds a column of numbers and asks for `class="num"` | The same column finder serves the number rules |
| Print styles | Links print as plain text ("Paper has no link") | A web address in the list of sources must be written as visible text |
| `html { scroll-padding-top: 88px }` | A jump to a section stops below the sticky top bar | The same for a jump to a note and back |
| `DESIGN.md`, "Sources" | One entry, Cleveland and McGill (1984), cited in the text as "(Cleveland and McGill, 1984)" | The model for the one style |

---

## 2. The source line

**The reader's question:** *Where do these numbers come from, which dates do they cover, and how many things were counted?*

### The markup

The source line is the last line of the caption. A chart drawn from data, a hand-drawn figure and a table all use the same markup.

```html
<figure>
  <div class="fig" role="region" aria-label="Figure 4, bug reports by area" tabindex="0">
    <!-- docent:diagram { "id": "reports-by-area", "kind": "bar", ... } -->
  </div>
  <figcaption><strong>Figure 4</strong>Sign-in had the most bug reports.
    <span class="source">Source: the team's bug tracker, 1 July to 30 September 2026, n = 1,090 reports.</span></figcaption>
</figure>
```

A table that holds outside data gets the same frame: a figure, with "Table n" in its caption.

```html
<figure>
  <div class="table-wrap" role="region" aria-label="Table 2, reports by area" tabindex="0">
    <table>…</table>
  </div>
  <figcaption><strong>Table 2</strong>Reports by area, largest first.
    <span class="source">Source: the team's bug tracker, 1 July to 30 September 2026, n = 1,090 reports.</span></figcaption>
</figure>
```

**What goes in it, in this order:** `Source:`, then where the data comes from (a system, a survey, a published work), then the dates, then n with its unit. Each part is written by the rules in section 6. When the data comes from two places, write `Sources:` and split them with a semicolon. When the numbers are made up, for a sample or a test, the line says so: `Source: invented sample data.`

### How it relates to the other text

Each piece of text around a chart has one job, so nothing is said twice.

| Text | Its job | Example |
|---|---|---|
| Caption sentence | What the figure shows: the finding | "Sign-in had the most bug reports." |
| Source line | Where the numbers come from | "Source: the team's bug tracker, 1 July to 30 September 2026, n = 1,090 reports." |
| The line above the chart (drawn) | How to read the drawing | "Reports in the third quarter, bars from 0. Largest first." |
| `label` in the data | The finding in full, for a screen reader | "Sign-in had the most bug reports in the third quarter, 412. …" |
| The diagram in words | Every number | A table: area and reports |
| "Method and limits" | How the numbers were made, and what they cannot tell | Section 5 |

The source line is not copied into the diagram in words. The figure is one unit, and the caption is part of it.

### The look

- **Screen:** its own line under the caption sentence, 4px below it, in the caption's size and color: 14px, muted (6.30:1 on the light page, 6.65:1 on the dark page). No bold, no link color, no line above it.
- **Phone:** the same; it wraps at its spaces.
- **Paper:** it prints under the caption. A figure does not break across pages, so the source stays with its chart.
- **Screen reader:** the caption is the figure's name and is read with the figure, so the source is heard after the finding. It is plain text, with no role of its own.

### The limits

- One source line per figure. A figure with two drawings has one caption and one source line, with `Sources:` when they differ.
- It holds plain text and, at most, a link to an entry in the list of sources (section 4). No footnote mark: if the source needs an explanation, it belongs in "Method and limits".
- It is not a place for a caveat. "Help pages are left out" goes in "Method and limits", or in the caption sentence when the reader must know it to read the chart.

### What `check` tests

- **A chart drawn from data with no source line gives a warning.** This covers the kinds that show measured numbers: range chart, bar chart, line chart, funnel, heat map, heat plan and status grid. It does not cover workflow and UML diagrams, a layout to scale or a plan, which describe a design and not data. The message: `figure 4 ("reports-by-area") is a bar chart with no source line; add <span class="source">Source: …</span> to its caption, or write "Source: invented sample data." when the numbers are made up`. A warning, not an error: an author may have a reason, and decision 2 says why.
- A `.source` outside a `figcaption` gives a warning, because it would not belong to a figure.
- An empty source line, or one that is only "Source:", gives a warning.
- `check` cannot tell whether a table holds outside data, so it does not warn about a table with no source line. It cannot test whether the dates and n are there either: a count of every report has no sample, and some sources have no dates.

---

## 3. Footnotes

**The reader's question:** *What exactly does this word or number mean?* — asked by the few readers who need the detail, while the others read on.

### When to use a footnote, and when not

| The text needs | Use |
|---|---|
| A remark every reader should see, beside the paragraph | A margin note |
| Where a chart's numbers come from | A source line |
| A definition or a detail that most readers skip, such as how a metric is counted | **A footnote** |
| Who said it, in published work | An author-year citation (section 4) |
| How the whole result was made | "Method and limits" |

A document with more than a few footnotes is a sign that the text, or "Method and limits", should hold that detail.

### The markup

The mark is a link, at full size, after the word or the sentence it explains:

```html
<p>Of 1,090 reports, 196 could not be repeated.<a class="fn" id="fn-1-ref" href="#fn-1" aria-label="Note 1">[1]</a></p>
```

The notes are a numbered list at the end of the section, after its last block:

```html
<ol class="notes" aria-label="Notes to this section">
  <li id="fn-1">A report counts as "could not be repeated" when a tester tried its steps twice and saw no bug.
    <a class="back" href="#fn-1-ref" aria-label="Back to the text of note 1">Back</a></li>
</ol>
```

- **One number order for the whole page.** The notes of the second section continue the numbers of the first: `<ol class="notes" start="3">`. So "note 3" names one note only, also in print and in a conversation about the page.
- **One mark for each note.** A second place that needs the same note says it in words, or cites a source.
- The ids are `fn-n` for the note and `fn-n-ref` for its mark.

### The look

- **Screen:** the mark `[1]` has the body text size and the link look: ultramarine, underlined, the focus ring. It stands right after the word or the punctuation, with no space. The notes sit 32px under the last block of the section, at 14px in the muted color, in the text column, with the list's number in tabular figures. They have no heading, no box and no line above them: "Lines are for four things only" stays true. "Back" is a link at the end of the note. A jump in either direction stops below the sticky top bar, because the kit's `scroll-padding-top` already covers every jump.
- **Phone:** the same. The notes are at the end of the section, so the jump is short.
- **Paper:** the mark prints as `[1]` in the line, and the notes print at the end of the section, close to their marks. "Back" does not print, because paper has no link. Real footnotes at the foot of each printed page are not possible: browsers do not support CSS's `float: footnote`, which only print tools such as Prince offer.
- **Scripts off:** nothing changes. Every part is a plain link to an id.
- **Screen reader:** the mark is read as "Note 1, link", from its `aria-label`, not as "left bracket one right bracket". The notes are read as "Notes to this section, list, 2 items", and each back link is read as "Back to the text of note 1", so a list of links on the page tells them apart. The DPUB-ARIA roles `doc-noteref` and `doc-endnotes` were left out: screen readers support them poorly, and plain links already say the same.

### The limits

- No mark in a heading: a screen reader lists the headings of a page by their words, where "Note 1" is noise, and a link inside a heading is hard to use. No mark in the data of a drawing or a widget, which `render` writes as plain text.
- A mark in a table cell or a caption works like a mark in a paragraph.
- A note holds text and links only: no table, no code block, no figure. It is one to three sentences.
- The notes of a section stand at its end, after any closed section, so a reader who opens nothing still finds them.

### What `check` tests

- Every `a.fn` points at an `li` in an `ol.notes`, and its text is `[n]`, where n is that note's number (from `start` and the note's place in the list).
- The numbers run 1, 2, 3 … down the page, with no gap and no repeat.
- Every note has one mark, and its `a.back` points at that mark's id.
- A note's list is in the same section as its mark (a warning when it is not).
- A mark in a heading is a warning. A note longer than 60 words is a warning: it belongs in the text or in "Method and limits".
- `<sup>` stays refused, as today.

---

## 4. The list of sources

**The reader's question:** *Who found this, when, and where can I read it?*

### The one style

The style is the one `DESIGN.md` already uses for Cleveland and McGill: author and year in the text, and a full entry in a list at the end.

**In the text:** the family names and the year, in brackets, as a link to the entry. Two authors are joined by "and". Three or more are "the first name and others".

```html
<p>Readers compare lengths more accurately than angles (<a href="#src-cleveland-1984">Cleveland and McGill, 1984</a>).</p>
```

**In the list:** a section titled "Sources", after "Method and limits" and before the footer.

```html
<section id="sources" aria-labelledby="sources-h">
  <h2 id="sources-h">Sources</h2>
  <ul class="sources">
    <li id="src-cleveland-1984">Cleveland, W. S., and McGill, R. (1984). "Graphical Perception: Theory, Experimentation, and Application to the Development of Graphical Methods." <cite>Journal of the American Statistical Association</cite>, 79(387), 531–554. <a href="https://doi.org/10.1080/01621459.1984.10478080">https://doi.org/10.1080/01621459.1984.10478080</a></li>
  </ul>
</section>
```

| Part | Rule |
|---|---|
| Authors | Family name, then initials; "and" before the last, never "&". An organization is written as its name. |
| Year | In brackets. A work with no date says "(no date)". Two works by the same authors in one year are "2024a" and "2024b". |
| Title | In quotation marks, as the work writes it. |
| Where | The journal, book, site or publisher, in `<cite>` (it shows in italic). Then volume(issue), pages, when they exist. |
| Address | The DOI or the web address, written out as the link's own text, because paper has no link. |
| A web page | The date it was read, at the end: "Read on 24 November 2026." A page can change; the date says which version the author saw. |
| Order | By the first family name, then by year. A list with no numbers, so its entries are never confused with footnotes. |
| Id | `src-` with the first family name and the year, in lowercase: `src-cleveland-1984`. |

Internal data, such as the team's bug tracker, is not a source in this list. It is named in the source line of its chart and in "Data" under "Method and limits". The list is for outside work that a reader can look up.

### Why one style, and not many

- **The reader learns the same thing from every style:** who, when, what, and where to find it. The styles differ in commas, italics and order, which no reader of a design doc or a market report needs to choose.
- **Every style is more rules to get right.** An agent writes the entries by hand, and `check` tests them. One style can be tested; ten cannot.
- **A formatter breaks the file rules.** Tools that print many styles (a CSL processor and its style files, or BibTeX) are large scripts or build steps. A Docent page is one file that works with scripts off and no network.
- **Author-year leaves the numbers to footnotes.** A numbered citation style would put `[1]` in the text for a source and `[1]` for a note. Author-year also tells the reader who and when without a jump, also on paper.
- **Research readers who need a journal's style** are writing for that journal, with that journal's tools. A Docent page is a report, not a paper for submission.

### The look

- **Screen:** the list in the text column, at body size, with no bullets and a hanging indent of 24px, so each entry's first word stands out. 8px between two entries. A long address breaks at any character, as code in a table does.
- **Phone:** the same; the address wraps.
- **Paper:** the address prints in full, because it is the link's text. This is why the address is never hidden behind words such as "this study".
- **Screen reader:** a list of n items. Each citation in the text is a link whose words are the authors and the year.

### The limits

Left out: citation managers, importing BibTeX, RIS or CSL data, other styles, numbered citations, "ibid." and "op. cit.", filling an entry from its DOI (that needs the network), and checking that a link still works (also the network). A page number in a citation is allowed: "(Cleveland and McGill, 1984, p. 531)".

### What `check` tests

- Every link to `#src-…` points at an `li` in `ul.sources`.
- Every entry is cited at least once (a warning when it is not).
- The entries are in order by their ids, which hold the family name and year (a warning when they are not).
- A link in an entry whose text is not its own address gives a warning: "paper has no link, so write the address as the link's text".
- An entry with no year in brackets, or "(no date)", gives a warning.
- A page has at most one `ul.sources`.

`check` cannot test that the title is right, that the work exists, or that it says what the text claims.

---

## 5. "Method and limits"

**The reader's question:** *Can I trust this result, and what does it not tell me?*

### What it holds

Four parts, always in this order, each a block heading (`h3`) with one or two short paragraphs. A part with nothing to say keeps its heading and says so in one sentence, such as "Nothing was left out." A reader then knows that it was not forgotten.

| Part | It says | Example (invented) |
|---|---|---|
| **Method** | What was done, in a few steps | "We counted every bug report filed in the third quarter, by the area the reporter chose." |
| **Data** | Where the data comes from, its dates, n, and who or what is in it | A definition list: source, dates, size, who is counted |
| **What was left out** | What was not counted, and why | "Help pages had 18 reports. That is too few for a share, so the chart leaves it out." |
| **How sure the result is** | The ranges, and what could make the result wrong | "18% of reports could not be repeated (95% interval, 16% to 20%). Reports with no area are not counted, so a share by area may be low." |

```html
<section id="method" aria-labelledby="method-h">
  <h2 id="method-h">Method and limits</h2>
  <h3>Method</h3>
  <p>…</p>
  <h3>Data</h3>
  <dl>
    <dt>Source</dt><dd>The team's bug tracker, exported on 1 October 2026</dd>
    <dt>Dates</dt><dd>1 July to 30 September 2026</dd>
    <dt>Size</dt><dd>n = 1,090 reports</dd>
    <dt>Who is counted</dt><dd>Every report from the app; not reports sent by email</dd>
  </dl>
  <h3>What was left out</h3>
  <p>…</p>
  <h3>How sure the result is</h3>
  <p>…</p>
</section>
```

### Where it sits, for each profile

The findings come first in every profile: Docent puts the answer first. "Method and limits" comes after them, before "Sources".

| Profile | Where | And near the top |
|---|---|---|
| **Brief** | The last section before "Sources", open | A "Data" fact in the title's facts list: "Data: 1 July to 30 September 2026". The one limit that could change a decision stands in the text, beside its finding. |
| **Standard** | After the findings, before "Sources" | The "Data" fact, when the page reports numbers |
| **Task** | Usually none: a runbook or a how-to reports no result. When a step rests on a measurement, a block heading "Method and limits" inside that section | — |
| **Reference** | Before "Sources", when the tables hold measured numbers, such as timings | The "Data" fact |

A research reader expects the method before the results, as in a paper. Docent keeps the findings first, also for research, and the top bar links to "Method and limits", so that reader reaches it in one jump (decision 6).

### The look

No new styles. It is a section with an `h2`, four `h3` headings and a definition list, which the kit already styles. On a phone and on paper it reads like any section. A screen reader user moves through it by its headings.

### The limits

- It is not an appendix of raw data. Long tables of numbers belong in a closed section, or in a separate file named in "Data".
- One per page. A page with two separate studies writes two pages.

### What `check` tests

- When a page has an `h2` "Method and limits", its four `h3` headings are there, in this order (a warning when not).
- `check` does not warn when a page has no such section. Whether a page needs one is a judgment: release notes with one bar chart of counts do not.

---

## 6. Rules for writing numbers

These rules join `DESIGN.md`'s Voice as a "Numbers" part, and `SKILL.md` gets a short summary. They hold in the text, in tables, in captions, in the data of a chart, and in cards. Code and quoted output keep their own form.

| # | Rule | Do | Don't | `check` |
|---|---|---|---|---|
| 1 | **Digits and units.** Every measured number is in digits, also below 10. A space goes between a number and its unit; a percent has none. One form of each unit in a document. | `3 reports`, `320 ms`, `4.2 GB`, `18%` | `three reports`, `320ms` beside `250 ms`, `18 %`, a number with no unit | No |
| 2 | **Rounding.** Round to what the reader needs: two or three digits that matter. In a column, every number has the same decimals. A share near 0 or 100 keeps one decimal, as the funnel does, so it stays true. | `18%`, `1.2 s` and `0.9 s` in one column, `0.4%` | `17.98%`, `1.2 s` and `0.95 s` in one column, `0%` for 3 of 1,090 | Warns |
| 3 | **Thousands.** A comma every three digits, from 1,000 up. A point for decimals. Years and codes have no comma. | `1,090`, `12,400`, `2026`, `build 10452` in code | `1090` beside `12,400`, `12400`, `1.090` | Warns |
| 4 | **Negative numbers.** A minus sign (−, U+2212), not a hyphen. In the text, a word is clearer. No brackets for a negative. | `−12` in a table; "fell by 12" in the text | `-12`, `(12)` | Warns |
| 5 | **Ranges.** In a table, a chart and a source line: an en dash with no spaces. In the text: "from … to". With a negative number: always "to". Both ends keep the unit when it is a percent. | `45–76`; "from 45 to 76 characters"; `−5 to 10`; "16% to 20%" | `45-76`, `45 – 76`, `−5–10`, "16 to 20%" | Warns |
| 6 | **Percent and percentage points.** A change in a rate is in percentage points, written in full. A relative change may follow, with its base. | "The fix rate rose from 40% to 46%: up 6 percentage points." | "The fix rate rose 6%." (for 40% to 46%); `6 pp`; `6 pts` | Warns on `pp` and `pts` only |
| 7 | **Sample size.** In a source line and in "Data": `n =` with spaces, the number and the unit. In the text: the words. | `n = 1,090 reports`; "from 1,090 reports" | `n=1090`; `n = 1,090` with no unit; "a large sample" | No |
| 8 | **Change against a period.** Name the value, the direction as a word, the amount, the period it is compared with, and, in brackets, the earlier value. | "1,090 reports, up 12% against Q2 2026 (973)" | `+12%`; "up 12%" with no period; "12% growth" | In a card only (section 7) |
| 9 | **Dates.** Day, month as a word, year. A range of dates is "from … to", with the year once when it is the same. A quarter names its year the first time. ISO dates are allowed in a table of data. | `1 July 2026`; "1 July to 30 September 2026"; `Q3 2026`; `2026-07-01` in a table | `7/1/2026`, `01.07.26`, "Q3" with no year the first time | Warns on dates with slashes |
| 10 | **"About" and "times".** Plain words for an estimate and a ratio. | "about 250"; "3 times as many"; "a third as many" | `~250`, `c. 250`, "3x more", "3 times fewer" | Warns on `~` before a number |

**Why these rules.** Readers of English as a second language read in many local number styles: some use a comma for decimals, some write the day first and some the month. Docent's text is English, so it uses one English style and writes the parts that differ most (dates, ratios) in words. A hyphen as a minus is read as "dash" or not at all by some screen readers, and a minus sign is read as "minus". "3 times fewer" has no clear meaning in English, and "6%" for a change from 40% to 46% is wrong by a factor of 2.5 (the relative change is 15%).

### What `check` can test, and what it cannot

`check` gives a warning, never an error, for each rule it tests. It reads the author's text outside `<code>`, `<pre>` and the drawings.

| Rule | What `check` tests |
|---|---|
| 2, rounding | In a column marked `num`, numbers with different decimals; a percent with more than 2 decimals |
| 3, thousands | In a column marked `num` and in a card's large number: a number of 5 or more digits with no comma, or a 4-digit number with no comma in a column whose other numbers have one |
| 4, minus | A hyphen just before a digit, after a space, a bracket or the start of a cell (so `COVID-19` and `fn-1` pass) |
| 5, ranges | A hyphen between two numbers (`45-76`). It skips ISO dates and numbers with more than one hyphen, such as `555-0100`. It may still find a part number; it is a warning |
| 6, points | `pp` or `pts` after a number |
| 9, dates | Two or three numbers split by slashes that look like a date |
| 10, about | `~` before a number |

It cannot test the meaning: whether a number needs a unit (rule 1), whether a change of a rate is written in percent (rule 6), whether n is there (rule 7), or whether the text names a period (rule 8). Those stay with the author, and `SKILL.md` says so.

---

## 7. A number with its change

**The reader's question:** *How large is it, and is it more or less than before?*

### The markup

In a card, the change is a third line, after the line that says what the number counts:

```html
<ul class="cards">
  <li>
    <p class="big">1,090</p>
    <p>bug reports in Q3 2026</p>
    <p class="change"><span class="dir">Up</span> 12% against Q2 2026 (973)</p>
  </li>
  <li>
    <p class="big">46%</p>
    <p>of reports fixed within 7 days</p>
    <p class="change"><span class="dir">Up</span> 6 percentage points against Q2 2026 (40%)</p>
  </li>
  <li>
    <p class="big">18%</p>
    <p>of reports could not be repeated</p>
    <p class="change"><span class="dir">No change</span> against Q2 2026 (18%)</p>
  </li>
</ul>
```

In a line of text, the same parts in the same order, with no markup: "Reports rose to 1,090 in Q3 2026, up 12% against Q2 (973)."

**The parts, in this order:** the direction as a word (`Up`, `Down` or `No change`), the amount (a percent, percentage points, or a count with its unit), the word "against", the period, and the earlier value in brackets. The earlier value lets the reader check the change.

### Good news or bad news

The direction says only more or less. Whether that is good is the author's sentence, next to the cards: "More reports came in after the new sign-in page went live." When the change crosses a target, the author writes a status note in words, which Docent already has: `<span class="state warn">Above the target of 1,000 reports</span>`. A change line never takes a status color, because up is not always good, and green, amber and red mean status only.

### The look

- **Screen:** 14px, the size of the card's other line. The direction word is in the text color at weight 600, so it can be found at a glance; the rest is muted. No arrow, no color, no fill (decision 7 names the arrow as the other choice).
- **Phone:** two cards in a row, or one on the narrowest screen, as today. The change line wraps at its spaces.
- **Paper:** it prints as text. A gray printer loses nothing, because nothing rests on color.
- **Screen reader:** the card is read in its order: "1,090. Bug reports in Q3 2026. Up 12% against Q2 2026 (973)." The direction is a word, so it is heard.

### The limits

- One change per card, against one period. Two comparisons (against last quarter and against last year) are a table.
- A card with a change must have the line that says what it counts.

### What `check` tests

- A `p.change` sits in a card of a card grid, after the card's other line.
- Its text starts with `Up`, `Down` or `No change`, and holds the word "against" (a warning when not).
- A `p.change` with a status class, or a style that sets a color, is a warning: the direction is not a status.

---

## 8. How sure a result is

**The reader's question:** *Would the number be the same if we counted again?*

### In words

| Do | Don't |
|---|---|
| Give the range with the number when it comes from a sample, a survey or a forecast: "18% (95% interval, 16% to 20%)" | "18%" alone, for a sample |
| Name the kind of range and its level once, in "How sure the result is" | An interval with no level |
| Write a range as "16% to 20%". It can be uneven around the value, as this one is | `18% ± 2%`: the plus-or-minus sign is unclear to many readers, and it hides an uneven range |
| Keep the digits that the range supports | `17.98% (15.82% to 20.36%)` |
| Say plainly when a count is small: "Only 18 reports; too few for a share." | A share of 18 things, written like a share of 1,090 |
| Use "significant" only with its test, in "Method and limits" | "a significant rise" meaning "a large rise" |

An interval is easy to describe wrongly in plain words. "We are 95% sure the true value is in this range" is a common reading that statisticians do not accept for a confidence interval. Docent's sentence for it is: "a 95% interval: with the same method on many samples, about 95 of 100 such intervals would hold the true value." It goes in "How sure the result is", once.

### In a range chart: the estimate row

The range chart already draws a range and a point, one per row. An estimate is both on one row: a point at its value, inside the range of its interval. Write `at`, `from` and `to` together:

```json
{
  "id": "not-repeated",
  "kind": "range",
  "label": "About 18% of all reports could not be repeated. Search, Checkout and Settings had the highest shares, about 21% to 23%. Profile had the lowest, 9%, but its interval is wide, from 4% to 19%.",
  "scale": {"from": 0, "to": 40, "step": 10, "unit": "%", "marks": [{"at": 18, "name": "all areas"}]},
  "rows": [
    {"name": "Sign-in", "at": 14, "from": 11, "to": 18},
    {"name": "Search", "at": 23, "from": 18, "to": 28},
    {"name": "Checkout", "at": 21, "from": 16, "to": 27},
    {"name": "Settings", "at": 23, "from": 16, "to": 32},
    {"name": "Profile", "at": 9, "from": 4, "to": 19}
  ]
}
```

Caption: "Figure 5. Reports that could not be repeated, by area, with 95% intervals." Source line: "Source: the team's bug tracker, 1 July to 30 September 2026, n = 1,072 reports in five areas." Help pages are left out with 18 reports, as "What was left out" says (1,090 − 18 = 1,072).

- **Screen and paper:** the range is the range chart's bar: the page color inside, a text-color outline, small round corners. The point is the range chart's filled circle in the text color, drawn on the bar. The value beside the mark reads `14 (11–18)`. A named line marks the share of all areas. On a 640px desktop the narrowest interval, Sign-in, is about 79px wide; nothing is dashed, nothing moves, and there is no new color.
- **Phone:** the 264px form, with each name above its row. Sign-in's interval is about 32px wide (an estimate from the bar chart's phone plot; the build measures it).
- **Screen reader and the words:** the `label`, and the table in words with three columns: estimate, low and high.
- **The limits:** `render` refuses `at` outside `from`–`to`, and an interval too narrow to show the point inside it, with the message "write the estimate as a point, and give its interval in the text". The rows can be sorted by the estimate, or left in the written order. It keeps every other rule of the range chart.
- **What `check` tests:** as for every chart, that the drawing is the one `render` makes from the data, and the source line (section 2). No new fit warning: whether two areas truly differ is a statistical test, not something `check` can read from the marks.

This draws what research reports call a forest plot, in Docent's look, with no new kind.

### In a line chart: a band, not now

A line chart could show a band around its focus series, such as a forecast with its range. It does not fit the existing rules: the line chart has "no area", and a band in the outline color has a contrast of 1.40:1, which is too faint for a mark that carries meaning. A forecast also needs a way to show where the measured data ends, and Docent dashes nothing. Both need their own proposal. Until then the author writes the range in the text, and the table in words gives the values (decision 9).

### What the research audience needs here

Research is Docent's third audience, and this proposal gives it the base parts: an interval, its level, n, the method and its limits, and sources. A research report also needs these, which an author writes in "Method and limits" with no new part:

- n for each group, not only in total.
- The test used, and an exact p value ("p = 0.03", not "p < 0.05"), together with the size of the effect, not the p value alone.
- What was planned before the data came in, and what was found after.
- Where the data and the code can be found.

Left out: a fixed list of words for likelihood (such as "likely" for 66% to 100%), equations, and statistical tables. They can be proposed when a research document needs them.

---

## 9. What it reuses, and what is new

| From | What it reuses |
|---|---|
| `figcaption` and its style | The source line is one more line in it, in its size and color |
| `ul.facts` | The "Data" fact in the title's margin note |
| `ul.cards`, `p.big` | The change line is one more line in a card |
| The range chart (`range.cjs`) | Its bar and point, now on one row; its two forms and its table in words |
| `check`, rule 10 | The column finder, for the number rules |
| `check`, rule 5 | The refusal of `<sup>`, which keeps footnote marks at full size |
| `html { scroll-padding-top }` | Jumps to a note and back stop below the top bar |
| `<ol start>`, `<dl>`, `<cite>` | Plain HTML, styled by the kit, which work with scripts off and on paper |

New: four small style blocks in `kit.css` (`.source`, `.notes` with `.fn` and `.back`, `.sources`, `.change`), the estimate row in `range.cjs`, the `check` tests in sections 2 to 8, a "Numbers" part in `DESIGN.md`'s Voice, a paragraph on each part in `DESIGN.md`'s Layout, `SKILL.md` text for each part and for "Method and limits" in each profile, and the source line, a footnote, a card change, "Method and limits" and "Sources" in the template. The sample page gets source lines that say "invented sample data", which is true.

No new color, token, script or diagram kind.

---

## 10. Phases, and what is out of scope

Each item is its own pull request, built in this order.

1. **The source line** (small). It comes first, because every business document with a chart needs it, and it is the smallest change. The template's table and the sample page's charts get source lines.
2. **The number rules** (medium). Text in `DESIGN.md` and `SKILL.md`, and the five warnings. Tests: one fixture that breaks each tested rule, and one that keeps them all with no warning.
3. **A number with its change** (small). It uses rule 8 of item 2.
4. **Footnotes** (medium). Tests: marks and notes in two sections with `start`; a missing note; a missing back link; numbers out of order; a mark in a heading. A browser check that a jump to a note and back stops below the top bar, and that "Back" does not print.
5. **The list of sources and "Method and limits"** (medium). Tests: a citation with no entry; an entry never cited; entries out of order; an address hidden behind words; the four parts out of order.
6. **The estimate row** (medium). Tests: the example in both forms; `at` outside the interval; an interval too narrow for its point.

A separate session is writing test documents in `docs/research/` at the same time. Each build item should check its rules against those documents once they are merged, and change a rule that does not fit them.

**Out of scope:** a band in a line chart and a way to mark a forecast (section 8); citation managers and other citation styles (section 4); footnotes at the foot of each printed page; a fixed list of words for likelihood; statistical tables; changing any existing drawing.

---

## Measured

The sample numbers were made up and then checked with this script, which is in the session scratchpad and is not part of the kit. The interval is the Wilson score interval at 95%.

```js
const wilson = (k, n, z = 1.959964) => {
  const p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = (z / d) * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [c - h, c + h];
};
const pct = (x, d = 1) => (100 * x).toFixed(d);
console.log("reports Q2 973 -> Q3 1090: change", 1090 - 973, "=", pct((1090 - 973) / 973), "%");
console.log("fix rate 40% -> 46%:", 46 - 40, "percentage points;", pct((46 - 40) / 40), "% of 40%");
const areas = [["Sign-in", 412, 58], ["Search", 268, 61], ["Checkout", 231, 49], ["Settings", 97, 22], ["Profile", 64, 6], ["Help pages", 18, 0]];
console.log("total reports", areas.reduce((s, a) => s + a[1], 0), "cannot repeat", areas.reduce((s, a) => s + a[2], 0));
for (const [name, n, k] of areas) { const [lo, hi] = wilson(k, n); console.log(name.padEnd(11), `${k}/${n}`.padEnd(7), "share", pct(k / n), "% 95% interval", pct(lo), "to", pct(hi)); }
const [lo, hi] = wilson(196, 1090);
console.log("all areas  196/1090 share", pct(196 / 1090), "% 95% interval", pct(lo), "to", pct(hi));
for (const [name, n, k] of areas.slice(0, 5)) { const [l, h] = wilson(k, n); console.log(name.padEnd(11), "phone", ((h - l) * 100 * 192 / 40).toFixed(1), "px; desktop", ((h - l) * 100 * 469 / 40).toFixed(1), "px"); }
```

Its output:

```text
reports Q2 973 -> Q3 1090: change 117 = 12.0 %
fix rate 40% -> 46%: 6 percentage points; 15.0 % of 40%
total reports 1090 cannot repeat 196
Sign-in     58/412  share 14.1 % 95% interval 11.1 to 17.8
Search      61/268  share 22.8 % 95% interval 18.1 to 28.1
Checkout    49/231  share 21.2 % 95% interval 16.4 to 26.9
Settings    22/97   share 22.7 % 95% interval 15.5 to 32.0
Profile     6/64    share 9.4 % 95% interval 4.4 to 19.0
Help pages  0/18    share 0.0 % 95% interval -0.0 to 17.6
all areas  196/1090 share 18.0 % 95% interval 15.8 to 20.4
Sign-in     phone 32.2 px; desktop 78.8 px
Search      phone 48.0 px; desktop 117.2 px
Checkout    phone 50.4 px; desktop 123.1 px
Settings    phone 79.1 px; desktop 193.2 px
Profile     phone 70.2 px; desktop 171.4 px
```

Notes on the numbers:

- The report counts per area are the bar chart example's in [`charts.md`](charts.md): 412, 268, 231, 97, 64 and 18, which sum to 1,090.
- The proposal rounds each share and interval to whole percents: Sign-in 14 (11–18), Search 23 (18–28), Checkout 21 (16–27), Settings 23 (16–32), Profile 9 (4–19), all areas 18 (16–20).
- Help pages, with 0 of 18, gives an interval from 0 to 17.6, which shows why the example leaves it out. `-0.0` is a rounding effect of the script's print.
- The widths use the bar chart's plots on a 0 to 40 scale: 469px on a desktop and 192px on a phone. The range chart's own plot may differ by a few pixels; build item 6 measures it.

---

## Decisions

Each decision has a recommended answer, which the proposal above follows, and the other choice, so the user can change one.

1. **The source line is markup in the caption.** Recommended: yes, `<span class="source">` in the `figcaption`, one form for charts, hand-drawn figures and tables. `render` and every drawing stay as they are. The other choice: a `source` field in a chart's data, which `render` writes under the drawing. It is the same every time, but it serves charts drawn from data only, so tables and hand-drawn figures would need a second way.
2. **A chart with no source line gives a warning.** Recommended: a warning, for the seven kinds that show measured numbers. An honest line ("Source: invented sample data.") ends the warning, so a sample page stays clean and truthful. The other choices: an error, which would stop a draft that is not finished; or no test, which leaves the gap the team review found.
3. **A table of outside data gets a figure frame, with "Table n".** Recommended: yes, so the table has a caption and a source line in the same place as a chart. The other choice: a source line as a plain paragraph after the table, with no number. That is less markup, but the source then has two forms.
4. **Footnote marks are a full-size `[1]`.** Recommended: yes. It is readable, easy to hit, and allowed by `check`. The other choices: a raised small number, which needs an exception to the 14px rule; or symbols (*, †), which run out after a few notes and are hard to say aloud.
5. **Notes at the end of each section.** Recommended: yes, close to their marks on a screen and on paper. The other choice: all notes at the end of the page, which is the usual place for endnotes, but puts a long jump between a mark and its note.
6. **"Method and limits" after the findings, in every profile, also for research.** Recommended: yes, with a "Data" fact in the title's margin and the one limit that matters beside its finding. The other choice: method before the findings for a research page, as in a paper. That serves the third audience's habit, and breaks Docent's rule of the answer first.
7. **The direction of a change is a word, with no arrow.** Recommended: a word only (`Up`, `Down`, `No change`). The other choice: a small arrow in the text color before the word, hidden from a screen reader. It is faster to scan in a grid of many cards, and it is one more mark on a quiet page.
8. **The list of sources is written by hand, and `check` tests it.** Recommended: yes. One style is short enough to write by hand, and `check` tests the links, the order and the visible addresses. The other choice: a data block that `render` formats into the style, which would be the same every time, at the cost of a new block kind and its code.
9. **No band in a line chart now.** Recommended: not now. A band breaks "no area", is too faint in the outline color, and comes with the open question of how to mark a forecast. The other choice: a band around the focus series only, in the outline color, like the faint lines of small multiples, with low and high columns in the table in words.

## Decided

Approved on 2026-11-24, each with the recommended answer:

1. **The source line is markup in the caption:** `<span class="source">` in the `figcaption`, one form for charts, hand-drawn figures and tables.
2. **A chart with no source line gives a warning,** for the seven kinds that show measured numbers.
3. **A table of outside data gets a figure frame,** with "Table n" in its caption and a source line.
4. **Footnote marks are a full-size `[1]`.**
5. **Notes stand at the end of each section.**
6. **"Method and limits" comes after the findings in every profile,** also for research, with a "Data" fact in the title's margin and the one limit that matters beside its finding.
7. **The direction of a change is a word,** `Up`, `Down` or `No change`, with no arrow.
8. **The list of sources is written by hand,** and `check` tests it.
9. **A line chart has no band for now.**

## Not in this proposal

- Code, and changes to `SKILL.md`, `DESIGN.md`, `check.cjs`, `kit.css`, the template or the sample page. Each item comes in its own pull request.
- The test documents in `docs/research/`, which a separate session is writing.
- A band in a line chart, and a way to mark a forecast.
- Citation managers, BibTeX or CSL import, and citation styles other than the one above.
- Footnotes at the foot of each printed page.
