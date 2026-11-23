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
# The heat steps: a number on steps 1 to 3 takes the text color, on steps 4 and 5 the page color. The outline of a cell with no data is muted.
HEAT = dict(light=(L, ["#dee2f0", "#babecb", "#9498a5", "#616571", "#3e424d"]), dark=(D, ["#2a2e38", "#434751", "#5d616c", "#8f939f", "#babecb"]), paper=(dict(L, page="#ffffff"), ["#dee2f0", "#babecb", "#9498a5", "#616571", "#3e424d"]))
for name, (t, steps) in HEAT.items():
    for k, step in enumerate(steps, 1):
        fg = "text" if k <= 3 else "page"
        rows.append((f"{name} {fg} on heat-{k}", t[fg], step, 4.5))
    rows.append((f"{name} no-data outline on page", t["muted"], t["page"], 3.0))

fails = 0
for label, fg, bg, need in rows:
    r = ratio(fg, bg)
    ok = r >= need
    fails += not ok
    print(f"{label:34} {fg} on {bg}  {r:5.2f}  {'ok' if ok else 'FAIL'}" + (f" (min {need})" if need else ""))
print("pairs:", len(rows), "| fails:", fails)
