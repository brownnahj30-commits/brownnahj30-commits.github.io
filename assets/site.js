// Shared interactions: cinematic intro, smooth scroll, scroll-pinned story chapters,
// text decode, layered parallax, 3D tilt cards, magnetic buttons, glow cursor, reveals.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const root = document.documentElement;
  root.classList.add('js');

  // ---------- Text decode ("hacker" scramble into the real text) ----------
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
  function decode(el, dur = 900) {
    if (reduced || el.dataset.decoded) return;
    el.dataset.decoded = '1';
    dispatchEvent(new CustomEvent('sinciety:decode'));
    const final = el.textContent;
    const start = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const n = Math.floor(final.length * p);
      let out = final.slice(0, n);
      for (let i = n; i < final.length; i++) out += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step); else el.textContent = final;
    })(start);
  }

  // ---------- Cinematic intro (home page, once per browser session) ----------
  const intro = document.getElementById('intro');
  let seen = false;
  try { seen = sessionStorage.getItem('sinciety-intro') === '1'; } catch { /* storage blocked */ }
  window.SINCIETY_INTRO = !!intro && !seen && !reduced;
  if (intro) {
    if (!window.SINCIETY_INTRO) intro.remove();
    else {
      try { sessionStorage.setItem('sinciety-intro', '1'); } catch { /* ignore */ }
      root.classList.add('intro-on');
      const word = intro.querySelector('.intro-word');
      const finish = () => {
        if (intro.classList.contains('done')) return;
        intro.classList.add('done');
        root.classList.remove('intro-on');
        setTimeout(() => intro.remove(), 1100);
      };
      requestAnimationFrame(() => intro.classList.add('play'));
      setTimeout(() => decode(word, 1100), 250);
      setTimeout(finish, 2300);
      intro.addEventListener('click', finish);
      addEventListener('keydown', finish, { once: true });
    }
  }

  // ---------- Reveal on scroll (content is visible by default without JS) ----------
  const io = 'IntersectionObserver' in window && new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      e.target.querySelectorAll('.eyebrow').forEach((x) => decode(x));
      if (e.target.classList.contains('eyebrow')) decode(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.setProperty('--d', `${(i % 4) * 70}ms`);
    io ? io.observe(el) : el.classList.add('in');
  });
  if (reduced) { document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in')); }

  // ---------- Story chapters: pinned section, chapter follows scroll ----------
  const story = document.querySelector('.story');
  if (story) {
    const chapters = [...story.querySelectorAll('.chapter')];
    const dots = [...story.querySelectorAll('.story-dots i')];
    const bar = story.querySelector('.story-bar b');
    let current = -1;
    const setChapter = (idx, colourIdx) => {
      if (idx === current) return;
      current = idx;
      chapters.forEach((c, i) => c.classList.toggle('on', i === idx));
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
      dispatchEvent(new CustomEvent('sinciety:chapter', { detail: { index: colourIdx } }));
    };
    const onScroll = () => {
      const r = story.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / total));
      if (bar) bar.style.transform = `scaleX(${p})`;
      const idx = Math.min(chapters.length - 1, Math.floor(p * chapters.length));
      const inside = r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5;
      setChapter(idx, inside ? idx + 1 : 0);
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- Trailer player: silent preview loop in view; click to watch with sound ----------
  document.querySelectorAll('.cinema').forEach((box) => {
    const v = box.querySelector('video'), play = box.querySelector('.cinema-play');
    if (!v) return;
    let full = false;
    if (!reduced && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        if (full) return;
        if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
      }, { threshold: 0.35 }).observe(box);
    }
    const duck = (d) => dispatchEvent(new CustomEvent('sinciety:duck', { detail: d }));
    play && play.addEventListener('click', () => {
      full = true; box.classList.add('playing');
      v.muted = false; v.loop = false; v.controls = true; v.currentTime = 0;
      v.play().catch(() => {});
    });
    v.addEventListener('play', () => { if (!v.muted) duck(true); });
    v.addEventListener('volumechange', () => duck(!v.muted && !v.paused));
    v.addEventListener('pause', () => duck(false));
    v.addEventListener('ended', () => { duck(false); full = false; box.classList.remove('playing'); v.controls = false; v.muted = true; v.loop = true; v.play().catch(() => {}); });
  });

  if (reduced) return;

  // ---------- Smooth scrolling ----------
  if (window.Lenis) {
    const lenis = new window.Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4) });
    window.__lenis = lenis;
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -70 }); }
    }));
  }

  // ---------- Layered parallax: [data-depth] moves with scroll and pointer ----------
  const layers = [...document.querySelectorAll('[data-depth]')];
  let px = 0, py = 0, ex = 0, ey = 0, cx = innerWidth / 2, cy = innerHeight / 2;
  addEventListener('pointermove', (e) => {
    px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5;
    cx = e.clientX; cy = e.clientY;
    root.style.setProperty('--mx', `${e.clientX}px`);
    root.style.setProperty('--my', `${e.clientY}px`);
  }, { passive: true });

  // ---------- Glow cursor (fine pointers only; native cursor stays) ----------
  let ring = null, rx = cx, ry = cy;
  if (fine) {
    ring = document.createElement('div'); ring.className = 'cursor-ring'; ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.addEventListener('pointerover', (e) => ring.classList.toggle('hot', !!e.target.closest('a,button,[data-tilt]')));
    document.addEventListener('pointerdown', () => ring.classList.add('press'));
    document.addEventListener('pointerup', () => ring.classList.remove('press'));
  }

  function loop() {
    ex += (px - ex) * 0.08; ey += (py - ey) * 0.08;
    for (const el of layers) {
      const d = parseFloat(el.dataset.depth);
      el.style.transform = `translate3d(${ex * d * 60}px, ${ey * d * 40 - scrollY * d * 0.35}px, 0)`;
    }
    if (ring) {
      rx += (cx - rx) * 0.18; ry += (cy - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    }
    requestAnimationFrame(loop);
  }
  loop();

  if (!fine) return;

  // ---------- Magnetic buttons ----------
  document.querySelectorAll('.btn').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      b.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  // ---------- 3D tilt cards with moving glare ----------
  document.querySelectorAll('[data-tilt]').forEach((card) => {
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

  // ---------- Scene tilt: a whole 3D object (e.g. the phone) follows the pointer ----------
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
