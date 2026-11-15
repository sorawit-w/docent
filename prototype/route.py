# Docent diagrams for the sample page and the options sheet: Route (tall, wide) and Plates, with icons.
# Colors come from the page's CSS variables through classes, so one drawing serves light and dark.
# Coordinates are placed by hand here; the real renderer is PR 1 work. The spacing rules it must keep:
#   R1  an arrowhead has a straight run of at least 28px behind it
#   R2  a numbered mark sits in the gap between lanes (or mid-leg inside one lane), 16px clear of heads, bends and parts
#   R3  a verb sits beside its mark and stays 6px clear of every line
#   R4  a leg inside one lane is at least 72px long
import math
import re
import sys

HEAD = 8  # arrowhead length
STOP = 13  # radius of a stop that holds an icon

# Icons: a 16x16 grid, 1.5 stroke, round caps and joins, no fill, at most six shapes, no letters.
ICONS = {
    "branch": '<circle cx="5" cy="3.5" r="1.5"/><circle cx="5" cy="12.5" r="1.5"/><circle cx="11" cy="5.5" r="1.5"/><path d="M5 5v6M11 7c0 2.6-6 1.4-6 4"/>',
    "commit": '<circle cx="8" cy="8" r="2.5"/><path d="M1.5 8h4M10.5 8h4"/>',
    "merge": '<circle cx="4.5" cy="3.5" r="1.5"/><circle cx="4.5" cy="12.5" r="1.5"/><circle cx="11.5" cy="8.5" r="1.5"/><path d="M4.5 5v6M4.5 5c0 2.8 2.6 3.5 5.5 3.5"/>',
    "pull": '<circle cx="4.5" cy="3.5" r="1.5"/><circle cx="4.5" cy="12.5" r="1.5"/><circle cx="11.5" cy="12.5" r="1.5"/><path d="M4.5 5v6M11.5 11V6.5a2 2 0 0 0-2-2H8M9.5 3 8 4.5 9.5 6"/>',
    "tag": '<path d="M2.5 8.4V3.5a1 1 0 0 1 1-1h4.9l5.1 5.1a1 1 0 0 1 0 1.4l-4.5 4.5a1 1 0 0 1-1.4 0z"/><path d="M5.6 5.6h.01"/>',
    "laptop": '<rect x="3" y="3.5" width="10" height="7" rx="1"/><path d="M1.5 12.5h13"/>',
    "person": '<circle cx="8" cy="5" r="2.5"/><path d="M3 13.5c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"/>',
    "team": '<circle cx="6" cy="5.5" r="2.25"/><path d="M1.75 13c0-2.4 1.9-3.75 4.25-3.75s4.25 1.35 4.25 3.75M10.5 3.5a2.25 2.25 0 0 1 0 4.25M12 9.6c1.4.5 2.25 1.7 2.25 3.4"/>',
    "document": '<path d="M9.5 2.5h-5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-7z"/><path d="M9.5 2.5v3h3M6 9h4M6 11.25h4"/>',
    "message": '<path d="M2.5 4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H7l-3 2.5v-2.5h-.5a1 1 0 0 1-1-1z"/><path d="M5.5 6.25h5M5.5 8.5h3"/>',
    "inspect": '<circle cx="7" cy="7" r="4"/><path d="M10 10l3.5 3.5"/>',
    "check": '<circle cx="8" cy="8" r="5.5"/><path d="M5.5 8.2l1.8 1.8 3.2-3.6"/>',
    "repo": '<rect x="2.5" y="2.5" width="11" height="4.5" rx="1"/><rect x="2.5" y="9" width="11" height="4.5" rx="1"/><path d="M5 4.75h.01M5 11.25h.01"/>',
}


def icon(x, y, name, cls="icon"):
    return f'<g class="{cls}" transform="translate({x - 8:g},{y - 8:g})">{ICONS[name]}</g>'


