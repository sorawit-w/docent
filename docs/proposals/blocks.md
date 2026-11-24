# Proposal: blocks from the test documents — findings, quotes, status words, totals and events

Status: **approved on 2026-11-24**, as written, with the recommended answer to each decision (see "Decided" near the end). No code is written yet. The items are built in the order of section 7, each in its own pull request. Five test documents (PR 65, [`../research/test-documents.md`](../research/test-documents.md)) found gaps that no proposal covers. This proposal covers five of them: gaps 7, 8, 10, 12 and 13 of the ranked table, and gap 18 in short. The sources proposal ([`sources.md`](sources.md), approved on 2026-11-24) already covers source lines, the number rules, a number with its change, footnotes, the list of sources, "Method and limits" and the estimate row, so this proposal does not repeat them. The sample content is invented, on the "Report a bug" topic, and agrees with the numbers in `charts.md` and `sources.md`. The before-and-after examples quote the five test documents, whose names and numbers are invented too.

## The answer first

The five documents did not need new colors. They needed a few plain parts, and clear rules for parts Docent already has. Add four small parts and one rule. Each part keeps the quiet rules: no box, no fill, no new color, and never color alone.

1. **Key findings.** A numbered list, `ol.findings`, in the first section of the page. Each item opens with one sentence in weight 600 on its own line, so the eye can read the findings down the page like headings. Recommendations use the same list. A single decision stays a status note, as today.
2. **Status words.** No new state and no new color. A table maps each common word onto one of the five states that exist, and `check` warns when a known word takes another state. "In progress" takes `info`, "Proposed" and "Open question" take `plan`, "Accepted" takes `ok`, and "Superseded" and "Rejected" take `info`.
3. **A total row.** The total goes in a `tfoot`, under a 1px rule in the text color, with its cells in weight 600. The row heading says in words what it totals. `check` adds up a column when the author asks it to, because one test document got its totals wrong.
4. **A quote with its speaker.** A `figure.quote` that holds a `blockquote` and a `figcaption` with the speaker, such as "P1, office manager". The quote stands in the serif at body size, indented like a list, and the kit draws the quotation marks.
5. **Event marks on a line chart.** `"events"` in the data: at most three moments, each a thin upright line in the muted color at one point in time, with its name above the plot. The table in words gets an "Event" column. A step line is left out for now.

| # | Pull request | Size | Gap | Documents |
|---|---|---|---|---|
| 1 | Status words: the table in `SKILL.md` and `DESIGN.md`, and a `check` warning | Small | 8 | 3 |
| 2 | Key findings: `ol.findings`, its `check` tests, the template and `SKILL.md` | Small | 7 | 3 |
| 3 | A total row: the `tfoot` style, the print rule, and `check` tests with the sum | Small | 13 | 2 |
| 4 | A quote with its speaker: `figure.quote`, its `check` tests, the template and `SKILL.md` | Small | 10 | 2 |
| 5 | Event marks on a line chart: `"events"` in `line.cjs`, both forms, the table in words | Medium | 12 | 2 |

Section 7 gives the order and the reasons.

## The obvious answers that would be wrong

**A "key takeaway" box.** Most document tools put the main finding in a box with a tinted ground, a colored bar at the left, and a label in capitals. Each of these breaks a Docent rule: "Don't draw a box around a block", the accent "is never a button, banner or block background", lines "are for four things only", and Docent has "no uppercase letter-spaced labels". A box also tells the reader that the rest of the page matters less. Docent finds the answer by its place and its type: first on the page, in a list whose first sentences stand out by weight (section 1).

**A color for each new status word.** Issue trackers give every state its own colored badge: blue for in progress, purple for superseded, gray for rejected. In Docent, green, amber and red mean status only, and "Docent has no colored badge". Six or eight colors would also need a key, and a reader who cannot tell the colors apart would have only the words. The words already carry the meaning, so each word takes one of the five marks that exist (section 2).

**A large pull quote.** Magazines set a quote in large italic type with a big decorative quotation mark. That is a new type size (Docent has six), an ornament, and usually a repeat of a sentence from the text. Docent's quote stands at body size and is never a copy of the text around it (section 4).

**A gray fill behind the total row.** A fill is the usual mark for a total in a spreadsheet. A fill is an area of color, and the table rules are Docent's only lines. A rule in the text color above the row, the same rule that stands under the headings, marks the total with no fill (section 3).

**A colored, dashed line for each event, with a legend.** In Docent a dashed line means "a path that only some readers take", a color would need a key, and a line chart has no legend. An event line is a thin solid line in the muted color, named where it stands (section 5).

---

## What Docent has today

| Part | What it does now | What this proposal needs from it |
|---|---|---|
| The opening paragraph (`p.standfirst`) | 21px serif. Says what the document is for | A rule: on a report, its last sentence states the answer |
| Card grid (`ul.cards`) | Three to eight short items, such as key numbers | Nothing. Key numbers stay cards; key findings are sentences, so they are a list |
| Numbered list (`ol`) | Steps of one actor; 4px between items | A class for findings, with a lead sentence and more space |
| Status note (`div.status`) | A state, then one or two sentences | Nothing. A single decision or recommendation stays a status note |
| States (`span.state`) | `ok`, `warn`, `err` with a status color; `info` a muted dot; `plan` a muted ring | Rules for the words: which state each common word takes |
| Table (`table`) | A rule in the text color under the headings; a rule in the line color under each body row | A rule in the text color above a total row |
| Line chart (`line.cjs`) | Lines, names at their ends, no legend; a table in words | Upright event lines, named above the plot; an "Event" column in the table |
| Range chart `marks` | Up to two named lines: thin, muted, with a name over the ticks | The model for an event line's look |
| `figure` | A well that holds a drawing, at the block width, with a caption | A quote figure, at the text width, with no well |

