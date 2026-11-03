// Census visual: a rotating globe of data points being swept by a scanner, with flickering links.
// Plain 2D canvas, no libraries. Pauses when off screen or the tab is hidden; still frame for reduced motion.
window.startCensusFx = function (canvas, { density = 1, offsetX = 0.62 } = {}) {
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, R = 0, cx = 0, cy = 0, visible = true, raf = 0;
  const small = () => innerWidth < 760;
  // Fibonacci sphere: evenly spread "players"
  let pts = [];
  function build() {
    const n = Math.round((small() ? 520 : 1100) * density);
    pts = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
      pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, hot: Math.random() < 0.07, ph: Math.random() * 6.28 });
    }
  }
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * (small() ? 0.36 : 0.36);
    cx = small() ? W * 0.5 : W * offsetX; cy = small() ? H * 0.34 : H * 0.5;
    build();
  }
  let mx = 0, my = 0;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  const proj = [];
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const rotY = t * 0.00012 + mx * 0.6, rotX = -0.35 + my * 0.3;
    const cyR = Math.cos(rotY), syR = Math.sin(rotY), cxR = Math.cos(rotX), sxR = Math.sin(rotX);
    const scan = ((t * 0.00035) % 2) - 1;             // scanner plane sweeping top -> bottom
    // glow behind globe
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.6);
    g.addColorStop(0, 'rgba(255,190,80,0.10)'); g.addColorStop(0.5, 'rgba(60,120,255,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    proj.length = 0;
    for (const p of pts) {
      let x = p.x * cyR + p.z * syR, z = -p.x * syR + p.z * cyR, y = p.y;
      const y2 = y * cxR - z * sxR; z = y * sxR + z * cxR; y = y2;
      const s = 1 / (1.9 - z * 0.6);
      proj.push({ sx: cx + x * R * s * 1.4, sy: cy + y * R * s * 1.4, z, p, wy: p.y });
    }
    // links between nearby front points (flicker)
    ctx.lineWidth = 0.6;
    for (let i = 0; i < proj.length; i += 3) {
      const a = proj[i]; if (a.z < 0.1) continue;
      const b = proj[(i * 7 + Math.floor(t / 900)) % proj.length];
      if (b.z < 0.1) continue;
      const dx = a.sx - b.sx, dy = a.sy - b.sy, d2 = dx * dx + dy * dy;
      if (d2 > R * R * 0.12) continue;
      ctx.strokeStyle = `rgba(120,170,255,${0.18 * a.z})`;
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
    // points
    for (const q of proj) {
      const depth = (q.z + 1) / 2;
      const near = Math.max(0, 1 - Math.abs(q.wy - scan) * 9);       // lit by scanner
      const tw = q.p.hot ? 0.6 + 0.4 * Math.sin(t * 0.004 + q.p.ph) : 0;
      const a = 0.12 + depth * 0.55 + near * 0.9;
      const r = (0.6 + depth * 1.3) * (1 + near * 0.8 + tw * 0.8);
      ctx.fillStyle = q.p.hot || near > 0.3 ? `rgba(255,${190 + near * 50 | 0},${90 + near * 120 | 0},${Math.min(1, a + tw * 0.4)})` : `rgba(130,175,255,${a})`;
      ctx.beginPath(); ctx.arc(q.sx, q.sy, r, 0, 6.283); ctx.fill();
    }
    // scanner ring
    const sy = cy + scan * R * 1.25, half = Math.sqrt(Math.max(0, 1 - scan * scan)) * R * 1.32;
    const lg = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    lg.addColorStop(0, 'rgba(255,200,90,0)'); lg.addColorStop(0.5, 'rgba(255,214,120,0.85)'); lg.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.strokeStyle = lg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, sy, half, half * 0.18, 0, 0, 6.283); ctx.stroke();
    // orbit rings
    ctx.strokeStyle = 'rgba(120,170,255,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.6, R * 0.42, -0.25, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,90,0.14)';
    ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.85, R * 0.55, 0.35, 0, 6.283); ctx.stroke();
    const oa = t * 0.0006;
    ctx.fillStyle = 'rgba(255,214,120,0.9)';
    ctx.beginPath(); ctx.arc(cx + Math.cos(oa) * R * 1.85 * Math.cos(0.35) - Math.sin(oa) * R * 0.55 * Math.sin(0.35), cy + Math.cos(oa) * R * 1.85 * Math.sin(0.35) + Math.sin(oa) * R * 0.55 * Math.cos(0.35), 2.6, 0, 6.283); ctx.fill();
  }
  function loop(t) { if (visible && !document.hidden) draw(t); raf = requestAnimationFrame(loop); }
  addEventListener('resize', () => { size(); if (reduced) draw(4000); });
  size();
  if (reduced) { draw(4000); return; }
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  raf = requestAnimationFrame(loop);
};
