# Proposal: a repo file for Docent — the brand and the author's rule changes, kept once for every page

Status: **proposed on 2026-11-25, with each open question decided** (see "Decisions" at the end). No code is written yet. **Three points wait for the user:** the open question at the top of "Decisions", the reversal of white-label decision 5, and the list of rules that the file may change. A talk on 2026-11-25 set the direction: a file in the host repo holds a pointer to the host's `DESIGN.md` and the author's changes to Docent's rules, each with a reason, and no copy of the tokens that come from `DESIGN.md`.

## The answer first

A host repo may hold one file, `.docent/config.json`. It holds two kinds of things:

- **Where the brand comes from:** the path to the host's `DESIGN.md`, a palette, the logo file, the tagline, the credit as a link or as plain text, and the host's name. These are the answers to the brand interview, kept so that no one asks them again.
- **The author's changes to Docent's house style,** each with a reason. An example is "allow 10 cards in a card grid, because our weekly review shows 10 service numbers side by side".

Every page stays one file that works alone. The scripts read the repo file when they run and write what it says into the page. The page never reads the repo file.

```json
{
  "version": 1,
  "name": "Example project",
  "design": "docs/DESIGN.md",
  "palette": null,
  "logo": { "light": "brand/logo.svg", "dark": ".docent/logo-dark.svg" },
  "tagline": "Small tools for careful teams.",
  "credit": "link",
  "profile": "brief",
  "rules": {
    "cards.count": {
      "off": true,
      "reason": "The weekly review shows 10 service numbers side by side, in the same order every week."
    },
    "hand.left-out.pie": {
      "off": true,
      "reason": "The board asks for the budget split as a pie each quarter; the table in words stays beside it."
    }
  }
}
```

A rule change never hides the rule. `check` still reports each one, as a **note** that names the line of the repo file and its reason. The rules that protect the reader cannot be changed at all: no network, contrast, dark mode, print, and accessibility. A file that tries to change one of them is refused with an error.

The file changes one confirmed decision: white-label decision 5 said that the newest Docent page is the record of the brand, and that no file goes into the host repo. Section 2 says why that changes, and what stays.

| # | Pull request | Size |
|---|---|---|
| 1 | An ID for each rule in `check`, a list of the IDs in `scripts/lib/rules.cjs`, and `check --rules` to print them | Medium |
| 2 | The repo file: find it, read it, and refuse a bad one; `brand` reads the `DESIGN.md` that the file names | Small |
| 3 | Rule changes: `check` turns a listed house-style rule into a note, and refuses a guarantee | Small |
| 4 | The brand from the file: the interview writes the file; `stamp` writes the host tokens; `render` uses the file's palette | Medium |
| 5 | `check` notes a page whose brand differs from the file | Small |

If the user wants to change colors and fonts only, PRs 1, 3 and 5 are not needed (see "Decisions").

## The obvious answers that would be wrong

**A generated `tokens.json` that copies the host's `DESIGN.md`.** It looks tidy: one file with every value, ready to read. But a copy goes out of date as soon as someone changes `DESIGN.md`, and nothing tells the reader of the copy. `brand.cjs` already works out the same six tokens from `DESIGN.md` every time, with fixed rules, so the same file always gives the same tokens. A copy saves no work. And the name `tokens.json` reads as a design-tokens file, a kind of file that other tools read and write, while this file also holds rule changes. So the file stores the path to `DESIGN.md`, and the scripts run `brand` again each time.

**Keep the newest page as the record (decision 5 as it is).** A page records values: the colors, the logo, the tagline. It does not record why a rule was broken, so the next page starts again from zero. It also cannot tell an agent which page to copy. `SKILL.md` already has a case where the newest page is the wrong one: a page about a customer's product carries the customer's name and no logo, and an agent that copies it gives the next page the wrong host. Two people's agents may also pick two different "newest" pages, one by the file's date and one by the last commit.

**Let the file change any rule.** Then one line could turn off the contrast test, or let a page load a font from the network. A page often travels outside the repo: by mail, in a chat, on paper. Its reader never sees the repo file. The rules that protect that reader are promises to the reader, not choices of the author, so the file cannot change them (section 3).

