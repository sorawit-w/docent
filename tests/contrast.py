# WCAG contrast for Docent's own neutrals (a slight lean toward ultramarine, hue 234).
def lum(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a, b):
    x, y = sorted((lum(a), lum(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)


L = dict(page="#fbfbfe", well="#f2f3f9", text="#1c1f2e", muted="#575d75", line="#d3d6e3", primary="#2f3fd0", ink="#1b2260", ok="#1a7f37", warn="#7d4e00", err="#cf222e")
D = dict(page="#12141f", well="#0b0d15", text="#e7e9f3", muted="#959bb3", line="#2d3146", primary="#8e9bff", ink="#e7e9f3", ok="#3fb950", warn="#d29922", err="#f85149", lamp="#f2b824")

rows = []
for name, t in (("light", L), ("dark", D)):
    for fg in ("text", "muted", "primary", "ink", "ok", "warn", "err"):
        for bg in ("page", "well"):
            rows.append((f"{name} {fg} on {bg}", t[fg], t[bg], 4.5))
    rows.append((f"{name} line on page (non-text)", t["line"], t["page"], 0))
    rows.append((f"{name} well vs page (tone step)", t["well"], t["page"], 0))
rows.append(("dark lamp dot on page", D["lamp"], D["page"], 3.0))
rows.append(("dark lamp dot on well", D["lamp"], D["well"], 3.0))
rows.append(("light primary dot on page", L["primary"], L["page"], 3.0))
rows.append(("mark: white on primary", "#ffffff", L["primary"], 3.0))
# The host colors of the SKILL.md example. In dark mode the dot takes the dark accent: a mark needs 3:1, and the accent already has 4.5:1.
HOST = dict(accent="#a21caf", dark="#ec6cf7", ink="#4d0055")
for bg in ("page", "well"):
    rows.append((f"host accent on {bg}", HOST["accent"], L[bg], 4.5))
    rows.append((f"host dark accent on dark {bg}", HOST["dark"], D[bg], 4.5))
    rows.append((f"host dark dot on dark {bg}", HOST["dark"], D[bg], 3.0))
rows.append(("host ink on page", HOST["ink"], L["page"], 4.5))
# Values that brand.cjs works out for the proposal's examples: a dark accent at 7:1 on the dark page, a darkened light accent at 4.6:1, a heading color at Docent's ink lightness.
for name, accent, dark, ink in (("green", "#0b6e4f", "#5ab08d", "#003020"), ("yellow", "#8d6800", "#f2b824", "#362700")):
    for bg in ("page", "well"):
        rows.append((f"brand {name} accent on {bg}", accent, L[bg], 4.5))
        rows.append((f"brand {name} dark accent on dark {bg}", dark, D[bg], 4.5))
    rows.append((f"brand {name} ink on page", ink, L["page"], 4.5))
# A host's logo for one theme only stands on a tile in the page color of that theme. The tile must stand out from the other page.
rows.append(("dark: logo tile (light page) on page", L["page"], D["page"], 3.0))
rows.append(("light: logo tile (dark page) on page", D["page"], L["page"], 3.0))
rows.append(("paper: logo tile (dark page) on page", D["page"], "#ffffff", 3.0))
# The heat steps: a number on steps 1 to 3 takes the text color, on steps 4 and 5 the page color. The outline of a cell with no data is muted.
# A heat plan adds no new pair: the name, the value and the note of a box on a step take these same two colors.
HEAT = dict(light=(L, ["#c6e9ef", "#86c9d5", "#3da6b6", "#00707e", "#004a53"]), dark=(D, ["#093339", "#054e58", "#006b78", "#36a0b1", "#80cad7"]), paper=(dict(L, page="#ffffff"), ["#dee2f0", "#babecb", "#9498a5", "#616571", "#3e424d"]))
for name, (t, steps) in HEAT.items():
    for k, step in enumerate(steps, 1):
        fg = "text" if k <= 3 else "page"
        rows.append((f"{name} {fg} on heat-{k}", t[fg], step, 4.5))
    rows.append((f"{name} no-data outline on page", t["muted"], t["page"], 3.0))
# A status grid. On screen each cell is filled in its status color on the band (the page color), and the mark of a Warning or
# an Error cell (a slash or a cross) takes the page color. On paper only the failures stand out: OK and Warning cells take the
# outline color, the slash the warning color, and the Error cell keeps its fill and its cross. Fills and marks are graphics: 3:1.
for name, t in (("light", L), ("dark", D)):
    for k in ("ok", "warn", "err"):
        rows.append((f"{name} status {k} cell on page", t[k], t["page"], 3.0))
    for k in ("warn", "err"):
        rows.append((f"{name} status mark on {k} cell", t["page"], t[k], 3.0))
P = dict(L, page="#ffffff")
rows.append(("paper status err cell on page", P["err"], P["page"], 3.0))
rows.append(("paper status cross on err cell", P["page"], P["err"], 3.0))
rows.append(("paper status err cell vs OK cell", P["err"], P["line"], 3.0))
rows.append(("paper status slash on OK cell", P["warn"], P["line"], 3.0))

# More contrast (the reader's system setting): the line takes the muted value, and muted text the text value, on the page and the well.
for name, t in (("light", L), ("dark", D)):
    for bg in ("page", "well"):
        rows.append((f"{name} more: line on {bg} (non-text)", t["muted"], t[bg], 3.0))
        rows.append((f"{name} more: muted text on {bg}", t["text"], t[bg], 4.5))

# Palettes (skills/docent/assets/palettes.json): the same pairs for each palette, in light, dark and on paper.
# Paper is white, with the palette's light colors and Docent's gray heat steps.
import json, math, os
PALETTES = json.load(open(os.path.join(os.path.dirname(__file__), "..", "skills", "docent", "assets", "palettes.json")))
PAPER_HEAT = HEAT["paper"][1]


def lab(h):
    h = h.lstrip("#")
    r, g, b = ((lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))
    xyz = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b, 0.2126729 * r + 0.7151522 * g + 0.072175 * b, 0.0193339 * r + 0.119192 * g + 0.9503041 * b)
    f = lambda t: t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116
    fx, fy, fz = (f(v / w) for v, w in zip(xyz, (0.95047, 1, 1.08883)))
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def de(a, b):  # CIE76
    return math.dist(lab(a), lab(b))


# Distances that must hold, beside contrast: (label, value, minimum).
gaps = []
for key, pal in PALETTES.items():
    n = pal["name"].lower()
    lt = dict(page=pal["light"]["bg"], well=pal["light"]["panel"], text=pal["light"]["text"], muted=pal["light"]["muted"], line=pal["light"]["line"], primary=pal["light"]["primary"], ink=pal["light"]["ink"], ok=L["ok"], warn=L["warn"], err=L["err"])
    dk = dict(page=pal["dark"]["bg"], well=pal["dark"]["panel"], text=pal["dark"]["text"], muted=pal["dark"]["muted"], line=pal["dark"]["line"], primary=pal["dark"]["primary"], ink=pal["dark"]["text"], ok=D["ok"], warn=D["warn"], err=D["err"])
    pp = dict(lt, page="#ffffff")
    for mode, t in (("light", lt), ("dark", dk), ("paper", pp)):
        for fg in ("text", "muted", "primary", "ink", "ok", "warn", "err"):
            for bg in ("page", "well"):
                rows.append((f"{n} {mode} {fg} on {bg}", t[fg], t[bg], 4.5))
        rows.append((f"{n} {mode} line on page (non-text)", t["line"], t["page"], 0))
        if mode != "paper":  # more contrast, on screen only: the line takes the muted color, and muted text the text color
            for bg in ("page", "well"):
                rows.append((f"{n} {mode} more: line on {bg} (non-text)", t["muted"], t[bg], 3.0))
                rows.append((f"{n} {mode} more: muted text on {bg}", t["text"], t[bg], 4.5))
        rows.append((f"{n} {mode} no-data outline on page", t["muted"], t["page"], 3.0))
        steps = PAPER_HEAT if mode == "paper" else [pal[mode][f"heat-{k}"] for k in range(1, 6)]
        for k, step in enumerate(steps, 1):
            fg = "text" if k <= 3 else "page"
            rows.append((f"{n} {mode} {fg} on heat-{k}", t[fg], step, 4.5))
        if mode != "paper":
            gaps += [(f"{n} {mode} heat steps {k} and {k + 1} (CIE76)", de(steps[k - 1], steps[k]), 12) for k in range(1, 5)]
    rows.append((f"{n} light primary dot on page", lt["primary"], lt["page"], 3.0))
    for bg in ("page", "well"):
        rows.append((f"{n} dark dot on dark {bg}", dk["primary"], dk[bg], 3.0))
    # A note must not look like a link, and the accent must not read as a status.
    gaps += [(f"{n} {mode} muted vs accent (CIE76)", de(t["muted"], t["primary"]), 25) for mode, t in (("light", lt), ("dark", dk))]
    gaps += [(f"{n} {mode} accent vs {st} (CIE76)", de(t["primary"], t[st]), 25) for mode, t in (("light", lt), ("dark", dk)) for st in ("ok", "warn", "err")]

# A deck in present mode (docs/proposals/decks.md, section 4): always light, with the "more contrast" tokens, so muted text takes the text
# color and the line the muted color. Every text pair on a slide reaches 7:1 (AAA) on the page; a status word takes the text color, and its
# dot is a mark that needs 3:1. A palette may give a darker accent for present mode ("present" in palettes.json).
present = [("docent", L, L["primary"])] + [(pal["name"].lower(), dict(page=pal["light"]["bg"], text=pal["light"]["text"], muted=pal["light"]["muted"], ink=pal["light"]["ink"]), pal.get("present", {}).get("primary", pal["light"]["primary"])) for pal in PALETTES.values()]
for n, t, accent in present:
    for label, fg in (("text", t["text"]), ("muted text (text color)", t["text"]), ("heading (ink)", t["ink"]), ("accent", accent)):
        rows.append((f"{n} present: {label} on page", fg, t["page"], 7.0))
    rows.append((f"{n} present: line (muted) on page", t["muted"], t["page"], 3.0))
    for st in ("ok", "warn", "err"):
        rows.append((f"{n} present: {st} dot on page", L[st], t["page"], 3.0))

fails = 0
# The scripts test a palette in Node (skills/docent/scripts/lib/pairs.cjs), so a palette that is not in palettes.json can be tested when a
# page is built. Its pairs must be these: the same labels, colors and minimums for each palette, and the same distances.
import subprocess
here = os.path.dirname(os.path.abspath(__file__))
node = subprocess.run(["node", "-e", "const {palettePairs}=require(process.argv[1]); const P=require(process.argv[2]); console.log(JSON.stringify(Object.values(P).map(palettePairs)))",
                       os.path.join(here, "..", "skills", "docent", "scripts", "lib", "pairs.cjs"), os.path.join(here, "..", "skills", "docent", "assets", "palettes.json")],
                      capture_output=True, text=True, check=True)
names = tuple(pal["name"].lower() + " " for pal in PALETTES.values())
mine_rows = [(l, fg, bg, float(need)) for l, fg, bg, need in rows if l.startswith(names)]
mine_gaps = [(l, round(v, 1), float(need)) for l, v, need in gaps if l.startswith(names)]
theirs = json.loads(node.stdout)
node_rows = [(r[0], r[1], r[2], float(r[3])) for p in theirs for r in p["rows"]]
node_gaps = [(g[0], round(g[1], 1), float(g[2])) for p in theirs for g in p["gaps"]]
agree = sorted(mine_rows) == sorted(node_rows) and sorted(mine_gaps) == sorted(node_gaps)
fails += not agree
print(f"{'node pairs agree with contrast.py':44} {len(node_rows)} pairs, {len(node_gaps)} distances  {'ok' if agree else 'FAIL'}")
if not agree:
    for row in sorted(set(mine_rows) ^ set(node_rows)) + sorted(set(mine_gaps) ^ set(node_gaps)):
        print("  differs:", row)
for label, value, need in gaps:
    good = value >= need
    fails += not good
    print(f"{label:44} {value:6.1f}  {'ok' if good else 'FAIL'} (min {need})")
for label, fg, bg, need in rows:
    r = ratio(fg, bg)
    ok = r >= need
    fails += not ok
    print(f"{label:34} {fg} on {bg}  {r:5.2f}  {'ok' if ok else 'FAIL'}" + (f" (min {need})" if need else ""))
print("pairs:", len(rows), "| distances:", len(gaps), "| fails:", fails)