---

## 1. Key findings and recommendations

**The reader's question:** *What did they find, and what should we do?* A manager reads the top of a report and decides whether to read on.

### What the test documents did

| Document | What it needed | What it did |
|---|---|---|
| Churn analysis | The main finding, and three proposed changes | The opening paragraph states the finding. Four key numbers are a card grid. The three changes are a table with a state column, at the end of the page. |
| Interview summary | Four findings, at the top | A plain `<ol>`, each item starting with a `<strong>` sentence. It worked, but the items stand 4px apart, so the four bold sentences are hard to tell apart. |
| Decision record | The decision, at the top | A status note with `Accepted`, then a paragraph, then a margin note "In one line". |

Each document found a way, and each way was different. The gap is less a missing look than a missing rule: where the answer goes, and one list form for findings that every document shares.

### Where the answer goes

| Place | What it holds | Markup |
|---|---|---|
| The opening paragraph | What the document is for, and, on a report, the answer in its last sentence: "We chose a managed message queue." | `p.standfirst`, as today |
| The first section | The findings, or the decision | `ol.findings` (below), or a status note |
| Key numbers | Three to eight numbers that sum up the result | A card grid, as today, with the change line of `sources.md` |
| The last section | What we propose, when each item has an owner, a date or a measure | A table with a state column, as the churn analysis has |

A page has one answer place at the top. The findings list does not repeat the cards: the cards give numbers, and the findings give sentences that explain them.

### The markup

```html
<section id="summary" aria-labelledby="summary-h">
  <h2 id="summary-h">What we found</h2>
  <ol class="findings" aria-label="Key findings">
    <li><strong>Sign-in had the most bug reports.</strong> 412 of 1,090 reports, 38%, more than any other area.</li>
    <li><strong>About one report in five could not be repeated.</strong> 196 of 1,090, and the share is about the same in most areas.</li>
    <li><strong>Reports are fixed faster than last quarter.</strong> 46% were fixed within 7 days, up 6 percentage points against Q2 2026 (40%).</li>
  </ol>
</section>
```

Recommendations use the same list, with their own label. An item may end with a state, using the words of section 2:

```html
<ol class="findings" aria-label="Recommendations">
  <li><strong>Ask for the steps in the report form.</strong> Reports with steps were repeated more often. <span class="state plan">Proposed</span></li>
  <li><strong>Move sign-in reports to their own queue.</strong> Sign-in has the most reports and one team owns it. <span class="state ok">Approved</span></li>
</ol>
```

The parts:

- **The lead sentence** is one `<strong>` at the start of the item: one full sentence, with a subject and a verb, ending with a period. It is the finding itself, not a topic ("Sign-in had the most bug reports", not "Sign-in").
- **The support** follows: one or two sentences, with the number that supports the finding, written by the number rules of `sources.md`. A link to the section with the evidence may go here.
- **The state**, for a recommendation, ends the item.

When each recommendation has an owner, a date and a measure, the reader compares facts across them, so they are a table, as the churn analysis has. When there is one decision, it is a status note, as the decision record has. The findings list is for two to six sentences that the reader should read in order.

### The look

- **Screen:** a numbered list in the text column, with the list's indent of 24px. The number is the list's own marker, in the muted color with tabular figures. The lead sentence is in the text color at weight 600, on its own line; the support is in the text color at weight 400, on the next line. 12px between two items, as between two pairs of a definition list, so each finding stands apart. No box, no line, no fill, no accent.
- **Phone:** the same, in the full width of the screen. The lead sentence wraps.
- **Paper:** the same. An item does not break across two pages.
- **Dark mode:** the text tokens; nothing else changes.
- **Forced colors:** the weight and the line break carry the lead sentence; neither rests on color.
- **Screen reader:** "Key findings, list, 3 items", from the `aria-label`, then "1. Sign-in had the most bug reports. 412 of 1,090 reports…". The numbers are the list's own markers, so they are read. The `<strong>` is not announced, which is right: the sentence carries the meaning by itself.

### How the test documents would look

**Interview summary**, "What we found": the same four items, now in `ol.findings` with the label "Key findings". The four bold sentences stand on their own lines, 12px apart, so a reader can read all four before the support text.

```html
<ol class="findings" aria-label="Key findings">
  <li><strong>Two calendars are the main pain.</strong> Seven of eight teams keep a work calendar beside Example Planner, and double bookings follow.</li>
  <li><strong>The seat price hurts small teams with part-time members.</strong> Six teams pay full seats for people who plan one day a week.</li>
  …
</ol>
```

**Churn analysis:** the cards stay. Under them, a findings list with three items replaces the three paragraphs: the rise came from small Starter accounts, two changes on 1 July explain most of it, and accounts that left set up less. The "What we propose" table stays a table, because each change has an owner and a measure.

**Decision record:** no change. Its status note `Accepted`, first in the first section, is already the answer place. The opening paragraph already ends with the answer.

### The limits

- 2 to 6 items. One finding is a sentence or a status note; more than six are not key.
- At most one findings list and one recommendations list on a page.
- The lead sentence holds no link and no state: a screen reader user who lists the links of a page hears each link once, in the support, where it belongs.
- It is not a list of steps. Steps stay a plain `<ol>` or a walkthrough.

### What `check` tests