**Turn the rule off in `check`, with no trace.** It is the quietest answer. But the next reviewer, or another person's agent, then sees a page that breaks a Docent rule and no sign that anyone chose it. A note costs one line in the output, and it keeps the choice visible.

**Keep the settings in `package.json`.** Many tools do this. But only JavaScript projects have a `package.json`, and a Docent page can live in any repo.

---

## 1. The file

### Where it is, and why a folder

The file is `.docent/config.json`, usually at the root of the host repo. It is a folder and not one file at the root, such as `docent.json`, because of the logo.

The logo often exists in the repo already, for example in `brand/` or `public/`. Then the file points at it, as it points at `DESIGN.md`, and nothing is copied. But a logo often needs work before `check` accepts it: the letters turned into paths, the parts that point at other parts flattened, or a one-color version drawn with `currentColor` (see "A logo that needs work" in `SKILL.md`). The agent does that work by hand, and no script can do it again. So its result is worth keeping, unlike the tokens, which `brand` works out again in a moment. The worked logo goes beside the file, as `.docent/logo.svg` or `.docent/logo-dark.svg`.

If the worked logo stayed inside each page and nowhere else, one `docent.json` at the root would be enough. Each new page would then repeat the work on the logo, or copy it from another page, which is the problem of decision 5 again.

### Why JSON

- **Node reads it with no extra code.** `JSON.parse` is built in, and Docent's scripts have no dependencies.
- **YAML would need a second parser by hand.** `brand.cjs` already reads YAML front matter by hand, and it reads only plain `key: value` lines (`frontMatter` in `scripts/brand.cjs`). A rule change with a reason is a nested entry, so a YAML file would need a larger hand-written parser, and each line of it is more code to trust.
- **JSON has no comments, so the reason is a field.** Each rule change must have a `reason`, and `check` refuses an entry without one. A comment can be left out; a required field cannot.

### What the file holds

| Field | What it holds | When it is missing |
|---|---|---|
| `version` | `1`, so that a later Docent can read an older file | `check` refuses the file |
| `name` | The host's name in the top bar and the `<title>` | The interview's rule: the `name` in `package.json` and the other files, or the README's title |
| `design` | The path to the host's `DESIGN.md`, from the repo file's folder. `null` means "use none" | No `DESIGN.md` is used |
| `palette` | `"harbor"`, `"plum"`, `"sepia"` or `null` | Docent's own colors |
| `logo` | One path, or `{ "light": …, "dark": … }`. Each path is an SVG, PNG or WebP file inside the repo | No logo |
| `tagline` | The host's own line, at most 90 characters | No tagline |
| `credit` | `"link"`, `"text"` or `"none"` | `"link"` |
| `profile` | The profile for a new page when the content does not choose one | The rules of "Choose a profile" in `SKILL.md` |
| `rules` | Rule changes: each key is a rule ID, and each value is `{ "off": true, "reason": "…" }` | No rule changes |

The file holds no colors of its own. A color comes from a palette or from `DESIGN.md`, and both are tested.

**Paths stay inside the repo.** `check` refuses a path that leaves the repo, and a web address. The logo still goes through the logo check of `check`, as it does today.

**There is no field to turn dark mode off.** A single page can still fix its theme with `data-theme="light"`, as today. One line that removes the reader's choice on every page is a different thing, and dark mode is a guarantee (section 3).

---

## 2. Why the page stops being the record

### What decision 5 said

White-label decision 5 (confirmed on 2026-11-23) said: the agent asks about the brand once per repo; later pages copy the brand from the newest Docent page; and no new file goes into the host repo. `SKILL.md` follows it today, in "Ask about the brand once".

### Why it changes

- **A page records values, not reasons.** When the user agrees to break a design rule (`SKILL.md`, "When the user asks for something that a design rule forbids"), that agreement lives in one chat. The page shows the result, but nothing says it was a choice. The next page, or another person's agent, follows the rule again, or asks again.
- **The newest page can be the wrong page.** A page about a customer's product carries another host. A page that a user restyled once, for one event, carries a one-off look. The agent cannot tell these apart from the page alone.
- **Two agents can disagree.** "The newest page" depends on how the agent looks: the file's date, the last commit, or the folder it reads first.
- **The file is reviewed like code.** A change to `.docent/config.json` comes in a pull request, and a reviewer sees each rule change with its reason. A change of brand copied from page to page has no such step.

