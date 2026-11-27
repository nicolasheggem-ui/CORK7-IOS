import * as THREE from 'three';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ================= SETTINGS / STATE ================= */
const settings = { quality:'medium', sound:true };
let pow = parseInt(localStorage.getItem('cork7_pow') || '625');
const S = {
  mode:'menu',            // menu | play | pause
  speed:0, x:0, z:0, jy:0, vy:0, jump:false, airTime:0,
  vx:0, lean:0, score:0, meters:0, time:0,
  grab:null, grabOn:false, grabPts:0,
  high: parseInt(localStorage.getItem('cork7_hs') || '0')
};
$('#pow-amt').textContent = pow;
$('#pause-hs').textContent = S.high;

/* ================= AUDIO ================= */
let AC = null;
function beep(f, d=0.08, type='square', v=0.04) {
  if (!settings.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = v;
    o.connect(g); g.connect(AC.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.stop(AC.currentTime + d);
  } catch(e) {}
}

/* ================= THREE SETUP ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaebfd6);
scene.fog = new THREE.Fog(0xaebfd6, 60, 320);

const camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, 0.1, 2000);
camera.position.set(6, 3.4, 8);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdfeaff, 0x8a97ad, 0.95));
const sun = new THREE.DirectionalLight(0xfff2dd, 1.4);
sun.position.set(60, 120, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
scene.add(sun);

/* ================= TERRAIN ================= */
function heightAt(x, z) {
  return Math.sin(z * Math.PI*2/500) * 1.1 + Math.sin(x * Math.PI*2/500 + 1.3) * 0.7;
}
const tGeo = new THREE.PlaneGeometry(600, 1400, 80, 160);
{
  const p = tGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setZ(i, heightAt(p.getX(i), -p.getY(i)));
  }
  tGeo.computeVertexNormals();
}
const terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ color:0xeef2f8, roughness:0.95 }));
terrain.rotation.x = -Math.PI/2;
terrain.position.z = -500;
terrain.receiveShadow = true;
scene.add(terrain);

/* ================= MOUNTAINS ================= */
const mtnMat = new THREE.MeshStandardMaterial({ color:0x8ba1c2, roughness:1, flatShading:true });
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2;
  const r = 260 + Math.random() * 160;
  const h = 50 + Math.random() * 70;
  const m = new THREE.Mesh(new THREE.ConeGeometry(50 + Math.random()*60, h, 5), mtnMat);
  m.position.set(Math.cos(a) * r, h/2 - 8, Math.sin(a) * r - 200);
  m.rotation.y = Math.random() * 3;
  scene.add(m);
}

/* ================= DECOR (recycled) ================= */
const decor = { trees:[], fence:[], liftP:[], liftC:[], arch:[] };

const snowMat = new THREE.MeshStandardMaterial({ color:0xf4f7fb, roughness:0.9 });
const trunkMat = new THREE.MeshStandardMaterial({ color:0x5a4632, roughness:1 });
function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.4, 6), trunkMat);
  trunk.position.y = 0.7; g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.7 - i*0.42, 1.9, 7), snowMat);
    c.position.y = 1.6 + i * 1.15; g.add(c);
  }
  const s = 0.8 + Math.random() * 0.9;
  g.scale.setScalar(s);
  g.traverse(o => o.castShadow = true);
  return g;
}
for (let i = 0; i < 46; i++) {
  const t = makeTree();
  t.position.set((Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 130), 0, 40 - Math.random() * 1040);
  scene.add(t); decor.trees.push(t);
}

const fenceMat = new THREE.MeshStandardMaterial({ color:0x2b6fd6, roughness:0.6 });
function makeFencePost() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), fenceMat);
  post.position.y = 0.8; g.add(post);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 20), fenceMat);
  rail.position.set(0, 1.35, -10); g.add(rail);
  return g;
}
for (const side of [-13, 13]) {
  for (let i = 0; i < 52; i++) {
    const f = makeFencePost();
    f.position.set(side, 0, 30 - i * 20);
    scene.add(f); decor.fence.push(f);
  }
}

const poleMat = new THREE.MeshStandardMaterial({ color:0x3c4658, roughness:0.7 });
function makeLiftPole() {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 11, 8), poleMat);
  p.position.y = 5.5; g.add(p);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 0.25), poleMat);
  arm.position.y = 10.6; g.add(arm);
  return g;
}
function makeChair() {
  const g = new THREE.Group();
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 4), poleMat);
  line.position.y = -1.2; g.add(line);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.6), new THREE.MeshStandardMaterial({ color:0xd64545 }));
  seat.position.y = -2.5; g.add(seat);
  return g;
}
for (let i = 0; i < 26; i++) {
  const p = makeLiftPole();
  p.position.set(30, heightAt(30, 0), 20 - i * 40);
  scene.add(p); decor.liftP.push(p);
}
const cableMat = new THREE.MeshStandardMaterial({ color:0x222a38 });
for (let i = 0; i < 26; i++) {
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 40), cableMat);
  c.position.set(30, 10.4, 0 - i * 40);
  scene.add(c); decor.liftC.push(c);
}
for (let i = 0; i < 12; i++) {
  const ch = makeChair();
  ch.position.set(30, 8.2, 10 - i * 80);
  scene.add(ch); decor.liftC.push(ch);
}

function makeTextTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.font = '900 72px "Archivo Black", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f3ecdd';
  g.fillText(text, 256, 66);
  return new THREE.CanvasTexture(c);
}
function makeArch() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color:0x8a5a2b, roughness:0.8 });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(10, 0.7, 10, 40, Math.PI), wood);
  arc.position.y = 0.5; g.add(arc);
  for (const sx of [-10, 10]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8, 1.4), wood);
    leg.position.set(sx, 3.5, 0); g.add(leg);
  }
  const txt = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75),
    new THREE.MeshBasicMaterial({ map: makeTextTexture('BIG AIR'), transparent:true }));
  txt.position.y = 9.2; g.add(txt);
  return g;
}
for (let i = 0; i < 3; i++) {
  const a = makeArch();
  a.position.set(0, heightAt(0, -140 - i*600), -140 - i*600);
  scene.add(a); decor.arch.push(a);
}

/* ================= SNOW PARTICLES ================= */
const P_COUNT = 900;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(P_COUNT * 3);
for (let i = 0; i < P_COUNT; i++) {
  pPos[i*3] = (Math.random()-0.5) * 120;
  pPos[i*3+1] = Math.random() * 50;
  pPos[i*3+2] = (Math.random()-0.5) * 120;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color:0xffffff, size:0.35, transparent:true, opacity:0.85 }));
scene.add(particles);

/* ================= SKIER ================= */
const OUTFITS = [
  { name:'BROADCAST TEE', jacket:0x3aa6b9, pants:0xf2efe9, skis:0x1c2b3a, goggles:0x66c4d6, gloves:0xf2efe9 },
  { name:'PINK NOISE',    jacket:0xf5f0f0, pants:0xe58bb0, skis:0x222831, goggles:0xff9ecb, gloves:0xf5f0f0 },
  { name:'TREELINE',      jacket:0x6b7a4f, pants:0x3a3a3a, skis:0x2e3b2e, goggles:0xb7c4a0, gloves:0x2b2b2b },
  { name:'SWITCHYARD',    jacket:0xffffff, pants:0xcbb58a, skis:0x8a8f98, goggles:0xd9d9d9, gloves:0xffffff }
];
let curOutfit = 0;

const skier = new THREE.Group();
const upper = new THREE.Group(); upper.position.y = 1.05; skier.add(upper);
let skiL, skiR, torso, armL, armR, headG;

let legL, legR, kneeL, kneeR, helmetMesh, scarfMesh, strapL, strapR;

const STEEZE_SKINS = [
  { name: 'PARK PRO', tee: 0xf4f6fa, skin: 0xd9a077, pants: 0x111318, straps: 0xd93848, helmet: 0xf5f7fa, mask: 0xeef2f7, gloves: 0x222630, skis: 0xe8dec8, goggles: 0x22d3ee },
  { name: 'CYBER NEON', tee: 0x141824, skin: 0xc68b63, pants: 0x0b0e14, straps: 0x7ef0d4, helmet: 0x141824, mask: 0x1f2937, gloves: 0x7ef0d4, skis: 0x7ef0d4, goggles: 0x7ef0d4 },
  { name: 'ARCTIC GHOST', tee: 0xdbeafe, skin: 0xd9a077, pants: 0xf1f5f9, straps: 0xf97316, helmet: 0xffffff, mask: 0x1e293b, gloves: 0xf97316, skis: 0x38bdf8, goggles: 0xf97316 },
  { name: 'SUNSET STEEZE', tee: 0xf43f5e, skin: 0xc68b63, pants: 0x12141a, straps: 0xfacc15, helmet: 0xfaf5eb, mask: 0xf8fafc, gloves: 0xfacc15, skis: 0xfacc15, goggles: 0xfacc15 }
];