def text(x, y, s, cls, anchor="start"):
    return f'<text x="{x}" y="{y}" class="{cls}" text-anchor="{anchor}">{s}</text>'


def stop(x, y, name, last=False):
    ring = f'<circle cx="{x}" cy="{y}" r="{STOP}" class="{"stop end" if last else "stop"}"/>'
    return ring + icon(x, y, name, "icon on-end" if last else "icon")


def head(x, y, direction):
    """A filled triangle whose tip is at (x, y)."""
    pts = {
        "down": f"{x - 4.5},{y - HEAD} {x + 4.5},{y - HEAD} {x},{y}",
        "right": f"{x - HEAD},{y - 4.5} {x - HEAD},{y + 4.5} {x},{y}",
        "left": f"{x + HEAD},{y - 4.5} {x + HEAD},{y + 4.5} {x},{y}",
    }[direction]
    return f'<polygon points="{pts}" class="head"/>'


def line_path(points, direction, radius=0):
    """The leg's line. It stops inside the arrowhead, so the round cap never shows past the tip."""
    back = {"down": (0, -6), "right": (-6, 0), "left": (6, 0)}[direction]
    pts = list(points[:-1]) + [(points[-1][0] + back[0], points[-1][1] + back[1])]
    if not radius:
        return "M" + " L".join(f"{x:g},{y:g}" for x, y in pts)
    d = f"M{pts[0][0]:g},{pts[0][1]:g}"
    for i in range(1, len(pts) - 1):
        (px, py), (cx, cy), (nx, ny) = pts[i - 1], pts[i], pts[i + 1]
        din, dout = math.dist((px, py), (cx, cy)), math.dist((cx, cy), (nx, ny))
        ax, ay = cx - (cx - px) / din * radius, cy - (cy - py) / din * radius
        bx, by = cx + (nx - cx) / dout * radius, cy + (ny - cy) / dout * radius
        d += f" L{ax:g},{ay:g} Q{cx:g},{cy:g} {bx:g},{by:g}"
    return d + f" L{pts[-1][0]:g},{pts[-1][1]:g}"


def leg(n, points, direction, mark, verb, radius=0):
    """One step: line, arrowhead, numbered mark, verb, and the dot that travels the leg when it is current."""
    mx, my = mark
    return (
        f'<g class="leg" data-leg="{n}">'
        f'<path d="{line_path(points, direction, radius)}" class="line"/>'
        + head(points[-1][0], points[-1][1], direction)
        + f'<circle cx="{mx}" cy="{my}" r="10" class="mark"/>'
        + text(mx, my + 4, n, "num", "middle")
        + text(*verb)
        + f'<circle r="6" class="pulse pulse-{n}"/></g>'
    )


def motion(name, legs):
    """Keyframes (transform and opacity only) and the rest place of each leg's dot."""
    css = []
    for n, points, *_ in legs:
        lengths = [math.dist(points[i], points[i + 1]) for i in range(len(points) - 1)]
        total, start, end, done = sum(lengths), 8.0, 68.0, 0.0
        frames = [f"0%{{transform:translate({points[0][0]:g}px,{points[0][1]:g}px);opacity:0}}", f"{start:g}%{{transform:translate({points[0][0]:g}px,{points[0][1]:g}px);opacity:1}}"]
        for (x, y), length in zip(points[1:], lengths):
            done += length
            frames.append(f"{start + (end - start) * done / total:.1f}%{{transform:translate({x:g}px,{y:g}px);opacity:1}}")
        xe, ye = points[-1]
        frames += [f"88%{{transform:translate({xe:g}px,{ye:g}px);opacity:1}}", f"100%{{transform:translate({xe:g}px,{ye:g}px);opacity:0}}"]
        # Where the dot rests (reduced motion, still pictures): clear of the numbered mark, on a straight part.
        if len(lengths) == 1:
            i, at = 0, 0.12
        elif lengths[0] >= 24:
            i, at = 0, 0.5
        else:
            i, at = max(range(len(lengths)), key=lambda k: lengths[k]), 0.24
        (ax, ay), (bx, by) = points[i], points[i + 1]
        css.append(f"@keyframes {name}-{n}{{{''.join(frames)}}}")
        css.append(f".route-{name} .pulse-{n}{{transform:translate({ax + (bx - ax) * at:.0f}px,{ay + (by - ay) * at:.0f}px)}}")
        css.append(f".js .route-{name} .leg.is-current .pulse-{n}{{animation-name:{name}-{n}}}")
    return "\n".join(css)


