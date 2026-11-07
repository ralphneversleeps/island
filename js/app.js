// Last Follower Standing · the island site. Same paradise kit as the videos, live in the browser.
// data/roster.json → every castaway on a fixed spot (by castaway #), instanced; #@handle flies to yours.
import { THREE, stage, paradise, volcano, castaway, heightAt, shore, rng, SKINS, HAIRS, TOPS, BOTTOMS, crown, cloud, ghost } from './paradise.js';
import { ACCOUNT, SITE_TITLE } from './config.js';

const $ = (id) => document.getElementById(id);
const IG = `https://instagram.com/${ACCOUNT}`, DM = `https://ig.me/m/${ACCOUNT}`;

// ---------- data ----------
const R = await fetch('data/roster.json', { cache: 'no-cache' }).then((r) => r.json());
const people = R.c.map(([h, n, dead, sh, f, rec]) => ({ h, n, dead: !!dead, sh, founder: !!(f & 1), rec: rec || 0 }));
const byHandle = new Map(people.map((p) => [p.h, p]));
$('alive').textContent = people.filter((p) => !p.dead).length.toLocaleString('en-US');
if (!people.length) { $('hint').textContent = 'First headcount coming soon 🏝️ comment your last words on the post'; }
$('dayn').textContent = R.day ?? 0;

// ---------- world ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
const st = stage({ span: 24, fov: 40 }); const scene = st.scene, camera = st.cam;
st.sun.shadow.mapSize.set(2048, 2048);
const world = paradise(scene); const volc = volcano(); scene.add(volc.g);
[[-40, 26, -70, 3.4, 1], [36, 30, -90, 4, 2], [-80, 34, -40, 4.5, 3], [70, 24, 10, 3, 4], [10, 36, 90, 3.6, 5]].forEach(([x, y, z, s, sd]) => { const c = cloud(sd, s); c.position.set(x, y, z); scene.add(c); });

// ---------- spots: a fixed spiral from the campfire outward; past the shore you get a raft ----------
const CENTER = new THREE.Vector2(0.6, 2.2);
const AVOID = [[-3.6, -3.2, 1.7], [2.6, -2.4, 1.7], [-0.4, -6.6, 1.7], [0.6, 2.2, 1.1], [-4.6, -7.8, 5.0], [9.8, 9.6, 1.2],
  ...world.palms.map((p) => [p.g.position.x, p.g.position.z, 0.45])];