- An item of `ol.findings` that does not start with a `<strong>` gives a warning: "each key finding starts with one sentence in `<strong>`".
- A lead sentence that does not end with a period, or that is longer than 25 words, gives a warning.
- Fewer than 2 or more than 6 items give a warning.
- An `ol.findings` with no `aria-label` gives a warning, because a screen reader would name it only "list".
- A link or a state inside the `<strong>` gives a warning.
- `check` cannot tell whether a sentence is a finding or a topic, or whether the answer is on the page. Those stay with the author.

---

## 2. Status words beyond the five states

**The reader's question:** *Where does this item stand?* — for a decision, a piece of work, or a question.

### What the test documents did

| Document | Words it needed | What it did | The problem |
|---|---|---|---|
| Churn analysis | Proposed, Approved | `plan` and `ok` | None, but the writer had to guess |
| Interview summary | Open question | `plan` | "That is a stretch": `plan` means "planned, or behind a feature flag" |
| Decision record | Accepted, Not decided yet | `ok` and `plan` | Nothing says which state a rejected or a replaced decision takes |
| Incident review | Done, In progress, Planned | `ok`, `warn` and `plan` | `warn` reads as a problem, but the work was on time |

### The rule: each mark answers one question

The five states stay. What changes is how each one is described: each mark answers one plain question, and every word takes the mark whose question it answers.

| State | Mark | It answers | Today's words in `DESIGN.md` |
|---|---|---|---|
| `ok` | Green dot | It is done, decided, or working | Status: success |
| `warn` | Amber dot | It needs care, or it waits on something | Status: warning |
| `err` | Red dot | It failed, or it stopped | Status: error |
| `info` | Muted dot | A fact with no judgment: plain information, work under way, or a closed item | "Plain information" |
| `plan` | Muted ring | Not yet: planned, proposed, or not decided | "Planned, or not turned on yet" |

The two muted marks already read as a sequence: an empty ring for "not yet", a filled muted dot for "under way or closed", and a green dot for "done". The incident's actions then read Planned, In progress, Done as ring, dot, green dot, and nothing in the table looks like a problem.

### The words

| Word | State | Why |
|---|---|---|
| Done, Fixed | `ok` | Finished, and it works |
| Accepted, Approved | `ok` | Decided, and now in effect |
| In progress | `info` | Under way. Nothing is wrong, so it takes no amber |
| Planned | `plan` | Not started yet |
| Proposed | `plan` | Not decided yet |
| Open question, Not decided yet | `plan` | Not answered yet. The ring's "not yet" fits a question as well as a plan |
| Superseded | `info` | Closed: another decision took its place. The label names it: "Superseded by record 15" |
| Rejected | `info` | Closed: decided against. Nothing is broken, so it takes no red |

Two choices need a reason:

- **"Rejected" is `info`, not `err`.** In a decision record the rejected options are a normal outcome. A red dot beside options A and C would tell the reader that something went wrong, and red means "failed or stopped".
- **"Superseded" and "Rejected" share the muted dot with "In progress".** All three are facts with no judgment, and the word says which fact. In one table they rarely meet: a decision log holds Accepted, Proposed, Superseded and Rejected; a list of actions holds Done, In progress and Planned.

An author who needs to add a judgment writes it in the word and takes the state of the judgment: "In progress, late" is `warn`, because it needs care. The state follows the question the word answers, not the word's first part.

**Left out:** "Deprecated", common in decision records, because no test document used it. When one does, it takes `warn`: still in effect, but going away. "Blocked" keeps the `err` that `SKILL.md` already shows.

### The markup

Nothing new. The state is a `span.state`, in a status note, a table cell or a line of text, as today:

```html
<td><span class="state info">In progress</span></td>
<li>Decision record 9, "Reminder jobs in the main database", March 2024. <span class="state info">Superseded by this record</span></li>
```

### The look

No change to any mark.

- **Screen and phone:** as today. A label wraps.
- **Paper:** the dots print in their colors. In gray print the three status dots look alike, but the ring still differs from a dot by its shape, and the word carries the rest.
- **Dark mode:** as today.
- **Forced colors:** every dot takes the text color, so `ok`, `warn`, `err` and `info` look the same; the ring stays a ring. This is why the word must carry the meaning by itself, and why the word list matters.
- **Screen reader:** the dot is a style with no text, so the reader hears the word only: "In progress". That is enough, because the word is the meaning.

### How the test documents would look

- **Incident review:** the two actions "In progress" change from `warn` to `info`. The table then shows three green dots, two muted dots and two rings, and no amber.
- **Interview summary:** "Open question" stays `plan`, and is now inside the rule, not a stretch.
- **Decision record:** "Accepted" and "Not decided yet" stay. In "Links", decision record 9 gets `<span class="state info">Superseded by this record</span>`. Options A and C could each end with `<span class="state info">Rejected</span>`.
- **Churn analysis:** no change; "Proposed" (`plan`) and "Approved" (`ok`) are already right.

### The limits

- The labels stay free text. The table lists the common words; any other word takes the state whose question it answers.
- A status grid keeps its own three states (OK, Warning, Error) and its `names`. This table is for status notes and table cells.

### What `check` tests

- A state whose whole label is a word of the table, or the word followed by "by …" ("Superseded by record 15"), and whose class is another state, gives a warning: `"In progress" takes the state info (under way, nothing is wrong), not warn; write warn with words that say why, such as "In progress, late"`.
- A longer label, such as "In progress, late", is not tested, because its added words may hold a judgment.
- `check` cannot test a word that is not in the table.

---

## 3. A total row in a table

**The reader's question:** *What is the whole, and which row is it?*

### What the test documents did