### What stays from decision 5

- **The interview, once per repo,** with the same name, the same four questions and the same defaults when the user skips one.
- **No file is written without the user's OK.** After the interview the agent asks one more question: "May I save these answers in `.docent/config.json`, so that every page and every agent uses them?" When the user says no, the agent works as decision 5 says today: it copies the brand from the newest page.
- **When no user can be asked,** the agent writes no file. It uses the repo file when one exists, and otherwise the defaults, as `SKILL.md` says today.

---

## 3. What the file may change

### The test

A rule is a **guarantee** when it is a promise to the reader: the page opens with no network, reads in light, in dark and on paper, meets the contrast rules, and works with a screen reader and a keyboard. A reader who never sees the repo file still gets these promises, so the file cannot change them.

A rule is **house style** when Docent chose it for its own pages, out of taste or habit, and another team can choose differently without hurting a reader. The file can change these.

The tables below sort the rules that `check` tests today (`scripts/check.cjs` and the parts of `scripts/lib/` that it calls), by family. The IDs are proposed; PR 1 makes them real. **A question mark** marks a rule whose group I am not sure of, with the reason.

### House style: the file can change these

| Family | Proposed IDs | What `check` does today | Note |
|---|---|---|---|
| Number style | `numbers.rounding`, `numbers.thousands`, `numbers.ranges`, `numbers.points`, `numbers.change`, `numbers.dates`, `numbers.about` | Warns (rules 2, 3, 5, 6, 8, 9 and 10 of "Numbers" in `DESIGN.md`) | These rules have numbers already |
| Chart types left out | `hand.left-out.pie`, `.donut`, `.radar`, `.spider`, `.polar`, `.pyramid`, `.treemap`, `.bubble`, `.sankey`, `.ridgeline` | Refuses a hand-drawn figure of that type | ? The contract of a hand-drawn figure still holds: no colors of its own, and the words beside it. So a pie's slices are told apart by their labels, not by colors. Whether that gives a pie worth having is not tested |
| A flat page | `flat.gradient`, `flat.shadow`, `flat.filter` | Refuses | The page's look, not the reader's access |
| Uppercase | `text.uppercase` | Refuses | ? Text in capitals is slower to read, also for readers of English as a second language. It may be a guarantee |
| Pure white or black | `ground.pure` | Refuses | ? Light text on pure black blurs for some readers. It may be a guarantee |
| The title | `title.format`, `title.h1`, `title.host`, `title.docent` | Warns; refuses a title that names Docent | |
| The credit and the tagline | `credit.missing`, `tagline.length`, `tagline.markup` | Warns | `credit` in the file sets the credit |
| Counts | `cards.count`, `findings.count`, `widgets.most` | Warns | |
| Key findings | `findings.lead`, `findings.link` | Warns | Not `findings.label`: see the guarantees |
| Writing advice | `steps.heading`, `facts.joined`, `diagram.twice`, and the advice of `render` on a kind (for example, "no leg has a verb") | Warns | |
| The profile | `profile.missing`, `profile.suggest` | Warns | `profile` in the file gives the default |
| Tables | `table.num`, `table.total-row`, `table.foot-rows` | Warns | Not `table.sum`: see the guarantees |
| Footnotes | `footnotes.section`, `footnotes.order`, `footnotes.length` | Warns | Not the broken links: see the guarantees |
| The list of sources | `sources.uncited`, `sources.year`, `sources.order`, `sources.id`, `sources.second` | Warns | Not `sources.link-text`: see the guarantees |
| Source lines | `source.outside`, `source.empty` | Warns | Not `source.chart`: see the guarantees |
| "Method and limits" | `method.parts` | Warns | |
| Status words | `status.words` | Warns | A team may use its own words for its own process |
| Quotes | `quote.speaker`, `quote.marks`, `quote.length`, `quote.speaker-markup`, `quote.outside` | Warns | |
| A host accent that misleads | `accent.status`, `accent.gray` | Warns | ? A brand whose color is red reads as "error" in every link. It is about meaning, not access, but a reader is misled |
| A deck | `deck.widget` | Refuses | |
| The size of a logo | `logo.size` | Refuses above 24,000 characters | ? The limit is a judgment (white-label section 1), but a large logo makes every page larger |

