(() => {
  const root = document.documentElement;
  root.classList.add('js');
  // Theme: the page follows the reader's system setting. The switch sets a choice that wins over the system and is remembered.
  const button = document.querySelector('.theme');
  const system = matchMedia('(prefers-color-scheme: dark)');
  const theme = () => root.dataset.theme || (system.matches ? 'dark' : 'light');
  try {
    const saved = localStorage.getItem('docent-theme');
    if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;
  } catch { /* no saved choice can be read: follow the system */ }
  if (button) {
    const showSwitch = () => {
      const next = theme() === 'dark' ? 'light' : 'dark';
      button.dataset.next = next;
      button.querySelector('.theme-text').textContent = next === 'dark' ? 'Dark' : 'Light';
      button.setAttribute('aria-label', `Switch to the ${next} theme`);
    };
    showSwitch();
    system.addEventListener('change', showSwitch);
    button.addEventListener('click', () => {
      root.dataset.theme = theme() === 'dark' ? 'light' : 'dark';
      showSwitch();
      try { localStorage.setItem('docent-theme', root.dataset.theme); } catch { /* private window: the choice lasts for this visit */ }
    });
  }
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
  update();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
})();