function makeCamoTexture(c1, c2, c3) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, 256, 256);
  const cols = [c2, c3, c1];
  for (let i = 0; i < 65; i++) {
    g.fillStyle = cols[i % cols.length];
    g.beginPath();
    g.ellipse((i * 73) % 256, (i * 137) % 256, 18 + (i % 24), 10 + (i % 16), (i % 6) * 0.5, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

STEEZE_SKINS.push({
  name: 'PINK CAMO PRO',
  tee: 0xf7f9fc,
  skin: 0xd9a077,
  pants: 0xf4a8c8,
  camo: ['#f8eef3', '#e07aa8', '#9e4770'],
  longSleeve: true,
  poles: true,
  straps: 0xe07aa8,
  helmet: 0xf7f9fc,
  mask: 0xf1f5f9,
  gloves: 0x181b22,
  skis: 0xe8dec8,
  goggles: 0xff85c0
});
function buildSkier() {
  while (skier.children.length) skier.remove(skier.children.at(0));
  while (upper.children.length) upper.remove(upper.children.at(0));
  skier.add(upper);

  const s = STEEZE_SKINS[curOutfit % STEEZE_SKINS.length];
  const mTee = new THREE.MeshStandardMaterial({ color: s.tee, roughness: 0.75 });
  const mPants = s.camo ? new THREE.MeshStandardMaterial({ map: makeCamoTexture(s.camo[0], s.camo[1], s.camo[2]), roughness: 0.85 }) : new THREE.MeshStandardMaterial({ color: s.pants, roughness: 0.85 });
  const mStrap = new THREE.MeshStandardMaterial({ color: s.straps, roughness: 0.5 });
  const mSkis = new THREE.MeshStandardMaterial({ color: s.skis, roughness: 0.25, metalness: 0.3 });
  const mEdge = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.8 });
  const mGlove = new THREE.MeshStandardMaterial({ color: s.gloves, roughness: 0.65 });
  const mSkin = new THREE.MeshStandardMaterial({ color: s.skin, roughness: 0.7 });
  const mHelm = new THREE.MeshStandardMaterial({ color: s.helmet, roughness: 0.3, metalness: 0.15 });
  const mMask = new THREE.MeshStandardMaterial({ color: s.mask, roughness: 0.8 });
  const mGog = new THREE.MeshStandardMaterial({ color: s.goggles, roughness: 0.12, metalness: 0.7, emissive: s.goggles, emissiveIntensity: 0.25 });
  const mDark = new THREE.MeshStandardMaterial({ color: 0x151820, roughness: 0.45 });

  function makeTwinTipSki(xPos) {
    const g = new THREE.Group();
    g.position.set(xPos, 0.05, 0);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 2.15), mSkis);
    body.castShadow = true; g.add(body);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.265, 0.02, 2.12), mEdge);
    edge.position.y = -0.015; g.add(edge);
    const tipF = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.04, 0.32), mSkis);
    tipF.position.set(0, 0.055, -1.18); tipF.rotation.x = 0.42; g.add(tipF);
    const tipB = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.04, 0.28), mSkis);
    tipB.position.set(0, 0.045, 1.16); tipB.rotation.x = -0.35; g.add(tipB);
    const bind = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.08, 0.48), mDark);
    bind.position.set(0, 0.05, 0.02); g.add(bind);
    skier.add(g);
    return g;
  }
  skiL = makeTwinTipSki(-0.24); skiR = makeTwinTipSki(0.24);

  function makeBaggyLeg(xPos, side) {
    const hip = new THREE.Group(); hip.position.set(xPos, 1.14, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.48, 12), mPants);
    thigh.scale.set(1.05, 1, 1.15); thigh.position.y = -0.22; thigh.castShadow = true; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.set(0, -0.45, 0); hip.add(knee);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.46, 12), mPants);
    shin.scale.set(1.08, 1, 1.15); shin.position.y = -0.21; shin.castShadow = true; knee.add(shin);
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), mMask);
    patch.position.set(side * 0.04, -0.18, 0.27); knee.add(patch);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.24, 0.5), mDark);
    boot.position.set(0, -0.5, -0.05); knee.add(boot);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.62, 0.06), mStrap);
    strap.position.set(side * 0.26, -0.32, 0.02); strap.rotation.z = side * -0.08; hip.add(strap);
    skier.add(hip);
    return { hip, knee, strap };
  }
  const lL = makeBaggyLeg(-0.24, -1); legL = lL.hip; kneeL = lL.knee; strapL = lL.strap;
  const rL = makeBaggyLeg(0.24, 1); legR = rL.hip; kneeR = rL.knee; strapR = rL.strap;

  upper.position.set(0, 1.1, 0);
  torso = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.45, 0.86, 14), mTee);
  torso.scale.set(1.15, 1, 0.82); torso.position.y = 0.46; torso.castShadow = true; upper.add(torso);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 18), mTee);
  hem.rotation.x = Math.PI / 2; hem.scale.set(1.15, 0.82, 1); hem.position.y = 0.04; upper.add(hem);
  scarfMesh = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.085, 8, 16), mMask);
  scarfMesh.rotation.x = Math.PI / 2; scarfMesh.position.set(0, 0.91, 0); upper.add(scarfMesh);

    function makeArm(side) {
    const a = new THREE.Group(); a.position.set(side * 0.54, 0.82, 0);
    if (s.longSleeve) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.62, 12), mTee);
      sleeve.position.y = -0.28; sleeve.castShadow = true; a.add(sleeve);
    } else {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.34, 12), mTee);
      sleeve.position.y = -0.14; sleeve.castShadow = true; a.add(sleeve);
      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.36, 4, 10), mSkin);
      forearm.position.y = -0.44; forearm.castShadow = true; a.add(forearm);
    }
    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.24, 0.21), mGlove);
    glove.position.y = -0.68; a.add(glove);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.06, 0.23), mStrap);
    cuff.position.y = -0.58; a.add(cuff);
        const poleMat = new THREE.MeshStandardMaterial({ color: s.straps, metalness: 0.65, roughness: 0.25 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.5 });
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.03, 0.16, 8), gripMat);
    grip.position.set(0, -0.72, 0.04); grip.rotation.x = -0.35; a.add(grip);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 1.48, 8), poleMat);
    pole.position.set(0, -1.04, 0.24); pole.rotation.x = -0.42; a.add(pole);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 10), mGlove);
    basket.position.set(0, -1.66, 0.52); basket.rotation.x = -0.42; a.add(basket);
    upper.add(a); return a;
  }
  armL = makeArm(-1); armR = makeArm(1);

  headG = new THREE.Group(); headG.position.y = 1.24; upper.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), mSkin);
  head.castShadow = true; headG.add(head);
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.272, 16, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), mMask);
  headG.add(mask);
  helmetMesh = new THREE.Mesh(new THREE.SphereGeometry(0.315, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), mHelm);
  helmetMesh.position.y = 0.03; helmetMesh.castShadow = true; headG.add(helmetMesh);
  for (const vx of [-0.11, 0.11]) {
    for (const vz of [-0.14, 0.02, 0.16]) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.07), mDark);
      vent.position.set(vx, 0.29, vz); headG.add(vent);
    }
  }
  const goproMount = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), mDark);
  goproMount.position.set(0, 0.35, -0.02); headG.add(goproMount);
  const goproCam = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.07), mDark);
  goproCam.position.set(0, 0.41, -0.03); headG.add(goproCam);
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.22), mGog);
  goggles.position.set(0, 0.02, -0.22); headG.add(goggles);
}
buildSkier();
scene.add(skier);

function applyOutfit(i) {
  curOutfit = (i + STEEZE_SKINS.length) % STEEZE_SKINS.length;
  buildSkier();
  document.querySelectorAll('#locker-grid .item').forEach((el, k) => el.classList.toggle('sel', k === curOutfit));
}
applyOutfit(0);

/* ================= UI: MENU TABS ================= */
function showTab(name) {
  $$('.tabs .tab').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
  ['ride','locker','shop'].forEach(n => $('#tab-' + n).classList.toggle('hidden', n !== name));
  const other = !['ride','locker','shop'].includes(name);
  $('#tab-other').classList.toggle('hidden', !other);
  if (other) $('#other-title').textContent = name.toUpperCase() + ' — COMING SOON';
  $('#menu').scrollTop = 0;
}
$$('.tabs .tab').forEach(t => t.addEventListener('click', () => { showTab(t.dataset.tab); beep(720, .04); }));
$('#tab-ride').style.flexDirection = 'row';
$('#tab-ride').style.gap = '40px';
$('#tab-ride').style.alignItems = 'flex-start';

/* locker content */
const GEAR = [
  ['NO HELMET', '#8fa2bd', '#5a6a80'], ['NO HEADWEAR', '#c9b18a', '#8a7a5a'],
  ['PARK BLUE', '#66c4d6', '#2b6fd6'], ['BROADCAST TEE', '#3aa6b9', '#1c2b3a'],
  ['RENTAL DEPT MITTS', '#f2efe9', '#c9ccd4'], ['RIPSTOP', '#f2efe9', '#9aa7b5'],
  ['PARK CABRIO', '#3a3a3a', '#1a1a1a'], ['CHALLENGER 501', '#1c2b3a', '#3aa6b9'],
  ['PARK BINDING', '#c9ccd4', '#5a6a80'], ['BMX GRIP', '#d9d9d9', '#8a8f98']
];
const lg = $('#locker-grid');
OUTFITS.forEach((o, i) => {
  const d = document.createElement('div');
  d.className = 'item purple';
  d.innerHTML = `<div class="swatch" style="background:linear-gradient(120deg,#${o.jacket.toString(16).padStart(6,'0')},#${o.pants.toString(16).padStart(6,'0')})"></div>
    <div class="rare">TOP + PANTS</div><div class="nm display">${o.name}</div>`;
  d.addEventListener('click', () => { applyOutfit(i); beep(660, .06); });
  lg.appendChild(d);
});
const gg = $('#gear-grid');
GEAR.forEach(([n, c1, c2]) => {
  const d = document.createElement('div');
  d.className = 'item';
  d.innerHTML = `<div class="swatch" style="background:linear-gradient(120deg,${c1},${c2})"></div>
    <div class="nm display" style="font-size:13px">${n}</div>`;
  d.addEventListener('click', () => toast('LOCKED — RIDE TO UNLOCK'));
  gg.appendChild(d);
});
const GRABS_UI = [['METHOD', 'Y'], ['STALEFISH', 'U'], ['NOSE GRAB', 'I']];
GRABS_UI.forEach(([n, k]) => {
  const d = document.createElement('div');
  d.className = 'item orange';
  d.innerHTML = `<div class="rare">GRAB</div><div class="nm display">${n}</div>
    <div class="small" style="margin-top:6px">Trykk <b>${k}</b> i lufta</div>`;
  d.addEventListener('click', () => toast('GRABS UTLOSES I SPEL'));
  $('#grabs-grid').appendChild(d);
});
$$('.ltabs .lt').forEach(t => t.addEventListener('click', () => {
  $$('.ltabs .lt').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  const v = t.dataset.lt;
  $('#lk-outfit').classList.toggle('hidden', v !== 'outfit');
  $('#lk-grabs').classList.toggle('hidden', v !== 'grabs');
  $('#lk-saved').classList.toggle('hidden', v !== 'saved');
}));