### Guarantees: the file cannot change these

| Family | What `check` does today | The promise |
|---|---|---|
| No network: `<link>`, `<base>`, a `src` or `url()` outside the file, `@import`, a script that can use the network, and a logo that loads, links or runs anything | Refuses | The page opens offline |
| The kit: missing, two copies, an old version, changed by hand, the wrong palette part; a palette name that does not exist | Refuses | The same tested styles on every page |
| Kit tokens set by hand (`--bg`, `--primary` and the others) | Warns | The value is lost in dark mode or in print |
| Contrast: each host color, the dark dot, a logo in both themes, a deck accent at 7:1 | Refuses; warns for the deck | Text and marks can be read |
| A missing dark accent | Warns | Dark mode shows the host's color |
| Text size: below 14px on the page, below 12px in a drawing, `<small>`, `<sub>`, `<sup>` | Refuses | Text can be read |
| Drawings and widgets that match their data, sit in their blocks, and link to diagrams that exist; one step for each leg of a walkthrough; the places of a value picker | Refuses | What the reader sees is what the data says |
| The contract of a hand-drawn figure: no colors of its own, at most 640px wide, an accessible name, the words beside it | Refuses | The figure follows the reader's theme and settings, and has a form in words |
| The frame: `lang`, the viewport, one `<h1>`, a `<title>`, a known `data-theme`, `data-profile` and `data-text` | Refuses | Screen readers, phones and the kit's own settings work |
| The skip link | Warns | A keyboard reader can pass the top bar |
| Labels for screen readers: a findings list's `aria-label` (`findings.label`), a footnote mark's label, a `<tfoot>` row heading | Warns | A screen reader names each part |
| Broken links: a footnote with no note or no link back, a citation with no entry | Refuses | Every link goes somewhere |
| A source link whose text is not its address (`sources.link-text`) | Warns | Paper has no link, so the address must be printed |
| A slide that does not fit, a walkthrough or a closed section in a deck | Refuses | A slide can be read on a shared screen |
| A script outside the kit | Warns | The page reads with scripts off |
| Personal data | Warns | ? A repo-wide "off" would hide every email address on every page. The author still decides on each page, as today |
| A minus written as a hyphen (`numbers.minus`, rule 4) | Warns | ? Some screen readers read a hyphen as "dash" or not at all (`DESIGN.md`, "Why these rules"). It is a number rule, but its reason is access |
| A total that is not the sum of its column (`table.sum`) | Warns | ? A wrong total is a wrong fact, and "numbers that people must trust" is a promise in the README |
| A chart of measured numbers with no source line (`source.chart`) | Warns | ? The same promise in the README: "each chart and data table has a source line" |

About 55 rules are house style, in 21 families. The ten chart types left out count as one rule, with an ID for each type. Section 8 counts the rest.

---

## 4. What `check` does with a rule change

### A third kind of line: the note

Today `check` prints errors and warnings. It gets a third kind, the **note**. A note does not fail the page, and it is never hidden. It names the rule, the line of the repo file, the reason, and how many places on the page the rule would have reported:

```text
check docs/weekly-review.html: note [cards.count]: off in .docent/config.json ("The weekly review shows 10 service numbers side by side, in the same order every week."); 1 card grid has 10 cards, where Docent allows 3 to 8
check docs/weekly-review.html: 0 errors, 1 warning, 1 note
```

- **One note for each rule on each page,** not one for each place, so a rule that the team turned off on purpose does not fill the output.
- **No note when the rule finds nothing** on the page. A rule change that a page does not use says nothing.
- **An error becomes a note too.** Some house-style rules are errors today, such as a gradient, a title that names Docent, or a hand-drawn pie. With a line in the repo file, each one becomes a note, and the page passes.

### A file that `check` refuses

`check` reads the repo file before the pages, and reports a problem in it once, as an error:

