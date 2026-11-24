(() => {
  // Deck: written only into a page with data-profile="deck". Each slide's number is written as text before its heading, as a step's is.
  const root = document.documentElement, main = document.querySelector('main');
  // A page saved from the browser keeps what this script added on the last visit. Take it out, so that the script adds each part once.
  document.querySelectorAll('.slide-n, .present, .deck-nav').forEach((el) => el.remove());
  root.classList.remove('presenting');
  root.style.removeProperty('--deck-scale');
  const slides = [...document.querySelectorAll('main > section.slide')];
  // A page saved while presenting keeps the slides' present state: show them all again, with the names of the stack.
  slides.forEach((slide) => {
    slide.hidden = false;
    slide.classList.remove('is-current');
    ['role', 'aria-roledescription', 'aria-label', 'tabindex'].forEach((name) => slide.removeAttribute(name));
    const heading = slide.querySelector(':scope > h1[id], :scope > h2[id]');
    if (heading && !slide.hasAttribute('aria-labelledby')) slide.setAttribute('aria-labelledby', heading.id);
  });
  slides.forEach((slide, i) => {
    const heading = slide.firstElementChild;
    if (i === 0 || !heading || heading.tagName !== 'H2') return; // the title slide counts as slide 1 and shows no number
    const span = document.createElement('span');
    span.className = 'slide-n';
    span.textContent = `${i + 1} `;
    heading.prepend(span);
    heading.classList.add('is-numbered');
  });
  if (!main || !slides.length) return;

  // Present mode. The Present button in the top bar shows one slide on the full screen. Escape, or leaving the full screen, returns to
  // the stack at the same slide. The address names the slide (#s4) and replaces itself, so Back leaves the deck.
  const icon = (d) => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const present = document.createElement('button');
  present.type = 'button';
  present.className = 'present';
  present.innerHTML = `${icon('M2 3h12v8H2zM6 14h4M8 11v3')}Present`;
  const bar = document.querySelector('.topbar .shell');
  if (bar) bar.insertBefore(present, bar.querySelector('.theme'));
  const nav = document.createElement('div');
  nav.className = 'deck-nav';
  nav.innerHTML = `<span class="deck-count" aria-hidden="true"></span><button type="button" class="deck-prev" aria-label="Previous slide">${icon('M10 3 5 8l5 5')}</button><button type="button" class="deck-next" aria-label="Next slide">${icon('M6 3l5 5-5 5')}</button>`;
  main.append(nav);
  const [count, prev, next] = [nav.querySelector('.deck-count'), nav.querySelector('.deck-prev'), nav.querySelector('.deck-next')];
  let at = 0, on = false, full = false;
  const labels = new Map();
  const fit = () => root.style.setProperty('--deck-scale', String(Math.min(innerWidth / 1280, innerHeight / 720)));
  // A drawing on a slide stands at 1.5 times, or less when the room under the heading and above the caption needs it. render writes the
  // size of a drawing it made (--fw and --fh); for a hand-drawn figure or a picture the real room is measured here, on the frame.
  const drawings = (slide) => [...slide.querySelectorAll('.fig > svg[data-drawn="hand"], .fig > img')];
  const scale = (slide) => drawings(slide).forEach((art) => {
    const w = Number(art.getAttribute('width')), h = Number(art.getAttribute('height')), fig = art.closest('.fig'), figure = fig.closest('figure') || fig;
    if (!(w > 0 && h > 0)) return;
    art.style.width = `${w}px`;
    art.style.height = `${h}px`;
    const below = figure.offsetTop + figure.offsetHeight - (fig.offsetTop + fig.offsetHeight); // the caption under the well
    const room = { w: slide.clientWidth - 128 - 8, h: slide.clientHeight - 64 - fig.offsetTop - below - 8 };
    const s = Math.min(1.5, room.w / w, room.h / h);
    art.style.width = `${w * s}px`;
    art.style.height = `${h * s}px`;
  });
  const unscale = () => slides.forEach((slide) => drawings(slide).forEach((art) => { art.style.width = ''; art.style.height = ''; }));
  unscale(); // a page saved in present mode keeps the sizes of the last visit
  const show = (n) => {
    at = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((slide, i) => { slide.hidden = i !== at; slide.classList.toggle('is-current', i === at); });
    count.textContent = `${at + 1} / ${slides.length}`;
    prev.disabled = at === 0;
    next.disabled = at === slides.length - 1;
    if (slides[at].id) history.replaceState(history.state, '', `#${slides[at].id}`);
    slides[at].focus({ preventScroll: true });
    scale(slides[at]);
    // A diagram's dot travels its route twice when its slide shows, as when a diagram comes into view on a page.
    requestAnimationFrame(() => slides[at].querySelectorAll('svg.dg-auto').forEach((svg) => {
      svg.classList.add('is-playing');
      svg.querySelectorAll('.pulse').forEach((dot) => dot.getAnimations().forEach((run) => { run.cancel(); run.play(); }));
    }));
  };
  const enter = () => {
    if (on) return;
    on = true;
    // Start at the slide the reader is at: the first one that still shows at least 40px below the top bar, so a slide whose heading has
    // scrolled away but whose body shows counts, and the space above the next slide's heading does not. Measured in the stack.
    const line = (document.querySelector('.topbar')?.getBoundingClientRect().bottom || 0) + 40;
    const found = slides.findIndex((slide) => slide.getBoundingClientRect().bottom > line);
    const start = found < 0 ? slides.length - 1 : found;
    // Each slide is a group named as a slide, "4 of 12", the pattern of a carousel; the slides that do not show are hidden.
    slides.forEach((slide, i) => {
      labels.set(slide, slide.getAttribute('aria-labelledby'));
      slide.removeAttribute('aria-labelledby');
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} of ${slides.length}`);
      slide.tabIndex = -1;
    });
    root.classList.add('presenting');
    fit();
    show(start);
    const ask = root.requestFullscreen || root.webkitRequestFullscreen;
    if (ask) Promise.resolve(ask.call(root)).then(() => { full = on; }, () => { /* no full screen here: the slide fills the window */ });
  };
  const leave = () => {
    if (!on) return;
    on = false;
    full = false;
    root.classList.remove('presenting');
    root.style.removeProperty('--deck-scale');
    unscale();
    slides.forEach((slide) => {
      slide.hidden = false;
      slide.classList.remove('is-current');
      ['role', 'aria-roledescription', 'aria-label', 'tabindex'].forEach((name) => slide.removeAttribute(name));
      if (labels.get(slide)) slide.setAttribute('aria-labelledby', labels.get(slide));
    });
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document)?.catch?.(() => {});
    slides[at].scrollIntoView({ block: 'start' });
    present.focus({ preventScroll: true });
  };
  // A link to a slide, or to a place on it, shows that slide in present mode, as it scrolls to it in the stack.
  const slideOf = (hash) => { const el = hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1))); return el ? slides.indexOf(el.closest('main > section.slide')) : -1; };
  document.addEventListener('click', (event) => {
    const link = on && event.target instanceof Element && event.target.closest('a[href^="#"]');
    const n = link ? slideOf(link.getAttribute('href')) : -1;
    if (n < 0) return;
    event.preventDefault();
    show(n);
  });
  addEventListener('hashchange', () => { const n = on ? slideOf(location.hash) : -1; if (n >= 0 && n !== at) show(n); });
  present.addEventListener('click', enter);
  prev.addEventListener('click', () => show(at - 1));
  next.addEventListener('click', () => show(at + 1));
  addEventListener('resize', () => on && fit());
  // The browser's own key left the full screen that Present asked for: leave present mode too. A late event from an earlier exit, when the
  // full screen is on again, changes nothing.
  const changed = () => { if (full && !(document.fullscreenElement || document.webkitFullscreenElement)) leave(); };
  document.addEventListener('fullscreenchange', changed);
  document.addEventListener('webkitfullscreenchange', changed);
  // Keys: most hand-held clickers send Page Down and Page Up. A space on a link or a button presses it, as usual.
  addEventListener('keydown', (event) => {
    if (!on || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    const { key, shiftKey } = event;
    if (key === 'Escape') { event.preventDefault(); leave(); return; }
    const control = event.target instanceof Element && event.target.closest('a, button, input, select, textarea, summary');
    if (key === ' ' && control) return;
    const to = ['ArrowRight', 'ArrowDown', 'PageDown'].includes(key) || (key === ' ' && !shiftKey) ? at + 1
      : ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(key) || (key === ' ' && shiftKey) ? at - 1
      : key === 'Home' ? 0 : key === 'End' ? slides.length - 1 : null;
    if (to === null) return;
    event.preventDefault();
    show(to);
  });
  // A swipe to the left shows the next slide, and to the right the previous one. A tap does nothing, so a tap on a link opens it.
  let touch = null;
  main.addEventListener('touchstart', (event) => { touch = on && event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }, { passive: true });
  main.addEventListener('touchend', (event) => {
    if (!touch) return;
    const end = event.changedTouches[0], dx = end.clientX - touch.x, dy = end.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > 1.5 * Math.abs(dy)) show(at + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
