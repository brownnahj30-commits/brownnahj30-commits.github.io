// Sinciety sound design: everything is synthesized live with the Web Audio API (no audio files).
// Off by default (browsers block autoplay). The toggle remembers the visitor's choice.
//  - ambient drone that breathes, opens up as you scroll faster, and changes chord per story chapter
//  - soft ticks on hover, a glassy blip on click, a whoosh between chapters, typing ticks on text decode
(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  let ctx = null, master = null, droneBus = null, droneFilter = null, voices = [], on = false, noiseBuf = null;
  let pref = false;
  try { pref = localStorage.getItem('sinciety-sound') === 'on'; } catch { /* storage blocked */ }

  // ---------- toggle button ----------
  const btn = document.createElement('button');
  btn.className = 'sound-toggle'; btn.type = 'button';
  btn.innerHTML = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="lbl">Sound off</span>';
  btn.setAttribute('aria-pressed', 'false');
  document.body.appendChild(btn);

  const CHORDS = [
    [38, 45, 53, 57, 60, 64],   // D minor 9 (default)
    [40, 47, 55, 59, 62, 66],   // E minor (go live, tension)
    [41, 48, 57, 60, 64, 67],   // F major 7 (clip)
    [36, 43, 52, 55, 59, 62],   // C major 9 (edit)
    [38, 45, 54, 57, 62, 64],   // D major add9 (post, resolve)
  ];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);

    // simple stereo reverb from a generated impulse
    const rev = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    rev.buffer = ir;
    const revGain = ctx.createGain(); revGain.gain.value = 0.55;
    rev.connect(revGain).connect(master);
    window.__sincietyRev = rev;

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // drone: detuned saws -> breathing lowpass
    droneBus = ctx.createGain(); droneBus.gain.value = 0.11;
    droneFilter = ctx.createBiquadFilter(); droneFilter.type = 'lowpass'; droneFilter.frequency.value = 420; droneFilter.Q.value = 0.7;
    const lfo = ctx.createOscillator(), lfoAmt = ctx.createGain();
    lfo.frequency.value = 0.07; lfoAmt.gain.value = 180; lfo.connect(lfoAmt).connect(droneFilter.frequency); lfo.start();
    droneBus.connect(droneFilter); droneFilter.connect(master); droneFilter.connect(rev);
    CHORDS[0].forEach((m, i) => {
      [-6, 6].forEach((cents) => {
        const o = ctx.createOscillator(); o.type = i < 2 ? 'triangle' : 'sawtooth';
        o.frequency.value = hz(m); o.detune.value = cents;
        const g = ctx.createGain(); g.gain.value = i < 2 ? 0.5 : 0.16;
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (p) { p.pan.value = cents < 0 ? -0.4 : 0.4; o.connect(g).connect(p).connect(droneBus); } else o.connect(g).connect(droneBus);
        o.start(); voices.push({ o, idx: i });
      });
    });
  }

  function out(node, wet = 0.4) {
    node.connect(master);
    if (wet && window.__sincietyRev) { const s = ctx.createGain(); s.gain.value = wet; node.connect(s).connect(window.__sincietyRev); }
  }

  // ---------- one-shots ----------
  function tick(vol = 0.05) {
    if (!on) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(2200 + Math.random() * 900, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(g); out(g, 0.15); o.start(t); o.stop(t + 0.04);
  }
  function blip() {
    if (!on) return;
    const t = ctx.currentTime;
    [[880, 0], [1320, 0.045]].forEach(([f, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(f, t + d); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + d + 0.12);
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35);
      o.connect(g); out(g, 0.5); o.start(t + d); o.stop(t + d + 0.4);
    });
  }
  function whoosh(up = true, vol = 0.18) {
    if (!on) return;
    const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(up ? 300 : 3000, t); f.frequency.exponentialRampToValueAtTime(up ? 3200 : 260, t + 0.7);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    src.connect(f).connect(g); out(g, 0.6); src.start(t); src.stop(t + 0.9);
    // sub thump under it
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(90, t + 0.28); o.frequency.exponentialRampToValueAtTime(38, t + 0.9);
    og.gain.setValueAtTime(0.0001, t + 0.28); og.gain.exponentialRampToValueAtTime(0.22, t + 0.3); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(og); out(og, 0); o.start(t + 0.28); o.stop(t + 1.2);
  }

  function setChord(idx) {
    if (!ctx) return;
    const ch = CHORDS[idx] || CHORDS[0], t = ctx.currentTime;
    voices.forEach(({ o, idx: i }) => o.frequency.setTargetAtTime(hz(ch[i]), t, 0.35));
  }

  function setOn(v, user) {
    on = v;
    if (on && !ctx) init();
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('.lbl').textContent = on ? 'Sound on' : 'Sound off';
    if (ctx) {
      if (on) ctx.resume();
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(on ? 0.9 : 0, t, on ? 0.6 : 0.15);
      if (!on) setTimeout(() => { if (!on) ctx.suspend(); }, 900);
    }
    if (user) { try { localStorage.setItem('sinciety-sound', on ? 'on' : 'off'); } catch { /* ignore */ } }
    if (on && user) setTimeout(blip, 60);
  }

  btn.addEventListener('click', () => setOn(!on, true));

  // Browsers only allow audio after a gesture: if the visitor chose sound before, start on their first interaction.
  if (pref) {
    btn.classList.add('armed');
    const arm = (e) => {
      if (e.target.closest && e.target.closest('.sound-toggle')) return;
      removeEventListener('pointerdown', arm, true); removeEventListener('keydown', arm, true);
      btn.classList.remove('armed'); setOn(true, false);
    };
    addEventListener('pointerdown', arm, true); addEventListener('keydown', arm, true);
  }

  // ---------- hooks into the page ----------
  let lastHover = null;
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('a, button, [data-tilt]');
    if (el && el !== lastHover) tick(el.matches('[data-tilt]') ? 0.025 : 0.045);
    lastHover = el;
  });
  document.addEventListener('click', (e) => { if (e.target.closest('a, button:not(.sound-toggle)')) blip(); });
  addEventListener('sinciety:chapter', (e) => {
    const i = e.detail.index;
    if (i !== window.__sincietyLastChapter) { if (window.__sincietyLastChapter !== undefined) whoosh(i >= (window.__sincietyLastChapter || 0)); setChord(i); }
    window.__sincietyLastChapter = i;
  });
  addEventListener('sinciety:decode', () => {
    if (!on) return;
    for (let k = 0; k < 10; k++) setTimeout(() => tick(0.02), k * 55 + Math.random() * 30);
  });
  // let the trailer take over: duck the ambient while a video plays with sound
  addEventListener('sinciety:duck', (e) => {
    if (!ctx) return;
    droneBus.gain.setTargetAtTime(e.detail ? 0.012 : 0.11, ctx.currentTime, 0.3);
  });

  // scroll speed opens the filter, like wind as you move
  let lastY = scrollY, vel = 0;
  (function loop() {
    const y = scrollY; vel = vel * 0.9 + Math.abs(y - lastY) * 0.1; lastY = y;
    if (ctx && on) droneFilter.frequency.setTargetAtTime(420 + Math.min(2600, vel * 40), ctx.currentTime, 0.12);
    requestAnimationFrame(loop);
  })();

  document.addEventListener('visibilitychange', () => {
    if (!ctx || !on) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  window.SincietySound = { whoosh: () => whoosh(true, 0.25), isOn: () => on };
})();
