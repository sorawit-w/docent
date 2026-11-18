# Proposal: UML diagrams, and how Docent picks a diagram

Status: **approved on 2026-11-18**, with the recommended answer to each open decision (see "Decided" at the end). Each numbered item below is built in its own pull request, in the order of the table.

## The answer first

Docent can draw all 14 diagram types of UML 2.5.1 with its own renderer. "Proper" means two things here:

- **Every mark that Docent draws follows the UML notation.** A reply is a dashed line with an open arrowhead. Composition is a filled diamond. A final state is a ring around a filled dot.
- **Docent draws a chosen subset of each diagram type, not every option in the specification.** Each section below lists what is drawn and what is not. A missing option is left out. It is never replaced by a look-alike.

Today Docent draws **0 of the 14 types in correct UML notation**. Two kinds look like UML but are not UML:

| Kind today | Nearest UML type | Why it is not UML |
|---|---|---|
| `"kind": "sequence"` | Sequence diagram | A reply is a solid line, because in Docent a dashed line means "an optional path". No activation bars. One `alt` group only: no `opt`, `loop`, `par` or `break`. No asynchronous message, no create or destroy. |
| `"kind": "flow"` | Activity diagram | A decision is a plate with pointed ends, not a diamond. No initial node and no final node. No fork or join. No partitions. |

The work has four shared pieces and 14 kinds. It takes about 15 pull requests. The biggest single risk is the general graph layout that the structural diagrams need (item 7).

Docent can also pick the best diagram for a passage. Today the agent picks the **kind**, from rules in `SKILL.md`, and `render` picks the **form**, from the data. This proposal keeps that split and extends it to UML (see "How Docent picks a diagram").

| # | Pull request | Size |
|---|---|---|
| 0 | This proposal | — |
| 1 | UML notation rules in `DESIGN.md`, and a library of UML marks | Medium |
| 2 | Sequence diagram, in correct notation | Medium |
| 3 | Activity diagram (`"kind": "activity"`) | Large |
| 4 | State machine diagram (`"kind": "state"`) | Large |
| 5 | Interaction overview diagram | Medium |
| 6 | Timing diagram | Medium |
| 7 | Graph layout engine and containers, shipped with the use case diagram | Large |
| 8 | Class diagram | Large |
| 9 | Object diagram | Small |
| 10 | Package diagram and profile diagram | Medium |
| 11 | Component diagram | Medium |
| 12 | Composite structure diagram | Medium |
| 13 | Deployment diagram | Medium |
| 14 | Communication diagram | Medium |
| 15 | The diagram picker: a decision table in `SKILL.md`, and fit warnings in `check` | Small |

Items 2 to 6 reuse the layouts that exist. Items 7 to 14 need the new graph layout. Item 15 can ship at any point; each kind adds its own row to the table when it ships.

## The obvious answer that would be wrong

**Adding PlantUML, Mermaid or Kroki.** It looks like the quick way to "all of UML", and it fails on every count:

- PlantUML needs Java. Kroki needs a network service. Mermaid is a large script in the page. Docent's scripts run on Node with no packages, and a document opens with no network.
- A third-party drawing does not use the page tokens, the two themes, the spacing rules or the dot. `check` cannot compare it with its data.
- Mermaid does not follow UML closely either. It has no timing, composite structure, profile or interaction overview diagram.

`DESIGN.md` already says that Docent does not use a third-party diagram renderer. This proposal keeps that rule.

**A second trap: one kind for "UML", with a `type` field.** The 14 types have different data, different layouts and different phone forms. One kind would be one large validator full of exceptions. Each UML type is its own `kind`, like `sequence` and `flow` today.

---

## Rules that every UML kind keeps

These change `DESIGN.md` (item 1). Everything not named here stays as it is.

1. **Inside a UML kind, lines and arrowheads mean what UML says.** A dashed line is a reply, a dependency, an `«include»` or an `«extend»`, as the specification says. The Docent rule "a dashed line means a path that only some readers take" holds for every other diagram. The renderer never mixes the two meanings in one drawing.
2. **A UML mark may be filled in the text color.** The initial node, the centre of a final node, a fork or join bar, a junction, a composition diamond and a synchronous arrowhead are filled. The column form already fills a ring this way. Ultramarine stays a mark and is never a fill. An author still cannot color a diagram.
3. **UML text keeps its form.** Stereotypes take guillemets (`«interface»`). Guards take brackets (`[valid]`). Constraints take braces (`{ordered}`). Visibility marks are `+ - # ~`. An object name is underlined. Names stay 14px and notes 12px, at real size.
4. **The dot travels only where order exists.** It travels the messages of a sequence diagram, the main path of an activity diagram, the main path of a state machine and the numbered messages of a communication diagram. A structural diagram (class, component, deployment and the others) has no order. It has no dot and no walkthrough. A document still shows the brand's dot in the top bar and the rail.
5. **Every UML kind has a phone form and a text form.** The phone form fits 320px. The text form is the closed section "The diagram in words" under the figure. It is the form a screen reader reaches, and it prints.
6. **The text form ends with a key to the marks.** It names only the marks used in this drawing, in plain words: "A filled diamond: the part cannot exist without the whole." Many readers do not know UML. The key lets them read the drawing without a reference book.
7. **The spacing rules hold.** A straight run of at least 28px behind each arrowhead, no text on a line, marks clear of arrowheads and bends. Two lines may cross at a right angle, as in Plates. They never share a line.
8. **`check` compares each drawing with its data**, as it does today, and it compares the text form with the data.

