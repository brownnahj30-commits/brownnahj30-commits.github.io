/* Voiciety walkers: public-domain legends (folklore, mythology, classic books) drawn in Sinciety's own style, that stroll along the bottom of the stream, one per chatter.
   Vanilla JS, no dependencies. Used by the OBS overlay and the sinciety.org demo.
   const stage = Walkers.create(containerEl, { premium, maxWalkers });
   stage.chat({ user, display, color, text });  stage.speak({ user, display, color }, durationMs);  stage.quiet(user) */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  // ---------- the cast: public-domain legends from folklore, mythology and classic books ----------
  // Each is drawn in Sinciety's own style from the original public-domain descriptions, never from a film/TV design.
  const FREE_CAST = ['santa', 'robin', 'sherlock', 'dracula', 'redhood'];
  const ALL_CAST = ['santa', 'robin', 'sherlock', 'dracula', 'redhood', 'monster', 'hatter', 'pinocchio', 'zeus', 'thor',
    'anubis', 'medusa', 'horseman', 'reaper', 'arthur', 'merlin', 'toothfairy', 'silver'];
  // voice-cast names -> walker, so a chatter turns into the legend whose voice they use
  const BY_VOICE = { countdracula: 'dracula', dracula: 'dracula', themonster: 'monster', monster: 'monster', sherlockholmes: 'sherlock',
    robinhood: 'robin', thehatter: 'hatter', pinocchio: 'pinocchio', santaclaus: 'santa', zeus: 'zeus', thor: 'thor', anubis: 'anubis',
    medusa: 'medusa', headlesshorseman: 'horseman', thegrimreaper: 'reaper', kingarthur: 'arthur', merlin: 'merlin', toothfairy: 'toothfairy',
    longjohnsilver: 'silver', redridinghood: 'redhood' };
  const INK = '#160f24';

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; }
  function keyOf(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function look(user, premium) {
    const pool = premium ? ALL_CAST : FREE_CAST;
    return { who: pool[hash(user.toLowerCase()) % pool.length] };
  }

  // ---------- drawing kit (viewBox 0 0 64 84, feet at y=84, head centre 32,26) ----------
  let uid = 0;
  function kit(svg) {
    const defs = el('defs', {}, svg);
    const fillOf = (c) => {                     // soft top-lit gradient for every coloured shape
      const id = 'vwg' + (++uid); const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 0.25, y2: 1 }, defs);
      el('stop', { offset: '0', 'stop-color': shade(c, 1.18) }, g); el('stop', { offset: '1', 'stop-color': shade(c, 0.78) }, g);
      return `url(#${id})`;
    };
    const O = (extra) => Object.assign({ stroke: INK, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, extra);
    const P = (d, c, parent, extra) => el('path', O(Object.assign({ d, fill: c === 'none' ? 'none' : fillOf(c) }, extra)), parent);
    const C = (cx, cy, r, c, parent, extra) => el('circle', O(Object.assign({ cx, cy, r, fill: fillOf(c) }, extra)), parent);
    const E = (cx, cy, rx, ry, c, parent, extra) => el('ellipse', O(Object.assign({ cx, cy, rx, ry, fill: fillOf(c) }, extra)), parent);
    const flat = (tag, a, parent) => el(tag, a, parent);
    return { P, C, E, flat, fillOf };
  }

  // shared body parts
  function legs(k, svg, pants, shoes, opt = {}) {
    const g = el('g', {}, svg);
    for (const [x, side] of [[24, 'l'], [34, 'r']]) {
      const leg = el('g', { class: 'vw-leg ' + side }, g);
      k.P(`M${x} 62 h6 v13 h-6 Z`, pants, leg);
      if (opt.peg && side === 'r') { k.P(`M${x + 1.5} 72 h3 l-0.5 10 h-2 Z`, '#8a5a32', leg); continue; }
      k.P(`M${x - 1.5} 74 h8 q2.5 0 2.5 3.5 v2.2 h-11 Z`, shoes, leg);
    }
  }
  function torso(k, svg, c, d) { return k.P(d || 'M19 44 Q32 39 45 44 L47.5 66 Q32 69.5 16.5 66 Z', c, svg); }
  function arm(k, svg, side, sleeve, hand, prop) {
    const g = el('g', { class: 'vw-arm ' + side }, svg);
    const x = side === 'l' ? 13 : 44.5;
    if (prop) prop(g);
    k.P(`M${x + 1} 45 h6 q1.2 0 1 2 l-0.6 12 h-7 l-0.4 -12 q0 -2 1 -2 Z`, sleeve, g);
    k.C(x + 4, 61.5, 3.2, hand, g);
    return g;
  }
  function head(k, svg, skin, opt = {}) {
    const g = el('g', { class: 'vw-head' }, svg);
    if (opt.back) opt.back(g);
    if (!opt.noFace) {
      k.C(32, 26, 15.5, skin, g);
      k.flat('ellipse', { cx: 27, cy: 19, rx: 6, ry: 3.4, fill: '#fff', opacity: 0.18 }, g);
    }
    return g;
  }
  function face(k, g, opt = {}) {
    const f = el('g', { class: 'vw-face' }, g);
    const iris = opt.iris || '#4f8cff', y = opt.ey || 28;
    for (const x of [26, 38]) {
      const eye = el('g', { class: 'vw-eye' }, f);
      if (opt.glow) { k.flat('circle', { cx: x, cy: y, r: 2.4, fill: opt.glow, filter: 'url(#vwglow)' }, eye); k.flat('circle', { cx: x, cy: y, r: 1.3, fill: '#fff' }, eye); continue; }
      k.flat('ellipse', { cx: x, cy: y, rx: 3.4, ry: 4.2, fill: '#fff', stroke: INK, 'stroke-width': 1.2 }, eye);
      k.flat('ellipse', { cx: x + 0.3, cy: y + 0.6, rx: 2.4, ry: 3.1, fill: iris }, eye);
      if (opt.slit) k.flat('ellipse', { cx: x + 0.3, cy: y + 0.6, rx: 0.6, ry: 2.6, fill: INK }, eye);
      else k.flat('circle', { cx: x + 0.3, cy: y + 0.9, r: 1.3, fill: INK }, eye);
      k.flat('circle', { cx: x - 0.8, cy: y - 1.2, r: 1, fill: '#fff' }, eye);
      if (opt.brow) k.flat('path', { d: `M${x - 3.5} ${y - 5.5 + (x < 32 ? -opt.brow : opt.brow)} L${x + 3.5} ${y - 5.5 + (x < 32 ? opt.brow : -opt.brow)}`, stroke: opt.browC || INK, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, eye);
    }
    if (opt.blush !== false) for (const x of [21.5, 42.5]) k.flat('ellipse', { cx: x, cy: 33.5, rx: 2.8, ry: 1.5, fill: opt.blush || '#ff7c9c', opacity: 0.45 }, f);
    const my = opt.my || 35.5;
    k.flat('path', { d: `M29 ${my} Q32 ${my + 2.8} 35 ${my}`, fill: 'none', stroke: opt.mouthC || '#5b2a3a', 'stroke-width': 1.5, 'stroke-linecap': 'round', class: 'vw-smile' }, f);
    k.flat('ellipse', { cx: 32, cy: my + 1, rx: 2.6, ry: 2.2, fill: opt.mouthC || '#5b2a3a', class: 'vw-mouth' }, f);
    if (opt.fangs) for (const x of [30.4, 33.6]) k.flat('path', { d: `M${x - 0.9} ${my + 0.7} l0.9 2.2 l0.9 -2.2 Z`, fill: '#fff' }, f);
    return f;
  }
  function star(cx, cy, r) { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (cx + q * Math.cos(a)).toFixed(1) + ' ' + (cy + q * Math.sin(a)).toFixed(1) + ' '; } return d + 'Z'; }

  const CAST = {
    santa(k, s) {
      legs(k, s, '#c8202f', '#1d1a22');
      torso(k, s, '#d42a36'); k.P('M30 40 h4 v28 h-4 Z', '#f6f2ee', s);
      k.P('M17 58 Q32 61 47 58 v4 Q32 65 17 62 Z', '#1d1a22', s); k.P('M29 58.5 h6 v4.5 h-6 Z', '#ffd84a', s);
      arm(k, s, 'l', '#d42a36', '#f6f2ee'); arm(k, s, 'r', '#d42a36', '#f6f2ee');
      const h = head(k, s, '#ffd9bf'); face(k, h, { iris: '#4f8cff', my: 39, mouthC: '#7a2a2a' });
      k.P('M17 30 Q16 48 32 50 Q48 48 47 30 Q44 36 38 34.5 Q32 37 26 34.5 Q20 36 17 30 Z', '#f6f2ee', h);
      k.P('M26 34 Q32 31 38 34 Q35 36.5 32 35 Q29 36.5 26 34 Z', '#f6f2ee', h);
      k.flat('ellipse', { cx: 32, cy: 39.5, rx: 2.6, ry: 2.2, fill: '#7a2a2a', class: 'vw-mouth' }, h);
      k.P('M15 21 Q18 4 36 6 Q50 8 55 22 Q48 15 40 14 Q30 12 15 21 Z', '#d42a36', h);
      k.P('M14 22 Q32 12 50 22 v4 Q32 17 14 26 Z', '#f6f2ee', h); k.C(55.5, 23, 3.4, '#f6f2ee', h);
    },
    robin(k, s) {
      legs(k, s, '#3a5a2a', '#7a4a26');
      k.P('M7 30 Q-2 54 10 76', 'none', s, { stroke: '#8a5a32', 'stroke-width': 2.4 }); k.flat('path', { d: 'M7.5 31 L10 75', stroke: '#eee', 'stroke-width': 0.7 }, s);
      torso(k, s, '#2f8a3e'); k.P('M17 56 Q32 59 47 56 v3.4 Q32 62.5 17 59.4 Z', '#7a4a26', s);
      arm(k, s, 'l', '#2f8a3e', '#f3c9a3'); arm(k, s, 'r', '#2f8a3e', '#f3c9a3');
      const h = head(k, s, '#f3c9a3'); face(k, h, { iris: '#3d9a4f', brow: 0.8, browC: '#6b3d22' });
      k.P('M16 26 Q15 13 26 12 Q38 9 47 17 Q49 21 48 26 Q44 19 36 19 Q26 18 16 26 Z', '#6b3d22', h);
      k.P('M13 20 Q22 4 40 7 Q52 10 56 18 Q42 15 13 20 Z', '#2f8a3e', h);
      k.P('M40 9 Q52 -4 60 -2 Q54 4 44 12 Z', '#e5484d', h);
    },
    sherlock(k, s) {
      legs(k, s, '#4a4038', '#24201c');
      torso(k, s, '#7a6a55'); k.P('M14 44 Q32 37 50 44 L52.5 57 Q32 61.5 11.5 57 Z', '#8a7a62', s);
      arm(k, s, 'l', '#7a6a55', '#f3cfb0', (g) => k.P('M12 62 l-3 9 h5 Z', 'none', g)); arm(k, s, 'r', '#7a6a55', '#f3cfb0');
      const h = head(k, s, '#f3cfb0'); face(k, h, { iris: '#5a7a9a', brow: 1.2, browC: '#3a2a1e' });
      k.P('M34 37 Q40 39 43 37 L44 33 h4 v4 Q46 41 41 41 Q37 41 34 39 Z', '#5a3a22', h);
      k.P('M15 22 Q15 6 32 6 Q49 6 49 22 Q40 18 32 18 Q24 18 15 22 Z', '#9a8462', h);
      k.flat('path', { d: 'M20 10 L22 21 M27 7 L28 19 M36 7 L35 19 M44 10 L42 21 M16 15 H48', stroke: '#6a5a40', 'stroke-width': 0.8, fill: 'none' }, h);
      k.P('M15 21 Q9 24 8 28 Q14 27 19 22 Z', '#9a8462', h); k.P('M49 21 Q55 24 56 28 Q50 27 45 22 Z', '#9a8462', h);
      k.P('M13 22 l2 8 l3 -7 Z', '#8a7452', h); k.P('M51 22 l-2 8 l-3 -7 Z', '#8a7452', h);
    },
    dracula(k, s) {
      k.P('M13 43 Q4 64 9 81 L55 81 Q60 64 51 43 Z', '#1a1622', s); k.P('M16 46 Q9 64 13 79 L51 79 Q55 64 48 46 Z', '#9b1f3f', s, { 'stroke-width': 0 });
      legs(k, s, '#1f1b26', '#0e0c12');
      torso(k, s, '#1f1b26'); k.P('M27 42 L32 56 L37 42 Z', '#f4f0f6', s); k.P('M30.5 47 h3 l-1.5 4 Z', '#9b1f3f', s); k.C(32, 55, 2.2, '#e8b230', s);
      arm(k, s, 'l', '#1f1b26', '#ece8f2'); arm(k, s, 'r', '#1f1b26', '#ece8f2');
      const h = head(k, s, '#ece8f2', { back: (g) => { k.P('M14 44 L8 20 L24 36 Z', '#9b1f3f', g); k.P('M50 44 L56 20 L40 36 Z', '#9b1f3f', g); } });
      face(k, h, { iris: '#c3203d', brow: 1.6, fangs: true, blush: '#b8a6d8' });
      k.P('M16 26 Q15 9 32 9 Q49 9 48 26 Q45 16 37 16 L32 23 L27 16 Q19 16 16 26 Z', '#121018', h);
    },
    redhood(k, s) {
      legs(k, s, '#f2e6d8', '#5a3a22');
      k.P('M12 32 Q6 60 10 79 L54 79 Q58 60 52 32 Z', '#d4283a', s);
      torso(k, s, '#f2e6d8', 'M20 44 Q32 40 44 44 L48 70 Q32 73 16 70 Z'); k.P('M24 50 h16 v12 h-16 Z', '#4a6aa8', s);
      arm(k, s, 'l', '#f2e6d8', '#f6d2b4', (g) => { k.P('M8 60 h11 l-1.5 8 h-8 Z', '#b07a42', g); k.P('M9 60 Q13.5 52 18 60', 'none', g); });
      arm(k, s, 'r', '#f2e6d8', '#f6d2b4');
      const h = head(k, s, '#f6d2b4', { back: (g) => k.C(32, 25, 19, '#d4283a', g) });
      face(k, h, { iris: '#7a4b2a' });
      k.P('M17 27 Q17 12 32 12 Q47 12 47 27 Q43 18 32 18 Q21 18 17 27 Z', '#7a4a2a', h);
      k.P('M13 26 Q14 5 32 5 Q50 5 51 26 Q46 9 32 9 Q18 9 13 26 Z', '#d4283a', h);
      k.P('M28 41 l4 4 l4 -4', 'none', h, { stroke: '#d4283a', 'stroke-width': 2.2 });
    },
    monster(k, s) {
      legs(k, s, '#3a3430', '#1a1714');
      torso(k, s, '#4a3b2e', 'M17 43 Q32 38 47 43 L49 67 Q32 70 15 67 Z'); k.P('M27 41 L32 52 L37 41 Z', '#9a9488', s);
      k.flat('path', { d: 'M18 66 l3 3 l3 -3 l3 3 M39 66 l3 3 l3 -3', stroke: INK, 'stroke-width': 1.2, fill: 'none' }, s);
      arm(k, s, 'l', '#4a3b2e', '#c9c08a'); arm(k, s, 'r', '#4a3b2e', '#c9c08a');
      const h = head(k, s, '#c9c08a', { back: (g) => k.P('M14 24 Q12 44 18 46 L20 28 Z M50 24 Q52 44 46 46 L44 28 Z', '#121018', g) });
      face(k, h, { iris: '#c9a83a', brow: -1.2, blush: false, mouthC: '#3a2a22' });
      k.flat('path', { d: 'M19 21 Q32 18 45 22 M23 19.5 l-0.6 3 M28 18.8 l-0.4 3 M33 18.8 v3 M38 19.3 l0.4 3 M42 20.5 l0.6 3', stroke: '#5a4a3a', 'stroke-width': 1, fill: 'none' }, h);
      k.P('M16 23 Q14 9 32 9 Q50 9 48 23 Q44 15 38 17 Q33 12 28 16 Q22 13 16 23 Z', '#121018', h);
    },
    hatter(k, s) {
      legs(k, s, '#c9b06a', '#2a2030');
      k.flat('path', { d: 'M24 64 v11 M27 64 v11 M34 64 v11 M37 64 v11', stroke: '#8a7040', 'stroke-width': 0.8 }, s);
      torso(k, s, '#5a3a7a'); k.P('M27 41 L32 50 L37 41 Z', '#f4f0f6', s);
      k.P('M25 44 Q32 48 39 44 L39 50 Q32 46 25 50 Z', '#ffd84a', s); k.C(32, 47, 1.8, '#e5484d', s);
      arm(k, s, 'l', '#5a3a7a', '#f6d8c0', (g) => { k.P('M10 58 h8 v4 q-4 5 -8 0 Z', '#f4f0f6', g); }); arm(k, s, 'r', '#5a3a7a', '#f6d8c0');
      const h = head(k, s, '#f6d8c0'); face(k, h, { iris: '#9d6bff', brow: -0.8 });
      k.P('M15 27 Q12 16 20 14 L44 14 Q52 16 49 27 Q45 19 32 19 Q19 19 15 27 Z', '#b8b2c4', h);
      k.P('M11 15 Q32 9 53 15 Q52 18 32 17 Q12 18 11 15 Z', '#3b2a4a', h);
      k.P('M18 15 L15 -12 Q32 -16 49 -12 L46 15 Z', '#3b2a4a', h); k.P('M17.3 8 Q32 5 46.7 8 L46.3 12 Q32 9 17.7 12 Z', '#b46bff', h);
      k.P('M39 -1 h8 v9 h-8 Z', '#f6f2ee', h, { transform: 'rotate(10 43 4)' }); k.flat('text', { x: 40.2, y: 5, 'font-size': 3.6, 'font-weight': 700, fill: INK, transform: 'rotate(10 43 4)' }, h).textContent = '10/6';
    },
    pinocchio(k, s) {
      legs(k, s, '#d9a066', '#5a3a22');
      torso(k, s, '#7fb4ff'); for (const [x, y] of [[23, 50], [37, 47], [29, 58], [41, 60], [21, 63]]) k.C(x, y, 1.6, '#ffd84a', s, { 'stroke-width': 0.8 });
      k.P('M24 42 Q32 47 40 42 L37 47 Q32 49 27 47 Z', '#f6f2ee', s);
      arm(k, s, 'l', '#7fb4ff', '#e2a96a'); arm(k, s, 'r', '#7fb4ff', '#e2a96a');
      const h = head(k, s, '#e2a96a'); face(k, h, { iris: '#4a2a1a', blush: '#e5484d', my: 37 });
      k.flat('path', { d: 'M20 18 Q22 24 20 30 M44 18 Q42 24 44 30', stroke: '#b07a42', 'stroke-width': 0.8, fill: 'none' }, h);
      k.P('M31 31 L48 30 L31 34 Z', '#d9995a', h);
      k.P('M16 20 Q20 6 34 0 Q42 -6 52 -14 Q48 4 48 20 Q32 14 16 20 Z', '#e8b77a', h);
      k.flat('path', { d: 'M24 12 l2 2 M34 8 l1.5 2 M42 3 l1 2 M30 15 l2 1', stroke: '#b07a42', 'stroke-width': 1.2 }, h);
      k.P('M15 26 Q14 18 18 18 L20 25 Z M49 26 Q50 18 46 18 L44 25 Z', '#4a2a1a', h);
    },
    zeus(k, s) {
      legs(k, s, '#f0d0b0', '#a8743a');
      k.flat('path', { d: 'M24 70 h6 M24 73 h6 M34 70 h6 M34 73 h6', stroke: '#a8743a', 'stroke-width': 1 }, s);
      torso(k, s, '#f6f2ee'); k.P('M19 44 L45 62 L46 66 L18 47 Z', '#3a5ab8', s); k.P('M16.5 64 Q32 68 47.5 64 v2.5 Q32 70 16.5 66.5 Z', '#e8b230', s);
      arm(k, s, 'l', '#f6f2ee', '#f0d0b0', (g) => k.P('M17 40 L11 52 L16 52 L10 66 L21 49 L16 49 L21 40 Z', '#ffe066', g, { filter: 'url(#vwglow)' }));
      arm(k, s, 'r', '#f6f2ee', '#f0d0b0');
      const h = head(k, s, '#f0d0b0'); face(k, h, { iris: '#4f8cff', brow: 1, browC: '#d8d8e0', my: 38.5, blush: false });
      k.P('M15 27 Q14 50 32 52 Q50 50 49 27 Q45 36 38 34 Q32 37 26 34 Q19 36 15 27 Z', '#e8e8f0', h);
      k.P('M25 34 Q32 30 39 34 Q35 37 32 35.5 Q29 37 25 34 Z', '#e8e8f0', h); k.flat('ellipse', { cx: 32, cy: 39, rx: 2.6, ry: 2, fill: '#5b2a3a', class: 'vw-mouth' }, h);
      k.P('M15 26 Q13 9 32 9 Q51 9 49 26 Q45 16 32 16 Q19 16 15 26 Z', '#e8e8f0', h);
      for (let i = 0; i < 6; i++) { const x = 17 + i * 6; k.E(x, 13 - Math.sin(i / 5 * Math.PI) * 3, 2.6, 1.4, '#e8b230', h, { transform: `rotate(${-30 + i * 12} ${x} 13)`, 'stroke-width': 0.8 }); }
    },
    thor(k, s) {
      legs(k, s, '#4a3a2a', '#2a1e14');
      k.P('M14 43 Q6 62 10 78 L54 78 Q58 62 50 43 Z', '#3a5a3a', s);
      torso(k, s, '#8a8f9a'); k.flat('path', { d: 'M20 50 Q32 53 44 50 M19 56 Q32 59 45 56 M18 62 Q32 65 46 62', stroke: '#5a5f6a', 'stroke-width': 1, fill: 'none' }, s);
      k.P('M14 43 Q32 36 50 43 L49 48 Q32 42 15 48 Z', '#8a6040', s);
      arm(k, s, 'l', '#8a6040', '#f0c8a8', (g) => { k.P('M15.5 56 h3 v16 h-3 Z', '#6b4a2a', g); k.P('M9 70 h15 v9 h-15 Z', '#8a8f9a', g); });
      arm(k, s, 'r', '#8a6040', '#f0c8a8');
      const h = head(k, s, '#f0c8a8'); face(k, h, { iris: '#4f8cff', brow: 1.4, browC: '#b8461e', my: 38.5, blush: false });
      k.P('M16 28 Q15 48 32 51 Q49 48 48 28 Q44 35 38 34 Q32 36 26 34 Q20 35 16 28 Z', '#c9541e', h);
      k.P('M29 49 l3 8 l3 -8 Z', '#c9541e', h); k.flat('ellipse', { cx: 32, cy: 39, rx: 2.6, ry: 2, fill: '#5b2a1a', class: 'vw-mouth' }, h);
      k.P('M14 23 Q14 5 32 5 Q50 5 50 23 Q32 19 14 23 Z', '#9aa0aa', h); k.P('M30 5 h4 v16 h-4 Z', '#6a707a', h);
      k.P('M12 23 Q32 18 52 23 v3 Q32 21 12 26 Z', '#6a707a', h);
    },
    anubis(k, s) {
      legs(k, s, '#2a2230', '#e8b230');
      torso(k, s, '#2a2230'); k.P('M17 56 Q32 59 47 56 L49 68 Q32 71 15 68 Z', '#f6f2ee', s); k.P('M29 57 h6 v12 h-6 Z', '#e8b230', s);
      k.P('M17 43 Q32 37 47 43 L45 50 Q32 46 19 50 Z', '#2a7ab8', s); k.flat('path', { d: 'M18 46 Q32 41 46 46', stroke: '#e8b230', 'stroke-width': 2, fill: 'none' }, s);
      arm(k, s, 'l', '#2a2230', '#2a2230', (g) => { k.P('M15.5 30 h3 v48 h-3 Z', '#e8b230', g); k.P('M13 30 Q17 24 21 28 L19 31 Q17 28 15 31 Z', '#e8b230', g); });
      arm(k, s, 'r', '#2a2230', '#2a2230');
      const h = head(k, s, '#2a2230', { noFace: true });
      k.P('M18 4 L22 26 L28 18 Z M46 4 L42 26 L36 18 Z', '#1d1724', h); k.P('M20 9 L23 22 L26 18 Z M44 9 L41 22 L38 18 Z', '#e8b230', h, { 'stroke-width': 0 });
      k.P('M18 30 Q17 16 32 15 Q47 16 46 30 L50 34 Q52 38 46 39 L36 40 Q32 44 26 40 Q16 38 18 30 Z', '#2a2230', h);
      k.flat('ellipse', { cx: 49.5, cy: 35.5, rx: 2, ry: 1.6, fill: INK }, h);
      const f = el('g', { class: 'vw-face' }, h);
      for (const x of [27, 37]) { const e = el('g', { class: 'vw-eye' }, f); k.flat('path', { d: `M${x - 3.5} 27 Q${x} 23.5 ${x + 3.5} 27 Q${x} 29 ${x - 3.5} 27 Z`, fill: '#ffd84a', stroke: '#e8b230', 'stroke-width': 0.8 }, e); k.flat('circle', { cx: x, cy: 26.8, r: 1, fill: INK }, e); }
      k.flat('path', { d: 'M38 39 Q42 40 46 38.6', stroke: '#e8b230', 'stroke-width': 1, fill: 'none', class: 'vw-smile' }, f);
      k.flat('ellipse', { cx: 42, cy: 39.5, rx: 2.4, ry: 1.6, fill: '#8a1e2a', class: 'vw-mouth' }, f);
    },
    medusa(k, s) {
      legs(k, s, '#2a8a7a', '#c9a227');
      torso(k, s, '#2a8a7a', 'M19 44 Q32 39 45 44 L48 70 Q32 73 16 70 Z'); k.P('M18 50 Q32 54 46 50 v2.5 Q32 56.5 18 52.5 Z', '#e8b230', s);
      arm(k, s, 'l', '#2a8a7a', '#a8d8b0'); arm(k, s, 'r', '#2a8a7a', '#a8d8b0');
      const h = head(k, s, '#a8d8b0'); face(k, h, { iris: '#ffd84a', slit: true, blush: '#4ee0a0', mouthC: '#2a4a3a' });
      const snakes = [[18, 16, 6, -3], [24, 10, 14, -6], [32, 8, 32, -10], [40, 10, 50, -6], [46, 16, 58, -2], [16, 24, 6, 10], [48, 24, 58, 12]];
      for (const [x1, y1, x2, y2] of snakes) { k.P(`M${x1} ${y1} Q${(x1 + x2) / 2 + 4} ${(y1 + y2) / 2 + 4} ${x2} ${y2}`, 'none', h, { stroke: '#2f9a5a', 'stroke-width': 4.2 }); k.flat('path', { d: `M${x1} ${y1} Q${(x1 + x2) / 2 + 4} ${(y1 + y2) / 2 + 4} ${x2} ${y2}`, stroke: '#4ee08a', 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round' }, h); k.C(x2, y2, 2.6, '#2f9a5a', h); k.flat('circle', { cx: x2 + 0.8, cy: y2 - 0.6, r: 0.7, fill: '#ff3d3d' }, h); }
      k.P('M16 24 Q16 11 32 11 Q48 11 48 24 Q42 17 32 17 Q22 17 16 24 Z', '#2f9a5a', h);
    },
    horseman(k, s) {
      k.P('M14 40 Q5 62 9 80 L55 80 Q59 62 50 40 Z', '#14101c', s);
      legs(k, s, '#2a2230', '#0e0c12');
      torso(k, s, '#2a2230'); k.P('M20 40 Q32 46 44 40 L44 44 Q32 50 20 44 Z', '#f4f0f6', s);
      k.flat('path', { d: 'M24 48 v16 M40 48 v16', stroke: '#c9a227', 'stroke-width': 1, 'stroke-dasharray': '1.5 3' }, s);
      arm(k, s, 'l', '#2a2230', '#d8d0e0'); arm(k, s, 'r', '#2a2230', '#d8d0e0');
      const h = head(k, s, '#ff8a2a', { noFace: true });
      k.flat('ellipse', { cx: 32, cy: 41, rx: 14, ry: 3, fill: '#000', opacity: 0.3 }, h);
      k.P('M17 27 Q16 12 32 12 Q48 12 47 27 Q47 41 32 41 Q17 41 17 27 Z', '#ff8a2a', h);
      k.flat('path', { d: 'M25 13 Q22 27 25 40 M39 13 Q42 27 39 40 M32 12 V41', stroke: '#c8601a', 'stroke-width': 1, fill: 'none' }, h);
      k.P('M31 13 Q30 6 35 4 L36 6 Q33 8 34 13 Z', '#4a6a2a', h);
      const f = el('g', { class: 'vw-face' }, h);
      for (const x of [25.5, 38.5]) { const e = el('g', { class: 'vw-eye' }, f); k.flat('path', { d: `M${x - 3.5} 28 L${x} 22 L${x + 3.5} 28 Z`, fill: '#ffe066', filter: 'url(#vwglow)' }, e); }
      k.flat('path', { d: 'M23 33 L26 35 L29 33 L32 35.5 L35 33 L38 35 L41 33 Q32 39 23 33 Z', fill: '#ffe066', class: 'vw-smile' }, f);
      k.flat('path', { d: 'M22 32 L26 35 L29 32.5 L32 35.5 L35 32.5 L38 35 L42 32 Q41 40.5 32 40.5 Q23 40.5 22 32 Z', fill: '#ffe066', class: 'vw-mouth', filter: 'url(#vwglow)' }, f);
    },
    reaper(k, s) {
      legs(k, s, '#1a1622', '#0e0c12');
      arm(k, s, 'l', '#1a1622', '#d8d8e0', (g) => { k.P('M15.5 6 h2.6 v74 h-2.6 Z', '#6b4a2a', g); k.P('M17 6 Q32 -6 46 10 Q32 4 17 12 Z', '#c8d0dc', g); });
      k.P('M18 40 Q32 34 46 40 L50 79 Q32 82 14 79 Z', '#1a1622', s);
      k.flat('path', { d: 'M24 46 Q22 62 22 78 M40 46 Q42 62 42 78', stroke: '#2e2838', 'stroke-width': 1.4, fill: 'none' }, s);
      arm(k, s, 'r', '#1a1622', '#d8d8e0');
      const h = head(k, s, '#1a1622', { noFace: true });
      k.P('M13 34 Q10 6 32 6 Q54 6 51 34 Q46 44 32 44 Q18 44 13 34 Z', '#1a1622', h);
      k.E(32, 28, 11, 12, '#0a0710', h, { 'stroke-width': 1 });
      face(k, h, { glow: '#9be7ff', blush: false, mouthC: '#9be7ff', my: 34 });
    },
    arthur(k, s) {
      k.P('M14 42 Q6 62 9 79 L55 79 Q58 62 50 42 Z', '#b8202f', s);
      legs(k, s, '#9aa0aa', '#5a5f6a');
      torso(k, s, '#2a4ab8'); k.P('M17 43 Q32 38 47 43 L46 48 Q32 44 18 48 Z', '#c8d0dc', s);
      k.P('M30 50 h4 v14 h-4 Z M25 55 h14 v4 h-14 Z', '#e8b230', s);
      arm(k, s, 'l', '#c8d0dc', '#f0c8a8', (g) => { k.P('M15.5 26 h3 v32 h-3 Z', '#dfe6f0', g); k.P('M11 56 h12 v2.5 h-12 Z', '#e8b230', g); k.P('M15.6 58.5 h2.8 v5 h-2.8 Z', '#6b4a2a', g); });
      arm(k, s, 'r', '#c8d0dc', '#f0c8a8');
      const h = head(k, s, '#f0c8a8'); face(k, h, { iris: '#6a8ab8', brow: 0.8, browC: '#6b3d22', my: 38 });
      k.P('M17 31 Q18 44 32 45 Q46 44 47 31 Q44 37 32 37 Q20 37 17 31 Z', '#7a4a2a', h); k.flat('ellipse', { cx: 32, cy: 39, rx: 2.4, ry: 1.8, fill: '#5b2a1a', class: 'vw-mouth' }, h);
      k.P('M16 27 Q14 11 32 11 Q50 11 48 27 Q44 18 32 18 Q20 18 16 27 Z', '#7a4a2a', h);
      k.P('M17 14 L18 2 L23 8 L27 0 L32 7 L37 0 L41 8 L46 2 L47 14 Q32 11 17 14 Z', '#e8b230', h); k.C(32, 10.5, 1.6, '#e5484d', h, { 'stroke-width': 0.8 });
    },
    merlin(k, s) {
      legs(k, s, '#3a2f7a', '#2a2030');
      torso(k, s, '#4a3a9a', 'M19 44 Q32 39 45 44 L49 77 Q32 80 15 77 Z');
      for (const [x, y] of [[22, 60], [40, 66], [28, 72]]) k.P(star(x, y, 2.4), '#ffd84a', s, { 'stroke-width': 0.6 });
      arm(k, s, 'l', '#4a3a9a', '#f0d0b0', (g) => { k.P('M15.5 20 h3 v60 h-3 Z', '#8a5a32', g); k.C(17, 18, 4, '#7fe9ff', g, { filter: 'url(#vwglow)' }); });
      arm(k, s, 'r', '#4a3a9a', '#f0d0b0');
      const h = head(k, s, '#f0d0b0'); face(k, h, { iris: '#7fe9ff', brow: 1.2, browC: '#e8e8f0', my: 38.5, blush: false });
      k.P('M16 28 Q16 50 32 58 Q48 50 48 28 Q44 35 38 34 Q32 37 26 34 Q20 35 16 28 Z', '#ecebf2', h);
      k.P('M25 34 Q32 30 39 34 Q35 37 32 35.5 Q29 37 25 34 Z', '#ecebf2', h); k.flat('ellipse', { cx: 32, cy: 39, rx: 2.4, ry: 1.8, fill: '#5b2a3a', class: 'vw-mouth' }, h);
      k.P('M10 19 Q32 12 54 19 Q50 23 32 21 Q14 23 10 19 Z', '#3a2f7a', h);
      k.P('M15 19 Q22 2 30 -10 Q36 -20 48 -16 Q40 -10 44 0 Q47 10 49 19 Q32 15 15 19 Z', '#3a2f7a', h);
      k.P(star(30, 6, 3), '#ffd84a', h, { 'stroke-width': 0.6 }); k.P('M41 10 a3 3 0 1 0 2 4 a2.2 2.2 0 1 1 -2 -4 Z', '#ffd84a', h, { 'stroke-width': 0.6 });
    },
    toothfairy(k, s) {
      for (const sx of [-1, 1]) { k.P(`M32 46 Q${32 + sx * 30} ${22} ${32 + sx * 26} ${46} Q${32 + sx * 28} ${62} 32 52 Z`, '#c9e9ff', s, { opacity: 0.75 }); }
      legs(k, s, '#f6d2b4', '#f4b4ff');
      torso(k, s, '#f4b4ff', 'M21 44 Q32 40 43 44 L50 68 Q32 72 14 68 Z'); k.P('M15 66 Q32 70 49 66 L50 69 Q32 73 14 69 Z', '#ffffff', s);
      arm(k, s, 'l', '#f4b4ff', '#f6d2b4', (g) => { k.P('M16.4 46 h1.8 v16 h-1.8 Z', '#e8b230', g); k.P(star(17.3, 43, 5), '#ffe066', g, { filter: 'url(#vwglow)' }); });
      arm(k, s, 'r', '#f4b4ff', '#f6d2b4');
      const h = head(k, s, '#f6d2b4'); face(k, h, { iris: '#b46bff' });
      k.P('M16 27 Q14 11 32 10 Q50 11 48 27 Q44 17 32 17 Q20 17 16 27 Z', '#ffe9a8', h); k.C(32, 7, 6, '#ffe9a8', h);
      k.P('M27 7 L32 1 L37 7 L35 9 L32 6 L29 9 Z', '#c9e9ff', h, { 'stroke-width': 0.8 });
    },
    silver(k, s) {
      legs(k, s, '#3a2a20', '#1d1714', { peg: true });
      torso(k, s, '#2a4a7a'); k.P('M27 41 L32 52 L37 41 Z', '#f4f0f6', s); k.P('M17 57 Q32 60 47 57 v3.5 Q32 64 17 60.5 Z', '#5a3a22', s);
      for (const y of [47, 53]) k.C(26, y, 1.2, '#e8b230', s, { 'stroke-width': 0.6 });
      arm(k, s, 'l', '#2a4a7a', '#e8b896', (g) => { k.P('M14.5 58 h3 v22 h-3 Z', '#8a5a32', g); k.P('M12 79 h8 v2 h-8 Z', '#5a3a22', g); });
      arm(k, s, 'r', '#2a4a7a', '#e8b896');
      const h = head(k, s, '#e8b896'); face(k, h, { iris: '#3a2a1e', brow: 1, my: 37.5, blush: false });
      k.P('M18 31 Q18 45 32 46 Q46 45 46 31 Q42 36 32 36 Q22 36 18 31 Z', '#5a3a22', h); k.flat('ellipse', { cx: 32, cy: 38.5, rx: 2.4, ry: 1.8, fill: '#2a1a12', class: 'vw-mouth' }, h);
      k.P('M10 18 Q20 2 32 8 Q44 2 54 18 Q32 12 10 18 Z', '#1d1a22', h); k.P('M14 15 Q32 11 50 15', 'none', h, { stroke: '#e8b230', 'stroke-width': 1.2 });
      const parrot = el('g', {}, h); k.E(50, 40, 4.5, 6, '#3dd68c', parrot); k.C(50, 33, 3.6, '#3dd68c', parrot); k.P('M52.5 32 q3 1 1.5 4 l-2 -1.5 Z', '#ffb02e', parrot, { 'stroke-width': 0.8 });
      k.flat('circle', { cx: 51, cy: 32.4, r: 0.8, fill: INK }, parrot); k.P('M47 44 q-2 6 1 9 l3 -7 Z', '#e5484d', parrot, { 'stroke-width': 0.8 });
    },
  };

  // ---------- one walker as SVG (viewBox 0 0 64 84, feet at y=84) ----------
  function chibi(L) {
    const svg = el('svg', { viewBox: '0 0 64 84', class: 'vw-svg', 'aria-hidden': 'true' });
    const k = kit(svg);
    const glow = el('filter', { id: 'vwglow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, svg.querySelector('defs'));
    el('feGaussianBlur', { stdDeviation: 1.4, result: 'b' }, glow); const m = el('feMerge', {}, glow); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
    (CAST[L.who] || CAST.santa)(k, svg);
    return svg;
  }

  const CSS = `
  .vw-stage{position:absolute;left:0;right:0;bottom:0;height:150px;overflow:visible;pointer-events:none;font-family:'Chakra Petch','Trebuchet MS',sans-serif}
  .vw{position:absolute;bottom:4px;width:64px;height:84px;transition:opacity .8s;will-change:transform}
  .vw-body{position:absolute;inset:0;transform-origin:50% 100%}
  .vw-svg{width:64px;height:84px;overflow:visible;filter:drop-shadow(0 3px 2px rgba(0,0,0,.35))}
  .vw.flip .vw-svg{transform:scaleX(-1)}
  .vw.row2 .vw-name{bottom:104px}.vw.row2 .vw-bubble{bottom:128px}.vw.row2 .vw-tag{bottom:124px}
  .vw.chatting,.vw.talking{z-index:5}
  .vw-name{position:absolute;bottom:88px;left:50%;transform:translateX(-50%);white-space:nowrap;font-weight:700;font-size:13px;letter-spacing:.02em;padding:2px 7px;border-radius:7px;background:rgba(10,10,20,.72);color:#fff;text-shadow:0 1px 0 #000}
  .vw-bubble{position:absolute;bottom:112px;left:50%;transform:translateX(-50%) scale(.6);opacity:0;max-width:220px;width:max-content;padding:7px 11px;border-radius:12px;background:#fff;color:#1b1530;font:600 13px/1.25 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.35);transition:opacity .25s,transform .25s;word-wrap:break-word}
  .vw-bubble::after{content:"";position:absolute;left:50%;bottom:-6px;margin-left:-6px;border:6px solid transparent;border-top-color:#fff;border-bottom:0}
  .vw.chatting .vw-bubble{opacity:1;transform:translateX(-50%) scale(1)}
  .vw .vw-mouth{opacity:0}.vw.talking .vw-mouth{opacity:1;animation:vw-talk .18s infinite alternate}.vw.talking .vw-smile{opacity:0}
  @keyframes vw-talk{from{transform:scaleY(.35)}to{transform:scaleY(1.1)}}
  .vw .vw-mouth{transform-box:fill-box;transform-origin:center}
  .vw.walking .vw-leg.l{animation:vw-step .42s infinite alternate}.vw.walking .vw-leg.r{animation:vw-step .42s infinite alternate-reverse}
  .vw-leg{transform-box:fill-box;transform-origin:50% 0}
  @keyframes vw-step{from{transform:rotate(-22deg)}to{transform:rotate(22deg)}}
  .vw.walking .vw-body{animation:vw-bob .21s infinite alternate}
  @keyframes vw-bob{to{transform:translateY(-2px)}}
  .vw.hop .vw-body{animation:vw-hop .5s cubic-bezier(.3,1.6,.5,1)}
  @keyframes vw-hop{30%{transform:translateY(-26px) scale(1.04,.96)}60%{transform:translateY(0) scale(1.08,.9)}100%{transform:none}}
  .vw.talking .vw-body{filter:drop-shadow(0 0 10px var(--vw-glow,#9d6bff)) drop-shadow(0 0 22px var(--vw-glow,#9d6bff))}
  .vw.wave .vw-arm.r{animation:vw-wave .3s 4 alternate;transform-box:fill-box;transform-origin:50% 10%}
  @keyframes vw-wave{to{transform:rotate(-140deg)}}
  .vw-eye{animation:vw-blink 4.6s infinite;transform-box:fill-box;transform-origin:center}
  @keyframes vw-blink{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
  .vw-tag{position:absolute;bottom:108px;left:50%;transform:translateX(-50%);font:700 11px/1 system-ui;color:#fff;padding:3px 7px;border-radius:999px;white-space:nowrap;opacity:0;transition:opacity .3s}
  .vw.showtag .vw-tag{opacity:1}
  @media (prefers-reduced-motion:reduce){.vw *{animation:none!important}}`;

  function create(container, opts = {}) {
    if (!document.getElementById('vw-css')) { const s = document.createElement('style'); s.id = 'vw-css'; s.textContent = CSS; document.head.appendChild(s); }
    const stage = document.createElement('div'); stage.className = 'vw-stage'; container.appendChild(stage);
    const walkers = new Map();
    let premium = !!opts.premium, maxWalkers = opts.maxWalkers || 40, enabled = opts.walkers !== false;
    const W = () => stage.clientWidth || innerWidth;
    stage.style.height = '170px';

    function spawn(user, display, color) {
      if (walkers.size >= maxWalkers) {                       // make room: the quietest chatter leaves
        let oldest = null; for (const w of walkers.values()) if (!oldest || w.last < oldest.last) oldest = w;
        if (oldest) remove(oldest.user);
      }
      const L = look(user, premium);
      const node = document.createElement('div'); node.className = 'vw' + (hash(user + '#row') % 2 ? ' row2' : '');
      const body = document.createElement('div'); body.className = 'vw-body'; body.appendChild(chibi(L)); node.appendChild(body);
      const name = document.createElement('div'); name.className = 'vw-name'; name.textContent = display; name.style.color = color || '#fff'; node.appendChild(name);
      const bubble = document.createElement('div'); bubble.className = 'vw-bubble'; node.appendChild(bubble);
      const tag = document.createElement('div'); tag.className = 'vw-tag'; node.appendChild(tag);
      const fromLeft = Math.random() < 0.5;
      const w = { user, node, body, who: L.who, bubble, tag, x: fromLeft ? -70 : W() + 10, target: 40 + Math.random() * (W() - 140), speed: 0.9 + Math.random() * 0.7, last: Date.now(), idleUntil: 0, timers: {} };
      node.style.transform = `translateX(${w.x}px)`;
      stage.appendChild(node); walkers.set(user, w);
      return w;
    }
    function get(user, display, color) { return walkers.get(user) || spawn(user, display || user, color); }
    function remove(user) { const w = walkers.get(user); if (!w) return; walkers.delete(user); w.node.style.opacity = '0'; setTimeout(() => w.node.remove(), 900); }
    function flash(w, cls, ms) { w.node.classList.remove(cls); void w.node.offsetWidth; w.node.classList.add(cls); clearTimeout(w.timers[cls]); w.timers[cls] = setTimeout(() => w.node.classList.remove(cls), ms); }

    function tick() {
      const now = Date.now();
      for (const w of walkers.values()) {
        if (now - w.last > (opts.idleMs || 10 * 60 * 1000)) { remove(w.user); continue; }
        if (w.node.classList.contains('talking')) { w.node.classList.remove('walking'); continue; }
        if (now < w.idleUntil) { w.node.classList.remove('walking'); continue; }
        const d = w.target - w.x;
        if (Math.abs(d) < 2) {
          w.idleUntil = now + 1500 + Math.random() * 5000;
          w.target = Math.max(20, Math.min(W() - 84, w.x + (Math.random() - 0.5) * 420));
          if (Math.random() < 0.25) flash(w, 'wave', 1300);
          continue;
        }
        w.x += Math.sign(d) * Math.min(Math.abs(d), w.speed);
        w.node.classList.add('walking'); w.node.classList.toggle('flip', d < 0);
        w.node.style.transform = `translateX(${w.x}px)`;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    return {
      chat({ user, display, color, text }) {
        if (!enabled) return;
        const w = get(user, display, color); w.last = Date.now();
        if (text) { w.bubble.textContent = text.length > 90 ? text.slice(0, 88) + '…' : text; flash(w, 'chatting', 4200); }
        flash(w, 'hop', 520);
      },
      speak({ user, display, color, character_name, glow }, ms) {
        if (!enabled) return;
        const w = get(user, display, color); w.last = Date.now();
        w.node.style.setProperty('--vw-glow', glow || color || '#9d6bff');
        const legend = BY_VOICE[keyOf(character_name)];
        if (legend && legend !== w.who) { w.who = legend; w.body.replaceChildren(chibi({ who: legend })); }
        if (character_name) { w.tag.textContent = character_name; w.tag.style.background = glow || '#7d4dff'; flash(w, 'showtag', Math.max(ms, 1500)); }
        w.node.classList.add('talking'); clearTimeout(w.timers.talk);
        w.timers.talk = setTimeout(() => w.node.classList.remove('talking'), ms || 2500);
      },
      quiet(user) { const w = user ? walkers.get(user) : null; for (const x of (w ? [w] : walkers.values())) x.node.classList.remove('talking'); },
      config(c) { premium = !!c.premium; maxWalkers = c.max_walkers || maxWalkers; enabled = c.walkers !== false; stage.style.display = enabled ? '' : 'none'; },
      count() { return walkers.size; },
    };
  }
  global.Walkers = { create, look, cast: ALL_CAST.slice(), free: FREE_CAST.slice() };
})(typeof window !== 'undefined' ? window : globalThis);
