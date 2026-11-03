// Sinciety home: cinematic choreography (GSAP + ScrollTrigger), hero video, explosion-synced lighting, embers, HUD.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const mobile = () => innerWidth <= 760;
  const hero = document.querySelector('.u-hero');
  const video = document.querySelector('.u-video');
  const header = document.querySelector('header.site');
  if (reduced) root.classList.add('no-motion');

  // ---------- header solidifies after the hero ----------
  const onScrollHeader = () => header && header.classList.toggle('solid', scrollY > innerHeight * 0.6);
  addEventListener('scroll', onScrollHeader, { passive: true }); onScrollHeader();

  // ---------- hero video: right size for the screen, only when it can play ----------
  let heroVisible = true;
  function loadVideo() {
    if (!video || reduced) return;
    const m = mobile(), webm = video.canPlayType('video/webm; codecs="vp9"');
    const src = webm ? (m ? video.dataset.srcMobileWebm : video.dataset.srcDesktopWebm) : (m ? video.dataset.srcMobile : video.dataset.srcDesktop);
    video.src = src; video.preload = 'auto';
    video.addEventListener('playing', () => video.classList.add('ready'), { once: true });
    video.play().catch(() => {});
  }
  if (document.readyState === 'complete') loadVideo(); else addEventListener('load', loadVideo, { once: true });
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(([e]) => {
      heroVisible = e.isIntersecting;
      if (!video || !video.src) return;
      if (heroVisible && !document.hidden) video.play().catch(() => {}); else video.pause();
    }, { threshold: 0.02 }).observe(hero);
  }
  document.addEventListener('visibilitychange', () => { if (video && video.src) { if (document.hidden) video.pause(); else if (heroVisible) video.play().catch(() => {}); } });

  // ---------- explosion sync: the rendered loop's event times (seconds in a 16 s loop) ----------
  const LOOP = 16;
  const BIG = [2.1, 6.6, 10.9, 14.2];
  const HITS = [0.01, 1.46, 2.62, 3.89, 4.75, 5.86, 6.95, 8.04, 9.55, 10.78, 11.68, 12.79, 14.14, 14.94];
  let lastT = 0;
  function flashAt(t) {
    let f = 0;
    for (const b of BIG) { const a = ((t - b) % LOOP + LOOP) % LOOP; if (a < 1.4) f = Math.max(f, Math.pow(1 - a / 1.4, 2)); }
    for (const h of HITS) { const a = ((t - h) % LOOP + LOOP) % LOOP; if (a < 0.4) f = Math.max(f, 0.35 * (1 - a / 0.4)); }
    return f;
  }

  // ---------- HUD ----------
  const clock = document.querySelector('.hud-clock'), rift = document.querySelector('.hud-rift'), threat = document.querySelector('.hud-threat');
  const t0 = performance.now();
  let hudTick = 0;

  // ---------- embers (2D canvas, cheap; only while the hero is on screen) ----------
  const cv = document.querySelector('.u-embers');
  const ctx = cv && !reduced ? cv.getContext('2d') : null;
  let parts = [], W = 0, H = 0, dpr = 1;
  function sizeEmbers() {
    if (!ctx) return;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = mobile() ? 45 : 110;
    parts = Array.from({ length: n }, () => spawn(true));
  }
  function spawn(any) {
    return { x: Math.random() * W, y: any ? Math.random() * H : H + 10, vx: (Math.random() - 0.3) * 0.5, vy: -(0.4 + Math.random() * 1.3),
      r: 0.6 + Math.random() * 1.9, life: 0, max: 200 + Math.random() * 300, hue: Math.random() < 0.82 ? 22 + Math.random() * 18 : 195, tw: Math.random() * 6 };
  }
  addEventListener('resize', sizeEmbers); sizeEmbers();

  // ---------- one loop for all per-frame hero work ----------
  let px = 0, py = 0;
  addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });
  function frame(now) {
    if (heroVisible && !document.hidden) {
      // explosions -> interface light + sound
      if (video && video.src && !video.paused) {
        const t = video.currentTime % LOOP;
        const f = flashAt(t);
        root.style.setProperty('--flash', f.toFixed(3));
        for (const b of BIG) { if ((lastT < b && t >= b) || (lastT > t && b < t)) dispatchEvent(new CustomEvent('sinciety:blast')); }
        lastT = t;
      }
      // HUD every ~10 frames
      if (++hudTick % 10 === 0 && clock) {
        const s = Math.floor((now - t0) / 1000);
        clock.textContent = [s / 3600, (s / 60) % 60, s % 60].map((v) => String(Math.floor(v)).padStart(2, '0')).join(':');
        const fl = parseFloat(root.style.getPropertyValue('--flash')) || 0;
        rift.textContent = (96.2 + Math.random() * 2.4 + fl * 1.2).toFixed(1) + '%';
        threat.textContent = fl > 0.5 ? 'CRITICAL' : 'EXTREME';
      }
      // embers drift with a little pointer parallax
      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        const fl = parseFloat(root.style.getPropertyValue('--flash')) || 0;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.life++; p.x += p.vx + Math.sin((p.life + p.tw * 50) * 0.02) * 0.35 - px * 0.6; p.y += p.vy * (1 + fl * 1.5);
          if (p.y < -10 || p.life > p.max) { parts[i] = spawn(false); continue; }
          const a = Math.sin(Math.PI * Math.min(1, p.life / p.max)) * (0.55 + fl * 0.45);
          ctx.fillStyle = `hsla(${p.hue}, 100%, ${p.hue > 100 ? 75 : 62}%, ${a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + fl * 0.6), 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- text splitting ----------
  document.querySelectorAll('[data-chars]').forEach((el) => {
    el.innerHTML = [...el.textContent].map((c) => `<span class="ch">${c}</span>`).join('');
  });
  document.querySelectorAll('[data-words]').forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w"><span>${w}</span></span>`).join(' ');
  });
  document.querySelectorAll('[data-scrub-words]').forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="sw">${w}</span>`).join(' ');
  });

  // stat bars + project cards light up when visible (works with or without GSAP)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('lit'); io.unobserve(e.target); } }), { threshold: 0.35 });
    document.querySelectorAll('.u-hero-card').forEach((c) => io.observe(c));
  } else document.querySelectorAll('.u-hero-card').forEach((c) => c.classList.add('lit'));

  // project cards: preview video on hover (desktop only, loads on first hover)
  if (fine && !reduced) document.querySelectorAll('.u-project').forEach((card) => {
    const v = card.querySelector('video[data-lazy-src]');
    if (!v) return;
    card.addEventListener('pointerenter', () => { if (!v.src) v.src = v.dataset.lazySrc; v.play().then(() => card.classList.add('playing')).catch(() => {}); });
    card.addEventListener('pointerleave', () => { card.classList.remove('playing'); v.pause(); });
  });

  const G = window.gsap, ST = window.ScrollTrigger;
  if (reduced || !G || !ST) { document.querySelectorAll('.u-hero-card').forEach((c) => c.classList.add('lit')); return; }
  G.registerPlugin(ST);
  if (window.__lenis) window.__lenis.on('scroll', ST.update);

  // ---------- intro: letterbox opens, title forges in ----------
  const bars = document.querySelectorAll('.u-bars i');
  const intro = G.timeline({ defaults: { ease: 'expo.out' } });
  G.set(bars, { scaleY: 6 });
  intro
    .to(bars, { scaleY: 1, duration: 1.8, ease: 'expo.inOut' }, 0.15)
    .from('.u-poster img', { scale: 1.18, duration: 3.2, ease: 'power2.out' }, 0)
    .from('.u-brand .ch', { yPercent: 110, rotateX: -80, opacity: 0, stagger: 0.06, duration: 1.4, clearProps: 'transform,opacity', onComplete: () => document.querySelectorAll('.u-brand').forEach((b) => b.classList.add('forged')) }, 0.7)
    .from('.u-kicker', { opacity: 0, y: 18, letterSpacing: '0.8em', duration: 1.4 }, 1.0)
    .from('.u-brand-sub', { opacity: 0, letterSpacing: '1.4em', duration: 1.6 }, 1.2)
    .from('.u-statement', { opacity: 0, y: 26, duration: 1.2 }, 1.25)
    .from('.u-hero-copy .actions > *', { opacity: 0, y: 22, stagger: 0.1, duration: 1 }, 1.4)
    .from('.u-hud > span', { opacity: 0, duration: 1.2, stagger: 0.12, ease: 'power1.out' }, 1.5)
    .from('.u-scroll', { opacity: 0, y: -10, duration: 1 }, 1.9);

  // ---------- hero exit: camera pushes in, copy lifts away ----------
  G.timeline({ scrollTrigger: { trigger: '.u-hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.u-stage', { scale: 1.14, yPercent: 8, ease: 'none' }, 0)
    .to('.u-hero-copy', { yPercent: -28, opacity: 0, ease: 'none' }, 0)
    .to('.u-hud', { opacity: 0, ease: 'none' }, 0)
    .to('.u-bars i', { scaleY: 2.2, ease: 'none' }, 0);

  // pointer parallax on the hero copy (desktop)
  if (fine) {
    const qx = G.quickTo('.u-hero-copy', 'x', { duration: 1.2, ease: 'power3' }), qy = G.quickTo('.u-hero-copy', 'y', { duration: 1.2, ease: 'power3' });
    const sx = G.quickTo('.u-poster, .u-video', 'x', { duration: 1.6, ease: 'power3' });
    addEventListener('pointermove', () => { qx(-px * 18); qy(-py * 12); sx(px * 24); });
  }

  // ---------- section language ----------
  document.querySelectorAll('.u-energy').forEach((line) => {
    G.to(line, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: line.parentElement, start: 'top 95%', end: 'top 30%', scrub: true } });
  });
  document.querySelectorAll('.u-title').forEach((t) => {
    G.from(t.querySelectorAll('.w > span'), { yPercent: 115, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: t, start: 'top 85%' } });
  });
  G.utils.toArray('.u-eyebrow, .u-lede, .u-note').forEach((el) => {
    G.from(el, { opacity: 0, y: 24, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // ---------- universe: pinned horizontal roster on desktop ----------
  const mm = G.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const roster = document.querySelector('[data-roster]'), track = roster.querySelector('.u-track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: roster, start: 'center center', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 } });
    // inner image parallax as cards slide across
    G.utils.toArray('.u-hero-card').forEach((card) => {
      G.fromTo(card.querySelector('.u-art img'), { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      G.from(card, { rotateY: -18, z: -120, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 105%', end: 'left 60%', scrub: true } });
    });
  });
  mm.add('(max-width: 899px)', () => {
    G.from('.u-hero-card', { y: 60, opacity: 0, stagger: 0.1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.u-roster', start: 'top 85%' } });
  });

  // ---------- projects ----------
  G.utils.toArray('.u-project').forEach((p, i) => {
    G.fromTo(p, { clipPath: 'inset(18% 8% 18% 8% round 24px)', y: 60 }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', y: 0, ease: 'power2.out', scrollTrigger: { trigger: p, start: 'top 92%', end: 'top 45%', scrub: 0.8 } });
    G.from(p.querySelector('.u-project-media img'), { scale: 1.3, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  if (document.querySelector('.u-trailer')) G.from('.u-trailer .cinema', { y: 80, scale: 0.92, opacity: 0, ease: 'power2.out', scrollTrigger: { trigger: '.u-trailer', start: 'top 90%', end: 'top 45%', scrub: 0.8 } });

  // ---------- vision: parallax world + words light up as you read ----------
  G.fromTo('.u-vision-bg', { yPercent: -10, scale: 1.12 }, { yPercent: 10, scale: 1, ease: 'none', scrollTrigger: { trigger: '.u-vision', start: 'top bottom', end: 'bottom top', scrub: true } });
  G.to('.u-vision-line .sw', { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '.u-vision-line', start: 'top 75%', end: 'bottom 40%', scrub: true } });
  G.from('.u-pillar', { y: 50, opacity: 0, stagger: 0.12, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.u-pillars', start: 'top 85%' } });

  // ---------- community + footer ----------
  G.from('.u-join-card', { y: 60, opacity: 0, rotateX: -12, transformPerspective: 900, stagger: 0.1, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.u-join', start: 'top 88%' } });
  G.fromTo('.u-footer-mark', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.u-footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  addEventListener('load', () => ST.refresh());
})();