```text
check: error: .docent/config.json, "rules"."host.contrast": a guarantee, which the repo file cannot change; it is a promise to the reader of every page (see "What the file may change" in docs/proposals/repo-config.md)
check: error: .docent/config.json, "rules"."cards.cuont": no rule has this ID; node check.cjs --rules lists them
check: error: .docent/config.json, "rules"."cards.count": no "reason"; write why the team changes this rule
```

A file that is not valid JSON, has no `version`, or names a path outside the repo is refused in the same way. The pages are still checked, without the file, so the author sees both problems at once.

### A rule break on one page only

A user may still agree to break a rule on one page, as `SKILL.md` says today. `check` then reports it, as today, because the page has no way to record the agreement. A way for one page to record its own rule change is not in this proposal (see "Not in this proposal").

---

## 5. Which setting wins

From the weakest to the strongest:

| # | Level | What it sets |
|---|---|---|
| 1 | Docent's defaults | Everything |
| 2 | A palette | Docent's own tokens: the page, the grays, the accent, the heading color, the heat steps and the heading font |
| 3 | The host's `DESIGN.md`, through `brand.cjs` | The six host tokens |
| 4 | The repo file | Which `DESIGN.md` and which palette (or none), the name, the logo, the tagline, the credit, the default profile, and the rule changes |
| 5 | One page's own settings | `data-profile`, `data-palette`, `data-theme`, and a `--host-*` value in the page's own `<style>` |

Two things need a word:

- **The repo file sits above `DESIGN.md`, but holds no colors.** It is stronger because it chooses: it names which `DESIGN.md` to read, or `"design": null` for none. When it names one, the colors come from that file, through `brand`.
- **A page's own value always wins.** `stamp` writes the host tokens from `DESIGN.md` inside `:where(:root)`, which has a specificity of 0 in CSS, so any `--host-*` value that the author writes in the page wins, wherever it stands.

**A page about another product.** `SKILL.md` says that such a page takes nothing from the repo's own brand. It writes `data-brand="off"` on `<html>`: the scripts then use no brand field of the repo file (name, design, palette, logo, tagline, credit), and still use its rule changes. The brand belongs to the product; the house style belongs to the team that writes.

---

## 6. How the scripts find the file

Each script looks for `.docent/config.json` in the page's folder, then in each folder above it. The first file found is used, and files are not merged. Prettier finds a `.prettierrc` in the same way. The search stops at the root of the repo (the first folder with a `.git`) or at the root of the disk. So a monorepo can give one part of the repo its own file.

Two flags, for tests and for special cases: `--config <path>` reads that file, and `--no-config` reads none.

| Script | Reads | What it does with it |
|---|---|---|
| `brand` | `design` | With no argument, it finds the repo file and reads the `DESIGN.md` that it names. It prints the tokens as it does today. A path given as an argument still wins. |
| `render` | `palette` | When the page names no palette, each drawing takes the file's palette as its fallback colors. |
| `stamp` | `design` | It runs `brand` on the `DESIGN.md` that the file names, and writes the six host tokens between `docent:host` markers in the `<head>`, as it writes the kit. A page with `data-brand="off"` gets no host block. |
| `check` | Everything | It refuses a bad file (section 4), turns each house-style rule in `rules` into a note, and notes a page whose brand differs from the file (section 7). |

The agent reads the file too, when it creates a page: it writes the name, the logo, the tagline, the credit, the palette and the profile from the file into the new page, in the places the template has for them.

---

## 7. Existing pages when the file changes

| What changes in the file | What happens to existing pages | Why |
|---|---|---|
| `design`, or the `DESIGN.md` it names | The host tokens change on the page's next `stamp` | They live between markers that `stamp` owns, as the kit does. One source, and `stamp` writes it again each time |
| `rules` | The next `check` uses the new rules | `check` reads the file each time it runs. A page that relied on a removed rule change gets its warning back, which is correct |
| `name`, `palette`, `logo`, `tagline`, `credit`, `profile` | The page keeps what it has. `check` notes the difference: `note [brand.differs]: the tagline differs from .docent/config.json` | These are the page's own content, which a reader may have seen, and some pages are kept as they were on purpose, such as last year's release notes. So the author decides, and the note makes sure the author knows |

