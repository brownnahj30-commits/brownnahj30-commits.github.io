// DCUO Codex "The Census Scan": scroll drives a scan of the player globe, a lock-on, a dive, and an example inspection card.
(() => {
  const root = document.querySelector('.cx'); if (!root) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { root.classList.add('still'); return; }
  const cv = root.querySelector('canvas'), ctx = cv.getContext('2d'), card = root.querySelector('.cx-card'), caps = [...root.querySelectorAll('.cx-caps li')], meter = root.querySelector('.cx-meter i');
  const bars = [...root.querySelectorAll('.cx-bar i')], nums = [...root.querySelectorAll('[data-to]')];
  let W, H, dpr, R, pts = [], target = 0, cur = 0, raf = 0, on = false;
  const small = () => innerWidth < 760;
  const sm = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  const build = () => { const n = small() ? 700 : 1500, ga = Math.PI * (3 - Math.sqrt(5)); pts = [];
    for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i; pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, hot: (i * 7919) % 13 === 0, d: ((i * 2654435761) % 1000) / 1000 }); } };
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 1.5); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); R = Math.min(W, H) * 0.34; build(); };
  const TARGET = 211;     // the point we lock onto
  const draw = (p) => {
    ctx.clearRect(0, 0, W, H);
    const scanK = sm(0.12, 0.4, p), lockK = sm(0.4, 0.5, p), dive = sm(0.5, 0.68, p), cardK = sm(0.62, 0.72, p);
    // rotation eases to bring the target point to face the camera at lock-on
    const tp = pts[TARGET], baseRot = p * 3.2, faceRot = Math.atan2(tp.x, tp.z);
    const rotY = baseRot * (1 - lockK) + (-faceRot) * lockK, rotX = -0.3 * (1 - lockK) + Math.asin(tp.y) * 0.9 * lockK;
    const cy_ = Math.cos(rotY), sy_ = Math.sin(rotY), cx_ = Math.cos(rotX), sx_ = Math.sin(rotX);
    const zoom = 1 + dive * 9, cx = W * (small() ? 0.5 : 0.5), cy = H * (small() ? 0.42 : 0.5);
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.8); g.addColorStop(0, `rgba(255,190,80,${0.08 + lockK * 0.1})`); g.addColorStop(0.5, 'rgba(60,120,255,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const scan = -1 + 2 * ((scanK * 2.5) % 1);
    let tsx = cx, tsy = cy;
    pts.forEach((q, i) => {
      let x = q.x * cy_ + q.z * sy_, z = -q.x * sy_ + q.z * cy_, y = q.y; const y2 = y * cx_ - z * sx_; z = y * sx_ + z * cx_; y = y2;
      const s = 1 / (1.9 - z * 0.6), sx = cx + x * R * s * 1.4 * zoom, sy = cy + y * R * s * 1.4 * zoom;
      if (i === TARGET) { tsx = sx; tsy = sy; }
      const depth = (z + 1) / 2, lit = scanK > 0 && scanK < 1 ? Math.max(0, 1 - Math.abs(q.y - scan) * 9) : 0;
      let a = (0.1 + depth * 0.55 + lit * 0.9) * (1 - dive * 0.85), r = (0.6 + depth * 1.3) * (1 + lit * 0.8) * (1 + dive * 2);
      if (i === TARGET) { a = 1; r = 3 + lockK * 4; }
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20 || a < 0.02) return;
      ctx.fillStyle = i === TARGET ? '#ffd27a' : q.hot || lit > 0.3 ? `rgba(255,210,120,${a})` : `rgba(130,175,255,${a})`;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.283); ctx.fill();
    });
    // scanner ring
    if (scanK > 0 && scanK < 1) { const half = Math.sqrt(Math.max(0, 1 - scan * scan)) * R * 1.32, yy = cy + scan * R * 1.25;
      ctx.strokeStyle = 'rgba(255,214,120,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, yy, half, half * 0.18, 0, 0, 6.283); ctx.stroke(); }
    // lock-on reticle
    if (lockK > 0) { const rr = 60 - lockK * 34 + dive * 120, al = lockK * (1 - dive);
      ctx.strokeStyle = `rgba(255,214,120,${al})`; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const a0 = k * Math.PI / 2 + 0.3 + (1 - lockK) * 2; ctx.beginPath(); ctx.arc(tsx, tsy, rr, a0, a0 + 0.9); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(tsx - rr - 14, tsy); ctx.lineTo(tsx - rr + 6, tsy); ctx.moveTo(tsx + rr - 6, tsy); ctx.lineTo(tsx + rr + 14, tsy); ctx.stroke(); }
    // white-gold flash as we dive into the record
    if (dive > 0 && dive < 1) { ctx.fillStyle = `rgba(255,236,200,${Math.sin(dive * Math.PI) * 0.35})`; ctx.fillRect(0, 0, W, H); }
    // the card
    card.style.opacity = cardK; card.style.transform = `translate(-50%, -50%) perspective(900px) rotateX(${(1 - cardK) * 25}deg) scale(${0.85 + cardK * 0.15})`;
    const fill = sm(0.7, 0.86, p);
    bars.forEach((b, i) => { b.style.transform = `scaleX(${fill * +b.dataset.v})`; });
    nums.forEach((n) => { n.textContent = Math.round(+n.dataset.to * fill).toLocaleString(); });
    root.querySelector('.cx-src').style.opacity = sm(0.86, 0.92, p);
  };
  const progress = () => { const r = root.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); };
  let active = -1;
  const update = () => { target = progress(); meter.style.transform = `scaleX(${target})`;
    const i = target < 0.12 ? 0 : target < 0.4 ? 1 : target < 0.6 ? 2 : target < 0.86 ? 3 : 4;
    if (i !== active) { caps.forEach((c, k) => c.classList.toggle('on', k === i)); active = i; } };
  const loop = () => { cur += (target - cur) * 0.15; draw(cur); raf = on ? requestAnimationFrame(loop) : 0; };
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(loop); }).observe(root);
  addEventListener('scroll', update, { passive: true }); addEventListener('resize', () => { size(); update(); });
  size(); update(); cur = target; draw(cur);
})();