/* shop */
const SHOP = [
  ['PINK NOISE', 'SET', 1400, '#f5f0f0', '#e58bb0'], ['TREELINE', 'SET', 1400, '#6b7a4f', '#3a3a3a'],
  ['SWITCHYARD', 'SET', 1400, '#ffffff', '#cbb58a'], ['OLIVE STARTER PACK', 'PACK · 2 ITEMS', 1000, '#8a8f6b', '#5a5f4a'],
  ['WHITEOUT 09', 'LEGENDARY · PANTS', 1000, '#dfe6ee', '#9aa7b5'], ['TARTAN 06', 'LEGENDARY · PANTS', 1000, '#c23b4e', '#7d2430'],
  ['PRISM SUNSET', 'EPIC · GOGGLES', 400, '#ff9ecb', '#ffb347'], ['PRO RED', 'LEGENDARY · SKIS', 1000, '#e23b3b', '#8f1f1f'],
  ['CHALLENGER 501', 'SKIS', 800, '#1c2b3a', '#3aa6b9'], ['PARK CABRIO', 'BOOTS', 800, '#3a3a3a', '#6b7a4f']
];
function shopCard([n, type, price, c1, c2], grid) {
  const d = document.createElement('div');
  d.className = 'item ' + (price >= 1000 ? 'purple' : 'orange');
  d.innerHTML = `<div class="price">❄ ${price.toLocaleString('nb-NO')}</div>
    <div class="swatch" style="background:linear-gradient(120deg,${c1},${c2})"></div>
    <div class="rare">${type}</div><div class="nm display">${n}</div>
    ${price > pow ? `<div class="to-go">${(price - pow).toLocaleString('nb-NO')} POW TO GO</div>` : ''}`;
  d.addEventListener('click', () => {
    if (pow >= price) { pow -= price; localStorage.setItem('cork7_pow', pow); $('#pow-amt').textContent = pow; toast('KJØPT: ' + n); beep(880, .12); }
    else { toast('NOT ENOUGH POW'); beep(180, .15, 'sawtooth'); }
  });
  $(grid).appendChild(d);
}
SHOP.slice(0, 4).forEach(it => shopCard(it, '#shop-sets'));
SHOP.slice(4).forEach(it => shopCard(it, '#shop-items'));

let toastT = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1600);
}

/* menu camera drag-rotate */
let menuAngle = 0.6, dragging = false, px = 0;
renderer.domElement.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => { if (dragging && S.mode === 'menu') menuAngle += (e.clientX - px) * 0.008; px = e.clientX; });
$('#rot-l').addEventListener('click', () => menuAngle -= 0.4);
$('#rot-r').addEventListener('click', () => menuAngle += 0.4);

/* ================= GAME FLOW ================= */
function startGame() {
  S.mode = 'play'; S.speed = 0; S.x = 0; S.z = 0; S.jy = 0; S.vy = 0;
  S.jump = false; S.score = 0; S.meters = 0; S.time = 0; S.grab = null; S.grabOn = false;
  skier.position.set(0, heightAt(0, 0), 0);
  $('#menu').classList.add('hidden');
  $('#pause').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  beep(520, .1);
}
function quitToMenu() {
  S.mode = 'menu';
  $('#pause').classList.add('hidden');
  $('#hud').classList.add('hidden');
  $('#menu').classList.remove('hidden');
}
function togglePause() {
  if (S.mode === 'play') { S.mode = 'pause'; $('#pause').classList.remove('hidden'); }
  else if (S.mode === 'pause') { S.mode = 'play'; $('#pause').classList.add('hidden'); }
}
$('#btn-ride').addEventListener('click', startGame);
$('#btn-resume').addEventListener('click', togglePause);
$('#btn-quit').addEventListener('click', quitToMenu);
$('#btn-menu-top').addEventListener('click', () => { if (S.mode === 'play') togglePause(); });

$$('#pause .qbtn[data-q]').forEach(b => b.addEventListener('click', () => {
  settings.quality = b.dataset.q;
  $$('#pause .qbtn[data-q]').forEach(x => x.classList.toggle('active', x === b));
  applyQuality();
}));
$$('#pause .qbtn[data-snd]').forEach(b => b.addEventListener('click', () => {
  settings.sound = b.dataset.snd === 'on';
  $$('#pause .qbtn[data-snd]').forEach(x => x.classList.toggle('active', x === b));
  if (settings.sound) beep(660, .08);
}));

function applyQuality() {
  const q = settings.quality;
  renderer.setPixelRatio(q === 'low' ? 0.6 : q === 'high' ? Math.min(devicePixelRatio, 2) : 1);
  renderer.shadowMap.enabled = q !== 'low';
  sun.castShadow = q === 'high';
  particles.visible = q !== 'low';
}
applyQuality();

/* music bar */
let playing = true;
$('#mus-play').addEventListener('click', () => { playing = !playing; $('#mus-play').textContent = playing ? '⏸' : '▶'; });
$('#mus-prev').addEventListener('click', () => beep(440, .06));
$('#mus-next').addEventListener('click', () => beep(520, .06));