---

## Shared pieces

### 1. The UML mark library

**Build.** One file of SVG marks that every UML kind draws from, in `scripts/lib/`. It holds:

- Arrowheads: open (association direction, asynchronous message, reply), filled triangle (synchronous message), hollow triangle (generalization, realization), filled triangle on a solid line (profile extension).
- Diamonds: hollow (aggregation, and the decision and merge node), filled (composition).
- Nodes: initial node, activity final, flow final, junction, choice, shallow and deep history (`H`, `H*`), fork and join bar, terminate (`×`).
- Shapes: rounded action, state, class box with compartments, node box in 3D, component box with its icon, folder tab for a package, actor, use case oval, lollipop and socket, port square, note with a folded corner.

Each mark reads the page tokens, so it serves both themes. The sample page gets a sheet of all marks in light and dark. The browser checks test their contrast.

### 2. Graph layout (with item 7)

**Build, in Docent's own code, with no package.** The structural diagrams are graphs, not lanes or columns. Today every layout puts parts in lanes (Route, Plates) or columns (flowchart, column form).

The layout is layered:

1. Put the nodes in rows. A generalization or a dependency points up, so a parent sits above its children.
2. Order the nodes in each row to cut crossings, in a fixed number of passes. The result is the same every time.
3. Route each line with right angles, between rows and around boxes.

An author may give a node a `row` to fix its row. That is the escape when the automatic rows read badly.

**Riskiest assumption:** a layered layout reads well for real class and component diagrams of up to 16 boxes. Before item 7, test it on three real diagrams. If it fails, there are two ways forward: require `row` for larger drawings, or copy a small open-source layout library (dagre, MIT license) into `scripts/lib/`. The second still needs no install and Docent still draws the SVG, but it bends the rule "Docent draws its own diagrams". That choice comes back to the owner.

### 3. Containers (with item 7)

**Build.** UML draws boxes inside boxes: a package, a composite state, a node, a system boundary, a combined fragment. A container is a frame with a name in its upper left. Nesting goes **one level deep**. A second level is an error, because deeper nesting does not fit a phone.

### 4. The text form

**Build once, in item 1.** Every UML kind writes its steps or its facts as a list in "The diagram in words", plus the key to the marks. A behavioral kind writes steps in order. A structural kind writes one line for each box and each relation: "Order has 1 to many Line items (composition)."

---

## The 14 kinds

Each section says what is drawn, what is not drawn, the phone form and the limits. The data follows the style of `sequence` and `flow`: a `kind`, a `label`, and lists of ids. Full data shapes go into `diagrams.md` with each pull request.

### Behavioral

#### 2. Sequence diagram — `"kind": "sequence"`

**Change the kind that exists.** The data stays compatible. The drawing changes.

- **Drawn:** lifelines with a head box; synchronous message (solid line, filled arrowhead); asynchronous message (solid line, open arrowhead); reply (dashed line, open arrowhead); call to itself; activation bars; create (a message to a head box that starts lower) and destroy (`×` at the end of a lifeline); combined fragments `alt`, `opt`, `loop`, `par`, `break` and `critical`, with their operator in a pentagon tab and guards in brackets; `ref` to another sequence diagram.
- **Not drawn:** gates, found and lost messages, duration and time constraints, general ordering, coregions.
- **Phone:** the script form of today, with the fragment operator in each band's label.
- **Limits:** 2 to 6 lifelines, 30 messages, fragments nested 2 deep.

Documents that already use this kind will show dashed replies after this change. That is the correct notation.

#### 3. Activity diagram — `"kind": "activity"`

**New kind.** `"kind": "flow"` stays as a plain flowchart, for readers who do not need UML.

- **Drawn:** initial node; action (rounded box); decision and merge (hollow diamond, guards in brackets); fork and join (bar); activity final; flow final; partitions (swimlanes, from the lanes of today); object node (box); send signal and accept event (pentagon shapes).
- **Not drawn:** pins, interruptible regions, expansion regions, exception handlers, streaming.
- **Phone:** the column form, with a go-to row for each branch.
- **Limits:** 20 nodes, 5 partitions, 4 forks.