CROSS, PAUSE = 1.6, 1.2  # seconds for one leg, and the rest before the run starts again


def motion_auto(name, legs):
    """A figure outside a walkthrough: one dot travels the whole route, leg by leg in order, then starts again."""
    total = len(legs) * CROSS + PAUSE
    pct = lambda t: f"{t / total * 100:.2f}%"
    css = [f".route-{name}.route-auto .pulse{{display:block;animation:{total:g}s linear 2 both}}"]
    for k, (n, points, *_) in enumerate(legs):
        lengths = [math.dist(points[i], points[i + 1]) for i in range(len(points) - 1)]
        t0, t1 = k * CROSS, (k + 1) * CROSS
        go, land = t0 + 0.12, t1 - 0.25
        at = lambda p: f"transform:translate({p[0]:g}px,{p[1]:g}px)"
        frames = [f"0%{{{at(points[0])};opacity:0}}"] if k else []
        frames += [f"{pct(t0)}{{{at(points[0])};opacity:0}}", f"{pct(go)}{{{at(points[0])};opacity:1}}"]
        done = 0.0
        for point, length in zip(points[1:], lengths):
            done += length
            frames.append(f"{pct(go + (land - go) * done / sum(lengths))}{{{at(point)};opacity:1}}")
        frames += [f"{pct(t1)}{{{at(points[-1])};opacity:0}}", f"100%{{{at(points[-1])};opacity:0}}"]
        css.append(f"@keyframes {name}-auto-{n}{{{''.join(frames)}}}")
        css.append(f".route-{name}.route-auto .pulse-{n}{{animation-name:{name}-auto-{n}}}")
    return "\n".join(css)


