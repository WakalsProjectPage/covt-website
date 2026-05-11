/* Snappy cursor follower + minor add-ons for the CoVT redesign. */
(function () {
  'use strict';
  if (!document.body.classList.contains('redesign')) return;

  const mark = document.createElement('div');
  mark.className = 'cursor-mark';
  document.body.appendChild(mark);

  let mx = 0, my = 0, tx = 0, ty = 0;
  document.addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!mark.classList.contains('is-visible')) mark.classList.add('is-visible');
  }, { passive: true });
  document.addEventListener('pointerleave', () => mark.classList.remove('is-visible'));

  (function loop() {
    mx += (tx - mx) * 0.5;
    my += (ty - my) * 0.5;
    mark.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
    requestAnimationFrame(loop);
  })();

  const matchClass = (el) => {
    if (!el || !el.closest) return '';
    if (el.closest('.teaser-figure, .method-visual, .variant-visual, .compare-container, .single-visual, .results-stage')) return 'on-img';
    if (el.closest('.exp-card, .method-experience, .anchor-lab, .single-lab, .results-module')) return 'on-card';
    if (el.closest('a, button, .chip, .method-node')) return 'on-link';
    return '';
  };
  document.addEventListener('pointerover', (e) => {
    const cls = matchClass(e.target);
    mark.classList.remove('on-link', 'on-card', 'on-img');
    if (cls) mark.classList.add(cls);
  });
})();