function spots(count) {
  const out = [], GA = Math.PI * (3 - Math.sqrt(5)), STEP = 0.62;
  for (let k = 0; out.length < count && k < count * 4 + 200; k++) {
    const r = 1.35 + STEP * Math.sqrt(k), a = k * GA, x = CENTER.x + Math.cos(a) * r, z = CENTER.y + Math.sin(a) * r;
    if (AVOID.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    const y = heightAt(x, z), raft = y < 0.12;
    out.push({ x, z, y: raft ? 0.16 : y, raft, ry: Math.atan2(CENTER.x - x, CENTER.y - z) });
  }
  return out;
}
const S = spots(people.length);
people.forEach((p, i) => (p.spot = S[i]));

// ---------- the crowd: one instanced mesh per body part, colours from the same seed as the hero model ----------
function seedOf(h) { let x = 2166136261; for (const ch of h) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return (x >>> 0) % 100000 + 1; }
function look(seed) { const r = rng(seed * 13 + 5), pk = (a) => a[Math.floor(r() * a.length)]; return { skin: pk(SKINS), hair: pk(HAIRS), top: pk(TOPS), bot: pk(BOTTOMS) }; }
const N = people.length, M = new THREE.MeshStandardMaterial({ roughness: 0.6 });
const part = (geo, count = N) => { const m = new THREE.InstancedMesh(geo, M, count); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
const G = {
  legs: part(new THREE.CapsuleGeometry(0.1, 0.2, 4, 10).scale(2.1, 1, 1).translate(0, 0.21, 0)),
  body: part(new THREE.CapsuleGeometry(0.2, 0.2, 6, 14).translate(0, 0.62, 0)),
  head: part(new THREE.SphereGeometry(0.34, 18, 14).translate(0, 1.16, 0)),
  hair: part(new THREE.SphereGeometry(0.355, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52).rotateX(-0.32).translate(0, 1.18, -0.02)),
  eyes: part(new THREE.SphereGeometry(0.05, 8, 6).scale(0.85, 1.15, 0.6), N * 2),
  raft: part(new THREE.BoxGeometry(1.1, 0.12, 0.9).translate(0, -0.06, 0)),
};
const gm = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, emissive: 0xd8ecff, emissiveIntensity: 0.5 });
G.ghost = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.32, 0.45, 6, 14).translate(0, 0.95, 0), gm, N); G.ghost.frustumCulled = false; scene.add(G.ghost);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0), col = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
const WOOD = new THREE.Color(0xc98a52), INK = new THREE.Color(0x1b1b22);
function place(i, show = true) {
  const p = people[i], s = p.spot, c = look(seedOf(p.h)), sc = show ? one : zero;
  q.setFromAxisAngle(UP, s.ry); v.set(s.x, s.y, s.z); m4.compose(v, q, sc);
  const living = show && !p.dead;
  for (const [k, colr] of [['legs', c.bot], ['body', c.top], ['head', c.skin], ['hair', c.hair]]) { G[k].setMatrixAt(i, living ? m4 : m4.clone().compose(v, q, zero)); G[k].setColorAt(i, col.setHex(colr)); }
  G.ghost.setMatrixAt(i, show && p.dead ? m4 : new THREE.Matrix4().compose(v, q, zero));
  G.raft.setMatrixAt(i, show && s.raft ? m4 : new THREE.Matrix4().compose(v, q, zero)); G.raft.setColorAt(i, WOOD);
  for (const sd of [0, 1]) {
    const e = new THREE.Vector3((sd ? 0.12 : -0.12), 1.18, 0.31).applyQuaternion(q).add(v);
    G.eyes.setMatrixAt(i * 2 + sd, new THREE.Matrix4().compose(e, q, living ? one : zero)); G.eyes.setColorAt(i * 2 + sd, INK);
  }
}
for (let i = 0; i < N; i++) place(i);
Object.values(G).forEach((g) => { g.instanceMatrix.needsUpdate = true; if (g.instanceColor) g.instanceColor.needsUpdate = true; });

// ---------- camera: orbit + pinch + fly-to ----------
const cam = { target: new THREE.Vector3(0, 1, 3), theta: 0.35, phi: 0.95, r: 48 };
let fly = null, lastInput = 0;
function applyCam() { const { target: t, theta, phi, r } = cam; camera.position.set(t.x + r * Math.sin(phi) * Math.sin(theta), t.y + r * Math.cos(phi), t.z + r * Math.sin(phi) * Math.cos(theta)); camera.lookAt(t); }
const ptrs = new Map(); let pinch0 = 0;
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); fly = null; lastInput = performance.now(); hideHint(); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } });
canvas.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p) return; lastInput = performance.now();
  if (ptrs.size === 1) { cam.theta -= (e.clientX - p.x) * 0.006; cam.phi = Math.min(1.45, Math.max(0.2, cam.phi - (e.clientY - p.y) * 0.004)); }
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) cam.r = Math.min(90, Math.max(3.5, cam.r * pinch0 / d)); pinch0 = d; }
});
const up = (e) => { ptrs.delete(e.pointerId); pinch0 = 0; };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.r = Math.min(90, Math.max(3.5, cam.r * (1 + e.deltaY * 0.0012))); fly = null; lastInput = performance.now(); hideHint(); }, { passive: false });
function flyTo(t, r, phi, ms = 1600, theta = cam.theta) {
  let th = theta; while (th - cam.theta > Math.PI) th -= 2 * Math.PI; while (cam.theta - th > Math.PI) th += 2 * Math.PI;  // shortest way round
  fly = { a: { t: cam.target.clone(), r: cam.r, phi: cam.phi, theta: cam.theta }, b: { t, r, phi, theta: th }, t0: performance.now(), ms };
}
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