This follows white-label decision 8, which accepted that a branded page changes its dark dot on its next `stamp`. A page that must not change keeps its own `--host-*` values in its own `<style>`, which win (section 5).

---

## 8. The cost: an ID for each rule

Today a rule has no name: each error or warning is a sentence written where `check` finds the problem. Only the number rules have numbers (2 to 10). The repo file needs a stable name for each rule it may change, so PR 1 comes first.

**How many.** `check.cjs` has 135 places that report an error or a warning; `logo.cjs` has 17, `slide.cjs` 19, `hand.cjs` 4 (and 5 more as error pairs), and `diagram.cjs` 10. That is about 190 places (see "Measured"). Many places belong to one rule: the six messages about the kit are one rule, and the ten chart types left out are one family. I estimate **120 to 140 rules**, of which **about 55 are house style**.

**Only the house-style rules need an ID for the file to work.** Every other name is refused. But a refusal is clearer when `check` can say "a guarantee" rather than "no rule has this ID", and an ID on every line of the output helps a reader search for a rule. So PR 1 gives every rule an ID.

**What PR 1 does.**

- A new `scripts/lib/rules.cjs` lists each rule once: its ID, its group (house style or guarantee), and the section of `DESIGN.md` or `SKILL.md` that explains it.
- Each place that reports a problem names its rule's ID. Each line of the output shows the ID: `warning [cards.count]: a card grid has 10 cards; …`.
- `node check.cjs --rules` prints the list, with the group of each rule, so an agent can write the repo file without reading the code.
- A test fails when a place reports a rule that the list does not have, or when the list has a rule that no place reports.
- `check.test.cjs` compares whole lines today, so its expected lines change once.

It changes no rule, and no page that passes today fails after it.

---

## 9. Phases, and what is out of scope

1. **Rule IDs** (PR 1, medium): section 8.
2. **The repo file** (PR 2, small): the search of section 6, the two flags, reading and refusing the file (section 4, without `rules`), and `brand` with no argument. Tests: a file in the page's folder, a file two folders up, a file outside the repo that is not used, invalid JSON, a missing `version`, a path outside the repo, and `--no-config`.
3. **Rule changes** (PR 3, small): the note level in `check`, a guarantee refused, a missing reason refused, an unknown ID refused, and one note for each rule on each page. `DESIGN.md` and `SKILL.md`: the two groups and the note.
4. **The brand from the file** (PR 4, medium): the interview's last question and the file it writes; `stamp`'s `docent:host` block in `:where(:root)`; `render`'s palette from the file; `data-brand="off"`. `SKILL.md`: "Ask about the brand once" changes from "copy the newest page" to "read the repo file; without one, copy the newest page". One branded sample page built from a sample repo file, in the "Report a bug" topic.
5. **Differences from the file** (PR 5, small): the `brand.differs` note for the name, the palette, the logo, the tagline, the credit and the profile.

**Out of scope:**

- A rule change for one page only (section 4).
- A rule change with a value, such as `"cards.count": { "max": 10 }`. A rule is on or off in this first version. A value waits until a real repo needs one.
- A file for the user, such as one in the home folder. A Docent page belongs to a repo, and its readers see that repo's choices only.
- Merging the files of a monorepo. The nearest file wins.
- A JSON Schema for editors. It can come later, made from `rules.cjs`.
- Any change to the guarantees.

---

## Measured

The counts in section 8 come from this script, run in `skills/docent/scripts`:

```bash
for f in check.cjs lib/logo.cjs lib/slide.cjs lib/hand.cjs lib/diagram.cjs; do
  printf "%-16s errors %3s  warnings %3s\n" $f $(grep -o 'errors\.push(' $f | wc -l) $(grep -o 'warnings\.push(' $f | wc -l)
done
echo "hand.cjs [1,...] error tuples: $(grep -o 'error: \[1' lib/hand.cjs | wc -l)"
echo "number rules with a number: $(grep -o 'rule: [0-9]*' lib/numbers.cjs | sort -u | tr '\n' ' ')"
echo "hand-drawn types left out: $(node -e 'console.log(Object.keys(require("./lib/hand.cjs").LEFT_OUT).join(", "))')"
```

Its output:

