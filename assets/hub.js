// Sinciety hub: product portals (lazy media, stacked pin), text choreography.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = innerWidth <= 760;
  const header = document.querySelector('header.site');
  const onScroll = () => header && header.classList.toggle('solid', scrollY > innerHeight * 0.5);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- split text ----------
  document.querySelectorAll('[data-chars]').forEach((el) => { el.innerHTML = [...el.textContent].map((c) => `<span class="ch">${c}</span>`).join(''); });
  document.querySelectorAll('[data-words]').forEach((el) => { el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w"><span>${w}</span></span>`).join(' '); });
  document.querySelectorAll('[data-scrub-words]').forEach((el) => { el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="sw">${w}</span>`).join(' '); });

  // ---------- hero montage of every world (desktop) ----------
  const reel = document.querySelector('.h-reel video');
  if (reel && !reduced && !mobile) {
    reel.src = reel.dataset.src;
    reel.addEventListener('playing', () => reel.classList.add('on'), { once: true });
    new IntersectionObserver(([e]) => { e.isIntersecting ? reel.play().catch(() => {}) : reel.pause(); }).observe(reel);
  }

  // ---------- product portals: media loads near view, plays only while visible ----------
  const webm = document.createElement('video').canPlayType('video/webm; codecs="vp9"');
  document.querySelectorAll('.h-panel').forEach((panel) => {
    const v = panel.querySelector('video'), cv = panel.querySelector('.census-canvas');
    if (cv && window.startCensusFx) window.startCensusFx(cv, { density: 0.9 });
    if (!v || reduced) return;
    const src = v.dataset.src || ((mobile ? v.dataset.mobile : v.dataset.desktop) + (webm ? '.webm' : '.mp4'));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          if (!v.src) v.src = src;
          v.play().then(() => panel.classList.add('playing')).catch(() => {});
        } else v.pause();
      }, { rootMargin: '200px 0px', threshold: 0.01 }).observe(panel);
    }
  });

  const G = window.gsap, ST = window.ScrollTrigger;
  if (reduced || !G || !ST) { document.documentElement.classList.add('no-motion'); return; }
  G.registerPlugin(ST);
  if (window.__lenis) window.__lenis.on('scroll', ST.update);

  // ---------- hero entrance (after the intro overlay, if it plays) ----------
  const delay = window.SINCIETY_INTRO ? 1.9 : 0.2;
  G.timeline({ delay, defaults: { ease: 'expo.out' } })
    .from('.h-hero .u-brand .ch', { yPercent: 110, rotateX: -80, opacity: 0, stagger: 0.06, duration: 1.4, clearProps: 'transform,opacity', onComplete: () => document.querySelectorAll('.u-brand').forEach((b) => b.classList.add('forged')) }, 0)
    .from('.h-hero .u-kicker', { opacity: 0, y: 16, letterSpacing: '0.8em', duration: 1.3 }, 0.2)
    .from('.h-tag .w > span', { yPercent: 110, stagger: 0.08, duration: 1.1 }, 0.5)
    .from('.h-hero .u-statement', { opacity: 0, y: 24, duration: 1.1 }, 0.7)
    .from('.h-hero .actions > *', { opacity: 0, y: 20, stagger: 0.1, duration: 1 }, 0.85)
    .from('.h-quick a', { opacity: 0, y: 24, stagger: 0.1, duration: 1 }, 1.0);
  G.to('.h-hero .wrap:first-child', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.h-hero', start: 'top top', end: 'bottom top', scrub: true } });

  // ---------- portals stack: each panel pins, the next slides over it ----------
  const panels = G.utils.toArray('.h-panel');
  panels.forEach((p, i) => {
    const copy = p.querySelector('.h-panel-copy');
    G.from(copy.children, { y: 60, opacity: 0, stagger: 0.08, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 60%' } });
    G.fromTo(p.querySelector('.h-media'), { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'top top', scrub: true } });
    if (i < panels.length - 1) {
      ST.create({ trigger: p, start: 'top top', end: 'bottom top', pin: true, pinSpacing: false });
      G.to(p, { scale: 0.9, opacity: 0.35, borderRadius: 28, ease: 'none', scrollTrigger: { trigger: panels[i + 1], start: 'top bottom', end: 'top top', scrub: true } });
    }
  });

  // ---------- shared section motion ----------
  document.querySelectorAll('.u-energy').forEach((line) => G.to(line, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: line.parentElement, start: 'top 95%', end: 'top 30%', scrub: true } }));
  document.querySelectorAll('.u-title').forEach((t) => G.from(t.querySelectorAll('.w > span'), { yPercent: 115, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: t, start: 'top 85%' } }));
  G.utils.toArray('.u-eyebrow, .u-lede').forEach((el) => G.from(el, { opacity: 0, y: 24, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
  G.fromTo('.u-vision-bg', { yPercent: -10, scale: 1.12 }, { yPercent: 10, scale: 1, ease: 'none', scrollTrigger: { trigger: '.u-vision', start: 'top bottom', end: 'bottom top', scrub: true } });
  G.to('.u-vision-line .sw', { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '.u-vision-line', start: 'top 75%', end: 'bottom 40%', scrub: true } });
  G.from('.u-pillar', { y: 50, opacity: 0, stagger: 0.12, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.u-pillars', start: 'top 85%' } });
  G.from('.u-join-card', { y: 60, opacity: 0, rotateX: -12, transformPerspective: 900, stagger: 0.1, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.u-join', start: 'top 88%' } });
  G.fromTo('.u-footer-mark', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.u-footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  addEventListener('load', () => ST.refresh());
})();
