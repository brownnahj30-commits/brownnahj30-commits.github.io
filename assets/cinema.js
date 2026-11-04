/* Sinciety cinema layer: movie-style page transitions, cursor light trail, film grain, scroll progress beam.
   Include on any page: <script src="/assets/cinema.js" defer></script>. <body data-cine="lite"> = transitions only.
   Respects prefers-reduced-motion (everything off except instant navigation). */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const lite = document.body.dataset.cine === 'lite';
  const css = `
  .cine-veil{position:fixed;inset:0;z-index:2147483000;pointer-events:none}
  .cine-veil i{position:absolute;left:0;right:0;height:50.5vh;background:#000;transition:transform .55s cubic-bezier(.7,0,.25,1)}
  .cine-veil i:first-child{top:0;transform:translateY(-100%)}.cine-veil i:nth-child(2){bottom:0;transform:translateY(100%)}
  .cine-veil b{position:absolute;left:-30%;top:50%;width:160%;height:2px;margin-top:-1px;background:linear-gradient(90deg,transparent,#7fe9ff,#fff,#ff7ad9,transparent);
    box-shadow:0 0 24px #9d6bff,0 0 60px #7fe9ff;opacity:0;transform:scaleX(0);transition:transform .45s cubic-bezier(.2,.7,.2,1),opacity .3s}
  .cine-veil.closed i{transform:none}.cine-veil.closed b{opacity:1;transform:scaleX(1)}
  .cine-veil.opening i{transition-duration:.75s}
  .cine-grain{position:fixed;inset:-50%;z-index:2147482000;pointer-events:none;opacity:.055;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    animation:cine-grain .9s steps(6) infinite}
  @keyframes cine-grain{0%{transform:translate(0,0)}20%{transform:translate(-6%,4%)}40%{transform:translate(5%,-7%)}60%{transform:translate(-3%,8%)}80%{transform:translate(7%,2%)}100%{transform:translate(0,0)}}
  .cine-vignette{position:fixed;inset:0;z-index:2147481999;pointer-events:none;background:radial-gradient(120% 90% at 50% 50%,transparent 62%,rgba(0,0,0,.42) 100%)}
  .cine-trail{position:fixed;inset:0;z-index:2147481998;pointer-events:none}
  .cine-progress{position:fixed;left:0;top:0;height:2px;width:100%;z-index:2147482500;pointer-events:none;transform-origin:left;transform:scaleX(0);
    background:linear-gradient(90deg,#9d6bff,#7fe9ff,#ff7ad9);box-shadow:0 0 12px #7fe9ff}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // ---------- transitions ----------
  const veil = document.createElement('div'); veil.className = 'cine-veil'; veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = '<i></i><i></i><b></b>'; document.body.appendChild(veil);
  let arrived = false;
  try { arrived = sessionStorage.getItem('cine-nav') === '1'; sessionStorage.removeItem('cine-nav'); } catch { /* storage blocked */ }
  if (arrived && !reduced) {                       // we came here through a transition: open the curtain
    veil.classList.add('closed');
    requestAnimationFrame(() => requestAnimationFrame(() => { veil.classList.add('opening'); veil.classList.remove('closed'); setTimeout(() => veil.classList.remove('opening'), 800); }));
  }
  document.addEventListener('click', (e) => {
    if (reduced || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;   // external or same-page anchor
    if (!/^https?:$/.test(url.protocol)) return;
    e.preventDefault();
    try { sessionStorage.setItem('cine-nav', '1'); } catch { /* ignore */ }
    if (window.SincietySound && window.SincietySound.isOn && window.SincietySound.isOn()) window.SincietySound.whoosh();
    veil.classList.add('closed');
    setTimeout(() => { location.href = url.href; }, 520);
  });
  addEventListener('pageshow', (e) => { if (e.persisted) veil.classList.remove('closed'); });   // back button from bfcache
  if (reduced || lite) return;

  // ---------- grain, vignette, progress beam ----------
  for (const cls of ['cine-grain', 'cine-vignette', 'cine-progress']) { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d); }
  const bar = document.querySelector('.cine-progress');
  const onScroll = () => { const max = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`; };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- cursor light trail (desktop) ----------
  if (!fine) return;
  const cv = document.createElement('canvas'); cv.className = 'cine-trail'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
  const ctx = cv.getContext('2d'); let W = 0, H = 0; const dpr = Math.min(devicePixelRatio || 1, 2);
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const parts = []; let lx = null, ly = null, hue = 260, idle = 0;
  addEventListener('pointermove', (e) => {
    const x = e.clientX, y = e.clientY;
    if (lx !== null) { const d = Math.hypot(x - lx, y - ly), n = Math.min(6, Math.floor(d / 6)); for (let i = 0; i < n; i++) parts.push({ x: lx + (x - lx) * (i / n), y: ly + (y - ly) * (i / n), life: 1, h: hue, r: 1.5 + Math.random() * 2.5 }); }
    lx = x; ly = y; hue = (hue + 1.2) % 360; idle = 0;
  }, { passive: true });
  (function loop() {
    idle++;
    if (parts.length || idle < 5) {
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= 0.035; if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.fillStyle = `hsla(${p.h},100%,70%,${p.life * 0.55})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + p.life), 0, 6.283); ctx.fill();
      }
      if (parts.length > 260) parts.splice(0, parts.length - 260);
    }
    requestAnimationFrame(loop);
  })();
})();
