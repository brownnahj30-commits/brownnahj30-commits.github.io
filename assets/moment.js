// Clipciety "The Moment": scroll position drives a highlight being found, scored, cut to 9:16 and queued.
(() => {
  const root = document.querySelector('.cm'); if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => root.querySelector(s);
  const v = $('video'), crop = $('.cm-crop'), cap = $('.cm-cap'), flag = $('.cm-flag'), chat = $('.cm-chat'), score = $('.cm-score strong'),
    queue = $('.cm-queue'), meter = $('.cm-meter i'), step = $('.cm-step'), title = $('.cm-title'), rig = $('.cm-rig');
  const STEPS = [[0, 'Live', 'You are streaming', '#7fe9ff'], [0.24, 'Signals', 'Clipciety is listening', '#b28bff'], [0.42, 'Highlight', 'That one. Score 94', '#ff3d9a'],
    [0.58, 'Auto-edit', 'Cut to 9:16, captioned', '#ffd23d'], [0.8, 'Review', 'Waiting for your OK', '#7dff9a']];
  // the clip's footage: our own Sinciety Online battle render, played as the "stream"
  const CLIP_FROM = 7.6, CLIP_TO = 11.2;
  const names = [['nova', '#ff6fb8'], ['ghxst', '#7fe9ff'], ['mila', '#ffd23d'], ['dre_', '#9dff7a'], ['zoe.tv', '#b28bff'], ['kai', '#ff9a4a'], ['sam', '#7fe9ff'], ['li', '#ff6fb8'], ['rook', '#9dff7a'], ['ava', '#ffd23d']];
  const calm = ['gg', 'this boss is huge', 'lets go', 'who is that', 'o7', 'chat is cooked', 'focus up', 'first time here'];
  const hype = ['NO WAY', 'CLIP IT', 'KEKW', 'WHAT', 'SHE LANDED THAT', '!clip', 'INSANE', 'W', 'CLIP THAT', 'OMG'];
  const msgs = []; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) { const at = i < 14 ? i / 14 * 0.3 : 0.3 + (i - 14) / 76 * 0.16; const n = names[Math.floor(rnd() * names.length)];
    msgs.push({ at, n, t: (at < 0.3 ? calm : hype)[Math.floor(rnd() * (at < 0.3 ? calm : hype).length)] }); }
  // three signal traces, quiet then a spike at the moment
  const trace = (k, spikeAt, w, noise) => { const pts = []; for (let i = 0; i <= 120; i++) { const x = i / 120; const s = Math.exp(-Math.pow((x - spikeAt) / w, 2)); const n = Math.sin(i * 1.7 + k) * 0.5 + Math.sin(i * 0.37 + k * 3) * 0.5;
    pts.push([x * 100, 36 - (0.12 + noise * (0.5 + 0.5 * n) * 0.25 + s * 0.85) * 34]); } return pts; };
  const T = [trace(1, 0.68, 0.06, 1), trace(4, 0.72, 0.1, 0.7), trace(9, 0.7, 0.05, 0.9)];
  const paths = [...root.querySelectorAll('.cm-sig path')];
  const words = cap.textContent.trim().split(/\s+/); cap.innerHTML = words.map((w) => `<span>${w}</span>`).join(' ');
  let loaded = false, target = 0, cur = 0, lastStep = -1, lastN = -1;
  const load = () => { if (loaded) return; loaded = true; v.src = v.dataset.src; v.load(); };
  const progress = () => { const r = root.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); };
  const smooth = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  const render = (p) => {
    const si = STEPS.reduce((acc, s, i) => (p >= s[0] ? i : acc), 0);
    if (si !== lastStep) { lastStep = si; step.textContent = `0${si + 1} · ${STEPS[si][1]}`; title.textContent = STEPS[si][2]; root.style.setProperty('--sc', STEPS[si][3]); step.style.setProperty('--sc', STEPS[si][3]); }
    meter.style.transform = `scaleX(${p})`;
    // footage: plays through the moment, then holds on the landing
    target = CLIP_FROM + (CLIP_TO - CLIP_FROM) * smooth(0, 0.56, p);
    // chat
    const n = msgs.filter((m) => m.at <= p).length;
    if (n !== lastN) { lastN = n; chat.innerHTML = msgs.slice(Math.max(0, n - 12), n).map((m) => `<p><b style="color:${m.n[1]}">${m.n[0]}</b> ${m.t}</p>`).join(''); }
    // signals draw in up to "now"
    const now = smooth(0.05, 0.5, p);
    paths.forEach((el, i) => { const pts = T[i].filter((q) => q[0] <= now * 100 + 0.01); el.setAttribute('d', pts.length ? 'M' + pts.map((q) => q.join(',')).join('L') : ''); });
    score.textContent = Math.round(18 + 76 * Math.pow(smooth(0.3, 0.44, p), 1.5) + (p < 0.3 ? Math.sin(p * 60) * 4 : 0));
    flag.classList.toggle('on', p >= 0.42);
    // 9:16 crop closes in, captions pop word by word
    const c = smooth(0.58, 0.66, p); crop.style.opacity = c; crop.style.setProperty('--dim', (0.78 * c).toFixed(3));
    cap.style.opacity = smooth(0.64, 0.68, p); const wi = Math.floor(smooth(0.66, 0.8, p) * words.length);
    [...cap.children].forEach((s, i) => s.classList.toggle('on', i === Math.min(words.length - 1, wi)));
    // into the review queue
    const q = smooth(0.8, 0.88, p); queue.style.opacity = q; queue.style.transform = `translateX(${(1 - q) * 60}px)`;
    rig.style.opacity = 1 - 0.55 * q; rig.style.transform = `scale(${1 - 0.06 * q})`;
  };
  if (reduced) { document.documentElement.classList.add('no-motion'); render(0.9); return; }
  new IntersectionObserver(([e]) => { if (e.isIntersecting) load(); }, { rootMargin: '150% 0px' }).observe(root);
  addEventListener('scroll', () => render(progress()), { passive: true });
  render(progress());
  const tick = () => { cur += (target - cur) * 0.2; if (v.readyState >= 2 && !v.seeking && Math.abs(v.currentTime - cur) > 1 / 40) v.currentTime = cur; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();
