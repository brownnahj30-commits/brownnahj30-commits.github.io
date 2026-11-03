// Sinciety 3D background: iridescent orb, wireframe shell, orbit rings, particle field.
// Reacts to the pointer (parallax tilt) and to scrolling (camera flies in, scene turns).
// Pauses when the tab is hidden; renders a single still frame for reduced-motion users.
import * as THREE from './three.module.min.js';

export function startHero(canvas, { orb = true, density = 1 } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = innerWidth < 760;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.remove();          // no WebGL: the CSS gradient background still looks right
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 0, 9);
  const world = new THREE.Group();
  scene.add(world);

  // --- Orb: animated displacement + fresnel iridescence (no textures needed) ---
  let orbMesh = null, orbMat = null;
  if (orb) {
    orbMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
      vertexShader: /* glsl */`
        uniform float uTime; uniform float uPulse;
        varying vec3 vNormal; varying vec3 vView; varying float vWave;
        void main() {
          vec3 p = position;
          float w = sin(p.x * 2.1 + uTime * 0.9) * sin(p.y * 2.4 + uTime * 0.7) * sin(p.z * 1.9 + uTime * 1.1);
          p += normal * (w * 0.16 + uPulse * 0.05);
          vWave = w;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vView = normalize(-mv.xyz);
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime;
        varying vec3 vNormal; varying vec3 vView; varying float vWave;
        void main() {
          float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.2);
          vec3 violet = vec3(0.62, 0.42, 1.0), blue = vec3(0.31, 0.55, 1.0), cyan = vec3(0.18, 0.9, 0.95);
          float t = 0.5 + 0.5 * sin(vWave * 3.0 + uTime * 0.6 + vNormal.y * 2.0);
          vec3 iri = mix(mix(violet, blue, t), cyan, smoothstep(0.55, 1.0, fres));
          vec3 core = vec3(0.04, 0.03, 0.09);
          vec3 col = mix(core, iri, 0.25 + fres * 0.95);
          col += iri * pow(fres, 4.0) * 0.8;               // bright rim
          gl_FragColor = vec4(col, 0.92);
        }`,
      transparent: true,
    });
    orbMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, small ? 32 : 64), orbMat);
    world.add(orbMesh);

    const shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.35, 1)),
      new THREE.LineBasicMaterial({ color: 0x9d6bff, transparent: true, opacity: 0.28 }));
    shell.userData.spin = 0.06;
    world.add(shell);

    const ringMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
    [[2.9, 0.012, 0x4f8cff, 0.55, 1.1, 0.2], [3.4, 0.008, 0x9d6bff, 0.45, -0.5, 0.9], [4.1, 0.006, 0x2ee6f2, 0.35, 0.3, -0.6]]
      .forEach(([r, t, c, o, rx, rz], i) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 220), ringMat(c, o));
        ring.rotation.set(rx, 0, rz);
        ring.userData.spin = 0.05 + i * 0.03;
        world.add(ring);
      });

    // soft glow behind the orb
    const g = document.createElement('canvas'); g.width = g.height = 128;
    const gx = g.getContext('2d'), grad = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(140,100,255,0.55)'); grad.addColorStop(0.5, 'rgba(79,140,255,0.15)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    gx.fillStyle = grad; gx.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(g), blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(9, 9, 1);
    world.add(glow);
  }

  // --- Particle field ---
  const count = Math.round((small ? 1200 : 2600) * density);
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
    size: small ? 0.07 : 0.055, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  scene.add(dots);

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

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    world.position.x = w > 900 && orb ? 1.9 : 0;    // orb sits beside the headline on wide screens
  }
  addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  let running = true, raf = 0;
  function frame() {
    const t = clock.getElapsedTime();
    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;
    eased.scroll += (scrollProgress() - eased.scroll) * 0.08;
    const s = eased.scroll;

    camera.position.x = eased.x * 0.9;
    camera.position.y = -eased.y * 0.6 - s * 1.5;
    camera.position.z = 9 - s * 4.5;
    camera.lookAt(world.position.x * 0.6, -s * 1.2, 0);

    world.rotation.y = t * 0.08 + s * Math.PI * 1.2 + eased.x * 0.35;
    world.rotation.x = eased.y * 0.25 + s * 0.6;
    world.children.forEach((c) => { if (c.userData.spin) c.rotation.z += c.userData.spin * 0.016; });
    if (orbMat) { orbMat.uniforms.uTime.value = t; orbMat.uniforms.uPulse.value = Math.sin(t * 1.6) * 0.5 + 0.5; }
    if (orbMesh) orbMesh.scale.setScalar(1 + s * 0.35);
    dots.rotation.y = t * 0.012 + s * 0.8;
    dots.rotation.x = s * 0.3;

    renderer.render(scene, camera);
    if (running && !reduced) raf = requestAnimationFrame(frame);
  }
  frame();

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    cancelAnimationFrame(raf);
    if (running && !reduced) raf = requestAnimationFrame(frame);
  });
}