/* ================= INPUT ================= */
const keys = {};
addEventListener('keydown', e => {
  if (['Space','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;

  if (e.code === 'Escape' || e.code === 'KeyM') {
    if (S.mode === 'play' || S.mode === 'pause') togglePause();
    return;
  }
  if (S.mode === 'menu' && e.code === 'Enter') { startGame(); return; }
  if (S.mode !== 'play') return;

  if (e.code === 'Space') startJump();
  if (e.code === 'KeyY') startGrab('METHOD');
  if (e.code === 'KeyU') startGrab('STALEFISH');
  if (e.code === 'KeyI') startGrab('NOSE GRAB');
  if (e.code === 'KeyO') startGrab('MUTE GRAB');
  if (e.code === 'KeyG') { buildParkMap(curMapIdx + 1); popup('MAP: ' + PARK_MAPS[curMapIdx].name); beep(740, 0.08); }
  if (e.code === 'KeyR') { fullRestartRun(); return; }
  if (e.code >= 'Digit1' && e.code <= 'Digit5') { applyOutfit(+e.code.slice(-1) - 1); beep(700, .05); }
});
addEventListener('keyup', e => {
  keys[e.code] = false;
  if (S.mode === 'play' && S.grabOn && ['KeyY','KeyU','KeyI','KeyO'].includes(e.code)) bankTrick();
});

/* === CORK7 SPIN, FLIP & COMBO SYSTEM === */
S.spinY = 0; S.spinX = 0; S.spinVelY = 0; S.spinVelX = 0;
S.combo = 1; S.comboTimer = 0; S.airGrabs = []; S.lastGrab = null;

const origStartGame = startGame;
startGame = function() {
  origStartGame();
  S.spinY = 0; S.spinX = 0; S.spinVelY = 0; S.spinVelX = 0;
  S.combo = 1; S.comboTimer = 0; S.airGrabs = []; S.lastGrab = null;
  const cb = document.querySelector('#hud-score .combo span');
  if (cb) cb.textContent = 'x1';
};

startGrab = function(name) {
  if (!S.jump) return;
  if (S.grab !== name) {
    S.grab = name;
    S.grabPts = 0;
    if (!S.airGrabs.includes(name)) {
      S.airGrabs.push(name);
      if (S.airGrabs.length > 1) {
        S.combo = Math.min(10, S.combo + 1);
        beep(620 + S.combo * 60, 0.08);
      }
    }
  }
  S.grabOn = true;
  beep(500, 0.06);
};

bankTrick = function() {
  const pts = Math.floor(S.grabPts);
  if (pts > 0 && S.grab) {
    S.airScore = (S.airScore || 0) + pts;
    popup(S.grab + ' +' + pts);
    beep(820, 0.1, 'square');
  }
  S.grab = null;
  S.grabOn = false;
  S.grabPts = 0;
};

function finishAirTrick() {
  const degY = Math.round(Math.abs(S.spinY) * 180 / Math.PI / 180) * 180;
  const flips = Math.round(Math.abs(S.spinX) / (Math.PI * 2));
  const remY = Math.abs(((S.spinY % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  const remX = Math.abs(((S.spinX % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  const cleanY = remY < 0.85 || Math.abs(remY - Math.PI) < 0.85;
  const cleanX = remX < 0.85;

  if ((degY >= 180 || flips >= 1 || S.airGrabs.length > 0 || (S.airScore || 0) > 0)) {
    if (cleanY && cleanX) {
      let names = [];
      if (flips >= 1 && degY >= 360) names.push((flips > 1 ? flips + 'X ' : '') + 'CORK ' + degY);
      else if (flips >= 1) names.push((flips === 1 ? 'BACKFLIP' : flips + 'X FLIP'));
      else if (degY >= 180) names.push('SPIN ' + degY);
      if (S.airGrabs.length > 0) names.push(S.airGrabs.join(' + '));

      const basePts = (degY * 1.5) + (flips * 600) + (S.airScore || 0);
      if (basePts > 0) {
        S.combo = Math.min(12, S.combo + (degY >= 360 ? 1 : 0) + (flips >= 1 ? 1 : 0));
        S.comboTimer = 4.5;
        const total = Math.floor(basePts * S.combo);
        S.score += total;
        popup(names.join(' • ') + ' (x' + S.combo + ') +' + total);
        beep(980, 0.16, 'triangle');
      }
    } else {
      S.combo = 1;
      S.comboTimer = 0;
      popup('CRASH! LANDED SKETCHY');
      beep(140, 0.25, 'sawtooth');
    }
  }
  S.spinY = 0; S.spinX = 0; S.spinVelY = 0; S.spinVelX = 0;
  S.airGrabs = []; S.airScore = 0; S.grab = null; S.grabOn = false;
}
/* === CORK7 MAPS, KICKERS & RAILS SYSTEM === */
const PARK_MAPS = [
  { name: 'BIG AIR / SLOPESTYLE', sky: 0x9ec5e8, fog: 0xb8d4ed, snow: 0xf2f6fb, railCol: 0x2563eb, night: false },
  { name: 'RAIL GARDEN PRO', sky: 0x8ab8e6, fog: 0xa8c9ea, snow: 0xeef4fa, railCol: 0xf97316, night: false },
  { name: 'MIDNIGHT NEON PARK', sky: 0x070d1a, fog: 0x0b1326, snow: 0xdbe6f5, railCol: 0x7ef0d4, night: true }
];
let curMapIdx = 0;
const parkGroup = new THREE.Group();
scene.add(parkGroup);
let parkFeatures = [];

function buildParkMap(idx) {
  curMapIdx = (idx + PARK_MAPS.length) % PARK_MAPS.length;
  const cfg = PARK_MAPS[curMapIdx];
  while (parkGroup.children.length) parkGroup.remove(parkGroup.children.at(0));
  parkFeatures = [];

  scene.background = new THREE.Color(cfg.sky);
  if (scene.fog) scene.fog.color.set(cfg.fog);
  const modeEl = document.getElementById('hud-mode');
  if (modeEl) modeEl.textContent = cfg.name + ' [G: BYTT MAP]';

  const mSnow = new THREE.MeshStandardMaterial({ color: cfg.snow, roughness: 0.7 });
  const mLine = new THREE.MeshStandardMaterial({ color: cfg.railCol, roughness: 0.4, emissive: cfg.night ? cfg.railCol : 0x000000, emissiveIntensity: 0.6 });
  const mRail = new THREE.MeshStandardMaterial({ color: cfg.railCol, metalness: 0.7, roughness: 0.25, emissive: cfg.night ? cfg.railCol : 0x000000, emissiveIntensity: 0.5 });
  const mLeg = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 });
  const mBoxTop = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });

  const spacing = curMapIdx === 1 ? 85 : 120;
  for (let i = 0; i < 10; i++) {
    const baseZ = -70 - i * spacing;
    const laneX = (i % 3 === 0) ? 0 : (i % 3 === 1 ? -7 : 7);

    if (curMapIdx !== 1 || i % 2 === 0) {
      // Big Air Kicker med ledelinjer
      const kW = 7.5, kL = 14, kH = curMapIdx === 0 ? 3.2 : 2.2;
      const gY = heightAt(laneX, baseZ);
      const kicker = new THREE.Mesh(new THREE.BoxGeometry(kW, kH, kL), mSnow);
      kicker.position.set(laneX, gY + kH * 0.35, baseZ);
      kicker.rotation.x = 0.22;
      kicker.receiveShadow = true;
      parkGroup.add(kicker);

      for (const sx of [-kW * 0.48, kW * 0.48]) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, kL + 4), mLine);
        line.position.set(laneX + sx, gY + kH * 0.58, baseZ);
        line.rotation.x = 0.22;
        parkGroup.add(line);
      }
      parkFeatures.push({ type: 'kicker', x: laneX, z: baseZ, w: kW, l: kL, h: kH, obj: kicker });
    }

    // Rail eller Boks etter hoppet
    const rZ = baseZ - 68.2;
    const rX = -laneX * 0.7;
    const rL = 22;
    const isBox = (i % 2 === 1);
    const rW = isBox ? 1.35 : 0.32;
    const rH = 1.15;
    const rY = heightAt(rX, rZ);

    const railObj = new THREE.Group();
    railObj.position.set(rX, rY, rZ);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(rW, 0.16, rL), isBox ? mBoxTop : mRail);
    topBar.position.y = rH;
    topBar.rotation.x = -0.14;
    topBar.castShadow = true;
    railObj.add(topBar);

    if (isBox) {
      const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(rW + 0.08, 0.08, rL), mRail);
      sideTrim.position.y = rH - 0.06;
      sideTrim.rotation.x = -0.14;
      railObj.add(sideTrim);
    }

    for (const lz of [-rL * 0.38, 0, rL * 0.38]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, rH + 0.4, 8), mLeg);
      leg.position.set(0, (rH - lz * 0.14) * 0.5, lz);
      railObj.add(leg);
    }
    parkGroup.add(railObj);
    parkFeatures.push({ type: 'rail', isBox, x: rX, z: rZ, w: rW, l: rL, h: rH, obj: railObj });
  }
}
/* === SMOOTH WEDGE RAMPS & CLEAN FLIP PHYSICS === */
function makeWedgeGeometry(w, h, l) {
  const hw = w * 0.5, hl = l * 0.5;
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([
    -hw,0,hl,  hw,0,hl,  hw,h,-hl,  -hw,0,hl,  hw,h,-hl, -hw,h,-hl,
    -hw,0,-hl,-hw,h,-hl, hw,h,-hl,  -hw,0,-hl, hw,h,-hl,  hw,0,-hl,
    -hw,0,hl, -hw,h,-hl,-hw,0,-hl,   hw,0,hl,  hw,0,-hl,  hw,h,-hl,
    -hw,0,hl, -hw,0,-hl, hw,0,-hl,  -hw,0,hl,  hw,0,-hl,  hw,0,hl
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

const origBuildParkMap = buildParkMap;
buildParkMap = function(idx) {
  origBuildParkMap(idx);
  const cfg = PARK_MAPS[curMapIdx];
  const mSnow = new THREE.MeshStandardMaterial({ color: cfg.snow, roughness: 0.65 });
  const mLine = new THREE.MeshStandardMaterial({ color: cfg.railCol, roughness: 0.35, emissive: cfg.night ? cfg.railCol : 0x000000, emissiveIntensity: 0.6 });

  for (const f of parkFeatures) {
    if (f.type === 'kicker') {
      parkGroup.remove(f.obj);
      const rg = new THREE.Group();
      rg.position.set(f.x, heightAt(f.x, f.z), f.z);
      const wedge = new THREE.Mesh(makeWedgeGeometry(f.w, f.h, f.l), mSnow);
      wedge.receiveShadow = true;
      rg.add(wedge);
      const slopeAng = Math.atan2(f.h, f.l);
      const slopeLen = Math.hypot(f.h, f.l);
      for (const sx of [-f.w * 0.47, f.w * 0.47]) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, slopeLen), mLine);
        line.position.set(sx, f.h * 0.5 + 0.03, 0);
        line.rotation.x = slopeAng;
        rg.add(line);
      }
      parkGroup.add(rg);
      f.obj = rg;
    }
  }
};
buildParkMap(curMapIdx);
/* === CLEAN SWITCH RIDING & EXACT R-RESTART === */
S.isSwitch = false;

function fullRestartRun() {
  startGame();
  S.isSwitch = false;
  S.spinY = 0; S.spinX = 0; S.spinVelY = 0; S.spinVelX = 0;
  S.vx = 0; S.lean = 0;
  if (typeof headG !== 'undefined' && headG) headG.rotation.y = 0;

  // Nullstill all dekor tilbake til toppen av bakken
  if (typeof decor !== 'undefined') {
    decor.trees.forEach((tr, i) => { tr.position.z = -30 - (i * 18) % 1050; tr.position.y = heightAt(tr.position.x, tr.position.z); });
    decor.fence.forEach((f, i) => { f.position.z = -10 - Math.floor(i / 2) * 20; f.position.y = heightAt(f.position.x, f.position.z); });
    decor.liftP.forEach((p, i) => { p.position.z = -20 - i * 80; p.position.y = heightAt(p.position.x, p.position.z); });
    decor.liftC.forEach((c, i) => { c.position.z = 10 - (i * 40) % 1040; });
    decor.arch.forEach((a, i) => { a.position.z = -140 - i * 900; a.position.y = heightAt(a.position.x, a.position.z); });
  }
  buildParkMap(curMapIdx);
  const g0 = heightAt(0, 0);
  skier.position.set(0, g0, 0);
  skier.rotation.set(0, 0, 0);
  camera.position.set(0, g0 + 4.6, 10.5);
  camera.lookAt(0, g0 + 1.6, -9);
  popup('RESTARTED!');
}