```text
check.cjs        errors  67  warnings  68
lib/logo.cjs     errors  16  warnings   1
lib/slide.cjs    errors  19  warnings   0
lib/hand.cjs     errors   3  warnings   1
lib/diagram.cjs  errors   0  warnings  10
hand.cjs [1,...] error tuples:        5
number rules with a number: rule:  rule: 10 rule: 2 rule: 3 rule: 4 rule: 5 rule: 6 rule: 9
hand-drawn types left out: pie, donut, radar, spider, polar, pyramid, treemap, bubble, sankey, ridgeline
```

A place that reports is not always one rule: some places report one of several problems from a list (the four kinds of a flat page), and some rules report from several places (the six messages about the kit). The estimate of 120 to 140 rules and about 55 house-style rules comes from reading each place, as the tables in section 3 sort them. Rule 8 of "Numbers" is tested in the change line of a card (section 10d of `check.cjs`), not in `numbers.cjs`, so it does not show in the list of numbered rules.

---

## Decisions

**The open question for the user, first: which rules did you want to change?** The need came from real use of Docent. If the answer is colors and fonts only, Docent already handles them: `DESIGN.md` through `brand.cjs` gives the host tokens, and a palette gives the page and the grays. Then the smaller fix is enough: **remember the interview's answers** in the repo file (the fields `name`, `design`, `palette`, `logo`, `tagline`, `credit` and `profile`), with no `rules` field. That is PRs 2 and 4 only, with no rule IDs. If the answer names rules from the house-style table, the whole proposal is needed.

**The user must confirm two more points:**

- **The reversal of white-label decision 5** (decision 4 below). The other choice keeps the newest page as the record, and adds the repo file for rule changes only.
- **The list of rules that the file may change** (decision 5 and the tables of section 3), and most of all the rules marked with a question mark.

Decided on 2026-11-25, so that the work can go on. Each one can be changed in review, because no code exists yet.

1. **The file: `.docent/config.json`, in a folder.** The folder keeps a worked logo beside the file, because that work is done by hand and no script can do it again. A logo that needs no work is a path to the file that already exists.
2. **JSON, with a required `reason` on each rule change.** Node reads JSON with no extra code, and the scripts have no dependencies. A required field cannot be left out, as a comment can.
3. **A pointer to `DESIGN.md`, and no copy of its tokens.** `brand` works out the same tokens each time, so a copy saves nothing and goes out of date.
4. **The repo file is the record, and decision 5 changes.** A page records values but not reasons, and the newest page can be the wrong one. The interview stays once per repo; its answers go into the file, but only with the user's OK. Without it, the agent copies the newest page, as today.
5. **Two groups: house style can change; guarantees cannot.** A guarantee is a promise to a reader who never sees the repo file. A file that names a guarantee is refused with an error.
6. **A rule change is on or off.** No values in this first version: a value form is more code and more tests, and no real repo has asked for one yet.
7. **`check` reports each rule change as a note:** one for each rule on each page, with the line of the file and its reason. A rule change stays visible to the next reviewer.
8. **The order: defaults, palette, `DESIGN.md`, the repo file, the page.** The page always wins, because a page may need to stay as it was.
9. **The search: upward from the page's folder to the repo root; the nearest file wins; no merging.** It is the rule that Prettier users know, and one file is easy to read.
10. **`data-brand="off"` for a page about another product.** It keeps a rule that `SKILL.md` has today: such a page takes nothing from the repo's brand, but still follows the team's house style.
11. **Existing pages: the host tokens change on the next `stamp`; the other brand fields stay, with a note.** The tokens have one source and live in `stamp`'s own block. The name, logo, tagline, credit, palette and profile are the page's content, so the author decides.
12. **An ID for every rule, listed in `scripts/lib/rules.cjs`, printed by `check --rules`.** IDs for the house-style rules alone would be enough for the file, but an ID on every line makes the refusals clearer and the output easier to search.

## Not in this proposal

- Code. PR 1 comes in its own pull request, after the user's answers.
- A change to any rule. The file can turn a house-style rule off, but each rule stays as it is.
- A rule change for one page, a rule change with a value, a file for the user, merged files in a monorepo, and a JSON Schema (section 9).
