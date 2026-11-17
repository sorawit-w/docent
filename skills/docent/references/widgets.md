# Widget data

A widget is a small part of the page that the reader uses: the reader picks, ticks or answers. A widget is written as data, and `scripts/render.cjs` builds its markup. Do not write the markup by hand, and do not edit it after it is made. To change a widget, change its data and run `render` again.

## When to use a widget

Use a widget only when the reader must do one of these three things:

| The reader must | Use | Do not use it for |
|---|---|---|
| **Choose** one case of several, and read only that case | a chooser | Text that every reader needs. Write it as plain text. |
| **Track** what is done, line by line | a checklist | A list of facts. Nobody ticks a fact. |
| **Decide** between answers, from one to three questions | a decision helper | A choice with one question and two short answers. Write one sentence. |

When none of the three is true, write text, a table or a closed section. A widget that the reader does not need makes the page harder to read. `check` warns when a document has more than 4 widgets.

Docent has these three widgets and no others. Do not write a widget of your own with a script.

## The block

Put one block where the widget belongs, in the text flow of a section. A widget does not sit inside a walkthrough step, a table, a margin note or a closed section.

```html
<p>The command is different on each system.</p>
<!-- docent:widget
{
  "id": "system",
  "kind": "chooser",
  "label": "Your system",
  "cases": [
    {"name": "macOS", "body": ["Open Terminal and run this command.", {"code": "sw_vers -productVersion"}]},
    {"name": "Windows", "body": ["Press the Windows key, type `winver`, and press Enter."]},
    {"name": "Linux", "body": ["Open a terminal and run this command.", {"code": "cat /etc/os-release"}]}
  ]
}
-->
<!-- /docent:widget -->
```

`render` writes the markup between `-->` and `<!-- /docent:widget -->`. The data stays in the document, so `render` and `check` can run again at any time.

Every widget has three fields:

| Field | What it is |
|---|---|
| `id` | A short id, unique among the widgets of the document: small letters, digits and `-`, starting with a letter. |
| `kind` | `"chooser"`, `"checklist"` or `"decision"`. |
| `label` | A short name that the reader sees beside or above the widget, at most 60 characters. A screen reader reads it as the name of the widget. |

## Text only

A widget holds text only. You never write HTML in the data: every text is shown as it is written, so `<b>` appears on the page as the five characters `<b>`. One mark has a meaning: text between two `` ` `` marks is shown as code.

A widget cannot hold a table, a diagram, a picture or another widget. Put those outside the widget.

## Chooser

The reader picks one case, and the page shows only that case. Use it for text that differs by system, by role or by tool.

| Field | What it is |
|---|---|
| `cases` | 2 to 5 cases. Each has a `name` (at most 24 characters) and a `body`. |
| `body` | 1 to 8 blocks, in order. A block is one of the four kinds below. |

| Block | How to write it |
|---|---|
| A paragraph | A text: `"Open Terminal and run this command."` |
| A code block | `{"code": "app build\napp test"}`. Write `\n` for a new line. Add `"label": "Commands to build"` when one case has more than one code block; a screen reader reads the label. |
| A list | `{"list": ["First point.", "Second point."]}` |
| Numbered steps | `{"steps": ["Do this first.", "Then do this."]}` |

Choosers with the same case names, in the same order, change together. When the reader picks `macOS` in one, every chooser with the cases `macOS`, `Windows`, `Linux` shows `macOS`. So use the same names in the same order each time, and write a chooser for each place where the text differs.

Write every case in full. A reader on paper sees all cases, one below the other, each under its name.

## Checklist

The reader ticks each line when it is done. Use it for things to prepare or to check, which the reader can do in any order. For steps in a fixed order, write a walkthrough when the steps have two or more actors, or a numbered list (`<ol>`) when one actor does them, also when the reader does the steps: the order is what the reader needs there, and a checklist does not show it.

```html
<!-- docent:widget
{
  "id": "ready",
  "kind": "checklist",
  "label": "Before you file",
  "items": [
    {"text": "Search the open reports for the same problem.", "note": "A problem that is reported already gets a comment, not a second report."},
    "Write the steps that lead to the problem.",
    "Add the version of the program, such as `2.4.0`."
  ]
}
-->
<!-- /docent:widget -->
```

| Field | What it is |
|---|---|
| `items` | 2 to 12 lines. A line is a text (at most 160 characters), or an object with a `text` and a `note` (at most 160 characters). The note says more about the line, in the small muted size. |

Write each line as a thing that is true when it is done: "The tests pass", or as one action: "Run the tests".

## Decision helper

The reader answers one to three questions and gets the one answer that fits. Use it when the right choice depends on the reader's case.

```html
<!-- docent:widget
{
  "id": "kind",
  "kind": "decision",
  "label": "Which kind of report is it?",
  "questions": [
    {"text": "Did you lose data?", "short": "Data lost", "options": ["Yes", "No"]},
    {"text": "Can you make the problem happen again?", "short": "Happens again", "options": ["Yes", "No"]}
  ],
  "answers": [
    {"when": ["Yes", "any"], "title": "An urgent report", "text": "File it today, and say what was lost."},
    {"when": ["No", "Yes"], "title": "A normal report", "text": "File it with the steps that show the problem."},
    {"when": ["No", "No"], "title": "A question first", "text": "Ask in the forum before you file a report."}
  ]
}
-->
<!-- /docent:widget -->
```

| Field | What it is |
|---|---|
| `questions` | 1 to 3 questions. Each has a `text` (at most 80 characters), 2 to 4 `options` (at most 32 characters each) and, if you want, a `short` (at most 32 characters). |
| `short` | The heading of the question's column in the table of all cases: two or three words, such as `"Data lost"`. Without it, the full question is the heading. |
| `answers` | 2 to 12 answers. Each has `when`, a `title` (at most 48 characters) and a `text` (at most 160 characters). |
| `when` | One entry for each question, in the order of the questions: the name of an option, or `"any"` for every option. |

**Every mix of options must fit exactly one answer.** `render` tests each mix. It refuses the widget when a mix fits no answer, or fits two. So the reader always gets one answer, and the table has no row that disagrees with another row.

The table of all cases is part of the widget. A reader with scripts off, and a reader on paper, sees only the table. So the table alone must make sense. Give each question a `short` heading, so that a column is not as wide as a full question.

## What the reader gets

| | With scripts | With scripts off | On paper |
|---|---|---|---|
| Chooser | Shows the chosen case. Remembers the choice. | Shows the chosen case. | Every case, each under its name. |
| Checklist | Ticks, a count, and a button that clears. Remembers the ticks for this document. | Ticks and the button. No count, no memory. | The lines with their boxes. |
| Decision helper | Questions, the answer that fits, and the table in a closed block. | The table of all cases. | The table of all cases. |

The page remembers in the reader's own browser only. Nothing leaves the file.

## What the renderer says

- `render doc.html: widget 1 ("system") built as chooser` — the markup is in the document.
- `render doc.html: widget 2 ("kind"): no answer fits "No" and "No"; every mix of options needs one answer` — the data is wrong. Fix what the message names. The block stays as it was, and `render` ends with exit code 1.

To see the markup of one widget without a document: `node scripts/render.cjs --data widget.json`. The markup goes to standard output.