- **Churn analysis:** "All plans" is the last plain body row of the plan table. It looks like a fourth plan.
- **Decision record:** "Weighted total" is the last plain body row of the scored table. The writer first worked out the totals wrong by hand (33, 42 and 33, in place of 35, 41 and 33).

### The markup

The total goes in a `tfoot`, after the `tbody`. Its row heading says in words what it totals.

```html
<div class="table-wrap" role="region" aria-label="Bug reports by area" tabindex="0">
  <table>
    <thead>
      <tr><th scope="col">Area</th><th scope="col" class="num">Reports</th><th scope="col" class="num">Could not be repeated</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">Sign-in</th><td class="num">412</td><td class="num">58</td></tr>
      <tr><th scope="row">Search</th><td class="num">268</td><td class="num">61</td></tr>
      <tr><th scope="row">Checkout</th><td class="num">231</td><td class="num">49</td></tr>
      <tr><th scope="row">Settings</th><td class="num">97</td><td class="num">22</td></tr>
      <tr><th scope="row">Profile</th><td class="num">64</td><td class="num">6</td></tr>
      <tr><th scope="row">Help pages</th><td class="num">18</td><td class="num">0</td></tr>
    </tbody>
    <tfoot>
      <tr><th scope="row">All areas</th><td class="num" data-sum>1,090</td><td class="num" data-sum>196</td></tr>
    </tfoot>
  </table>
</div>
```

- **The row heading** is a `th scope="row"` with words: "Total", "All areas", "Weighted total". A screen reader reads this heading with each cell of the row, so the words must say it is a total.
- **`data-sum`** on a cell asks `check` to add up the column above it and compare. It goes only on a cell that is the sum of its column. A rate, a share or a weighted total is not a sum, so it has no `data-sum`. `data-sum="rounded"` allows for parts that were rounded (below).
- One or two rows in a `tfoot`, such as a total and an average.

### The look

- **Screen:** a 1px rule in the text color above the total row, the same rule that stands under the headings, so the body of the table stands between two strong rules. The last body row loses its own line in the line color, so the two rules never stand together. Every cell of the total row is in weight 600; the row heading already is. No fill.
- **Phone:** the table scrolls sideways inside itself, as today, and the total row scrolls with it.
- **Paper:** browsers may repeat a `tfoot` at the foot of every printed page when a table runs onto a second page. A total printed under half of the rows would mislead, so the print styles make the `tfoot` a plain row group (`display: table-row-group`): the total prints once, at the end.
- **Dark mode:** the rule takes the dark text color.
- **Forced colors:** the rule takes the reader's text color, and the weight stays.
- **Screen reader:** most screen readers do not announce a `tfoot`, so the structure alone says nothing. The row heading does the work: moving across the row, the reader hears "All areas, Reports, 1,090".

### How the test documents would look

**Churn analysis:** "All plans" moves into a `tfoot`. Its three count and amount cells take `data-sum` (5,310 + 2,640 + 470 = 8,420; 968 + 201 + 43 = 1,212; $22,600 + $12,100 + $6,600 = $41,300). Its rates and its change are not sums, so they have none.

```html
<tfoot>
  <tr><th scope="row">All plans</th><td class="num" data-sum>8,420</td><td class="num" data-sum>1,212</td><td class="num">14.4%</td><td class="num">10.1%</td><td class="num">+4.3 pts</td><td class="num" data-sum>$41,300</td></tr>
</tfoot>
```

