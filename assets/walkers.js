/* Voiciety walkers: original chibi characters that stroll along the bottom of the stream, one per chatter.
   Vanilla JS, no dependencies. Used by the OBS overlay and the sinciety.org demo.
   const stage = Walkers.create(containerEl, { premium, maxWalkers });
   stage.chat({ user, display, color, text });  stage.speak({ user, display, color }, durationMs);  stage.quiet(user) */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const SKIN = ['#ffe0c7', '#f6c9a4', '#e3a77f', '#c98b62', '#9c6644', '#6e4630'];
  const HAIR = ['#2b2b3a', '#5a3b2e', '#f2c14e', '#ff6fae', '#7fb4ff', '#9d6bff', '#3dffa8', '#ff5a2e', '#f4f4f8', '#ff9f40'];
  const OUTFIT = ['#7d4dff', '#4f8cff', '#ff4f8b', '#2ec4b6', '#ffb02e', '#1f2937', '#e5484d', '#3dd68c'];
  const EYES = ['#4f8cff', '#9d6bff', '#2ec4b6', '#e5484d', '#7a4b2a', '#3dd68c', '#ffb02e'];
  const FREE_STYLES = ['spiky', 'bob', 'twintails'];
  const ALL_STYLES = ['spiky', 'bob', 'twintails', 'long', 'ponytail', 'cathood', 'messy', 'bunnyhood', 'headphones', 'ninja'];

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pick(arr, h, salt) { return arr[(h >>> salt) % arr.length]; }
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; }

  function look(user, premium) {
    const h = hash(user.toLowerCase());
    return { style: pick(premium ? ALL_STYLES : FREE_STYLES, h, 0), skin: pick(SKIN, h, 3), hair: pick(HAIR, h, 7),
      outfit: pick(OUTFIT, h, 11), eyes: pick(EYES, h, 15), scarf: premium && (h >>> 19) % 3 === 0 };
  }

  // ---------- one chibi as SVG (viewBox 0 0 64 84, feet at y=84) ----------
  function chibi(L) {
    const svg = el('svg', { viewBox: '0 0 64 84', class: 'vw-svg', 'aria-hidden': 'true' });
    const back = el('g', {}, svg);                       // hair behind the head
    if (L.style === 'long') el('path', { d: 'M13 24 Q12 52 18 60 L46 60 Q52 52 51 24 Z', fill: L.hair }, back);
    if (L.style === 'twintails') { el('ellipse', { cx: 9, cy: 36, rx: 6, ry: 13, fill: L.hair }, back); el('ellipse', { cx: 55, cy: 36, rx: 6, ry: 13, fill: L.hair }, back); }
    if (L.style === 'ponytail') el('path', { d: 'M46 18 Q60 22 56 44 Q52 36 47 30 Z', fill: L.hair }, back);
    // legs (animated) + shoes
    const legs = el('g', { class: 'vw-legs' }, svg);
    el('rect', { x: 24, y: 64, width: 6, height: 14, rx: 3, fill: shade(L.outfit, 0.55), class: 'vw-leg l' }, legs);
    el('rect', { x: 34, y: 64, width: 6, height: 14, rx: 3, fill: shade(L.outfit, 0.55), class: 'vw-leg r' }, legs);
    // body + arms
    el('rect', { x: 19, y: 46, width: 26, height: 22, rx: 9, fill: L.outfit }, svg);
    el('rect', { x: 14, y: 48, width: 7, height: 15, rx: 3.5, fill: L.outfit, class: 'vw-arm l' }, svg);
    el('rect', { x: 43, y: 48, width: 7, height: 15, rx: 3.5, fill: L.outfit, class: 'vw-arm r' }, svg);
    el('path', { d: 'M27 47 L32 53 L37 47', fill: 'none', stroke: shade(L.outfit, 1.35), 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
    if (L.scarf) el('path', { d: 'M20 46 Q32 52 44 46 L44 50 Q32 56 20 50 Z', fill: '#ffd84a' }, svg);
    // head
    const head = el('g', { class: 'vw-head' }, svg);
    if (L.style === 'cathood' || L.style === 'bunnyhood') {
      const ear = L.style === 'cathood' ? 'M14 16 L18 1 L28 11 Z M50 16 L46 1 L36 11 Z' : 'M18 12 Q15 -8 23 -6 Q27 4 26 12 Z M46 12 Q49 -8 41 -6 Q37 4 38 12 Z';
      el('path', { d: ear, fill: L.outfit }, head);
      el('circle', { cx: 32, cy: 27, r: 21, fill: L.outfit }, head);
    }
    el('circle', { cx: 32, cy: 28, r: 18, fill: L.skin }, head);
    // face
    const face = el('g', { class: 'vw-face' }, head);
    for (const x of [25, 39]) {
      const eye = el('g', { class: 'vw-eye' }, face);
      el('ellipse', { cx: x, cy: 30, rx: 3.6, ry: 4.6, fill: '#1b1530' }, eye);
      el('ellipse', { cx: x, cy: 31, rx: 2.6, ry: 3.2, fill: L.eyes }, eye);
      el('circle', { cx: x - 1.2, cy: 28.4, r: 1.3, fill: '#fff' }, eye);
    }
    el('ellipse', { cx: 21, cy: 36, rx: 3, ry: 1.6, fill: '#ff8fb1', opacity: 0.55 }, face);
    el('ellipse', { cx: 43, cy: 36, rx: 3, ry: 1.6, fill: '#ff8fb1', opacity: 0.55 }, face);
    el('path', { d: 'M29 38 Q32 40.5 35 38', fill: 'none', stroke: '#5b2a3a', 'stroke-width': 1.4, 'stroke-linecap': 'round', class: 'vw-smile' }, face);
    el('ellipse', { cx: 32, cy: 39, rx: 2.6, ry: 2.2, fill: '#5b2a3a', class: 'vw-mouth' }, face);
    // front hair
    const H = { fill: L.hair };
    const hair = {
      spiky: 'M13 28 L10 14 L18 18 L19 5 L26 13 L32 1 L37 12 L45 4 L45 17 L54 13 L51 28 Q46 18 32 17 Q18 18 13 28 Z',
      bob: 'M13 33 Q11 12 32 10 Q53 12 51 33 L46 33 Q44 21 32 20 Q20 21 18 33 Z',
      twintails: 'M14 28 Q14 11 32 10 Q50 11 50 28 Q45 19 38 19 L36 23 L33 19 Q22 18 14 28 Z',
      long: 'M14 30 Q12 11 32 10 Q52 11 50 30 Q47 18 32 18 Q17 18 14 30 Z',
      ponytail: 'M14 28 Q14 11 32 10 Q50 11 50 28 Q44 17 30 18 Q20 19 14 28 Z',
      messy: 'M13 29 Q10 16 17 14 Q16 6 26 9 Q30 2 37 8 Q46 5 47 14 Q55 16 51 29 Q47 19 40 21 Q34 15 28 20 Q20 17 13 29 Z',
      headphones: 'M14 27 Q14 11 32 11 Q50 11 50 27 Q44 19 32 19 Q20 19 14 27 Z',
      ninja: 'M14 25 Q14 11 32 11 Q50 11 50 25 Q42 18 32 18 Q22 18 14 25 Z',
      cathood: '', bunnyhood: '',
    }[L.style];
    if (hair) el('path', { d: hair, ...H }, head);
    if (L.style === 'headphones') {
      el('path', { d: 'M12 30 Q12 6 32 6 Q52 6 52 30', fill: 'none', stroke: '#1f2937', 'stroke-width': 3 }, head);
      el('rect', { x: 8, y: 25, width: 8, height: 12, rx: 4, fill: '#ff4f8b' }, head);
      el('rect', { x: 48, y: 25, width: 8, height: 12, rx: 4, fill: '#ff4f8b' }, head);
    }
    if (L.style === 'ninja') { el('rect', { x: 13, y: 19, width: 38, height: 5, rx: 2, fill: '#e5484d' }, head); el('path', { d: 'M50 21 L60 17 L58 25 Z', fill: '#e5484d' }, head); }
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
      const w = { user, node, bubble, tag, x: fromLeft ? -70 : W() + 10, target: 40 + Math.random() * (W() - 140), speed: 0.9 + Math.random() * 0.7, last: Date.now(), idleUntil: 0, timers: {} };
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
        if (character_name) { w.tag.textContent = character_name; w.tag.style.background = glow || '#7d4dff'; flash(w, 'showtag', Math.max(ms, 1500)); }
        w.node.classList.add('talking'); clearTimeout(w.timers.talk);
        w.timers.talk = setTimeout(() => w.node.classList.remove('talking'), ms || 2500);
      },
      quiet(user) { const w = user ? walkers.get(user) : null; for (const x of (w ? [w] : walkers.values())) x.node.classList.remove('talking'); },
      config(c) { premium = !!c.premium; maxWalkers = c.max_walkers || maxWalkers; enabled = c.walkers !== false; stage.style.display = enabled ? '' : 'none'; },
      count() { return walkers.size; },
    };
  }
  global.Walkers = { create, look };
})(typeof window !== 'undefined' ? window : globalThis);
