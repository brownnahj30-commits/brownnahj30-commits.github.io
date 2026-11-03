// Shared interactions: layered parallax, 3D tilt cards, scroll reveal, pointer spotlight.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  document.documentElement.classList.add('js');

  // Reveal on scroll (content is visible by default without JS).
  const io = 'IntersectionObserver' in window && new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.setProperty('--d', `${(i % 4) * 70}ms`);
    io ? io.observe(el) : el.classList.add('in');
  });
  if (reduced) document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  if (reduced) return;

  // Layered parallax: [data-depth] moves with scroll and pointer by its depth.
  const layers = [...document.querySelectorAll('[data-depth]')];
  let px = 0, py = 0, ex = 0, ey = 0;
  addEventListener('pointermove', (e) => {
    px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5;
    document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
    document.documentElement.style.setProperty('--my', `${e.clientY}px`);
  }, { passive: true });
  function loop() {
    ex += (px - ex) * 0.08; ey += (py - ey) * 0.08;
    for (const el of layers) {
      const d = parseFloat(el.dataset.depth);
      el.style.transform = `translate3d(${ex * d * 60}px, ${ey * d * 40 - scrollY * d * 0.35}px, 0)`;
    }
    requestAnimationFrame(loop);
  }
  if (layers.length) loop();

  // 3D tilt: [data-tilt] cards rotate toward the pointer, with a moving glare.
  if (fine) document.querySelectorAll('[data-tilt]').forEach((card) => {
    const max = parseFloat(card.dataset.tilt) || 10;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateZ(0)`;
      card.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
      card.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  // Scene tilt: a whole 3D object (e.g. the phone) follows the pointer.
  document.querySelectorAll('[data-scene]').forEach((sc) => {
    const max = parseFloat(sc.dataset.scene) || 18;
    let sx = 0, sy = 0;
    (function spin() {
      sx += (px * max - sx) * 0.06; sy += (py * max - sy) * 0.06;
      sc.style.transform = `rotateY(${sx - 14}deg) rotateX(${-sy + 6}deg)`;
      requestAnimationFrame(spin);
    })();
  });
})();