// ---------- selection: the hero model replaces your instance ----------
let sel = null, hero = null;
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd21f })); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
function select(p, { flyIn = true } = {}) {
  if (sel) { place(sel.i); dirty(); scene.remove(hero.root); }
  sel = p; p.i = people.indexOf(p); place(p.i, false); dirty();
  hero = p.dead ? { root: ghost() } : castaway(seedOf(p.h), { wave: true });
  if (p.founder && !p.dead) { const c = crown(); c.position.set(0, 0.33, -0.01); hero.head.add(c); }
  hero.root.position.set(p.spot.x, p.spot.y, p.spot.z); hero.root.rotation.y = p.spot.ry; scene.add(hero.root);
  ring.position.set(p.spot.x, p.spot.y + 0.03, p.spot.z); ring.visible = true;
  if (flyIn) flyTo(new THREE.Vector3(p.spot.x, p.spot.y + 0.9, p.spot.z), 7.5, 1.15, 1800, p.spot.ry);  // land in front of their face
  showCard(p); history.replaceState(null, '', '#@' + p.h); $('q').value = '@' + p.h;
}
function dirty() { Object.values(G).forEach((g) => (g.instanceMatrix.needsUpdate = true)); }

function showCard(p) {
  hideHint();
  $('join').classList.add('hide'); $('card').classList.remove('hide');
  $('ctitle').textContent = '@' + p.h;
  const B = [`<span class="b">CASTAWAY #${p.n.toLocaleString('en-US')}</span>`];
  if (p.founder) B.push('<span class="b gold">👑 ORIGINAL CASTAWAY</span>');
  B.push(p.dead ? '<span class="b dead">💀 DEAD</span>' : '<span class="b alive">ALIVE</span>');
  if (!p.dead) B.push(`<span class="b">🛡️ ${p.sh} SHIELD${p.sh === 1 ? '' : 'S'}</span>`);
  if (p.rec) B.push(`<span class="b">👯 ${p.rec} RECRUITED</span>`);
  $('cbadges').innerHTML = B.join('');
  $('cline').textContent = p.dead ? 'The island took you. Recruit 3 friends to come back as a ghost… then alive.' : p.sh === 0 ? '⚠️ No shields. If the island draws your name tonight, you are gone.' : p.spot.raft ? 'The island is full, so you washed up on a raft. Still in the game.' : 'Safe for now. Keep your shields up.';
  $('shield').href = DM; $('shield').textContent = p.dead ? '👻 Revive' : '🛡️ DM ALIVE';
}
const updated = R.updatedAt ? new Date(R.updatedAt) : null;
const ago = () => { if (!updated) return 'soon'; const m = Math.round((Date.now() - updated) / 60000); return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
function showJoin(h) {
  hideHint(); $('card').classList.add('hide'); $('join').classList.remove('hide'); $('jtitle').textContent = '@' + h; $('jgo').href = IG;
  $('jtext').innerHTML = `Not on the island <b>yet</b>. If you already commented or DM'd <b>SPAWN</b>, you wash up at the next headcount (last one ${ago()}). Not in yet? Follow + DM <b>SPAWN</b>.`;
}
$('x').onclick = () => { $('card').classList.add('hide'); ring.visible = false; if (sel) { place(sel.i); dirty(); scene.remove(hero.root); sel = null; } history.replaceState(null, '', location.pathname); };
$('share').onclick = async () => {
  if (!sel) return;
  const url = location.origin + location.pathname + '#@' + sel.h;
  const text = sel.dead ? `I died on ${SITE_TITLE} 💀 avenge me` : `I'm castaway #${sel.n} on ${SITE_TITLE} 🏝️ come wash up next to me`;
  try { if (navigator.share) await navigator.share({ title: SITE_TITLE, text, url }); else { await navigator.clipboard.writeText(url); $('share').textContent = 'Link copied ✓'; setTimeout(() => ($('share').textContent = 'Share my castaway'), 1600); } } catch { /* share sheet closed */ }
};
function find(raw) { const h = raw.trim().replace(/^@/, '').toLowerCase(); return { h, p: byHandle.get(h) }; }
$('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const { h, p } = find($('q').value); if (!h) return; p ? select(p) : showJoin(h); $('q').blur(); } });

// ---------- name tags (HTML, nearest ~28 to the view) ----------
const TAGS = Array.from({ length: 28 }, () => { const d = document.createElement('div'); d.className = 'tag'; d.style.display = 'none'; $('tags').appendChild(d); return d; });
const meTag = document.createElement('div'); meTag.className = 'tag me'; meTag.style.display = 'none'; $('tags').appendChild(meTag);
let near = [], frameN = 0;
function pickNear() {
  const t = cam.target, lim = Math.max(6, cam.r * 0.9);
  near = people.filter((p) => p !== sel && Math.abs(p.spot.x - t.x) < lim && Math.abs(p.spot.z - t.z) < lim)
    .map((p) => [p, Math.hypot(p.spot.x - camera.position.x, p.spot.z - camera.position.z)]).sort((a, b) => a[1] - b[1]).slice(0, cam.r < 30 ? 28 : 0).map((x) => x[0]);
}
const pv = new THREE.Vector3();
function tagAt(d, p, html, dy = 1.75) {
  pv.set(p.spot.x, p.spot.y + dy, p.spot.z).project(camera);
  if (pv.z > 1 || Math.abs(pv.x) > 1.1 || Math.abs(pv.y) > 1.1) { d.style.display = 'none'; return; }
  d.style.display = 'flex'; d.style.left = ((pv.x + 1) / 2) * innerWidth + 'px'; d.style.top = ((1 - pv.y) / 2) * innerHeight + 'px';
  if (d.dataset.h !== p.h) { d.innerHTML = html; d.dataset.h = p.h; d.classList.toggle('dead', p.dead && d !== meTag); }
}
function drawTags() {
  if (frameN++ % 8 === 0) pickNear();
  TAGS.forEach((d, i) => { const p = near[i]; if (!p) { d.style.display = 'none'; return; } tagAt(d, p, `<i></i>${p.founder ? '👑 ' : ''}@${p.h}${p.dead ? ' 💀' : ''}`); });
  if (sel) tagAt(meTag, sel, `<i></i>@${sel.h}`, 2.05); else meTag.style.display = 'none';
}

// ---------- HUD clock ----------
const leaves = R.boatLeaves ? Date.parse(R.boatLeaves) : null;
function clock() {
  if (!leaves) { $('boat').textContent = '⛴️ THE BOAT HAS LEFT'; return; }
  const s = Math.max(0, Math.floor((leaves - Date.now()) / 1000));
  $('clock').textContent = s ? [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((x) => String(x).padStart(2, '0')).join(':') : 'GONE';
}
setInterval(clock, 1000); clock();
let hinted = false; function hideHint() { if (!hinted) { hinted = true; $('hint').style.opacity = 0; } }

// ---------- loop ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const t0 = performance.now();
function frame(now) {
  const t = (now - t0) / 1000;
  (scene.userData.waters || []).forEach((w) => w.userData.setTime(t));
  world.palms.forEach((p, i) => { p.crown.rotation.z = Math.sin(t * 1.3 + i * 1.9) * 0.05; });
  if (world.fire) { world.fire.fl.children.forEach((f, i) => f.scale.set(1, 0.85 + 0.25 * Math.abs(Math.sin(t * (9 + i * 3) + i)), 1)); }
  if (fly) { const u = Math.min(1, (now - fly.t0) / fly.ms), e = ease(u); cam.target.lerpVectors(fly.a.t, fly.b.t, e); cam.r = fly.a.r + (fly.b.r - fly.a.r) * e; cam.phi = fly.a.phi + (fly.b.phi - fly.a.phi) * e; cam.theta = fly.a.theta + (fly.b.theta - fly.a.theta) * e; if (u >= 1) fly = null; }
  else if (now - lastInput > 6000 && !sel) cam.theta += 0.0012;                                          // idle drift
  if (hero && sel && !sel.dead) { hero.arms[1].rotation.x = Math.sin(t * 8) * 0.35; hero.body.position.y = 0.42 + Math.abs(Math.sin(t * 4)) * 0.03; }
  if (ring.visible) ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
  applyCam(); renderer.render(scene, camera); drawTags();
  requestAnimationFrame(frame);
}

// open on a personal link (#@handle), or sweep in over the island
const want = decodeURIComponent(location.hash.slice(1)).replace(/^@/, '').toLowerCase();
applyCam();
requestAnimationFrame((n) => { frame(n); $('load').classList.add('gone');
  if (want) { const p = byHandle.get(want); setTimeout(() => (p ? select(p) : showJoin(want)), 500); }
  else flyTo(new THREE.Vector3(0.6, 1, 2.5), 30, 0.9, 2600);
});
window.LFS = { people, select, byHandle };