#### 4. State machine diagram — `"kind": "state"`

**New kind.** It reuses the activity layout.

- **Drawn:** state (rounded box) with `entry /`, `do /` and `exit /` lines; initial pseudostate; final state; choice (diamond); junction (filled dot); shallow and deep history; fork and join; terminate; composite state, one level deep; orthogonal regions, divided by a dashed line; transitions labeled `trigger [guard] / effect`; a transition to itself.
- **Not drawn:** entry and exit points, submachine states, protocol state machines.
- **Phone:** the column form, one row per state, each transition as a go-to row.
- **Limits:** 16 states, 2 regions, 30 transitions.

#### 5. Interaction overview diagram — `"kind": "interaction-overview"`

**New kind.** An activity diagram whose nodes are interactions.

- **Drawn:** the control nodes of an activity diagram; each node a `ref` frame that names a sequence diagram in the same document. The frame is a link to it.
- **Not drawn:** a small sequence diagram drawn inline inside a node. The specification allows both forms; `ref` alone keeps the drawing readable.
- **Phone:** the column form.
- **Limits:** 12 frames.

#### 6. Timing diagram — `"kind": "timing"`

**New kind**, with a layout of its own and no graph engine.

- **Drawn:** one row per lifeline; the state timeline (a step line between state names on the left); a time axis with ticks; messages between lifelines; duration constraints (`{d..3d}`) and time observations.
- **Not drawn:** the value lifeline form (the hexagon chain).
- **Phone:** a table: one row per change, with the time, the lifeline and the new state.
- **Limits:** 4 lifelines, 6 states per lifeline, 20 changes.

#### 14. Communication diagram — `"kind": "communication"`

**New kind**, on the graph layout.

- **Drawn:** lifeline boxes; links as lines; messages as small arrows beside a link, numbered in decimal order (`1`, `1.1`, `1.2`, `2`); guards and iteration (`*[i=1..n]`).
- **Not drawn:** concurrent thread names on sequence numbers (`1a`, `1b`).
- **Phone:** a list in number order, like the sequence script.
- **Limits:** 8 lifelines, 20 messages.

### Structural

#### 7. Use case diagram — `"kind": "usecase"` (with the graph layout)

The simplest graph, so it proves the layout engine.

- **Drawn:** actor (stick figure, or a box with `«actor»`); use case (oval); system boundary (a container with the system name); association; `«include»` and `«extend»` (dashed, open arrowhead); generalization between actors or between use cases.
- **Not drawn:** extension points inside the oval, multiplicity on associations.
- **Phone:** a list per actor: the use cases the actor takes part in, with each include and extend as an indented line.
- **Limits:** 6 actors, 16 use cases, one boundary.

#### 8. Class diagram — `"kind": "class"`

- **Drawn:** class box with name, attributes and operations compartments; visibility; types; multiplicity; static members underlined; abstract names in italics; `«interface»`, `«enumeration»` and other stereotypes; association with role names, multiplicities and navigability; aggregation; composition; generalization; realization (dashed, hollow triangle); dependency (dashed, open arrowhead, optional stereotype); association class; notes and constraints.
- **Not drawn:** templates and their bindings, qualified associations, n-ary associations, an operation's full signature with directions (`in`, `out`).
- **Phone:** one card per class (its name, its attributes and operations as lists) and the relations as go-to rows under the class where they start.
- **Limits:** 16 classes, 24 relations, 8 attributes and 8 operations per class.

#### 9. Object diagram — `"kind": "object"`

A variant of the class layout.

- **Drawn:** instance box with an underlined `name : Class`; slots with values (`total = 40`); links with role names.
- **Not drawn:** anything beyond the class diagram's marks.
- **Phone, limits:** as the class diagram.

#### 10. Package diagram and profile diagram — `"kind": "package"`, `"kind": "profile"`

- **Package, drawn:** package (folder tab); nesting, one level; members listed inside; dependencies with `«import»`, `«access»` and `«merge»`.
- **Profile, drawn:** a package with `«profile»`; stereotype boxes with `«stereotype»`; metaclass boxes with `«metaclass»`; extension (solid line, filled triangle); profile application (dashed, `«apply»`).
- **Not drawn:** the containment line (circle with a cross), tag value notes.
- **Phone:** a list per package with its members, then the dependencies as rows.
- **Limits:** 12 packages or stereotypes.

#### 11. Component diagram — `"kind": "component"`

- **Drawn:** component box with `«component»` or the component icon; provided interface (lollipop); required interface (socket); assembly connector (lollipop in socket); ports; delegation connectors; dependencies; one level of internal components.
- **Not drawn:** the white-box view with realizing classifiers.
- **Phone:** one card per component, with its provided and required interfaces, then the connectors as rows.
- **Limits:** 12 components, 16 interfaces.