finishAirTrick = function() {
  const totalSpinDeg = Math.round(Math.abs(S.spinY - (S.isSwitch ? Math.PI : 0)) * 180 / Math.PI / 180) * 180;
  const flips = Math.round(Math.abs(S.spinX) / (Math.PI * 2));
  const remX = Math.abs(((S.spinX % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  const cleanX = remX < 0.9;

  // Sjekk faktisk vinkel ved landing: nærmere 180° = Switch, nærmere 0° = Regular
  const normYaw = Math.atan2(Math.sin(S.spinY), Math.cos(S.spinY));
  const landedBackwards = Math.abs(normYaw) > Math.PI * 0.5;
  const sideDiff = landedBackwards ? Math.abs(Math.PI - Math.abs(normYaw)) : Math.abs(normYaw);
  const cleanY = sideDiff < 0.95;

  if (cleanY && cleanX) {
    const wasSwitch = S.isSwitch;
    const changedStance = (landedBackwards !== wasSwitch);
    S.isSwitch = landedBackwards;

    if (totalSpinDeg >= 180 || flips >= 1 || S.airGrabs.length > 0 || (S.airScore || 0) > 0) {
      let names = [];
      if (wasSwitch) names.push('SWITCH');
      if (flips >= 1 && totalSpinDeg >= 360) names.push((flips > 1 ? flips + 'X ' : '') + 'CORK ' + totalSpinDeg);
      else if (flips >= 1) names.push((flips === 1 ? 'BACKFLIP' : flips + 'X FLIP'));
      else if (totalSpinDeg >= 180) names.push('SPIN ' + totalSpinDeg);
      if (S.airGrabs.length > 0) names.push(S.airGrabs.join(' + '));
      if (changedStance) names.push(S.isSwitch ? 'TO SWITCH' : 'TO REGULAR');

      const basePts = (totalSpinDeg * 1.6) + (flips * 650) + (S.airScore || 0) + (wasSwitch ? 250 : 0);
      if (basePts > 0) {
        S.combo = Math.min(12, S.combo + (totalSpinDeg >= 360 ? 1 : 0) + (flips >= 1 ? 1 : 0));
        S.comboTimer = 4.5;
        const total = Math.floor(basePts * S.combo);
        S.score += total;
        popup(names.join(' • ') + ' (x' + S.combo + ') +' + total);
        beep(980, 0.16, 'triangle');
      }
    }
  } else if (totalSpinDeg >= 180 || flips >= 1 || S.airGrabs.length > 0) {
    S.combo = 1;
    S.comboTimer = 0;
    popup('CRASH! LANDED SKETCHY');
    beep(140, 0.25, 'sawtooth');
  }

  S.spinY = S.isSwitch ? Math.PI : 0;
  S.spinX = 0; S.spinVelY = 0; S.spinVelX = 0;
  S.airGrabs = []; S.airScore = 0; S.grab = null; S.grabOn = false;
};
/* === COMPLETE CORK7 EXPERIENCE: MAP SELECTOR, PARTICLES, SLOW-MO & LOCKER === */
if (typeof PARK_MAPS !== 'undefined' && PARK_MAPS.length === 3) {
  PARK_MAPS.push({
    name: 'SUNSET ALPINE',
    sky: 0xe07a5f,
    fog: 0xf2cc8f,
    snow: 0xfff1e6,
    railCol: 0xf59e0b,
    night: false
  });
}

// 1. Injiser Map-velger rett over RIDE-knappen i hovedmenyen
(function injectMapSelector() {
  const rideBtn = document.getElementById('btn-ride');
  if (!rideBtn || document.getElementById('map-selector-box')) return;
  const box = document.createElement('div');
  box.id = 'map-selector-box';
  box.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;';
  const mapDescs = ['Store kickers & rails', 'Teknisk rail-park', 'Nattkjøring & neon', 'Solnedgang & gull-park'];
  PARK_MAPS.forEach((m, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-choice-btn';
    btn.dataset.map = idx;
    const hex = '#' + m.railCol.toString(16).padStart(6, '0');
    btn.style.cssText = 'background:rgba(255,255,255,0.06);border:2px solid ' + (idx === 0 ? '#7ef0d4' : 'rgba(255,255,255,0.12)') + ';border-radius:12px;padding:10px;color:#eef2f8;text-align:left;cursor:pointer;transition:all .15s;';
    btn.innerHTML = '<div style="font-family:Orbitron,sans-serif;font-size:11px;font-weight:800;color:' + hex + ';letter-spacing:.05em;">' + m.name + '</div><div style="font-size:10px;color:#9fb0c7;margin-top:3px;">' + (mapDescs[idx] || 'Park') + '</div>';
    btn.addEventListener('click', () => {
      buildParkMap(idx);
      document.querySelectorAll('.map-choice-btn').forEach((b, k) => {
        b.style.borderColor = (k === idx) ? '#7ef0d4' : 'rgba(255,255,255,0.12)';
        b.style.background = (k === idx) ? 'rgba(126,240,212,0.14)' : 'rgba(255,255,255,0.06)';
      });
      beep(680, 0.06);
    });
    box.appendChild(btn);
  });
  rideBtn.parentNode.insertBefore(box, rideBtn);
})();

// 2. Oppdater Locker med alle 5 skins
(function refreshLockerSkins() {
  const lg = document.getElementById('locker-grid');
  if (!lg || typeof STEEZE_SKINS === 'undefined') return;
  lg.innerHTML = '';
  STEEZE_SKINS.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'item purple' + (i === curOutfit ? ' sel' : '');
    const c1 = '#' + s.tee.toString(16).padStart(6, '0');
    const c2 = '#' + s.pants.toString(16).padStart(6, '0');
    d.innerHTML = '<div class="swatch" style="background:linear-gradient(120deg,' + c1 + ',' + c2 + ')"></div><div class="rare">TAST ' + (i + 1) + '</div><div class="nm display">' + s.name + '</div>';
    d.addEventListener('click', () => { applyOutfit(i); beep(660, 0.06); });
    lg.appendChild(d);
  });
})();

// 3. Gnister (rail grind) & Snøsprut (landing/carving)
const FX_COUNT = 90;
const fxGeo = new THREE.BufferGeometry();
const fxPos = new Float32Array(FX_COUNT * 3);
const fxVel = Array.from({ length: FX_COUNT }, () => ({ x: 0, y: 0, z: 0, life: 0 }));
fxGeo.setAttribute('position', new THREE.BufferAttribute(fxPos, 3));
const fxMat = new THREE.PointsMaterial({ color: 0xffd166, size: 0.24, transparent: true, opacity: 0.9 });
const fxPoints = new THREE.Points(fxGeo, fxMat);
fxPoints.frustumCulled = false;
scene.add(fxPoints);
let fxIdx = 0;

function spawnBurst(x, y, z, count, colorHex, speedScale) {
  fxMat.color.setHex(colorHex);
  for (let i = 0; i < count; i++) {
    const p = fxVel[fxIdx];
    fxPos[fxIdx * 3] = x + (Math.random() - 0.5) * 0.4;
    fxPos[fxIdx * 3 + 1] = y + 0.1;
    fxPos[fxIdx * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
    p.x = (Math.random() - 0.5) * 4.5 * speedScale;
    p.y = (1.5 + Math.random() * 3.5) * speedScale;
    p.z = (Math.random() - 0.2) * 4.0 * speedScale;
    p.life = 0.35 + Math.random() * 0.25;
    fxIdx = (fxIdx + 1) % FX_COUNT;
  }
}

// 4. Gi POW-mynter når man går tilbake til menyen
const origQuitToMenu = quitToMenu;
quitToMenu = function() {
  const earnedPow = Math.floor((S.score || 0) / 25);
  if (earnedPow > 0) {
    pow += earnedPow;
    localStorage.setItem('cork7_pow', pow);
    const pa = document.getElementById('pow-amt');
    if (pa) pa.textContent = pow;
    setTimeout(() => popup('+' + earnedPow + ' POW OPPTJENT!'), 200);
  }
  origQuitToMenu();
};
function startJump() {
  if (S.jump) return;
  S.jump = true; S.vy = 9.5; S.airTime = 0;
  beep(330, .1, 'triangle');
}
function startGrab(name) {
  if (!S.jump) startJump();
  S.grab = name; S.grabOn = true; S.grabPts = 0;
  beep(500, .06);
}
function bankTrick() {
  const pts = Math.floor(S.grabPts);
  const grabbed = S.grab;
  if (pts > 0) {
    S.score += pts;
    popup(grabbed + ' +' + pts);
    beep(880, .12, 'square');
  }
  S.grab = null; S.grabOn = false; S.grabPts = 0;
  if (grabbed) setGrabPose(grabbed);
}
function setGrabPose(grab) {
  // Reset to neutral first
  skiL.rotation.z = 0.06; skiR.rotation.z = -0.06;
  upper.rotation.x = 0; armL.rotation.x = 0; armR.rotation.x = 0;
  // Apply grab-specific pose
  if (grab === 'METHOD') {
    skiL.rotation.z = 0.55; skiR.rotation.z = -0.3;
    upper.rotation.x = -0.4; armL.rotation.x = -1.0; armR.rotation.x = -0.6;
  } else if (grab === 'STALEFISH') {
    skiL.rotation.z = -0.15; skiR.rotation.z = 0.25;
    upper.rotation.x = -0.2; armL.rotation.x = -0.3; armR.rotation.x = -0.3;
  } else if (grab === 'NOSE GRAB') {
    skiL.rotation.z = 0.35; skiR.rotation.z = -0.1;
    upper.rotation.x = -0.35; armL.rotation.x = -0.8; armR.rotation.x = -0.2;
  }
}
function resetPose() {
  skiL.rotation.z = 0.06; skiR.rotation.z = -0.06;
  upper.rotation.x = 0; armL.rotation.x = 0; armR.rotation.x = 0;
}
function popup(text) {
  const el = $('#trick-popup');
  el.textContent = text;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

/* ================= LOOP ================= */
const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0, fpsT = 0;

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  const slowMo = (S.mode === 'play' && S.jump && (keys['ShiftLeft'] || keys['ShiftRight'])) ? 0.45 : 1.0;
  const dt = rawDt * slowMo;
  const t = clock.elapsedTime;

  /* FPS */
  fpsAcc += dt; fpsN++; fpsT += dt;
  if (fpsT > 0.5) {
    $('#hud-fps').textContent = Math.round(fpsN / fpsAcc) + ' FPS';
    fpsAcc = 0; fpsN = 0; fpsT = 0;
  }

  if (S.mode === 'play') {
    /* --- movement --- */
    if (keys.KeyW) S.speed = Math.min(S.speed + 14 * dt, 68.2);
    else if (keys.KeyS) S.speed = Math.max(S.speed - 22 * dt, 0);
    else S.speed = Math.max(S.speed - 3.5 * dt, 0);

    if (keys.KeyA) S.vx = Math.max(S.vx - 30 * dt, -14);
    else if (keys.KeyD) S.vx = Math.min(S.vx + 30 * dt, 14);
    else S.vx *= Math.exp(-6 * dt);

    S.x += S.vx * dt;
    S.z -= S.speed * dt;
    S.meters += S.speed * dt;
    S.time += dt;
    S.score += S.speed * dt * 0.6;

    S.lean += ((-S.vx * 0.045) - S.lean) * Math.min(1, dt * 8);

    /* --- jump / gravity --- */
    const ground = heightAt(S.x, S.z);
    if (S.jump) {
      S.vy -= 24 * dt;
      S.jy += S.vy * dt;
      S.airTime += dt;
      if (S.jy <= 0) {
        S.jy = 0; S.jump = false;
        if (S.grabOn) bankTrick();
        else if (S.airTime > 0.9) {
          const p = Math.floor(S.airTime * 60);
          S.score += p; popup('BIG AIR +' + p); beep(760, .1);
        }
        S.airTime = 0;
      }
      if (S.grabOn) setGrabPose(S.grab);
    }
        /* --- air spin, flip & combo update --- */
    if (S.comboTimer > 0) {
      S.comboTimer -= dt;
      if (S.comboTimer <= 0) S.combo = 1;
    }
    const cbSpan = document.querySelector('#hud-score .combo span');
    if (cbSpan) cbSpan.textContent = 'x' + S.combo;

    if (S.jump) {
      S.wasAir = true;
      const inLeft = keys['KeyA'] || keys['ArrowLeft'];
      const inRight = keys['KeyD'] || keys['ArrowRight'];
      const inBack = keys['KeyS'] || keys['ArrowDown'];
      const inFront = keys['KeyW'] || keys['ArrowUp'];
      const spinBoost = S.grabOn ? 1.35 : 1.0;

            if (inLeft) S.spinVelY += 16 * spinBoost * dt;
      if (inRight) S.spinVelY -= 16 * spinBoost * dt;
      if (!inLeft && !inRight) {
        S.spinVelY *= Math.exp(-8.5 * dt);
        const nearestYaw = Math.round(S.spinY / Math.PI) * Math.PI;
        S.spinY += (nearestYaw - S.spinY) * (1 - Math.exp(-9.0 * dt));
      }

      const allowFlip = S.jump && S.jy > 0.75 && !S.onRamp;
      if (inBack && allowFlip) S.spinVelX += 13 * spinBoost * dt;
      if (inFront && allowFlip) S.spinVelX -= 13 * spinBoost * dt;
      if (!allowFlip || (!inBack && !inFront)) {
        S.spinVelX *= Math.exp(-8.5 * dt);
        const nearestFlip = Math.round(S.spinX / (Math.PI * 2)) * (Math.PI * 2);
        S.spinX += (nearestFlip - S.spinX) * (1 - Math.exp(-9.5 * dt));
      }

      S.spinVelY = Math.max(-13, Math.min(13, S.spinVelY));
      S.spinVelX = Math.max(-11, Math.min(11, S.spinVelX));
      S.spinY += S.spinVelY * dt;
      S.spinX += S.spinVelX * dt;
    } else {
      if (S.wasAir) {
        S.wasAir = false;
        finishAirTrick();
      }
                  const targetGroundY = S.isSwitch ? Math.PI : 0;
      S.spinY += (targetGroundY - S.spinY) * (1 - Math.exp(-15 * dt));
      S.spinX = 0; S.spinVelX = 0;
      if (typeof headG !== 'undefined' && headG) {
        headG.rotation.y += (0 - headG.rotation.y) * (1 - Math.exp(-12 * dt));
      }
    }

            /* --- smooth kicker launch & rail grind --- */
    S.grinding = false;
    S.onRamp = false;
    for (const f of parkFeatures) {
      if (f.obj.position.z > S.z + 55) {
        f.obj.position.z -= (curMapIdx === 1 ? 850 : 1200);
        f.z = f.obj.position.z;
        f.obj.position.y = heightAt(f.x, f.z);
      }
      const dz = Math.abs(S.z - f.z);
      const dx = Math.abs(S.x - f.x);
      if (f.type === 'kicker' && dz <= f.l * 0.52 && dx <= f.w * 0.52) {
        const frontZ = f.z + f.l * 0.5;
        const tRamp = Math.max(0, Math.min(1, (frontZ - S.z) / f.l));
        const rampY = tRamp * tRamp * f.h;
        if (S.jy <= rampY + 0.25 && S.vy <= 2.5) {
          S.onRamp = true;
          S.jump = false;
          S.jy = rampY;
          S.vy = 0;
          S.spinX = 0; S.spinVelX = 0;
          if (tRamp >= 0.92) {
            S.jump = true;
            S.onRamp = false;
            S.vy = 11.2 + S.speed * 0.17;
            beep(380, 0.12, 'triangle');
          }
        }
      }
      if (f.type === 'rail' && dz < f.l * 0.5 && dx < f.w * 0.85 && Math.abs(S.jy - f.h) < 0.85 && S.vy <= 2) {
        S.grinding = true;
        S.jump = false;
        S.jy = f.h;
        S.vy = 0;
        S.spinX = 0; S.spinVelX = 0;
        S.x += (f.x - S.x) * Math.min(1, 14 * dt);
        S.score += dt * 180 * (S.combo || 1);
        S.comboTimer = 3.5;
        const hg = document.getElementById('hud-grab');
        if (hg) {
          hg.classList.add('show');
          const gn = hg.querySelector('.grab-name');
          if (gn) gn.textContent = (f.isBox ? 'BOX SLIDE' : 'RAIL GRIND') + ' x' + (S.combo || 1);
        }
      }
    }
    if (S.grabOn && S.jump) S.grabPts += dt * (45 + S.speed * 1.8);

        /* --- smooth Cork7 pose & grab animations --- */
    const sm = 1 - Math.exp(-14 * dt);
    const lp = (obj, axis, val) => { obj.rotation[axis] += (val - obj.rotation[axis]) * sm; };
    const lpPos = (obj, axis, val) => { obj.position[axis] += (val - obj.position[axis]) * sm; };

    let tSkiLY = 0, tSkiLZ = 0.04, tSkiLX = 0, tSkiLYPos = 0.05;
    let tSkiRY = 0, tSkiRZ = -0.04, tSkiRX = 0, tSkiRYPos = 0.05;
    let tUpperX = -0.12, tUpperY = -S.lean * 0.4, tUpperZ = 0, tUpperYPos = 1.12;
    let tArmLX = -0.25, tArmLZ = -0.18, tArmRX = -0.25, tArmRZ = 0.18;
    let tLegX = 0, tKneeX = 0;

    const hudGrab = $('#hud-grab');
    if (S.grabOn && S.jump) {
      if (hudGrab) {
        hudGrab.classList.add('show');
        const gn = hudGrab.querySelector('.grab-name');
        if (gn) gn.textContent = S.grab + ' +' + Math.floor(S.grabPts);
      }
      tLegX = -0.65; tKneeX = 1.15; tUpperYPos = 0.86;
      if (S.grab === 'METHOD') {
        tSkiLY = 0.85; tSkiLZ = 0.65; tSkiLX = -0.25; tSkiLYPos = 0.42;
        tSkiRY = 0.85; tSkiRZ = 0.55; tSkiRX = -0.2; tSkiRYPos = 0.36;
        tUpperX = -0.45; tUpperY = 0.55; tUpperZ = 0.25;
        tArmLX = -1.35; tArmLZ = -0.35; tArmRX = -0.3; tArmRZ = 0.95;
      } else if (S.grab === 'STALEFISH') {
        tSkiLY = -0.45; tSkiLZ = -0.35; tSkiLYPos = 0.38;
        tSkiRY = 0.35; tSkiRZ = 0.25; tSkiRYPos = 0.32;
        tUpperX = -0.35; tUpperY = -0.55; tUpperZ = -0.2;
        tArmRX = -1.45; tArmRZ = -0.25; tArmLX = -0.35; tArmLZ = -0.95;
      } else if (S.grab === 'NOSE GRAB') {
        tSkiLX = 0.55; tSkiLY = 0.18; tSkiLYPos = 0.34;
        tSkiRX = 0.45; tSkiRY = -0.12; tSkiRYPos = 0.30;
        tUpperX = -0.78; tUpperY = 0.25;
        tArmLX = -1.65; tArmLZ = 0.15; tArmRX = -0.55; tArmRZ = 0.65;
      } else if (S.grab === 'MUTE GRAB') {
        tSkiLY = -0.42; tSkiLZ = -0.25; tSkiLYPos = 0.4;
        tSkiRY = 0.42; tSkiRZ = 0.25; tSkiRYPos = 0.35;
        tUpperX = -0.55; tUpperY = 0.45;
        tArmRX = -1.55; tArmRZ = -0.35; tArmLX = -0.4; tArmLZ = -0.85;
      }
    } else if (S.jump) {
      if (hudGrab) hudGrab.classList.remove('show');
      tLegX = -0.38; tKneeX = 0.68; tUpperYPos = 0.98;
      tUpperX = -0.22; tArmLX = -0.55; tArmLZ = -0.45; tArmRX = -0.55; tArmRZ = 0.45;
        } else {
      if (hudGrab) hudGrab.classList.remove('show');
      const pushing = (keys['KeyW'] || keys['ArrowUp']) && !S.grinding;
      const polePhase = pushing ? Math.sin(t * 13) : 0;
      const polePush = pushing ? (0.5 + 0.5 * polePhase) : 0;
      const crouch = Math.min(0.25, S.speed * 0.006);
      tLegX = -crouch; tKneeX = crouch * 1.8; tUpperYPos = 1.12 - crouch * 0.25 - polePush * 0.06;
      tUpperX = -0.14 - crouch * 0.5 - polePush * 0.16;
      tArmLX = -0.28 - polePhase * 0.65; tArmLZ = -0.22 - Math.max(0, -S.lean) * 0.4;
      tArmRX = -0.28 - polePhase * 0.65; tArmRZ = 0.22 + Math.max(0, S.lean) * 0.4;
      tSkiLZ = 0.04 + S.lean * 0.35; tSkiRZ = -0.04 + S.lean * 0.35;
    }

    lp(skiL, 'x', tSkiLX); lp(skiL, 'y', tSkiLY); lp(skiL, 'z', tSkiLZ); lpPos(skiL, 'y', tSkiLYPos);
    lp(skiR, 'x', tSkiRX); lp(skiR, 'y', tSkiRY); lp(skiR, 'z', tSkiRZ); lpPos(skiR, 'y', tSkiRYPos);
    lp(upper, 'x', tUpperX); lp(upper, 'y', tUpperY); lp(upper, 'z', tUpperZ); lpPos(upper, 'y', tUpperYPos);
    lp(armL, 'x', tArmLX); lp(armL, 'z', tArmLZ);
    lp(armR, 'x', tArmRX); lp(armR, 'z', tArmRZ);
    lp(legL, 'x', tLegX); lp(kneeL, 'x', tKneeX);
    lp(legR, 'x', tLegX); lp(kneeR, 'x', tKneeX);

        const flipLift = (S.jump && !S.onRamp && S.vy > -12) ? Math.max(0, Math.sin(Math.abs(S.spinX))) * 0.65 : 0;
    skier.position.set(S.x, ground + S.jy + flipLift, S.z);
    skier.rotation.z = S.lean;
    skier.rotation.y = -S.vx * 0.02 + S.spinY;
    skier.rotation.x = (S.jump ? S.spinX : 0) + Math.min(0.18, S.speed * 0.0025);

    /* --- camera follow --- */
    const airZoom = Math.min(4.5, S.jy * 0.45 + S.speed * 0.05);
    const camT = new THREE.Vector3(S.x * 0.72, ground + S.jy + 4.4 + airZoom * 0.55, S.z + 10.2 + airZoom);
    camera.position.lerp(camT, 1 - Math.exp(-4.5 * dt));
    camera.lookAt(S.x * 0.85, ground + S.jy + 1.6, S.z - 9);

    /* --- HUD --- */
    $('#score-val').textContent = Math.floor(S.score).toLocaleString('nb-NO');
    $('#speed-val').textContent = Math.round(S.speed * 2.2);
    $('#speed-bar').style.width = Math.min(100, S.speed / 68.2 * 100) + '%';
    const mm = String(Math.floor(S.time / 60)).padStart(2, '0');
    const ss = String(Math.floor(S.time % 60)).padStart(2, '0');
    $('#time-val').textContent = mm + ':' + ss;
    const alt = Math.max(0, 2920 - S.meters * 0.35);
    $('#alt-val').textContent = alt.toLocaleString('nb-NO', { maximumFractionDigits: 0 }) + ' M';
    $('#alt-track').style.height = Math.max(4, alt / 2920 * 100) + '%';
    const left = Math.max(0, 1 - S.meters / 1000);
    $('#left-val').textContent = left.toFixed(1) + ' KM LEFT';
    $('#music-fill').style.width = ((t % 68.2) / 34 * 100) + '%';

    if (S.score > S.high) {
      S.high = Math.floor(S.score);
      localStorage.setItem('cork7_hs', S.high);
      $('#pause-hs').textContent = S.high;
    }

    /* --- wrap --- */
    if (S.z < -1000) S.z += 1000;
  } else {
    /* menu / pause: slow orbit around skier */
    if (S.mode === 'menu') {
      menuAngle += dt * 0.25;
      skier.rotation.y = menuAngle;
      camera.position.lerp(new THREE.Vector3(Math.sin(menuAngle) * 6.5, 2.8, Math.cos(menuAngle) * 6.5), 0.08);
      camera.lookAt(0, 1.3, 0);
    }
  }

  /* --- recycle decor --- */
  if (S.mode === 'play') {
    for (const tr of decor.trees) if (tr.position.z > S.z + 40) tr.position.z -= 1080;
    for (const f of decor.fence) if (f.position.z > S.z + 30) f.position.z -= 1040;
    for (const p of decor.liftP) if (p.position.z > S.z + 30) p.position.z -= 1040;
    for (let i = 0; i < decor.liftC.length; i++) {
      const c = decor.liftC[i];
      if (c.position.z > S.z + 30) c.position.z -= 1040;
    }
    for (const a of decor.arch) if (a.position.z > S.z + 60) a.position.z -= 1800;
  }
  for (const tr of decor.trees) tr.position.y = heightAt(tr.position.x, tr.position.z);
  for (const f of decor.fence) f.position.y = heightAt(f.position.x, f.position.z);
  for (const p of decor.liftP) p.position.y = heightAt(p.position.x, p.position.z);

  /* --- snow fall --- */
  const pp = pGeo.attributes.position;
  for (let i = 0; i < P_COUNT; i++) {
    let y = pp.getY(i) - dt * (4 + (i % 5));
    if (y < -2) y += 50;
    pp.setY(i, y);
    pp.setX(i, pp.getX(i) + Math.sin(t + i) * dt * 0.6);
    if (pp.getZ(i) < camera.position.z - 60) pp.setZ(i, pp.getZ(i) + 120);
    if (pp.getZ(i) > camera.position.z + 60) pp.setZ(i, pp.getZ(i) - 120);
  }
  pp.needsUpdate = true;

  /* --- update sparks & snow spray --- */
  for (let i = 0; i < FX_COUNT; i++) {
    const p = fxVel[i];
    if (p.life > 0) {
      p.life -= dt;
      p.y -= 12 * dt;
      fxPos[i * 3] += p.x * dt;
      fxPos[i * 3 + 1] += p.y * dt;
      fxPos[i * 3 + 2] += p.z * dt;
    } else {
      fxPos[i * 3 + 1] = -999;
    }
  }
  fxGeo.attributes.position.needsUpdate = true;

  if (S.mode === 'play') {
    if (S.grinding) spawnBurst(S.x, heightAt(S.x, S.z) + S.jy, S.z, 3, 0xffbe0b, 1.0);
    else if (!S.jump && Math.abs(S.lean) > 0.35 && S.speed > 10) spawnBurst(S.x, heightAt(S.x, S.z), S.z, 2, 0xffffff, 0.7);
  }

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
/* === MOBILE TOUCH CONTROLS === */
(function addMobileTouchUI() {
  if (document.getElementById('mobile-controls')) return;
  const wrap = document.createElement('div');
  wrap.id = 'mobile-controls';
  wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:40;display:none;';
  wrap.innerHTML = `
    <div style="position:absolute;bottom:24px;left:20px;display:grid;grid-template-columns:repeat(3,54px);grid-template-rows:repeat(2,54px);gap:6px;pointer-events:auto;">
      <div></div><button data-k="KeyW" class="mbtn">▲</button><div></div>
      <button data-k="KeyA" class="mbtn">◀</button><button data-k="KeyS" class="mbtn">▼</button><button data-k="KeyD" class="mbtn">▶</button>
    </div>
    <div style="position:absolute;bottom:24px;right:20px;display:grid;grid-template-columns:repeat(2,62px);gap:8px;pointer-events:auto;">
      <button data-grab="METHOD" class="mbtn" style="font-size:11px;">METHOD</button>
      <button data-grab="STALEFISH" class="mbtn" style="font-size:11px;">STALE</button>
      <button data-grab="NOSE GRAB" class="mbtn" style="font-size:11px;">NOSE</button>
      <button data-jump="1" class="mbtn" style="background:rgba(126,240,212,0.35);border-color:#7ef0d4;font-weight:900;">HOPP</button>
    </div>
    <button id="m-restart" class="mbtn" style="position:absolute;top:20px;left:50%;transform:translateX(-50%);width:48px;height:38px;pointer-events:auto;font-size:12px;">↺ R</button>
  `;
  document.body.appendChild(wrap);

  const st = document.createElement('style');
  st.textContent = '.mbtn{background:rgba(10,16,28,0.65);border:2px solid rgba(255,255,255,0.25);border-radius:14px;color:#fff;font-family:Orbitron,sans-serif;font-size:18px;touch-action:none;user-select:none;}.mbtn:active{background:rgba(126,240,212,0.45);border-color:#7ef0d4;}@media (pointer:coarse),(max-width:900px){#mobile-controls{display:block !important;}}';
  document.head.appendChild(st);

  const toggleVis = () => {
    const isMobile = matchMedia('(pointer:coarse)').matches || innerWidth <= 900;
    wrap.style.display = (isMobile && S.mode === 'play') ? 'block' : 'none';
  };
  setInterval(toggleVis, 300);

  wrap.querySelectorAll('[data-k]').forEach(b => {
    const code = b.dataset.k;
    b.addEventListener('pointerdown', e => { e.preventDefault(); keys[code] = true; });
    b.addEventListener('pointerup', e => { e.preventDefault(); keys[code] = false; });
    b.addEventListener('pointerleave', () => { keys[code] = false; });
  });
  wrap.querySelector('[data-jump]').addEventListener('pointerdown', e => { e.preventDefault(); startJump(); });
  wrap.querySelectorAll('[data-grab]').forEach(b => {
    b.addEventListener('pointerdown', e => { e.preventDefault(); startGrab(b.dataset.grab); });
    b.addEventListener('pointerup', e => { e.preventDefault(); if (S.grabOn) bankTrick(); });
  });
  document.getElementById('m-restart').addEventListener('pointerdown', e => {
    e.preventDefault();
    if (typeof fullRestartRun === 'function') fullRestartRun(); else startGame();
  });
})();
/* === 150 KM/H TOP SPEED, CLEAN LANDING & BOTTOM CONTROLS BAR === */
// 1. Flytt og oppdater kontroll-linjen til bunnen av skjermen
(function fixControlsBanner() {
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    if (n.nodeValue && n.nodeValue.includes('W-A-S-D: Bevegelse')) {
      const el = n.parentElement;
      el.textContent = 'W-A-S-D: Kjør & Spinn  •  Space: Hopp  •  Y/U/I/O: Grabs  •  Shift: Slow-Mo  •  1-5: Skins  •  G: Map  •  R: Restart';
      el.style.cssText = 'position:fixed !important;bottom:12px !important;top:auto !important;left:50% !important;transform:translateX(-50%) !important;background:rgba(10,16,28,0.65);border:1px solid rgba(255,255,255,0.14);border-radius:10px;padding:6px 14px;font-size:11px;white-space:nowrap;z-index:25;pointer-events:none;backdrop-filter:blur(6px);';
      break;
    }
  }
})();
/* === POW REWARDS & 7 NEW UNLOCKABLE SHOP SKINS === */
const NEW_SHOP_SKINS = [
  { name: 'GOLD MEDALIST', price: 600, rarity: 'RARE', tee: 0xfacc15, skin: 0xd9a077, pants: 0x111318, straps: 0xfacc15, helmet: 0x181b22, mask: 0x111318, gloves: 0xfacc15, skis: 0xfde047, goggles: 0xfacc15, longSleeve: true },
  { name: 'TOKYO DRIFT', price: 900, rarity: 'RARE', tee: 0xc026d3, skin: 0xc68b63, pants: 0x13111c, straps: 0x4ade80, helmet: 0x1e1b2e, mask: 0xc026d3, gloves: 0x4ade80, skis: 0xe879f9, goggles: 0x4ade80, longSleeve: false },
  { name: 'GLACIER CAMO', price: 1200, rarity: 'EPIC', tee: 0x0f172a, skin: 0xd9a077, pants: 0xbae6fd, camo: ['#e0f2fe', '#38bdf8', '#0284c7'], straps: 0x38bdf8, helmet: 0xf8fafc, mask: 0x0f172a, gloves: 0x38bdf8, skis: 0x7dd3fc, goggles: 0x38bdf8, longSleeve: true },
  { name: 'TOXIC SLIME', price: 1600, rarity: 'EPIC', tee: 0x22c55e, skin: 0xc68b63, pants: 0x090d0b, straps: 0x4ade80, helmet: 0x090d0b, mask: 0x14532d, gloves: 0x4ade80, skis: 0x22c55e, goggles: 0x86efac, longSleeve: false },
  { name: 'CRIMSON SAMURAI', price: 2200, rarity: 'EPIC', tee: 0x18181b, skin: 0xd9a077, pants: 0x1c1917, straps: 0xef4444, helmet: 0x991b1b, mask: 0x09090b, gloves: 0xef4444, skis: 0xdc2626, goggles: 0xf87171, longSleeve: true },
  { name: 'GALAXY COSMIC', price: 3000, rarity: 'LEGENDARY', tee: 0x1e1b4b, skin: 0xc68b63, pants: 0x6d28d9, camo: ['#311042', '#7c3aed', '#ec4899'], straps: 0xf472b6, helmet: 0x1e1b4b, mask: 0x312e81, gloves: 0xc084fc, skis: 0xa855f7, goggles: 0xf472b6, longSleeve: true },
  { name: 'DIAMOND LEGEND', price: 4500, rarity: 'MYTHIC', tee: 0xecfeff, skin: 0xd9a077, pants: 0x164e63, camo: ['#cffafe', '#22d3ee', '#0891b2'], straps: 0x7ef0d4, helmet: 0xffffff, mask: 0xecfeff, gloves: 0x7ef0d4, skis: 0x67e8f9, goggles: 0x7ef0d4, longSleeve: true }
];

const STARTER_NAMES = STEEZE_SKINS.slice(0, 5).map(s => s.name);
NEW_SHOP_SKINS.forEach(sk => { if (!STEEZE_SKINS.some(x => x.name === sk.name)) STEEZE_SKINS.push(sk); });

let unlockedSkins = Array.from(new Set([...STARTER_NAMES, ...JSON.parse(localStorage.getItem('cork7_unlocked') || '[]')]));
const saveUnlocked = () => localStorage.setItem('cork7_unlocked', JSON.stringify(unlockedSkins));
const updatePowUI = () => { localStorage.setItem('cork7_pow', pow); const p = document.getElementById('pow-amt'); if (p) p.textContent = pow.toLocaleString('nb-NO'); };
updatePowUI();

function bankRunPow(label) {
  const earned = Math.floor((S.score || 0) / 15) + Math.floor((S.meters || 0) * 0.25);
  if (earned > 0) {
    pow += earned; updatePowUI(); S.score = 0; S.meters = 0; renderShopAndLocker();
    toast((label || 'RUNDE') + ': +' + earned + ' POW!'); beep(880, 0.14, 'triangle');
  }
}

applyOutfit = function(i) {
  const idx = (i + STEEZE_SKINS.length) % STEEZE_SKINS.length;
  const target = STEEZE_SKINS[idx];
  if (!unlockedSkins.includes(target.name)) { toast('LÅST! KJØP I SHOP (' + target.price + ' POW)'); beep(180, 0.14, 'sawtooth'); return; }
  curOutfit = idx; buildSkier(); renderShopAndLocker();
};

function renderShopAndLocker() {
  const lg = document.getElementById('locker-grid');
  if (lg) {
    lg.innerHTML = '';
    STEEZE_SKINS.forEach((s, i) => {
      const owned = unlockedSkins.includes(s.name);
      const d = document.createElement('div');
      d.className = 'item purple' + (i === curOutfit ? ' sel' : '');
      d.style.opacity = owned ? '1' : '0.45';
      d.innerHTML = '<div class="swatch" style="background:linear-gradient(120deg,#' + s.tee.toString(16).padStart(6,'0') + ',#' + s.pants.toString(16).padStart(6,'0') + ')"></div><div class="rare">' + (owned ? 'OPPLÅST' : 'LÅST • ' + s.price + ' POW') + '</div><div class="nm display">' + s.name + '</div>';
      d.onclick = () => owned ? applyOutfit(i) : toast('KJØP ' + s.name + ' I SHOP');
      lg.appendChild(d);
    });
  }
  const ss = document.getElementById('shop-sets'), si = document.getElementById('shop-items');
  if (ss) ss.innerHTML = ''; if (si) si.innerHTML = '';
  NEW_SHOP_SKINS.forEach((s, idx) => {
    const owned = unlockedSkins.includes(s.name), grid = (idx < 4 && ss) ? ss : (si || ss);
    if (!grid) return;
    const d = document.createElement('div');
    d.className = 'item ' + (s.price >= 2000 ? 'purple' : 'orange');
    d.innerHTML = '<div class="price">' + (owned ? '✓ EID' : '❄ ' + s.price.toLocaleString('nb-NO') + ' POW') + '</div><div class="swatch" style="background:linear-gradient(120deg,#' + s.tee.toString(16).padStart(6,'0') + ',#' + s.pants.toString(16).padStart(6,'0') + ')"></div><div class="rare">' + s.rarity + '</div><div class="nm display">' + s.name + '</div>';
    d.onclick = () => {
      const fIdx = STEEZE_SKINS.findIndex(x => x.name === s.name);
      if (owned) { applyOutfit(fIdx); toast('VALGT: ' + s.name); }
      else if (pow >= s.price) { pow -= s.price; unlockedSkins.push(s.name); saveUnlocked(); updatePowUI(); applyOutfit(fIdx); toast('KJØPT: ' + s.name + '!'); beep(920, 0.16, 'triangle'); }
      else { toast('MANGLER ' + (s.price - pow) + ' POW'); beep(180, 0.15, 'sawtooth'); }
    };
    grid.appendChild(d);
  });
}
renderShopAndLocker();

const _r = fullRestartRun; fullRestartRun = function() { bankRunPow('NY RUNDE'); _r(); };
const _q = quitToMenu; quitToMenu = function() { bankRunPow('RUNDE FULLFØRT'); _q(); };
/* === START IN MAIN MENU & CLEAN MENU BUTTON === */
window.addEventListener('DOMContentLoaded', () => {
  S.mode = 'menu';
  const menu = document.getElementById('menu');
  const hud = document.getElementById('hud');
  const pause = document.getElementById('pause');
  if (menu) menu.classList.remove('hidden');
  if (hud) hud.classList.add('hidden');
  if (pause) pause.classList.add('hidden');
});

// Kjør også med en gang i tilfelle DOMContentLoaded allerede har kjørt
(function forceMenuOnBoot() {
  S.mode = 'menu';
  const menu = document.getElementById('menu');
  const hud = document.getElementById('hud');
  const pause = document.getElementById('pause');
  if (menu) menu.classList.remove('hidden');
  if (hud) hud.classList.add('hidden');
  if (pause) pause.classList.add('hidden');

  const topMenuBtn = document.getElementById('btn-menu-top');
  if (topMenuBtn) {
    topMenuBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof quitToMenu === 'function') quitToMenu();
    };
  }
})();