def drawing(name, view, label, bands, parts):
    w, h = view
    lanes = "".join(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="10" class="band"/>' for x, y, bw, bh in bands)
    return f'<svg class="route route-{name}" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">{lanes}{"".join(parts)}</svg>'


LABEL = "A bug report in four steps: the reporter files a report, the maintainers ask for steps, the reporter sends the steps, and the maintainers release a fix."

# ------------------------------------------------------------------ Route, tall
TALL_LEGS = [
    (1, [(176, 111), (176, 120), (350, 150), (350, 181)], "down", (263, 135), (263, 118, "file", "verb", "middle")),
    (2, [(350, 211), (350, 220), (176, 250), (176, 281)], "down", (263, 235), (263, 218, "ask for steps", "verb", "middle")),
    (3, [(176, 311), (176, 320), (350, 350), (350, 381)], "down", (263, 335), (263, 318, "send steps", "verb", "middle")),
    (4, [(350, 411), (350, 485)], "down", (350, 446), (371, 450, "release", "verb")),
]
TALL = drawing(
    "tall", (520, 552), LABEL,
    bands=[(8, 12, 243, 528), (275, 12, 237, 528)],
    parts=[
        '<line x1="176" y1="62" x2="176" y2="526" class="track"/><line x1="350" y1="62" x2="350" y2="526" class="track"/>',
        icon(30, 37, "person", "icon lane-icon"), text(46, 42, "Reporter", "lane"),
        icon(297, 37, "team", "icon lane-icon"), text(313, 42, "Maintainers", "lane"),
    ]
    + [leg(*item) for item in TALL_LEGS]
    + [stop(176, 96, "document"), stop(350, 196, "inspect"), stop(176, 296, "message"), stop(350, 396, "check"), stop(350, 500, "tag", True)]
    + [
        text(155, 101, "Bug report", "name", "end"), text(155, 118, "what went wrong", "sub", "end"),
        text(155, 301, "Steps to repeat", "name", "end"), text(155, 318, "a short, exact list", "sub", "end"),
        text(371, 201, "Triage", "name"), text(371, 218, "a first check", "sub"),
        text(371, 401, "Fix", "name"), text(371, 418, "a tested change", "sub"),
        text(371, 505, "New version", "name"), text(371, 522, "ready to install", "sub"),
    ],
)

# ------------------------------------------------------------------ Route, wide
WIDE_LEGS = [
    (1, [(215, 88), (228, 88), (298, 176), (335, 176)], "right", (263, 132), (279, 136, "file", "verb")),
    (2, [(365, 176), (378, 176), (448, 88), (485, 88)], "right", (413, 132), (429, 136, "ask for steps", "verb")),
    (3, [(515, 88), (528, 88), (598, 176), (635, 176)], "right", (563, 132), (579, 136, "send steps", "verb")),
    (4, [(665, 176), (795, 176)], "right", (730, 176), (730, 154, "release", "verb", "middle")),
]
WIDE = drawing(
    "wide", (890, 264), LABEL,
    bands=[(8, 20, 874, 100), (8, 144, 874, 100)],
    parts=[
        '<line x1="150" y1="88" x2="866" y2="88" class="track"/><line x1="150" y1="176" x2="866" y2="176" class="track"/>',
        icon(32, 68, "person", "icon lane-icon"), text(24, 93, "Reporter", "lane"),
        icon(32, 156, "team", "icon lane-icon"), text(24, 181, "Maintainers", "lane"),
    ]
    + [leg(*item) for item in WIDE_LEGS]
    + [stop(200, 88, "document"), stop(350, 176, "inspect"), stop(500, 88, "message"), stop(650, 176, "check"), stop(810, 176, "tag", True)]
    + [
        text(200, 46, "Bug report", "name", "middle"), text(200, 63, "what went wrong", "sub", "middle"),
        text(500, 46, "Steps to repeat", "name", "middle"), text(500, 63, "a short, exact list", "sub", "middle"),
        text(350, 211, "Triage", "name", "middle"), text(350, 228, "a first check", "sub", "middle"),
        text(650, 211, "Fix", "name", "middle"), text(650, 228, "a tested change", "sub", "middle"),
        text(810, 211, "New version", "name", "middle"), text(810, 228, "ready to install", "sub", "middle"),
    ],
)


# ------------------------------------------------------------------ Plates
def card(x, y, name, title, sub):
    return f'<rect x="{x}" y="{y}" width="300" height="52" rx="10" class="card"/>' + icon(x + 24, y + 26, name) + text(x + 46, y + 23, title, "name") + text(x + 46, y + 40, sub, "sub")


PLATES_LEGS = [
    (1, [(340, 90), (390, 90), (390, 182), (430, 182)], "right", (390, 128), (406, 132, "file", "verb"), 8),
    (2, [(462, 208), (462, 274), (342, 274)], "left", (390, 274), (412, 297, "ask for steps", "verb"), 8),
    (3, [(310, 300), (310, 350), (430, 350)], "right", (390, 350), (376, 370, "send steps", "verb", "end"), 8),
    (4, [(582, 376), (582, 448)], "down", (582, 408), (598, 412, "release", "verb"), 8),
]
PLATES = drawing(
    "plates", (780, 530), LABEL,
    bands=[(12, 12, 356, 506), (412, 12, 356, 506)],
    parts=[
        icon(48, 39, "person", "icon lane-icon"), text(64, 44, "Reporter", "lane"),
        icon(440, 39, "team", "icon lane-icon"), text(456, 44, "Maintainers", "lane"),
    ]
    + [leg(*item) for item in PLATES_LEGS]
    + [
        card(40, 64, "document", "Bug report", "what went wrong"), card(432, 156, "inspect", "Triage", "a first check"),
        card(40, 248, "message", "Steps to repeat", "a short, exact list"), card(432, 324, "check", "Fix", "a tested change"),
        card(432, 450, "tag", "New version", "ready to install"),
    ],
)

ROUTE_CSS = """/* Docent diagrams: Route (tall, wide) and Plates. They take their colors from the page, so one drawing serves both themes. */
.route { display: block; width: 100%; height: auto; margin-inline: auto; font-family: var(--sans); }
/* A drawing keeps its real size inside its well: it never stretches, and it scrolls sideways on a narrow screen. */
.route-tall { min-width: 440px; max-width: 520px; }
.route-wide { min-width: 640px; max-width: 890px; }
.route-plates { min-width: 640px; max-width: 780px; }
/* A diagram outside the walkthrough waits until it is in view, then runs twice. */
.js .route-auto:not(.is-playing) .pulse { animation-play-state: paused; }
/* Three layers: the well as the ground, a band for each lane, and the drawing on top. */
.route .band { fill: var(--bg); }
.route .track { stroke: var(--line); }
.route .line { fill: none; stroke: var(--text); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.route .head { fill: var(--text); }
.route .stop { fill: var(--bg); stroke: var(--text); stroke-width: 1.5; }
.route .stop.end { fill: var(--text); }
.route .mark { fill: var(--bg); stroke: var(--text); stroke-width: 1.25; }
.route .card { fill: var(--bg); stroke: var(--line); }
/* Icons: one grid, one stroke, the text color. */
.route .icon { fill: none; stroke: var(--text); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.route .icon.on-end { stroke: var(--bg); }
.route .icon.lane-icon { stroke: var(--muted); }
.route .num { font-size: 12px; font-weight: 600; fill: var(--text); font-variant-numeric: tabular-nums; }
.route .name { font-size: 14px; font-weight: 600; fill: var(--text); }
.route .lane { font-size: 14px; font-weight: 600; fill: var(--muted); }
.route .sub, .route .verb { font-size: 12px; fill: var(--muted); }
.route .pulse { display: none; fill: var(--dot); stroke: var(--bg); stroke-width: 2.5; }
/* The current step: its leg takes the ink color and its dot travels the leg. */
.js .route .leg.is-current .line { stroke: var(--primary); stroke-width: 2.5; }
.js .route .leg.is-current .head, .js .route .leg.is-current .num { fill: var(--primary); }
.js .route .leg.is-current .mark { stroke: var(--primary); }
.js .route .leg.is-current .pulse { display: block; animation: 2.4s linear infinite; }
"""

if __name__ == "__main__":
    page = sys.argv[1]
    html = open(page).read()
    # The tall Route follows the walkthrough step. The other two run by themselves, one leg after the other.
    auto = lambda svg, cls: svg.replace(f'class="route {cls}"', f'class="route {cls} route-auto"', 1)
    for cls, new in (("route-tall", TALL), ("route-wide", auto(WIDE, "route-wide")), ("route-plates", auto(PLATES, "route-plates"))):
        pattern = re.compile(r'<svg class="route ' + cls + r'[^"]*".*?</svg>', re.S)
        assert len(pattern.findall(html)) == 1, f"{cls} not found once"
        html = pattern.sub(lambda m: new, html)
    css = re.compile(r"/\* (?:The Route: stops on tracks|Docent diagrams: Route).*?(?=\nfigcaption \{)", re.S)
    assert len(css.findall(html)) == 1, "route CSS block not found once"
    blocks = [ROUTE_CSS + motion("tall", TALL_LEGS), motion_auto("wide", WIDE_LEGS), motion_auto("plates", PLATES_LEGS)]
    html = css.sub(lambda m: "\n".join(blocks), html)
    open(page, "w").write(html)
    print("page bytes:", len(html.encode()), "| routes:", html.count('<svg class="route'), "| icons:", html.count('class="icon'), "| keyframes:", html.count("@keyframes"))
