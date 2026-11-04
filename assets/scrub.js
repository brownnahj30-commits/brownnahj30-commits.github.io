// Standalone scroll-scrub for .u-saga[data-scrub] sections (pages without GSAP): sticky stage, video follows scroll, chapters by time.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.u-saga[data-scrub]').forEach((saga) => {
    const v = saga.querySelector('.u-saga-video'), chapters = [...saga.querySelectorAll('.u-saga-chapters li')], meter = saga.querySelector('.u-saga-meter i');
    const DUR = +saga.dataset.scrub, phone = innerWidth <= 760, screens = phone ? 5 : 6;
    saga.classList.add('live', 'sticky'); saga.style.height = `calc(${screens + 1} * 100svh)`;
    let loaded = false, target = 0, cur = 0, shown = -1, active = -1;
    const load = () => {
      if (loaded) return; loaded = true;
      fetch(phone ? v.dataset.mobile : v.dataset.desktop).then((r) => r.blob()).then((b) => {
        v.src = URL.createObjectURL(b); v.addEventListener('loadeddata', () => saga.classList.add('ready'), { once: true }); v.load();
      }).catch(() => {});
    };
    new IntersectionObserver(([e]) => { if (e.isIntersecting) load(); }, { rootMargin: '150% 0px' }).observe(saga);
    const update = () => {
      const r = saga.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      target = p * (DUR - 0.05); if (meter) meter.style.transform = `scaleX(${p})`;
      let i = 0; chapters.forEach((c, k) => { if (target >= +c.dataset.at) i = k; });
      if (i !== active) { chapters.forEach((c, k) => c.classList.toggle('on', k === i)); active = i; }
    };
    addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
    const tick = () => { cur += (target - cur) * 0.18; if (v.readyState >= 2 && !v.seeking && Math.abs(cur - shown) > 1 / 48) { v.currentTime = cur; shown = cur; } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
})();
