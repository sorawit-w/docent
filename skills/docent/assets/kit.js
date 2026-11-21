(() => {
  const root = document.documentElement;
  root.classList.add('js');
  // A page saved from the browser ("Save page as") keeps what this script added. Take it out, so that the script adds each part once.
  document.querySelectorAll('.fig-more, .step-n, button.copy').forEach((el) => el.remove());
  document.querySelectorAll('div.code').forEach((holder) => holder.replaceWith(...holder.childNodes));
  document.querySelectorAll('.is-numbered').forEach((h) => h.classList.remove('is-numbered'));
  // A theme that the reader chose carries data-theme-reader. A saved page keeps it, and it is not a fixed theme.
  if (root.hasAttribute('data-theme-reader')) { delete root.dataset.theme; delete root.dataset.themeReader; }
  // Theme: the page follows the reader's system setting. The switch sets a choice that wins over the system and is remembered.
  const button = document.querySelector('.theme');
  const system = matchMedia('(prefers-color-scheme: dark)');
  const theme = () => root.dataset.theme || (system.matches ? 'dark' : 'light');
  const chooseTheme = (value) => { root.dataset.theme = value; root.dataset.themeReader = ''; };
  // A theme written on <html> in the source is fixed: no saved choice and no switch.
  const fixed = root.dataset.theme === 'light' || root.dataset.theme === 'dark';
  if (fixed && button) button.hidden = true;
  if (!fixed) try {
    const saved = localStorage.getItem('docent-theme');
    if (saved === 'dark' || saved === 'light') chooseTheme(saved);
  } catch { /* no saved choice can be read: follow the system */ }
  if (button && !fixed) {
    const showSwitch = () => {
      const next = theme() === 'dark' ? 'light' : 'dark';
      button.dataset.next = next;
      button.querySelector('.theme-text').textContent = next === 'dark' ? 'Dark' : 'Light';
      button.setAttribute('aria-label', `Switch to the ${next} theme`);
    };
    showSwitch();
    system.addEventListener('change', showSwitch);
    button.addEventListener('click', () => {
      chooseTheme(theme() === 'dark' ? 'light' : 'dark');
      showSwitch();
      try { localStorage.setItem('docent-theme', root.dataset.theme); } catch { /* private window: the choice lasts for this visit */ }
    });
  }
  // Step numbers. The styles count the steps, but a screen reader in Chromium does not read a number that the styles count. So the script writes each number as text, in place of the counted one.
  const number = (heading, n) => {
    const span = document.createElement('span');
    span.className = 'step-n';
    span.textContent = `${n} `;
    heading.prepend(span);
    heading.classList.add('is-numbered');
  };
  const groups = new Map();
  document.querySelectorAll('h3.step').forEach((h) => { const s = h.closest('section'); groups.set(s, [...(groups.get(s) || []), h]); });
  groups.forEach((list) => list.forEach((h, i) => number(h, i + 1)));
  document.querySelectorAll('.steps').forEach((ol) => [...ol.children].forEach((li, i) => { const h = li.querySelector('h3'); if (h) number(h, i + 1); }));
  // A diagram outside a walkthrough runs its dot twice when it comes into view, then rests. Pointing at it runs it again.
  const replay = (svg) => svg.querySelectorAll('.pulse').forEach((dot) => dot.getAnimations().forEach((run) => { run.cancel(); run.play(); }));
  const seen = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-playing');
    seen.unobserve(entry.target);
  }), { threshold: 0.6 });
  document.querySelectorAll('svg.dg-auto').forEach((svg) => {
    seen.observe(svg);
    const well = svg.closest('.fig') || svg;
    well.addEventListener('pointerenter', () => replay(svg));
    well.addEventListener('focus', () => replay(svg));
  });
  // A drawing that is wider than its well scrolls sideways, and the part that shows can look complete. A line under the well says that more is to the side.
  const wells = [...document.querySelectorAll('.fig')].map((well) => {
    const note = document.createElement('p');
    note.className = 'fig-more';
    note.hidden = true;
    note.textContent = 'The drawing is wider than the screen. Scroll it sideways to see all of it.';
    well.after(note);
    return { well, note };
  });
  // A code block gets a button that copies the code. The block moves into a holder, so the button stays in place when the code scrolls sideways.
  const blocks = [...document.querySelectorAll('pre')].map((pre) => {
    const holder = document.createElement('div'), button = document.createElement('button');
    holder.className = 'code';
    pre.before(holder);
    holder.append(pre, button);
    button.type = 'button';
    button.className = 'copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', async () => {
      const text = (pre.querySelector('code') || pre).textContent;
      let done = false;
      try { await navigator.clipboard.writeText(text); done = true; } catch { /* no clipboard here: select the code and copy the selection */ }
      if (!done) {
        const range = document.createRange(), selection = getSelection();
        range.selectNodeContents(pre);
        selection.removeAllRanges();
        selection.addRange(range);
        try { done = document.execCommand('copy'); } catch { /* the code stays selected, so the reader can copy it by hand */ }
        if (done) selection.removeAllRanges();
      }
      button.textContent = done ? 'Copied' : 'Select and copy';
      setTimeout(() => (button.textContent = 'Copy'), 2000);
    });
    return { holder, pre, button };
  });
  const fit = () => {
    wells.forEach(({ well, note }) => (note.hidden = well.scrollWidth <= well.clientWidth + 1));
    // When the widest line of code reaches the button, the code starts below the button. A block that is hidden now has no size; it is measured when it shows.
    blocks.forEach(({ holder, pre, button }) => {
      if (!pre.clientWidth) return;
      const code = pre.querySelector('code') || pre;
      holder.classList.toggle('is-long', pre.scrollWidth > pre.clientWidth + 1 || code.getBoundingClientRect().right > button.getBoundingClientRect().left - 8);
    });
  };
  // Measure again when a well or a code block changes its size: the window changes, a chooser shows another case, or a closed section opens.
  if ('ResizeObserver' in window) {
    const watch = new ResizeObserver(fit);
    wells.forEach(({ well }) => watch.observe(well));
    blocks.forEach(({ pre }) => watch.observe(pre));
  }
  addEventListener('resize', fit);
  fit();
  // Print: open every closed section so its text prints, then close it again.
  let opened = [];
  addEventListener('beforeprint', () => { opened = [...document.querySelectorAll('details:not([open])')]; opened.forEach((d) => (d.open = true)); });
  addEventListener('afterprint', () => { opened.forEach((d) => (d.open = false)); opened = []; });
  // The route dot marks the current section. In each walkthrough, the rail dot marks the current step and the diagram lights the leg with the same number.
  const bar = document.querySelector('.topbar .shell');
  const routeDot = document.querySelector('.route-dot');
  const links = [...document.querySelectorAll('.route a[href^="#"]')].filter((a) => document.getElementById(a.getAttribute('href').slice(1)));
  const sections = links.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
  const walks = [...document.querySelectorAll('.walk')].map((walk) => ({
    steps: [...walk.querySelectorAll('.steps > li')],
    legs: [...walk.querySelectorAll('svg.dg .leg')],
    dot: walk.querySelector('.rail-dot'),
  })).filter((walk) => walk.steps.length);
  const nearest = (items, line) => items.reduce((best, el) => (el.getBoundingClientRect().top <= line ? el : best), items[0]);
  const update = () => {
    if (sections.length) {
      const section = nearest(sections, innerHeight * 0.35);
      links.forEach((a, i) => (sections[i] === section ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      if (bar && routeDot) {
        const link = links[sections.indexOf(section)].getBoundingClientRect();
        routeDot.style.setProperty('--x', `${link.left + link.width / 2 - bar.getBoundingClientRect().left - 3.5}px`);
      }
    }
    walks.forEach(({ steps, legs, dot }) => {
      const step = nearest(steps, innerHeight * 0.5);
      const number = steps.indexOf(step) + 1;
      steps.forEach((li) => li.classList.toggle('is-current', li === step));
      legs.forEach((leg) => leg.classList.toggle('is-current', Number(leg.dataset.leg) === number));
      if (dot) dot.style.setProperty('--y', `${step.offsetTop}px`);
    });
  };
  let queued = false;
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  // Widgets. Each one is readable without this script. The script adds memory, the count of a checklist and the answer of a decision helper.
  const load = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private window: it lasts for this visit */ } };
  // Chooser: the choice is remembered, and choosers with the same options change together.
  const choosers = [...document.querySelectorAll('.choose')].map((el) => ({
    inputs: [...el.querySelectorAll(':scope > input')],
    key: `docent-choice:${[...el.querySelectorAll(':scope > .opt')].map((label) => label.textContent).join('|')}`,
  }));
  const choose = (key, n) => choosers.forEach((c) => { if (c.key === key && c.inputs[n]) c.inputs[n].checked = true; });
  choosers.forEach((c) => {
    choose(c.key, load(c.key));
    c.inputs.forEach((input, n) => input.addEventListener('change', () => {
      const top = input.getBoundingClientRect().top;
      choose(c.key, n);
      scrollBy(0, input.getBoundingClientRect().top - top); // a chooser higher on the page changed its height: keep this one in place
      save(c.key, n);
      schedule();
    }));
  });
  // Value picker: every place <var data-v="key"> shows the value of the chosen option. The values come from the table of all values. Pickers with the same options change together, and the choice is remembered.
  const pickers = [...document.querySelectorAll('.values')].map((el) => ({
    el,
    inputs: [...el.querySelectorAll(':scope > input')],
    names: [...el.querySelectorAll(':scope > .opt')].map((label) => label.textContent),
    rows: [...el.querySelectorAll('tbody tr[data-v]')].map((tr) => ({ key: tr.dataset.v, cells: [...tr.querySelectorAll('td')].map((td) => td.textContent) })),
  }));
  const pick = (names, n) => pickers.forEach((p) => {
    if (p.names.join('|') !== names || !p.inputs[n]) return;
    p.inputs[n].checked = true;
    p.el.querySelector('.values-now strong').textContent = p.names[n];
    p.rows.forEach(({ key, cells }) => document.querySelectorAll(`var[data-v="${CSS.escape(key)}"]`).forEach((v) => (v.textContent = cells[n])));
  });
  pickers.forEach((p) => {
    const key = `docent-values:${p.names.join('|')}`, saved = load(key);
    if (Number.isInteger(saved)) pick(p.names.join('|'), saved);
    p.inputs.forEach((input, n) => input.addEventListener('change', () => { pick(p.names.join('|'), n); save(key, n); }));
    p.el.querySelector('details').open = false;
  });
  // Checklist: the ticks are remembered for this document, and the line below the list counts them.
  document.querySelectorAll('form.checks').forEach((form) => {
    const boxes = [...form.querySelectorAll('input')], out = form.querySelector('output'), key = `docent-ticks:${location.pathname}#${form.id}`;
    const saved = load(key);
    if (Array.isArray(saved) && saved.length === boxes.length) boxes.forEach((box, i) => (box.checked = saved[i] === true));
    const show = () => { out.textContent = `${boxes.filter((box) => box.checked).length} of ${boxes.length} done`; };
    const keep = () => { show(); save(key, boxes.map((box) => box.checked)); schedule(); };
    form.addEventListener('change', keep);
    form.addEventListener('reset', () => setTimeout(keep));
    show();
  });
  // Decision helper: a row that no longer fits the answers takes the muted color. When every question has an answer, the one row that fits is shown as the answer.
  document.querySelectorAll('.decide').forEach((el) => {
    const form = el.querySelector('form'), out = el.querySelector('output'), again = el.querySelector('.wd-foot'), groups = [...el.querySelectorAll('fieldset')], rows = [...el.querySelectorAll('tbody tr')];
    el.querySelector('details').open = false;
    const show = () => {
      const picked = groups.map((group) => [...group.querySelectorAll('input')].findIndex((input) => input.checked) + 1);
      const fits = rows.filter((row) => {
        const fit = row.dataset.when.split(',').every((option, q) => option === '0' || !picked[q] || Number(option) === picked[q]);
        row.classList.toggle('is-out', !fit);
        return fit;
      });
      out.innerHTML = picked.every(Boolean) && fits.length === 1 ? fits[0].lastElementChild.innerHTML : '';
      again.hidden = !picked.some(Boolean);
      schedule();
    };
    form.addEventListener('change', show);
    form.addEventListener('reset', () => setTimeout(show));
    show();
  });
  update();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
})();