#### 12. Composite structure diagram — `"kind": "composite"`

- **Drawn:** the outer classifier as a container; parts as boxes named `role : Type [multiplicity]`; ports on the border; connectors between parts and ports.
- **Not drawn:** collaborations and collaboration uses (the dashed oval).
- **Phone:** a list of parts, then the connectors as rows.
- **Limits:** 10 parts, 8 ports.

#### 13. Deployment diagram — `"kind": "deployment"`

- **Drawn:** node (3D box) with `«device»` or `«executionEnvironment»`; nesting, one level; artifacts (box with the document icon) with `«artifact»`; communication paths with an optional protocol name; `«deploy»` dependencies; `«manifest»`.
- **Not drawn:** deployment specifications, instance-level multiplicity.
- **Phone:** a list per node with its artifacts, then the paths as rows.
- **Limits:** 10 nodes, 16 artifacts.

---

## How Docent picks a diagram

**Yes, Docent can pick the best diagram for a passage, and it already does part of this.** Two choices are made today, by two different hands:

| Choice | Made by | How, today |
|---|---|---|
| **The kind** (workflow, sequence, flowchart) | The agent, while it writes | `SKILL.md` step 6: "For calls and replies between a few participants in time order, write a sequence diagram. For steps with decisions, paths that end early or arrows back, write a flowchart." Step 4 says when to write a plain numbered list instead. |
| **The form** (Route wide, Route tall, Plates, column, script) | `render`, from the data | Deterministic: paths that branch give Plates, a place beside the steps gives Route tall, a narrow screen gives the column form. |

This split follows Product Principle 3: scripts do what must be identical, and the agent does what needs judgment. The kind is a judgment about the passage. Only the agent reads the passage, so only the agent can make that choice. `render` sees data only, and the data is already shaped for one kind when `render` sees it.

**The proposal keeps the split and makes both halves stronger (item 15):**

1. **A decision table in `SKILL.md`, keyed on the reader's question.** The agent asks what the reader needs to learn, then looks up the kind. One row for each kind, plus the "no diagram" rows:

   | The reader asks | Write |
   |---|---|
   | What happens, in order, when one actor does every step? | A numbered list, no diagram |
   | Who does what, in order, across people and systems? | Workflow diagram (walkthrough) |
   | Who calls whom, and what comes back? | Sequence diagram |
   | Which path does a job take, with decisions and loops? | Activity diagram; a flowchart for a non-technical reader |
   | Which states can a thing be in, and what moves it? | State machine diagram |
   | Which things exist, and how do they relate? | Class diagram |
   | What does one example of that look like, with values? | Object diagram |
   | Which parts make up the system, and how do they connect? | Component diagram |
   | Where does each part run? | Deployment diagram |
   | Who uses the system, and for what? | Use case diagram |
   | How is the code grouped, and what depends on what? | Package diagram |
   | What is inside one part, and how do its pieces connect? | Composite structure diagram |
   | Which extensions does our modeling language add? | Profile diagram |
   | When does each state change, against a clock? | Timing diagram |
   | How do the interactions fit together? | Interaction overview diagram |
   | Who is linked to whom, and in which order do they talk? | Communication diagram; a sequence diagram reads better when order matters more than links |

   The table also says when to draw nothing: "Draw a diagram only when it shows something that words cannot" stays the first rule.

2. **Fit warnings in `check`, from the data's shape.** `check` cannot read the passage, but it can see when data does not fit its kind. Examples:

   - A sequence diagram where every message goes one way and no reply comes back: "this reads as a workflow".
   - An activity diagram with no decision, no fork and one partition: "this is a numbered list".
   - A workflow whose parts are all states of one thing: "this may be a state machine".
   - A class diagram with no relations: "this is a table".
   - A communication diagram where order matters more than links: "a sequence diagram may read better".

   A fit warning never changes the drawing. It names the cause and the kind that may fit, like the warnings of today.

**Not proposed: `render` choosing the kind by itself.** It would have to guess the reader's question from the data, and a wrong guess would draw a confident, wrong diagram. The agent already holds the context; the table and the warnings make its choice repeatable and checkable.

---

## Decided

Approved on 2026-11-18, each with the recommended answer:

1. **The dot in structural diagrams.** No dot, because nothing in a class or deployment diagram has an order (rule 4).
2. **Dashed replies in existing sequence diagrams.** Change them in item 2, because the dashed reply is the UML notation.
3. **`flow` beside `activity`.** Keep both. `flow` is for readers who do not know UML; `activity` is for those who do.
4. **If the graph layout fails its test** (shared piece 2): still open. Require `row` for large drawings, or copy dagre into `scripts/lib/`. Decided after the test, before item 7.
