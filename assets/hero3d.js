// Sinciety cinematic 3D background.
// Iridescent orb, wireframe shell, orbit rings and a particle field, rendered with
// light bloom plus a film pass (grain, vignette, chromatic fringing).
// Reacts to the pointer and scrolling; recolours on `sinciety:chapter` events;
// optional intro where the camera pulls out of the orb.
import * as THREE from './three.module.min.js';
import { EffectComposer } from './fx/EffectComposer.js';
import { RenderPass } from './fx/RenderPass.js';
import { UnrealBloomPass } from './fx/UnrealBloomPass.js';
import { ShaderPass } from './fx/ShaderPass.js';
import { OutputPass } from './fx/OutputPass.js';

const PALETTES = [
  // [primary, secondary, rim] per story chapter
  [0x9d6bff, 0x4f8cff, 0x2ee6f2],  // default: violet / blue / cyan
  [0xff3b5c, 0xff8a3d, 0xffd166],  // go live: red-hot
  [0x2ee6f2, 0x4f8cff, 0xffffff],  // clip: electric cyan
  [0xff4fd8, 0x9d6bff, 0x2ee6f2],  // edit: magenta
  [0x3dffa8, 0x2ee6f2, 0x9d6bff],  // post: green go
];

export function startHero(canvas, { orb = true, density = 1, intro = false, manual = false, offsetX = null } = {}) {
  // manual: no animation loop; the caller drives frames with api.render(seconds) (used to render the trailer).
  const reduced = !manual && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = innerWidth < 760;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: manual });
  } catch {
    canvas.remove();          // no WebGL: the CSS gradient background still looks right
    return;
  }
  const dpr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.6);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  // Painted nebula backdrop (opaque so bloom composites cleanly).
  const bgc = document.createElement('canvas'); bgc.width = 512; bgc.height = 512;
  const bx = bgc.getContext('2d');
  bx.fillStyle = '#05050a'; bx.fillRect(0, 0, 512, 512);
  const blob = (x, y, r, c) => { const g = bx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(5,5,10,0)'); bx.fillStyle = g; bx.fillRect(0, 0, 512, 512); };
  blob(390, 60, 330, 'rgba(40,22,96,0.9)'); blob(40, 470, 300, 'rgba(14,34,92,0.75)'); blob(260, 300, 200, 'rgba(30,10,60,0.4)');
  const bgTex = new THREE.CanvasTexture(bgc); bgTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTex;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 0, 9);
  const world = new THREE.Group();
  scene.add(world);

  const colA = new THREE.Color(PALETTES[0][0]), colB = new THREE.Color(PALETTES[0][1]), colC = new THREE.Color(PALETTES[0][2]);
  const tgtA = colA.clone(), tgtB = colB.clone(), tgtC = colC.clone();
  let ampTarget = 0.16, amp = 0.16;

  // --- Orb ---
  let orbMesh = null, orbMat = null;
  if (orb) {
    orbMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uAmp: { value: 0.16 },
        uA: { value: colA }, uB: { value: colB }, uC: { value: colC } },
      vertexShader: /* glsl */`
        uniform float uTime; uniform float uPulse; uniform float uAmp;
        varying vec3 vNormal; varying vec3 vView; varying float vWave;
        void main() {
          vec3 p = position;
          float w = sin(p.x * 2.1 + uTime * 0.9) * sin(p.y * 2.4 + uTime * 0.7) * sin(p.z * 1.9 + uTime * 1.1);
          w += 0.35 * sin(p.y * 6.0 + uTime * 2.0) * uAmp * 3.0;
          p += normal * (w * uAmp + uPulse * 0.05);
          vWave = w;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vView = normalize(-mv.xyz);
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
        varying vec3 vNormal; varying vec3 vView; varying float vWave;
        void main() {
          float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.2);
          float t = 0.5 + 0.5 * sin(vWave * 3.0 + uTime * 0.6 + vNormal.y * 2.0);
          vec3 iri = mix(mix(uA, uB, t), uC, smoothstep(0.55, 1.0, fres));
          vec3 core = vec3(0.03, 0.02, 0.07);
          vec3 col = mix(core, iri * 0.85, 0.12 + fres * 0.8);
          col += iri * pow(fres, 5.0) * 0.9;              // hot rim feeds the bloom
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    orbMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, small ? 32 : 64), orbMat);
    world.add(orbMesh);

    const shellMat = new THREE.LineBasicMaterial({ color: colA, transparent: true, opacity: 0.3 });
    shellMat.color = colA;   // share the live palette colour
    const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.35, 1)), shellMat);
    shell.userData.spin = 0.06;
    world.add(shell);

    const ringMat = (c, o) => { const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }); m.color = c; return m; };
    [[2.9, 0.012, colB, 0.55, 1.1, 0.2], [3.4, 0.008, colA, 0.45, -0.5, 0.9], [4.1, 0.006, colC, 0.35, 0.3, -0.6]]
      .forEach(([r, t, c, o, rx, rz], i) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 260), ringMat(c, o));
        ring.rotation.set(rx, 0, rz);
        ring.userData.spin = 0.05 + i * 0.03;
        world.add(ring);
      });
  }

  // --- Particle field (with a few hero sparks that streak during the intro) ---
  const count = Math.round((small ? 1200 : 2800) * density);
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const palette = [new THREE.Color(0x9d6bff), new THREE.Color(0x4f8cff), new THREE.Color(0x2ee6f2), new THREE.Color(0xffffff)];
  for (let i = 0; i < count; i++) {
    const r = 5 + Math.pow(Math.random(), 0.6) * 30, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.6, r * Math.cos(ph) - 6], i * 3);
    const c = palette[(Math.random() * (Math.random() < 0.15 ? 4 : 3)) | 0];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const dots = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: small ? 0.07 : 0.055, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  scene.add(dots);

  // --- Post-processing: bloom + film ---
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), small ? 0.6 : 0.7, 0.5, 0.32);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uCA: { value: 0.0015 }, uFade: { value: intro && !reduced ? 0 : 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uTime; uniform float uCA; uniform float uFade; varying vec2 vUv;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
      void main() {
        vec2 d = vUv - 0.5;
        float r2 = dot(d, d);
        vec2 off = d * uCA * (1.0 + r2 * 6.0);
        vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        c *= smoothstep(0.95, 0.18, r2 * 1.7);                 // vignette
        c += (rnd(vUv * 1000.0) - 0.5) * 0.045;               // grain
        gl_FragColor = vec4(c * uFade, 1.0);
      }`,
  });
  composer.addPass(film);

  // --- Interaction ---
  const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0, scroll: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  const scrollProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? Math.min(1, scrollY / max) : 0;
  };
  addEventListener('sinciety:chapter', (e) => {
    const p = PALETTES[e.detail.index] || PALETTES[0];
    tgtA.set(p[0]); tgtB.set(p[1]); tgtC.set(p[2]);
    ampTarget = e.detail.index ? 0.24 : 0.16;
    if (!running || reduced) frame();
  });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    world.position.x = offsetX ?? (w > 900 && orb ? 1.9 : 0);    // orb sits beside the headline on wide screens
  }
  addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  const introDur = 3.2;
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 4);
  let running = true, raf = 0;
  let manualT = 0;
  function frame() {
    const t = manual ? manualT : clock.getElapsedTime();
    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;
    eased.scroll += (scrollProgress() - eased.scroll) * 0.08;
    const s = eased.scroll;
    const k = intro && !reduced ? ease((t - 0.35) / introDur) : 1;   // 0 → 1 intro progress

    // Camera: starts inside the orb, pulls back with a slow roll, then follows pointer/scroll.
    camera.position.x = eased.x * 0.9 * k + world.position.x * (1 - k);
    camera.position.y = -eased.y * 0.6 - s * 1.5;
    camera.position.z = THREE.MathUtils.lerp(1.0, 9 - s * 2.2, k);
    camera.lookAt(world.position.x * (0.6 + 0.4 * (1 - k)), -s * 1.2, 0);
    camera.rotation.z += (1 - k) * 0.6;

    colA.lerp(tgtA, 0.04); colB.lerp(tgtB, 0.04); colC.lerp(tgtC, 0.04);
    amp += (ampTarget - amp) * 0.04;
    world.rotation.y = t * 0.08 + s * Math.PI * 1.2 + eased.x * 0.35;
    world.rotation.x = eased.y * 0.25 + s * 0.6;
    world.children.forEach((c) => { if (c.userData.spin) c.rotation.z += c.userData.spin * 0.016 * (1 + (1 - k) * 8); });
    if (orbMat) {
      orbMat.uniforms.uTime.value = t;
      orbMat.uniforms.uPulse.value = Math.sin(t * 1.6) * 0.5 + 0.5;
      orbMat.uniforms.uAmp.value = amp;
    }
    if (orbMesh) orbMesh.scale.setScalar(1 + s * 0.12);
    dots.rotation.y = t * 0.012 + s * 0.8;
    dots.rotation.x = s * 0.3;
    dots.scale.setScalar(1 + (1 - k) * 0.5);

    bloom.strength = (small ? 0.6 : 0.7) + (1 - k) * 1.4;            // flash of light during the intro
    film.uniforms.uTime.value = t % 10;
    film.uniforms.uCA.value = 0.0015 + (1 - k) * 0.012 + Math.abs(pointer.x - eased.x) * 0.004;
    film.uniforms.uFade.value = intro && !reduced ? Math.min(1, t / 0.6) : 1;

    composer.render();
    if (running && !reduced && !manual) raf = requestAnimationFrame(frame);
  }
  frame();

  const api = {
    render(t) { manualT = t; frame(); const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); },
    chapter(index) { dispatchEvent(new CustomEvent('sinciety:chapter', { detail: { index } })); },
    pointer(x, y) { pointer.x = x; pointer.y = y; },
    bloom,
    world,
  };
  window.__hero = api;
  if (manual) return api;

  document.addEventListener('visibilitychange', () => {
    if (manual) return;
    running = !document.hidden;
    cancelAnimationFrame(raf);
    if (running && !reduced) raf = requestAnimationFrame(frame);
  });
  return api;
}