(The "+4.3 pts" is the document's text as it stands; the number rules of `sources.md` change it to percentage points in words.)

**Decision record:** "Weighted total" moves into a `tfoot`. Only the weight cell takes `data-sum` (3 + 2 + 2 + 2 + 1 = 10). The three totals are weighted sums, which `check` does not work out (see the limits), so the writer's hand error would not have been caught. The rule above the row would still have shown the reader that these numbers are of another kind.

### The limits

- `check` adds up plain sums only. It does not work out a weighted sum, an average or a rate. A weighted total stays the author's arithmetic, done with a script, not by hand.
- A total row stays the last row. A subtotal inside the body, between groups of rows, is left out: no test document needed one.
- `render`'s tables in words get no total row in this proposal.

### What `check` tests

- A `tfoot` row with no `th scope="row"`, or whose row heading is empty, gives a warning.
- **The sum.** For each cell with `data-sum`, `check` adds up the numbers of the body cells in its column, after it drops commas, a currency sign and a unit. Plain `data-sum` must match exactly. `data-sum="rounded"` may differ by half a unit of the last digit for each body row: for 6 rows of whole numbers, by up to 3. A cell that does not match gives a warning: `the total 33 in column "A. Table" is not the sum of its column, 35`. A body cell that is not a number gives a warning that names it.
- **A total in the body.** When the last body row's heading starts with "Total" or "All ", and the table has no `tfoot`, `check` gives a warning: "this row reads as a total; put it in a `<tfoot>`".
- More than two rows in a `tfoot` give a warning.

---

## 4. A quote with its speaker

**The reader's question:** *What did a real customer say, and who are they?*

### What the test documents did

- **Churn analysis:** three quotes are items of a plain list, in quotation marks, with the plan and seats in brackets: "We never got the whole team to use it." (Starter, 9 seats).
- **Interview summary:** six quotes are paragraphs in quotation marks, ending with "— P1, office manager". The writer left out `<code>` for the participant codes, because a code in each of six quotes would be heavy.

In both, a screen reader hears a paragraph or a list item, with nothing to say that it is a quote. The quotation marks and the dash are typed by hand, so they differ from document to document.

### The markup

```html
<figure class="quote">
  <blockquote><p>I wrote the steps twice, and nobody could repeat the bug.</p></blockquote>
  <figcaption>P3, tester</figcaption>
</figure>
```

- **`blockquote`** holds the quote: one to three short paragraphs, as the person said them, with no quotation marks typed.
- **`figcaption`** holds the speaker, after the quote: a code and a role, or a group ("Starter, 9 seats"). It holds plain text: no `<code>`, no link.
- **`figure`** joins the two, as the HTML standard advises: the attribution goes in the `figcaption`, outside the `blockquote`, because the `blockquote` holds the quoted words only.

A short phrase inside a sentence is a `<q>`, with the speaker in the sentence: `<p>Five teams said setup <q>never felt finished</q>.</p>`. The browser draws the marks for a `<q>`.

**Who the speaker is.** A quote from a customer or a study names a code and a role, never the person's name, unless the person agreed. `check` cannot tell a name from a role; the planned warning about personal data (emails, phone numbers) may catch some cases. `SKILL.md` says this in one line.

### The look

- **Screen:** the figure stands in the text column, not at the block width, and has no well: a quote is text. It is indented 24px, like a list. The quote is set in the serif (the font of the headings and the opening paragraph) at 16px, weight 400, line height 1.65, in the text color. The serif tells a person's voice apart from the author's text with no color, no line and no box, and it adds no type size. The kit draws curly quotation marks around the quote, before the first paragraph and after the last, so every page has the same marks. The speaker stands on the next line, 4px below, at 14px in the sans-serif, muted, like a caption. 24px above and below the figure, as between blocks.
- **Phone:** the same; the indent stays 24px.
- **Paper:** the same, in the serif. A figure does not break across pages.
- **Dark mode:** the text tokens.
- **Forced colors:** the indent and the font carry it.
- **Screen reader:** a `figure` takes its name from its `figcaption`, and a `blockquote` has its own role, so a reader such as NVDA is expected to say "figure, P3, tester", then "block quote, I wrote the steps twice, and nobody could repeat the bug, out of block quote". The speaker comes first, then the words, which is a natural order for a quote. The curly marks are drawn by the style; most screen readers skip them at their usual settings. Build item 4 tests this with VoiceOver and NVDA, and the proposal makes no claim beyond that.

### How the test documents would look

**Interview summary,** theme "Two calendars clash": each quote becomes a quote figure, still beside its margin note "7 of 8".

```html
<figure class="quote">
  <blockquote><p>Every Monday I copy the week's meetings into the planner. If I forget one, someone books a client over it.</p></blockquote>
  <figcaption>P1, office manager</figcaption>
</figure>
<figure class="quote">
  <blockquote><p>We left because of this. Paying more for sync we used to have felt wrong.</p></blockquote>
  <figcaption>P3, founder</figcaption>
</figure>
```

**Churn analysis:** the three list items become three quote figures, with "Starter, 4 seats", "Starter, 3 seats" and "Starter, 9 seats" as their speakers. The sentence before them, "Three lines show what many said", stays.

### The limits

- One speaker per figure. A conversation of two people is text, or a table.
- At most 80 words in a quote. A longer passage belongs in the text, in the author's words.
- A quote is not a pull quote: it never repeats a sentence of the page.
- No numbers, and no "Figure n": a quote is not a figure of the figure list, and the caption names the speaker only.

### What `check` tests

- A `blockquote` that is not in a `figure.quote`, or a `figure.quote` with no `figcaption` after its `blockquote`, gives a warning: "a quote needs its speaker".
- A `figure.quote` that holds a figure well, a table or more than one `blockquote` gives a warning.
- A quote whose text starts or ends with a quotation mark gives a warning: "the kit draws the quotation marks".
- A quote longer than 80 words, or a `<code>` or a link in the speaker line, gives a warning.
- `check` cannot test that the speaker is a code and not a name, or that the words are what the person said.

---

## 5. Event marks on a line chart

**The reader's question:** *What happened at this moment, and did the line change after it?*

### What the test documents did

- **Churn analysis:** "The price change was announced in May and took effect on 1 July" is a sentence in the caption. The reader must find May and July on the time axis.
- **Incident review:** "The alert fired at 08:44 and the rollback started at 09:19" is in the caption. The reader must find two moments among 24 points, 5 minutes apart.

### The data

```json
{
  "id": "reports-by-month",
  "kind": "line",
  "label": "Sign-in reports rose from 62 in January to 138 in June, after the new sign-in page in May, then fell to 66 in December after the fix in July. Search and Checkout stayed between 28 and 52 all year.",
  "scale": {"from": 0, "to": 150, "step": 50, "unit": "reports"},
  "points": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  "series": [
    {"name": "Sign-in", "focus": true, "values": [62, 70, 81, 95, 120, 138, 131, 112, 96, 84, 71, 66]},
    {"name": "Search", "values": [40, 42, 39, 45, 48, 44, 46, 50, 47, 49, 52, 51]},
    {"name": "Checkout", "values": [30, 28, 35, 33, 31, 36, 34, 30, 29, 33, 32, 35]}
  ],
  "events": [
    {"at": "May", "name": "New sign-in page"},
    {"at": "Jul", "name": "Sign-in fix"}
  ]
}
```

| Field | What it is |
|---|---|
| `events` | 1 to 3. Each has `at`, one of the labels in `points`, and a `name` of at most 20 characters. |
| `at` | The point where the event stands. An event between two points takes the nearest point, and its name gives the exact time: `{"at": "08:45", "name": "Alert, 08:44"}`. |

The series and the example are the line chart example of `charts.md`; only the events are new.

### The look

- **Screen (640px):** each event is a 1px solid upright line in the muted color, from the bottom of the plot to its name. It is drawn over the grid lines and under the series lines, so nothing cuts a data line ("a break in a line means no data"). Its name stands above the plot at 12px in the muted color, starting at the line and running right; near the right edge it ends at the line instead. When two names would stand closer than 8px, they take separate rows, 16px apart, and each line runs up to its own name's row; the rows add height above the plot, never width. **The row order keeps every line clear of every name.** A name that runs right passes over the places of the later events, so the earlier name takes the higher row: its own line rises at its left end, through the lower rows, where no later name reaches, and the later line stops in a lower row, under the earlier name. A name that ends at its line runs left, so it is the reverse: the later name takes the higher row. When the names run both ways and no order keeps every line clear, `render` refuses (see the limits). The line above the chart, which says the unit and where the scale starts, stays above the names. The look is the range chart's named line, turned upright: muted, thin, solid, named where it stands, so it needs no key.
- **Contrast:** the muted line on the well is 5.87:1 in light and 7.04:1 in dark, above the 3:1 that a mark that carries meaning needs. A grid line in the outline color is 1.31:1 and 1.51:1, so an event line never reads as a grid line.
- **Phone (264px):** the same rules. Twelve points stand 13.9px apart, so two events two months apart cannot share a row: each name takes its own row. For the example, "New sign-in page" (100px) takes the upper row and "Sign-in fix" (58px) the lower row, 32px above the plot.
- **Paper:** the desktop form, in gray.
- **Dark mode:** the muted token.
- **Forced colors:** the event line and every series line take the reader's text color. The event line stays apart by its direction (upright, where the data lines move across), its weight (1px, where the series are 1.5px and 2.5px) and its name.
- **Screen reader and the words:** the author's `label` names the events in its sentence, as the example does. The table in words gets a last column, "Event", with each event's name in the row of its point and nothing in the other rows. Under the table, one line lists the events: "Events: New sign-in page, May; Sign-in fix, Jul."

### How the test documents would look

**Churn analysis,** Figure 1: two events, `{"at": "May", "name": "Price announced"}` and `{"at": "Jul", "name": "New prices"}`. May and July stand 90px apart on a desktop, and "Price announced" is 96px wide, so the two names take two rows, also on a desktop: "Price announced" in the upper row, with its line rising at May's place, and "New prices" in the lower row, so the July line stops under the May name and never crosses it. The caption no longer needs its sentence about May and July, and can say what the figure shows: "Starter churn rose after the price was announced."

**Incident review,** Figure 2: two events, `{"at": "08:45", "name": "Alert, 08:44"}` and `{"at": "09:20", "name": "Rollback, 09:19"}`. On a desktop the 24 points stand 21.6px apart, so the two lines are 151px apart and their names (67px and 89px) share one row. On a phone they stand 47px apart and take two rows. The reader now sees that "In use" stayed at the limit from the alert to the rollback, with no sentence to find.

| Example | Form | Points apart | Event lines apart | Names | Rows |
|---|---|---|---|---|---|
| Churn, May and Jul | Desktop | 45.2px | 90px | 96px, 64px | 2 |
| Churn, May and Jul | Phone | 13.9px | 28px | 96px, 64px | 2 |
| Incident, 08:45 and 09:20 | Desktop | 21.6px | 151px | 67px, 89px | 1 |
| Incident, 08:45 and 09:20 | Phone | 6.7px | 47px | 67px, 89px | 2 |

The widths are from `scripts/lib/text.cjs` and the plot widths of `charts.md` (497px on a desktop and 153px on a phone); see "Measured". The build measures the real drawing.

### The step line, in short

The incident review wanted a step line for the pool limit, which fell from 200 to 20 at one moment. The line chart draws a straight line between two points, so the limit seems to fall over five minutes, from 08:30 to 08:35.

**Leave it out for now.** One document needed it, and an event mark already says the moment: `{"at": "08:35", "name": "Limit set to 20"}`. The limit can then stay a muted series, or move into the text. If a second document needs a step, the change is small: `"step": true` on a series that is not the focus, drawn as a level line to the next point and then an upright line. Decision 11 names it as the other choice.

### The limits

- 1 to 3 events. More events are a timeline, which stays a table (`charts.md`, section 6).
- No events in small multiples or in a slopegraph in the first build: no test document needed them, and their panels have little room above.
- An event is a moment. A period, such as "from the announcement to the new price", is two events. A band over a period is left out, because the line chart has "no area" (`sources.md`, decision 9, for the same reason).
- `render` refuses an `at` that is not one of the `points`, two events at the same point, an empty name or a name longer than 20 characters, and names that cannot stand without crossing another event's line, with the message "shorten an event name, or leave one event out".

### What `check` tests

- As for every chart: the drawing is the one `render` makes from the data, in both forms, and the table in words matches the data.
- No new warning. Whether an event explains the change after it is the author's claim, and the text says it.

---

## 6. What this proposal leaves for later

These gaps from the ranked table are left out, each for a reason.

| # | Gap | Documents | Why it waits |
|---|---|---|---|
| 2 | The brand step when the host is not the repo's project | 5 | A `SKILL.md` change, not a block. It needs its own short note. |
| 4, 9 | The profile table, and `check`'s profile guess | 4, 3 | A `SKILL.md` and `profile.cjs` change, not a block. Both should be fixed together. |
| 14 | No space between a card grid and a text row | 2 | A kit bug: one CSS selector. It needs no proposal. |
| 17 | A chart for agree and disagree answers | 1 | A new chart kind, large. `charts.md` waits for test documents to show the need, and one now does; it should be the next chart proposal, because customer research is the business audience. |
| 18 | A step line | 1 | Section 5: an event mark covers the incident's need. |
| 20 | A yes-or-no grid, such as themes by participant | 1 | A table of "Yes" and "—" worked. A grid of marks needs a rule for what "no" looks like, and a status grid would color it as a failure. |
| 21 | Empty cells that mean "not yet" in a heat map | 1 | Small: a word for the hollow-cell key in the legend. It can go with the next heat map change. |
| 23 | A log scale | 1 | A log scale is often misread by business readers. One decision record needed it; the range chart's refusal was right. |
| 24 | Marks for added and removed lines in code | 1 | Marks with no colors, such as a `+` and `−` column, need their own short note on how they print and read aloud. |
| 26, 27 | The spread of values; more than 10 paired values | 1, 1 | Research needs, the third audience. `charts.md` item 6 covers part of 26. |
| 28 | Math notation | 1 | Research only, and the hardest to make readable with scripts off and aloud. |

Gaps 1, 3, 5, 6, 11, 16 and part of 25 are in `sources.md`. Gap 22, the timeline, is in `charts.md`.

**Also left out, because no evidence asks for them:** callouts for tips and notes beside the status note, a pull quote, a sixth state with a half-filled ring, a subtotal row, events in small multiples, and a band over a period in a line chart.

---

## 7. The order of building

Each item is its own pull request, smallest and most needed first.

1. **Status words** (small, three documents). Text in `SKILL.md` ("Text blocks to know") and in `DESIGN.md` (the status paragraph of Colors, with the new meanings of `info` and `plan`), and one `check` warning. No CSS. Tests: one fixture with each word of the table in its right state and no warning; one with "In progress" as `warn` and "Rejected" as `err`, which warns twice; one with "In progress, late" as `warn`, which does not warn.
2. **Key findings** (small, three documents). The `ol.findings` style in `kit.css`, the rule "where the answer goes" in `SKILL.md`, a paragraph in `DESIGN.md`'s Layout, an example in the template, and the `check` tests of section 1. Tests: a list with a missing `<strong>`, a lead with no period, one item, seven items, no `aria-label`, and a link inside the lead.
3. **A total row** (small, two documents). The `tfoot` style and its print rule in `kit.css`, a total row in the template's table, and the `check` tests of section 3. Tests: a right sum, a wrong sum, a rounded sum within and outside its allowance, a body cell that is not a number, and a last body row "Total" with no `tfoot`. A browser check that a long table prints its total once, at the end.
4. **A quote with its speaker** (small, two documents). The `figure.quote` style in `kit.css`, an example in the template, a line on speakers' names in `SKILL.md`, and the `check` tests of section 4. Tests: a `blockquote` alone, no speaker, typed quotation marks, 81 words, a `<code>` in the speaker line. A check with VoiceOver and NVDA of how the figure is read, written into the pull request.
5. **Event marks on a line chart** (medium, two documents). `"events"` in `line.cjs`, in both forms, the "Event" column and line in the table in words, a paragraph in `DESIGN.md`'s "Line charts", and a row in `diagrams.md`. Tests: the example in both forms; two events that share a row; two that need two rows, where no line crosses a name; an event near the right edge, whose name runs left; names that run both ways and cannot stay clear, which `render` refuses; each other refusal. Then redraw the two test documents' line charts with events, and look at them at 1366px and 320px, in light, dark and print.

Items 1 to 4 change no drawing. Item 5 changes the line chart only when a chart has `"events"`, so every line chart drawn today stays exactly the same.

---

## Measured

The contrasts and widths above were worked out with this script, which is in the session scratchpad and is not part of the kit. `textWidth` is the kit's own width estimate for the system sans-serif.

```js
const { textWidth } = require(process.argv[2]); // skills/docent/scripts/lib/text.cjs
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(2); };
console.log("muted on well, light", cr("#575d75", "#f2f3f9"), "| dark", cr("#959bb3", "#0b0d15"));
console.log("outline on well, light", cr("#d3d6e3", "#f2f3f9"), "| dark", cr("#2d3146", "#0b0d15"));
for (const n of ["Price change announced", "Price announced", "New prices", "Alert, 08:44", "Rollback, 09:19", "New sign-in page", "Sign-in fix", "Limit set to 20", "Twenty chars exactly"]) console.log(JSON.stringify(n), n.length, "chars,", textWidth(n, 12).toFixed(1), "px at 12px");
console.log("12 points: desktop gap", (497 / 11).toFixed(1), "px, phone gap", (153 / 11).toFixed(1), "px");
console.log("24 points: desktop gap", (497 / 23).toFixed(1), "px, phone gap", (153 / 23).toFixed(1), "px");
```

Its output:

```text
muted on well, light 5.87 | dark 7.04
outline on well, light 1.31 | dark 1.51
"Price change announced" 22 chars, 141.0 px at 12px
"Price announced" 15 chars, 96.0 px at 12px
"New prices" 10 chars, 64.0 px at 12px
"Alert, 08:44" 12 chars, 67.0 px at 12px
"Rollback, 09:19" 15 chars, 89.0 px at 12px
"New sign-in page" 16 chars, 100.0 px at 12px
"Sign-in fix" 11 chars, 58.0 px at 12px
"Limit set to 20" 15 chars, 82.0 px at 12px
"Twenty chars exactly" 20 chars, 120.0 px at 12px
12 points: desktop gap 45.2 px, phone gap 13.9 px
24 points: desktop gap 21.6 px, phone gap 6.7 px
```

Notes on the numbers:

- "Price change announced" is 22 characters, over the 20-character limit, so the churn example uses "Price announced" (15 characters, 96px). These are the kit's estimates; the build measures the real text.
- The distances between event lines are the gap between points times the number of steps: May to July is 2 steps (90px on a desktop, 28px on a phone), and 08:45 to 09:20 is 7 steps (151px and 47px).
- The plot widths, 497px and 153px, are those of the `charts.md` line chart example. A chart with other names has a slightly different plot; the build measures it.
- The share in section 1: 412 of 1,090 is 37.8%, written 38%. Search and Checkout together have 268 + 231 = 499, more than Sign-in, so the finding says "more than any other area".
- The sums in section 3: 5,310 + 2,640 + 470 = 8,420; 968 + 201 + 43 = 1,212; 22,600 + 12,100 + 6,600 = 41,300; 412 + 268 + 231 + 97 + 64 + 18 = 1,090; 58 + 61 + 49 + 22 + 6 + 0 = 196; 3 + 2 + 2 + 2 + 1 = 10.

---

## Decisions

Each decision has a recommended answer, which the proposal above follows, and the other choice, so the user can change one.

1. **Key findings get a class, `ol.findings`.** Recommended: yes. It gives every document the same look, more space between items, a lead sentence on its own line, and a class that `check` can test. The other choice: a rule only ("a plain `<ol>`, each item starting with `<strong>`"), with no new CSS and no tests. That is what the interview summary did, and its items were hard to tell apart.
2. **Recommendations use the findings list, a table or a status note, by how many facts each has.** Recommended: yes, with no separate block. The other choice: a separate `ol.actions` block with an owner and a date on each item, which repeats what a table already does.
3. **"In progress" takes `info`, the muted dot.** Recommended: yes. Ring, muted dot and green dot then read as not started, under way and done, with no new mark. The other choice: a sixth state, a half-filled ring, which is clearer by its shape alone but adds a mark that every page, legend and `check` rule must learn.
4. **"Rejected" takes `info`.** Recommended: yes, because a rejected option is a normal outcome, and red means "failed or stopped". The other choice: `err`, which some decision logs use, at the cost of red dots beside options that nobody did wrong.
5. **"Open question" and "Proposed" take `plan`, and `plan` now means "not yet".** Recommended: yes, a wider meaning for the ring: planned, proposed, or not decided. The other choice: keep `plan` for planned work only, and give open questions `info`, which loses the "not yet" that a ring shows.
6. **`check` warns when a known status word takes another state.** Recommended: yes, for the words in the table only, and only when the label is the word alone or the word then "by …". The other choice: the table in `SKILL.md` with no warning, which leaves the incident review's `warn` to chance.
7. **The total row is a `tfoot` with a text-color rule and weight 600.** Recommended: yes. The other choice: weight 600 only, with no rule, which is quieter but hard to see in a long table on a phone.
8. **`check` adds up a column when a cell has `data-sum`.** Recommended: yes, opt-in for each cell, exact by default and with an allowance for `data-sum="rounded"`. The other choices: test every `tfoot` row whose heading starts with "Total", which needs no new attribute but warns falsely on weighted totals and misses "All plans"; or no sum test.
9. **A quote is set in the serif at 16px, and the kit draws its quotation marks.** Recommended: yes. The serif marks a person's voice with no line or color, and drawn marks are the same on every page. The other choice: the sans-serif with the indent only, and marks typed by the author, which is plainer but leaves the quote marked only by its indent.
10. **The participant code in a speaker line is plain text, not `<code>`.** Recommended: plain text, because in a speaker line the code is a name, read once, not a key to look up in a table. The other choice: `<code>`, as `SKILL.md` asks for codes elsewhere, which keeps one rule but puts a small well in every speaker line.
11. **An event stands at one of the chart's points, and there is no step line for now.** Recommended: yes. An event between two points takes the nearest point and gives its exact time in its name. The other choices: an event at any position between two points, which is more exact but needs a time scale that the line chart does not have (its points are labels, not times); and `"step": true` on a series that is not the focus, for a setting that changes at one moment.

## Decided

Approved on 2026-11-24, each with the recommended answer:

1. **Key findings get a class, `ol.findings`,** with a lead sentence on its own line and a class that `check` can test.
2. **Recommendations use the findings list, a table or a status note,** by how many facts each has; there is no separate block.
3. **"In progress" takes `info`,** the muted dot. There is no sixth state.
4. **"Rejected" takes `info`,** not `err`.
5. **"Open question" and "Proposed" take `plan`,** and `plan` now means "not yet": planned, proposed, or not decided.
6. **`check` warns when a known status word takes another state,** for the words in the table only, when the label is the word alone or the word then "by …".
7. **The total row is a `tfoot`,** with a 1px rule in the text color above it and its cells in weight 600.
8. **`check` adds up a column when a cell has `data-sum`:** opt-in for each cell, exact by default, with an allowance for `data-sum="rounded"`.
9. **A quote is set in the serif at 16px,** and the kit draws its quotation marks.
10. **The participant code in a speaker line is plain text,** not `<code>`.
11. **An event stands at one of the chart's points,** and there is no step line for now.

## Not in this proposal

- Code, and changes to `SKILL.md`, `DESIGN.md`, `check.cjs`, `kit.css`, `line.cjs`, the template or the sample page. Each item comes in its own pull request.
- The sources proposal's parts: source lines, number rules, a number with its change, footnotes, the list of sources, "Method and limits" and the estimate row.
- Slide decks, which `docs/proposals/decks.md` covers. A deck may reuse the findings list and the quote figure, and that proposal decides.
- The gaps in section 6.
