// Last Follower Standing · "cozy paradise" look kit. Smooth, warm, toy-like 3D on three.js r170 (core only):
// a place people WANT to wash up on. Pure builders, seeded, no clock. Imported by episode shots.js as './paradise.js'
// (bin/lfs stages it next to the episode's shots).
import * as THREE from '../kit/vendor/three.module.min.js';
export { THREE };

// ---------- basics ----------
export function rng(seed = 1) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const MATS = new Map();
export function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...o }));
  return MATS.get(k);
}
export function mesh(geo, c, o) { const m = new THREE.Mesh(geo, c instanceof THREE.Material ? c : mat(c, o)); m.castShadow = true; m.receiveShadow = true; return m; }
export const at = (o, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
export const grp = (...k) => { const g = new THREE.Group(); k.forEach((x) => g.add(x)); return g; };
const sphere = (r, c, o, ws = 28, hs = 20) => mesh(new THREE.SphereGeometry(r, ws, hs), c, o);
const capsule = (r, l, c, o) => mesh(new THREE.CapsuleGeometry(r, l, 8, 18), c, o);
export function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- palette ----------
export const P = {
  sand: 0xf7e3b5, sandWet: 0xd9bb84, grass: 0x6fcf5a, grassDeep: 0x4fb04a, lagoon: [0x7ff0dc, 0x37c6e0, 0x1f86d4, 0x175fae],
  trunk: 0xb98552, trunkRing: 0x9a6a3e, frond: [0x4fc15a, 0x3aa24c], nut: 0x7a4a26, rock: 0xbdb6ae, wood: 0xc98a52, woodDark: 0x9a6334, thatch: 0xe6c27a,
};
export const SKINS = [0xffd9bf, 0xf3c09a, 0xdba077, 0xb97b52, 0x8d5636, 0x6a3f27];
export const HAIRS = [0x2b1d14, 0x5b3a22, 0xe8c66a, 0x15151a, 0xc0532b, 0xf2efe6, 0xff7ab8, 0x5ec8ff];
export const TOPS = [0xff5a5f, 0x4f8cff, 0xffc93c, 0x34c38f, 0xff8ad8, 0x9a6bff, 0xff9142, 0xffffff, 0x2dd4bf, 0xf06292];
export const BOTTOMS = [0x2f3e9e, 0xe9d3a0, 0x1f2937, 0x3fa34d, 0xffffff, 0x8b5a2b];

// ---------- stage: warm sun, sky dome, tone mapping hint ----------
export const SUN = { x: 30, y: 46, z: 26 };
export function stage({ fov = 34, top = 0x58b7ff, horizon = 0xfff1d6, sunCol = 0xfff0d8, sunI = 3.1, hemi = 1.25, span = 18, fog = 0xd9eefc, fogNear = 60, fogFar = 260, sunPos = SUN, night = false } = {}) {
  const scene = new THREE.Scene();
  scene.add(skyDome(top, horizon, night, sunPos));
  scene.fog = new THREE.Fog(fog, fogNear, fogFar);
  const cam = new THREE.PerspectiveCamera(fov, 9 / 16, 0.1, 2000);
  const h = new THREE.HemisphereLight(night ? 0x8fa8ff : 0xcfe9ff, night ? 0x1a2240 : 0xe9c89a, hemi); scene.add(h);
  const d = new THREE.DirectionalLight(sunCol, sunI); d.position.set(sunPos.x, sunPos.y, sunPos.z); d.castShadow = true;
  d.shadow.mapSize.set(4096, 4096); d.shadow.radius = 4; d.shadow.bias = -0.0004; d.shadow.normalBias = 0.03;
  Object.assign(d.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 160 });
  scene.add(d, d.target);
  const rim = new THREE.DirectionalLight(night ? 0x9fb8ff : 0xffd9b0, night ? 0.8 : 0.9); rim.position.set(-20, 12, -30); scene.add(rim);
  scene.userData.tone = { mapping: 'agx', exposure: night ? 1.1 : 1.0 };
  return { scene, cam, sun: d, look(px, py, pz, tx, ty, tz) { cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); cam.userData.t = new THREE.Vector3(tx, ty, tz); return this; } };
}
function skyDome(top, horizon, night, sunPos = SUN) {
  const g = new THREE.SphereGeometry(900, 32, 16);
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) }, sun: { value: new THREE.Vector3(sunPos.x, sunPos.y, sunPos.z).normalize() }, night: { value: night ? 1 : 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sun; uniform float night; varying vec3 vD;
      void main(){ float h = clamp(vD.y, -0.2, 1.0); vec3 c = mix(hor, top, pow(smoothstep(-0.05, 0.75, h), 0.8));
        float s = max(dot(normalize(vD), sun), 0.0); c += (1.0 - night) * (vec3(1.0,0.86,0.6) * pow(s, 18.0) * 0.55 + vec3(1.0,0.95,0.85) * pow(s, 900.0) * 2.0);
        gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` });
  const s = new THREE.Mesh(g, m); s.renderOrder = -10; return s;
}

// ---------- the island: smooth sculpted sand + grass plateau, height-sampled ----------
const R0 = 14;
export const shore = (a) => R0 + 1.3 * Math.sin(3 * a + 0.4) + 0.8 * Math.sin(5 * a + 1.7) + 0.5 * Math.sin(9 * a + 2.2);
function noise2(x, z) { return Math.sin(x * 0.55 + Math.sin(z * 0.43) * 1.6) * Math.cos(z * 0.47 - Math.sin(x * 0.31)) ; }
export function heightAt(x, z) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x), q = r / shore(a);
  let h = 1.05 * (1 - sstep(0.78, 1.06, q)) - 0.45 * sstep(1.0, 1.25, q);          // sand dome, sinks into the lagoon
  h += 0.55 * (1 - sstep(0.5, 0.68, q + 0.04 * noise2(x, z)));                        // grass plateau
  h += 0.12 * noise2(x * 1.3, z * 1.3) * (1 - sstep(0.7, 1.0, q));
  return h;
}
export function island(s) {
  const RINGS = 70, SEG = 160, pos = [], col = [], idx = [], c = new THREE.Color(), Rmax = 1.3;
  for (let i = 0; i <= RINGS; i++) for (let j = 0; j < SEG; j++) {
    const a = (j / SEG) * Math.PI * 2, q = Math.pow(i / RINGS, 0.85) * Rmax, r = q * shore(a), x = Math.cos(a) * r, z = Math.sin(a) * r, y = heightAt(x, z);
    pos.push(x, y, z);
    const g = 1 - sstep(0.5, 0.68, q + 0.04 * noise2(x, z));
    c.setHex(P.sand).lerp(new THREE.Color(P.sandWet), sstep(0.86, 1.0, q)).lerp(new THREE.Color(0xe6f3d0), sstep(1.02, 1.12, q) * 0.0);
    if (g > 0.5) c.setHex(P.grass).lerp(new THREE.Color(P.grassDeep), 0.5 + 0.5 * noise2(x * 0.7, z * 0.7));
    else if (g > 0.15) c.setHex(P.sand).lerp(new THREE.Color(P.grass), (g - 0.15) / 0.35);
    col.push(c.r, c.g, c.b);
  }
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) { const a = i * SEG + j, b = i * SEG + ((j + 1) % SEG), d = a + SEG, e = b + SEG; idx.push(a, b, d, b, e, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); m.receiveShadow = true; s.add(m);
  return m;
}
// lagoon: shallow turquoise over the sand shelf → deep blue, animated foam ring + sparkles. setTime(t).
export function lagoon(s, { night = false } = {}) {
  const L = P.lagoon.map((x) => new THREE.Color(x));
  if (night) L.forEach((c) => c.multiplyScalar(0.38));
  const m = new THREE.ShaderMaterial({ transparent: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { t: { value: 0 }, c0: { value: L[0] }, c1: { value: L[1] }, c2: { value: L[2] }, c3: { value: L[3] }, R0: { value: R0 } }]),
    vertexShader: `varying vec3 vW;
#include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform float t; uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform float R0; varying vec3 vW;
#include <fog_pars_fragment>
      float sh(float a){ return R0 + 1.3*sin(3.0*a+0.4) + 0.8*sin(5.0*a+1.7) + 0.5*sin(9.0*a+2.2); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        float r = length(vW.xz), a = atan(vW.z, vW.x), q = r / sh(a);
        vec3 c = mix(c0, c1, smoothstep(1.0, 1.35, q)); c = mix(c, c2, smoothstep(1.35, 2.4, q)); c = mix(c, c3, smoothstep(2.4, 6.0, q));
        float ripple = sin(q * 60.0 - t * 2.2 + sin(a * 7.0) * 1.5) * 0.5 + 0.5;
        float foam = smoothstep(0.06, 0.0, abs(q - 1.04 - 0.012 * sin(t * 1.6 + a * 5.0))) ;
        foam += 0.55 * smoothstep(0.035, 0.0, abs(q - 1.12 - 0.02 * sin(t * 1.1 + a * 3.0))) * (0.6 + 0.4 * sin(a * 11.0 + t));
        c = mix(c, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.9);
        c += vec3(0.06) * ripple * (1.0 - smoothstep(1.0, 2.0, q));
        vec2 cell = floor(vW.xz * 1.6); float sp = hash(cell + floor(t * 2.0)); c += vec3(0.55) * step(0.992, sp) * smoothstep(3.0, 1.2, q);
        gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}` });
  const w = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1), m); w.rotation.x = -Math.PI / 2; w.position.y = 0.02; s.add(w);
  w.userData.setTime = (t) => { m.uniforms.t.value = t; };
  (s.userData.waters ||= []).push(w);
  return w;
}

// ---------- nature ----------
function frond(len = 2.6, w = 0.55, droop = 1.1, cA = P.frond[0], cB = P.frond[1]) { // a folded, drooping palm leaf
  const N = 14, pos = [], col = [], idx = [], A = new THREE.Color(cA), Bc = new THREE.Color(cB);
  for (let i = 0; i <= N; i++) {
    const u = i / N, z = u * len, y = -droop * u * u * len * 0.5, half = w * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - 0.3 * u);
    for (const sd of [-1, 0, 1]) { pos.push(sd * half, y + (sd === 0 ? 0.08 * half : 0), z); const c = sd === 0 ? Bc : A; col.push(c.r, c.g, c.b); }
  }
  for (let i = 0; i < N; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 })); m.castShadow = true; m.receiveShadow = true; return m;
}
export function palm(seed = 1, h = 6, lean = 0.5) {
  const R = rng(seed), g = new THREE.Group(), dir = R() * Math.PI * 2;
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h * 0.55, 0), new THREE.Vector3(Math.cos(dir) * lean * h * 0.3, h, Math.sin(dir) * lean * h * 0.3));
  const SEGS = 14;
  for (let i = 0; i < SEGS; i++) {
    const u0 = i / SEGS, u1 = (i + 1) / SEGS, p0 = curve.getPoint(u0), p1 = curve.getPoint(u1), r = 0.24 - 0.09 * u0;
    const seg = mesh(new THREE.CylinderGeometry(r * 0.92, r, p0.distanceTo(p1) * 1.04, 12), i % 2 ? P.trunkRing : P.trunk, { roughness: 0.85 });
    seg.position.copy(p0).lerp(p1, 0.5); seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()); g.add(seg);
  }
  const top = curve.getPoint(1), crown = new THREE.Group(); crown.position.copy(top); g.add(crown);
  for (let i = 0; i < 9; i++) { const f = frond(2.4 + R() * 0.8, 0.5 + R() * 0.15, 1.0 + R() * 0.5); f.rotation.set(-0.25 - R() * 0.35, (i / 9) * Math.PI * 2 + R() * 0.3, 0, 'YXZ'); crown.add(f); }
  for (let i = 0; i < 3; i++) crown.add(at(sphere(0.18, P.nut, { roughness: 0.6 }), Math.cos(i * 2.1) * 0.22, -0.2, Math.sin(i * 2.1) * 0.22));
  return { g, top, crown };
}
export function rock(r = 0.6, seed = 1) { const R = rng(seed), geo = new THREE.IcosahedronGeometry(r, 2), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (R() - 0.5) * 0.22; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); } geo.computeVertexNormals(); return mesh(geo, P.rock, { roughness: 0.9 }); }
export function flowers(s, n, seed, keep) {
  const R = rng(seed), cols = [0xff6b9a, 0xffd23f, 0xffffff, 0xff8a3d, 0xb38cff];
  const geo = new THREE.SphereGeometry(0.055, 10, 8), I = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), n), m = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) { let x, z, k = 0; do { x = (R() - 0.5) * 22; z = (R() - 0.5) * 22; } while (!keep(x, z) && ++k < 40); m.makeTranslation(x, heightAt(x, z) + 0.08, z); I.setMatrixAt(i, m); I.setColorAt(i, c.setHex(cols[Math.floor(R() * cols.length)])); }
  I.castShadow = true; s.add(I); return I;
}
export function cloud(seed = 1, sc = 1) {
  const R = rng(seed), g = new THREE.Group(), m = mat(0xffffff, { roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.18 });
  for (let i = 0; i < 7; i++) { const r = 1.2 + R() * 1.3, b = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m); b.position.set((i - 3) * 1.4 + R() * 0.6, R() * 0.9 + (3 - Math.abs(i - 3)) * 0.35, R() * 1.2); b.scale.y = 0.75; g.add(b); }
  g.scale.setScalar(sc); return g;
}

// ---------- island life ----------
export function umbrella(c1 = 0xff5a5f, c2 = 0xffffff) {
  const g = grp(at(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), 0xf2f2f2), 0, 1.1, 0));
  for (let i = 0; i < 8; i++) { const w = mesh(new THREE.ConeGeometry(1.3, 0.45, 3, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), i % 2 ? c1 : c2, { side: THREE.DoubleSide, roughness: 0.7 }); w.position.y = 2.25; g.add(w); }
  g.rotation.z = 0.12; return g;
}
export function towel(c = 0x4f8cff, stripe = 0xffffff) {
  const t = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#' + new THREE.Color(c).getHexString(); g.fillRect(0, 0, w, h); g.fillStyle = '#' + new THREE.Color(stripe).getHexString(); for (let y = 10; y < h; y += 28) g.fillRect(0, y, w, 9); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.7), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.receiveShadow = true; return m;
}
export function surfboard(c = 0xffc93c) {
  const b = mesh(new THREE.SphereGeometry(0.5, 24, 16), c, { roughness: 0.35 }); b.scale.set(0.42, 2.0, 0.08);
  const s = mesh(new THREE.BoxGeometry(0.04, 1.6, 0.085), 0xffffff); return grp(at(b, 0, 0.95, 0), at(s, 0, 0.95, 0.01));
}
export function hut(seed = 1, { wall = 0xf3d9a8, name = null } = {}) {
  const g = new THREE.Group();
  for (const [x, z] of [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]]) g.add(at(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.9, 10), P.woodDark), x, 0.45, z));
  g.add(at(mesh(new THREE.BoxGeometry(2.4, 0.12, 2.0), P.wood), 0, 0.9, 0));
  g.add(at(mesh(new THREE.BoxGeometry(2.0, 1.15, 1.6), wall, { roughness: 0.8 }), 0, 1.55, 0));
  g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.8, 0.05), 0x8a5a33), 0.2, 1.38, 0.81));
  g.add(at(mesh(new THREE.BoxGeometry(0.45, 0.4, 0.05), 0x9ad7ff, { emissive: 0x2a6a90, emissiveIntensity: 0.25 }), -0.6, 1.65, 0.81));
  const roof = mesh(new THREE.ConeGeometry(1.9, 1.3, 4, 1), P.thatch, { roughness: 0.95 }); roof.position.y = 2.75; roof.rotation.y = Math.PI / 4; roof.scale.z = 0.92; g.add(roof);
  for (let i = 0; i < 4; i++) g.add(at(mesh(new THREE.BoxGeometry(0.1, 0.9, 0.08), P.woodDark), -0.95 + i * 0.1 + 0.7, 0.45 - 0.2, 1.05 + 0.4, 0.5, 0, 0)); // steps
  if (name) { const t = tag(name, { w: 1.4 }); t.position.set(0, 3.9, 0); g.add(t); }
  return g;
}
export function campfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(at(rock(0.22, 40 + i), Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62)); }
  for (let i = 0; i < 3; i++) g.add(at(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), P.woodDark), 0, 0.15, 0, Math.PI / 2, (i / 3) * Math.PI, 0.2));
  const fl = new THREE.Group(); g.add(fl);
  [[0xff4d1a, 0.32, 0.75], [0xff9a1f, 0.22, 0.6], [0xffe066, 0.12, 0.42]].forEach(([c, r, h], i) => fl.add(at(mesh(new THREE.ConeGeometry(r, h, 10), mat(c, { emissive: c, emissiveIntensity: 1.6, roughness: 1 })), 0, 0.2 + h / 2, 0)));
  const glow = new THREE.PointLight(0xff9a3c, 6, 7, 1.6); glow.position.y = 0.8; g.add(glow);
  return { g, fl, glow };
}
export function pier(len = 6) {
  const g = new THREE.Group();
  for (let i = 0; i < len * 2; i++) g.add(at(mesh(new THREE.BoxGeometry(1.4, 0.08, 0.42), i % 2 ? P.wood : 0xd59a63), 0, 0.55, i * 0.5));
  for (let i = 0; i <= len; i++) for (const x of [-0.65, 0.65]) g.add(at(mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), P.woodDark), x, 0.0, i));
  return g;
}

// ---------- castaways: chibi, smooth, cute. pose: { wave, cheer, sit, lie, look:[rx,ry], face:'happy'|'wow'|'sad' } ----------
export function castaway(seed = 1, o = {}) {
  const R = rng(seed * 13 + 5), pick = (a) => a[Math.floor(R() * a.length)];
  const skin = o.skin ?? pick(SKINS), hair = o.hair ?? pick(HAIRS), top = o.top ?? pick(TOPS), bot = o.bottom ?? pick(BOTTOMS);
  const style = o.style ?? Math.floor(R() * 5), acc = o.acc ?? Math.floor(R() * 5);
  const root = new THREE.Group(), body = new THREE.Group(); body.position.y = 0.42; root.add(body);
  const legs = [-1, 1].map((sd) => { const l = new THREE.Group(); l.position.set(0.11 * sd, 0.42, 0); l.add(at(capsule(0.085, 0.2, skin), 0, -0.2, 0), at(capsule(0.1, 0.06, bot), 0, -0.06, 0)); root.add(l); return l; });
  body.add(at(capsule(0.2, 0.2, top), 0, 0.2, 0));                                            // torso
  body.add(at(mesh(new THREE.CylinderGeometry(0.205, 0.215, 0.12, 20), bot), 0, 0.04, 0));    // waistband
  const arms = [-1, 1].map((sd) => { const a = new THREE.Group(); a.position.set(0.22 * sd, 0.36, 0); a.add(at(capsule(0.065, 0.2, skin), 0, -0.15, 0), at(capsule(0.075, 0.04, top), 0, -0.02, 0)); a.rotation.z = 0.18 * sd; body.add(a); return a; });
  const head = new THREE.Group(); head.position.y = 0.74; body.add(head);
  head.add(sphere(0.34, skin, { roughness: 0.55 }));
  const face = o.face ?? 'happy';
  for (const sd of [-1, 1]) {
    const e = sphere(0.052, 0x1b1b22, { roughness: 0.25 }, 16, 12); e.scale.set(0.85, face === 'wow' ? 1.45 : 1.15, 0.6); e.position.set(0.12 * sd, 0.02, 0.31); head.add(e);
    head.add(at(sphere(0.017, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }, 8, 6), 0.12 * sd + 0.016, 0.05, 0.345));
    const b = sphere(0.06, 0xff8fa3, { transparent: true, opacity: 0.55, roughness: 1 }, 14, 10); b.scale.set(1, 0.55, 0.3); b.position.set(0.19 * sd, -0.07, 0.27); b.castShadow = false; head.add(b);
  }
  if (face === 'wow') head.add(at(sphere(0.05, 0x7a2c33, {}, 12, 10), 0, -0.12, 0.31));
  else { const m = mesh(new THREE.TorusGeometry(0.06, 0.016, 6, 16, Math.PI), 0x7a2c33); m.position.set(0, face === 'sad' ? -0.15 : -0.09, 0.315); m.rotation.z = face === 'sad' ? 0 : Math.PI; head.add(m); }
  // hair
  const hm = { roughness: 0.7 };
  const cap = mesh(new THREE.SphereGeometry(0.355, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, hm); cap.rotation.x = -0.32; cap.position.set(0, 0.02, -0.02); head.add(cap);
  if (style === 1) head.add(at(sphere(0.14, hair, hm), 0, 0.3, -0.18));                                   // bun
  if (style === 2) for (let i = 0; i < 5; i++) { const c = mesh(new THREE.ConeGeometry(0.08, 0.22, 10), hair, hm); c.position.set(-0.2 + i * 0.1, 0.31, 0.05); c.rotation.set(-0.3, 0, (i - 2) * -0.25); head.add(c); }
  if (style === 3) for (const sd of [-1, 1]) head.add(at(capsule(0.08, 0.3, hair, hm), 0.31 * sd, -0.12, -0.05));  // long sides
  if (style === 4) head.add(at(capsule(0.07, 0.32, hair, hm), 0, -0.05, -0.33, 0.3, 0, 0));                 // ponytail
  // accessories
  if (acc === 0) { const h = grp(at(mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.035, 28), 0xf0d48a, { roughness: 0.9 }), 0, 0, 0), at(mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.2, 24), 0xf0d48a, { roughness: 0.9 }), 0, 0.1, 0), at(mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.05, 24), 0xff5a5f), 0, 0.03, 0)); h.position.set(0, 0.26, -0.02); h.rotation.x = -0.12; head.add(h); }
  if (acc === 1) { const lei = mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20), 0xff6b9a, { roughness: 0.6 }); lei.rotation.x = Math.PI / 2; lei.position.y = 0.42; body.add(lei); }
  if (acc === 2) for (const sd of [-1, 1]) head.add(at(mesh(new THREE.BoxGeometry(0.14, 0.08, 0.02), 0x15151a, { roughness: 0.2, metalness: 0.3 }), 0.12 * sd, 0.03, 0.34));
  if (acc === 3) head.add(at(sphere(0.07, 0xffd23f, { roughness: 0.6 }), 0.22, 0.22, 0.16));               // hair flower
  // pose
  if (o.wave) { arms[1].rotation.set(0, 0, 2.5); }
  if (o.cheer) { arms[0].rotation.z = -2.6; arms[1].rotation.z = 2.6; }
  if (o.sit) { legs.forEach((l) => (l.rotation.x = -1.45)); root.position.y = -0.3; }
  if (o.look) head.rotation.set(...o.look, 0);
  const sh = contactShadow(0.42); root.add(sh);
  return { root, body, head, arms, legs, shadow: sh };
}
let SHADOW_TEX = null;
export function contactShadow(r = 0.5, opacity = 0.42) {
  SHADOW_TEX ||= canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(40,30,20,1)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.015; m.renderOrder = 1; return m;
}
export function place(o, x, z, ry = 0) { o.position.set(x, heightAt(x, z), z); o.rotation.y = ry; return o; }

// name tag: pill with avatar dot, readable on phone. hero = always on top.
export function tag(text, { w = 1.25, bg = '#ffffff', fg = '#15151a', dot = '#ffd21f', hero = false } = {}) {
  const W = 768, H = 230;
  const tex = canvasTex(W, H, (g) => {
    g.font = '900 96px K, Inter, Arial Black, sans-serif'; const tw = Math.min(W - 30, g.measureText(text).width + 150), x = (W - tw) / 2;
    g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.fillStyle = bg; g.beginPath(); g.roundRect(x, 14, tw, 150, 75); g.fill();
    g.beginPath(); g.moveTo(W / 2 - 24, 160); g.lineTo(W / 2, 212); g.lineTo(W / 2 + 24, 160); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = dot; g.beginPath(); g.arc(x + 70, 89, 42, 0, Math.PI * 2); g.fill();
    g.fillStyle = fg; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, x + 128, 92);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: !hero, fog: false }));
  sp.scale.set(w, w * H / W, 1); if (hero) sp.renderOrder = 30; return sp;
}

// a crowd of castaways (real meshes, varied by seed). spots = [[x, z, ry, opts]]
export function crowd(s, spots, seed = 100) { return spots.map(([x, z, ry, o], i) => { const c = castaway(seed + i, o || {}); place(c.root, x, z, ry); s.add(c.root); return c; }); }

// the standard paradise set: island, lagoon, palms, rocks, flowers, huts, campfire, pier, clouds
export function paradise(s, { night = false, huts = true } = {}) {
  island(s); lagoon(s, { night });
  const palms = [[-6.5, 5.5, 1, 6.2], [7.5, 4.2, 2, 5.6], [3.2, -6.8, 3, 6.6], [-9.2, -2.6, 4, 5.8], [9.6, -3.4, 5, 6.0], [-3.2, 9.6, 6, 5.0], [11.2, 1.8, 7, 4.6]].map(([x, z, sd, h]) => { const p = palm(sd, h, 0.6); place(p.g, x, z); s.add(p.g); return p; });
  s.userData.palms = palms;
  for (const [x, z, r, sd] of [[-4.6, 11.6, 0.55, 1], [10.6, 7.4, 0.8, 2], [-12.6, 3.4, 0.6, 3], [5.4, 11.8, 0.4, 4], [-1.6, -12.6, 0.7, 5]]) { const k = rock(r, sd); place(k, x, z); s.add(k); }
  flowers(s, 220, 9, (x, z) => { const q = Math.hypot(x, z) / shore(Math.atan2(z, x)); return q < 0.46; });
  const H = [];
  if (huts) for (const [x, z, ry, w] of [[-3.6, -3.2, 0.5, 0xf3d9a8], [2.6, -2.4, -0.4, 0xffd1dc], [-0.4, -6.6, 0.1, 0xd6f0ff]]) { const h = hut(x * 10 + z, { wall: w }); place(h, x, z, ry); s.add(h); H.push(h); }
  const fire = campfire(); place(fire.g, 0.6, 2.2); s.add(fire.g);
  s.userData.fire = fire;
  const pr = pier(6); pr.position.set(9.8, 0, 9.6); pr.rotation.y = 0.75; s.add(pr);
  const um = umbrella(); place(um, -3.4, 10.6); s.add(um);
  for (const [x, z, c, ry] of [[-3.0, 11.4, 0x4f8cff, 0.2], [-4.1, 11.2, 0xff8ad8, -0.15]]) { const t = towel(c); t.rotation.z = ry; place(t, x, z); t.position.y += 0.03; s.add(t); }
  const sb = surfboard(0x2dd4bf); place(sb, 4.4, 10.6, -0.5); sb.rotation.z = -0.15; s.add(sb);
  const sb2 = surfboard(0xff9142); place(sb2, 4.9, 10.3, -0.3); sb2.rotation.z = 0.08; s.add(sb2);
  return { palms, huts: H, fire };
}


// ---------- Day 0 props ----------
// volcano: smooth lathe with a crater, lava glow and a little smoke. returns { g, rim (world-space summit point), lava }
export function volcano(x = -4.6, z = -7.8) {
  const prof = [[4.6, -0.4], [4.2, 0.6], [3.4, 1.9], [2.5, 3.4], [1.75, 4.7], [1.45, 5.05], [1.2, 4.95], [0.9, 4.6], [0.01, 4.5]].map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(prof, 48), p = geo.attributes.position, col = [], c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); c.setHex(0x8a6a58).lerp(new THREE.Color(0x5fbf55), 1 - sstep(0.3, 1.6, y)).lerp(new THREE.Color(0x6b4f45), sstep(3.6, 5.0, y)); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const v = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); v.castShadow = true; v.receiveShadow = true;
  const g = new THREE.Group(); g.add(v); const base = heightAt(x, z); g.position.set(x, base, z);
  const lava = mesh(new THREE.CircleGeometry(1.15, 32), mat(0xff6a1a, { emissive: 0xff4a00, emissiveIntensity: 1.8 })); lava.rotation.x = -Math.PI / 2; lava.position.y = 4.62; lava.castShadow = false; g.add(lava);
  const glow = new THREE.PointLight(0xff7a2a, 8, 9, 1.5); glow.position.y = 5.4; g.add(glow);
  const smoke = [];
  for (let i = 0; i < 4; i++) { const sm = mesh(new THREE.SphereGeometry(0.55 + i * 0.15, 18, 12), mat(0xf2efea, { transparent: true, opacity: 0.75, roughness: 1 })); sm.position.set(0.2 * i, 5.6 + i * 0.9, -0.15 * i); sm.castShadow = false; g.add(sm); smoke.push(sm); }
  return { g, lava, smoke, glow, rim: new THREE.Vector3(x + 1.38, base + 5.05, z + 0.25) };
}
export function crab() {
  const r = 0xff5a4a, g = grp(at(sphere(0.26, r, { roughness: 0.45 }), 0, 0.2, 0));
  g.children[0].scale.set(1.25, 0.62, 0.95);
  for (const sd of [-1, 1]) {
    g.add(at(sphere(0.11, r), 0.36 * sd, 0.28, 0.2), at(mesh(new THREE.ConeGeometry(0.07, 0.16, 10), r), 0.42 * sd, 0.36, 0.26, 0, 0, -0.6 * sd));
    for (let k = 0; k < 3; k++) g.add(at(capsule(0.025, 0.14, 0xe0473a), 0.27 * sd, 0.1, -0.1 + k * 0.1, 0, 0, 0.9 * sd));
    g.add(at(capsule(0.02, 0.1, 0xe0473a), 0.08 * sd, 0.36, 0.12), at(sphere(0.045, 0x15151a, { roughness: 0.2 }, 12, 10), 0.08 * sd, 0.44, 0.13), at(sphere(0.014, 0xffffff, {}, 8, 6), 0.08 * sd + 0.012, 0.455, 0.168));
  }
  return g;
}
export function ghost() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, emissive: 0xd8ecff, emissiveIntensity: 0.55, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.45, 8, 20), m); body.position.y = 0.75;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 18), m); tail.position.set(0.06, 0.25, -0.05); tail.rotation.x = Math.PI + 0.3;
  const g = grp(body, tail);
  for (const sd of [-1, 1]) g.add(at(sphere(0.055, 0x1b1b22, { roughness: 0.2 }, 14, 10), 0.11 * sd, 0.92, 0.3), at(sphere(0.06, 0xff9fb0, { transparent: true, opacity: 0.6 }, 12, 8), 0.2 * sd, 0.8, 0.26));
  g.add(at(sphere(0.05, 0x1b1b22, {}, 12, 10), 0, 0.78, 0.33));
  const halo = new THREE.PointLight(0xcfe6ff, 2.5, 4, 1.5); halo.position.y = 0.8; g.add(halo);
  return g;
}
export function shield(r = 0.75) {
  const m = new THREE.MeshStandardMaterial({ color: 0x8ff3ff, transparent: true, opacity: 0.28, emissive: 0x38d9ff, emissiveIntensity: 0.8, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const d = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 8, 48), mat(0xbaf7ff, { emissive: 0x63e0ff, emissiveIntensity: 1.6 })); ring.rotation.x = Math.PI / 2;
  return grp(d, ring);
}
export function bolt(from, to, seed = 3) {
  const g = new THREE.Group(), R = rng(seed), core = mat(0xffffff, { emissive: 0xfff6b0, emissiveIntensity: 3 }), glowM = new THREE.MeshBasicMaterial({ color: 0xfff08a, transparent: true, opacity: 0.35, depthWrite: false });
  let a = from.clone();
  for (let i = 1; i <= 8; i++) {
    const b = from.clone().lerp(to, i / 8); if (i < 8) { b.x += (R() - 0.5) * 1.2; b.z += (R() - 0.5) * 0.4; }
    const len = a.distanceTo(b), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    for (const [r, m] of [[0.07, core], [0.26, glowM]]) { const sg = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), m); sg.position.copy(a).lerp(b, 0.5); sg.quaternion.copy(q); g.add(sg); }
    a = b;
  }
  return g;
}
export function crown() {
  const m = mat(0xffc93c, { metalness: 0.55, roughness: 0.28, emissive: 0x6a4500, emissiveIntensity: 0.25 });
  const g = grp(mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.16, 28, 1, true), m));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, sp = mesh(new THREE.ConeGeometry(0.06, 0.2, 12), m); sp.position.set(Math.cos(a) * 0.22, 0.17, Math.sin(a) * 0.22); g.add(sp); g.add(at(sphere(0.035, i % 2 ? 0xff4d6d : 0x4fd1ff, { roughness: 0.15, emissive: i % 2 ? 0x7a0018 : 0x00507a, emissiveIntensity: 0.6 }, 10, 8), Math.cos(a) * 0.235, 0.03, Math.sin(a) * 0.235)); }
  return g;
}
export function boat() { // a cute island ferry
  const g = new THREE.Group();
  const hull = mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0xff5a5f, { roughness: 0.45 }); hull.scale.set(4.2, 1.3, 1.5); hull.position.y = 1.0; g.add(hull);
  g.add(at(mesh(new THREE.CylinderGeometry(1.48, 1.48, 0.25, 32), 0xffffff), 0, 1.05, 0)).children.at(-1).scale.set(2.84, 1, 1);
  g.add(at(mesh(new THREE.BoxGeometry(3.4, 1.3, 1.9), 0xffffff, { roughness: 0.5 }), -0.4, 1.8, 0));
  g.add(at(mesh(new THREE.BoxGeometry(3.6, 0.18, 2.1), 0x4f8cff), -0.4, 2.52, 0));
  for (let i = 0; i < 4; i++) g.add(at(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), 0x9ad7ff, { emissive: 0x3a8ac0, emissiveIntensity: 0.35 }), -1.7 + i * 0.85, 1.85, 0.96, Math.PI / 2));
  const ch = grp(at(mesh(new THREE.CylinderGeometry(0.38, 0.44, 1.2, 24), 0xffc93c), 0, 0, 0), at(mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.2, 24), 0xff5a5f), 0, 0.45, 0)); ch.position.set(0.9, 3.1, 0); g.add(ch);
  g.add(at(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), 0xffffff), -1.8, 3.3, 0), at(mesh(new THREE.BoxGeometry(0.7, 0.42, 0.02), 0x34c38f), -1.45, 3.85, 0));
  const puffs = [0, 1, 2].map((i) => { const p = mesh(new THREE.SphereGeometry(0.35 + i * 0.12, 16, 12), mat(0xffffff, { transparent: true, opacity: 0.8 })); p.position.set(0.9 + i * 0.3, 4.0 + i * 0.55, 0); p.castShadow = false; g.add(p); return p; });
  g.userData.puffs = puffs; return g;
}
export function sign(lines, { w = 1.8, h = 1.4, post = 1.0 } = {}) {
  const tex = canvasTex(768, 600, (g, W, H) => {
    g.fillStyle = '#d89a5e'; g.beginPath(); g.roundRect(0, 0, W, H, 40); g.fill(); g.fillStyle = 'rgba(120,70,30,0.25)'; for (let y = 0; y < H; y += 120) g.fillRect(0, y + 110, W, 6);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([t, size, y, c]) => { g.fillStyle = c || '#4a2a12'; g.font = `900 ${size}px K, Inter, Arial Black, sans-serif`; g.fillText(t, W / 2, y); });
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.09), [mat(0xb97a45), mat(0xb97a45), mat(0xb97a45), mat(0xb97a45), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), mat(0xb97a45)]);
  board.position.y = post + h / 2; board.castShadow = true;
  return grp(at(mesh(new THREE.CylinderGeometry(0.07, 0.08, post + h * 0.55, 10), P.woodDark), 0, (post + h * 0.55) / 2, -0.07), board);
}
export function stars(n = 900, seed = 7, r = 700) {
  const R = rng(seed), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = R() * 0.9 + 0.08, th = R() * Math.PI * 2, s = Math.sqrt(1 - u * u); p.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, fog: false }));
}
export function moon(r = 14) { const m = sphere(r, 0xfff6dc, { emissive: 0xfff1c8, emissiveIntensity: 1.1, fog: false }, 32, 20); m.castShadow = false; return m; }
export function stormCloud(seed = 1, sc = 1) { const c = cloud(seed, sc); c.traverse((o) => { if (o.material) o.material = mat(0x4a4466, { roughness: 1, emissive: 0x1a1830, emissiveIntensity: 0.4 }); }); return c; }
