(() => {
  // Deck: written only into a page with data-profile="deck". Each slide's number is written as text before its heading, as a step's is.
  document.querySelectorAll('.slide-n').forEach((el) => el.remove()); // a page saved from the browser keeps the numbers of the last visit
  document.querySelectorAll('main > section.slide').forEach((slide, i) => {
    const heading = slide.firstElementChild;
    if (i === 0 || !heading || heading.tagName !== 'H2') return; // the title slide counts as slide 1 and shows no number
    const span = document.createElement('span');
    span.className = 'slide-n';
    span.textContent = `${i + 1} `;
    heading.prepend(span);
    heading.classList.add('is-numbered');
  });
})();
