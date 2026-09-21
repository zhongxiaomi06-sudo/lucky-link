import * as THREE from 'three';
import { createSphericalCamera } from './camera-360.js';
import { createWorld360, woodTexture } from './world-360.js';
import { createCharmShowcase } from './charm-showcase.js';
import { finishBead } from './bead-finish.js';
import { createGameSound } from './game-sound.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MATERIALS } from './materials.js';
import { saveKey, readStored, writeStored } from './studio-game.js';
import { COMMISSIONS as LEVELS, normalizeProgress, deliver, transfer, history, availableMaterials } from './styling-game.js';
import { createBeadInteraction } from './bead-interaction.js';
import { createWorkbench } from './workbench.js';
import { createStudioUI, openDialog } from './studio-ui.js';

const shell = document.querySelector('[data-lab-shell]');
const stage = document.querySelector('[data-stage]');
const canvas = document.querySelector('[data-canvas]');
const fallback = document.querySelector('[data-fallback]');
const renderState = document.querySelector('[data-render-state]');
const fpsOutput = document.querySelector('[data-fps]');
const callsOutput = document.querySelector('[data-calls]');
const trianglesOutput = document.querySelector('[data-triangles]');
const resolutionOutput = document.querySelector('[data-resolution]');
const materialsRoot = document.querySelector('[data-materials]');
const countOutput = document.querySelector('[data-count]');
const builderStatus = document.querySelector('[data-builder-status]');
const selectionLabel = document.querySelector('[data-selection-label]');
const finishButton = document.querySelector('[data-action="finish"]');
const undoButton = document.querySelector('[data-action="undo"]');
const clearButton = document.querySelector('[data-action="clear"]');
const builderDock = document.querySelector('[data-builder]');
const finishDock = document.querySelector('[data-finish]');
const statusToast = document.querySelector('[data-status]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
let scene;
let camera;
let controls;
let chainRig;
let chainCurve;
let chainBeadGroup;
let chainSlots = [];
let cameraRig;
let world;
let subject;
let phone;
let charmShowcase;
let animationFrame;
let needsRender = true;
let sway = 0;
let swayVelocity = 0;
let frameCount = 0;
let lastStatsTime = performance.now();
let lastFrameTime = performance.now();
const game = normalizeProgress(readStored('lucky-link.styling.v2', readStored('lucky-link.studio.v1', null)));
const editHistory = history();
let composition = game.drafts[saveKey(game)];
let selectedIndex = -1;
let replacing = false;
let studioUI;
let selectedCategory = 'all';
let lastAddedIndex = -1;
let toastTimer;
let beadInteraction;
let lastDelivery;
let focusUiTimer;
const mobileRender = matchMedia('(pointer: coarse)').matches || innerWidth < 600;
const focusPoint = new THREE.Vector3();

const glassBlue = new THREE.MeshPhysicalMaterial({ color: 0x1478ff, metalness: 0.02, roughness: 0.08, transmission: 0.78, thickness: 0.7, ior: 1.46, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.92 });
const crystal = new THREE.MeshPhysicalMaterial({ color: 0xe8f9ff, metalness: 0, roughness: 0.06, transmission: 0.93, thickness: 0.8, ior: 1.48, clearcoat: 1, transparent: true, opacity: 0.9 });
const aquaGlass = new THREE.MeshPhysicalMaterial({ color: 0x59d9ff, metalness: 0, roughness: 0.07, transmission: 0.78, thickness: 0.9, ior: 1.47, clearcoat: 1, transparent: true, opacity: 0.92 });
const butterResin = new THREE.MeshPhysicalMaterial({ color: 0xffc928, metalness: 0, roughness: 0.18, transmission: 0.34, thickness: 0.7, clearcoat: 1 });
const pearl = new THREE.MeshPhysicalMaterial({ color: 0xfff8ed, metalness: 0.04, roughness: 0.18, iridescence: 0.85, iridescenceIOR: 1.3, clearcoat: 1 });
const silver = new THREE.MeshPhysicalMaterial({ color: 0xe9edf2, metalness: 0.92, roughness: 0.16, clearcoat: 0.8 });
const darkGlass = new THREE.MeshPhysicalMaterial({ color: 0x06101b, metalness: 0.35, roughness: 0.04, transmission: 0.08, clearcoat: 1 });
const cherryRed = new THREE.MeshPhysicalMaterial({ color: 0xe91e35, metalness: 0.04, roughness: 0.12, clearcoat: 1 });
const roseQuartz = new THREE.MeshPhysicalMaterial({ color: 0xff7eb8, metalness: 0, roughness: .09, transmission: .58, thickness: .72, ior: 1.45, clearcoat: 1, transparent: true, opacity: .94 });
const amberGlass = new THREE.MeshPhysicalMaterial({ color: 0xff861c, metalness: 0, roughness: .1, transmission: .52, thickness: .85, ior: 1.46, clearcoat: 1, transparent: true, opacity: .96 });
const jadeGlass = new THREE.MeshPhysicalMaterial({ color: 0x16bc83, metalness: 0, roughness: .12, transmission: .46, thickness: .8, ior: 1.45, clearcoat: 1 });
const lavenderGlass = new THREE.MeshPhysicalMaterial({ color: 0x9b72ff, metalness: 0, roughness: .08, transmission: .54, thickness: .8, ior: 1.47, clearcoat: 1 });
const limeResin = new THREE.MeshPhysicalMaterial({ color: 0xc2ed2f, metalness: 0, roughness: .18, transmission: .2, clearcoat: 1 });
const coralResin = new THREE.MeshPhysicalMaterial({ color: 0xff665c, metalness: 0, roughness: .2, clearcoat: 1 });
const cobaltResin = new THREE.MeshPhysicalMaterial({ color: 0x143ee8, metalness: .04, roughness: .12, transmission: .18, clearcoat: 1 });
const gold = new THREE.MeshPhysicalMaterial({ color: 0xffc438, metalness: .82, roughness: .17, clearcoat: .8 });
const cordMaterial = new THREE.MeshStandardMaterial({ color: 0x43566c, metalness: 0.48, roughness: 0.42 });


function mesh(geometry, material, cast = true) {
  const item = new THREE.Mesh(geometry, material);
  item.castShadow = cast;
  item.receiveShadow = true;
  return item;
}

function createPhone() {
  const phone = new THREE.Group();
  phone.name = 'phone-front-back-and-hardware';
  const body = mesh(new RoundedBoxGeometry(3.25, 6.45, 0.34, 6, 0.18), new THREE.MeshPhysicalMaterial({ color: 0xd5dadd, metalness: 0.62, roughness: 0.22, clearcoat: 1 }));
  phone.add(body);

  const clearCase = mesh(new RoundedBoxGeometry(3.43, 6.63, 0.43, 6, 0.2), new THREE.MeshPhysicalMaterial({ color: 0xeaf8ff, metalness: 0, roughness: 0.08, transmission: 0.86, thickness: 0.24, ior: 1.45, transparent: true, opacity: 0.42 }), false);
  clearCase.position.z = 0.01;
  phone.add(clearCase);

  const cameraPlate = mesh(new RoundedBoxGeometry(1.38, 1.62, 0.16, 4, 0.16), new THREE.MeshPhysicalMaterial({ color: 0xe8e5df, metalness: 0.56, roughness: 0.14, clearcoat: 1 }));
  cameraPlate.position.set(-0.78, 2.14, 0.27);
  phone.add(cameraPlate);

  [[-1.08, 2.48], [-.5, 2.38], [-1.0, 1.79]].forEach(([x, y], index) => {
    const ring = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.17, 40), silver);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, 0.42);
    phone.add(ring);
    const lens = mesh(new THREE.CylinderGeometry(0.275, 0.29, 0.19, 40), darkGlass);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, y, 0.53);
    phone.add(lens);
    const glint = mesh(new THREE.SphereGeometry(0.055, 16, 12), index === 1 ? aquaGlass : glassBlue, false);
    glint.scale.set(1.4, .55, .28);
    glint.position.set(x - .075, y + .075, .64);
    phone.add(glint);
  });

  const flash = mesh(new THREE.SphereGeometry(0.12, 24, 16), butterResin, false);
  flash.scale.z = .28;
  flash.position.set(-.42, 1.77, .48);
  phone.add(flash);

  const attachment = mesh(new THREE.TorusGeometry(.23, .055, 12, 34), silver);
  attachment.position.set(-1.48, -2.6, .22);
  attachment.rotation.x = .25;
  phone.add(attachment);

  // The reverse is an actual screen and frame, visible throughout a full orbit.
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 256; screenCanvas.height = 512;
  const ctx = screenCanvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 256, 512);
  gradient.addColorStop(0, '#236e76'); gradient.addColorStop(.6, '#91cec3'); gradient.addColorStop(1, '#e8d8b5');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = '#e9f4d660'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) { ctx.beginPath(); ctx.ellipse(120, 370, 30 + i * 18, 65 + i * 21, .5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff9e9'; ctx.font = '46px Georgia'; ctx.fillText('11:11', 128, 119);
  ctx.font = '11px sans-serif'; ctx.fillText('a little luck, made by you', 128, 148);
  const screenTexture = new THREE.CanvasTexture(screenCanvas); screenTexture.colorSpace = THREE.SRGBColorSpace;
  const frontFrame = mesh(new RoundedBoxGeometry(3.16, 6.33, .035, 4, .16), darkGlass);
  frontFrame.position.z = -.194; phone.add(frontFrame);
  const screen = mesh(new THREE.PlaneGeometry(2.94, 6.02), new THREE.MeshBasicMaterial({ map: screenTexture }), false);
  screen.rotation.y = Math.PI; screen.position.z = -.222; phone.add(screen);
  const island = mesh(new RoundedBoxGeometry(.78, .18, .03, 3, .08), darkGlass);
  island.position.set(0, 2.74, -.247); phone.add(island);
  for (const [side, y, height] of [[-1, 1.05, .58], [-1, .24, .58], [1, .75, .84]]) {
    const button = mesh(new RoundedBoxGeometry(.055, height, .12, 2, .025), silver);
    button.position.set(side * 1.644, y, .01); phone.add(button);
  }
  const port = mesh(new RoundedBoxGeometry(.38, .03, .115, 2, .02), darkGlass);
  port.position.set(0, -3.225, 0); phone.add(port);
  for (let i = 0; i < 10; i += 1) {
    const hole = mesh(new THREE.SphereGeometry(.029, 8, 6), darkGlass, false);
    hole.position.set((i < 5 ? -.92 : .5) + (i % 5) * .085, -3.227, 0);
    hole.scale.y = .3; phone.add(hole);
  }

  phone.rotation.set(-.16, 0, 0);
  phone.scale.setScalar(.84);
  phone.position.set(-1.05, 3.05, -.7);
  phone.userData.supported = true;
  return phone;
}

function shapeGeometry(kind) {
  const shape = new THREE.Shape();
  if (kind === 'heart') {
    shape.moveTo(0, -.27);
    shape.bezierCurveTo(-.48, -.58, -.66, -.08, -.47, .18);
    shape.bezierCurveTo(-.28, .43, -.04, .34, 0, .14);
    shape.bezierCurveTo(.04, .34, .28, .43, .47, .18);
    shape.bezierCurveTo(.66, -.08, .48, -.58, 0, -.27);
  } else {
    for (let index = 0; index < 10; index += 1) {
      const radius = index % 2 ? .19 : .42;
      const angle = Math.PI / 2 + index * Math.PI / 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .18, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .055, bevelThickness: .055 });
  geometry.center();
  return geometry;
}

function createFlower() {
  const flower = new THREE.Group();
  for (let index = 0; index < 6; index += 1) {
    const petal = mesh(new THREE.SphereGeometry(.18, 20, 14), crystal);
    const angle = index * Math.PI / 3;
    petal.scale.set(.72, 1.2, .54);
    petal.position.set(Math.cos(angle) * .3, Math.sin(angle) * .3, 0);
    flower.add(petal);
  }
  flower.add(mesh(new THREE.SphereGeometry(.16, 20, 14), glassBlue));
  return flower;
}

function createBow() {
  const bow = new THREE.Group();
  [-1, 1].forEach((side) => {
    const loop = mesh(new THREE.SphereGeometry(.28, 24, 18), butterResin);
    loop.scale.set(1.3, .78, .55);
    loop.position.x = side * .27;
    loop.rotation.z = side * .34;
    bow.add(loop);
  });
  bow.add(mesh(new THREE.SphereGeometry(.14, 20, 14), butterResin));
  return bow;
}

function createCherries() {
  const cherries = new THREE.Group();
  [-1, 1].forEach((side) => {
    const fruit = mesh(new THREE.SphereGeometry(.2, 24, 18), cherryRed);
    fruit.position.set(side * .18, -.18, 0);
    cherries.add(fruit);
    const stem = mesh(new THREE.CylinderGeometry(.018, .018, .42, 8), cordMaterial);
    stem.position.set(side * .09, .1, 0);
    stem.rotation.z = side * -.38;
    cherries.add(stem);
  });
  return cherries;
}

function createEye() {
  const eye = new THREE.Group();
  const bead = mesh(new THREE.SphereGeometry(.34, 28, 20), pearl);
  bead.scale.z = .72;
  eye.add(bead);
  const iris = mesh(new THREE.CylinderGeometry(.15, .15, .035, 28), glassBlue, false);
  iris.rotation.x = Math.PI / 2;
  iris.position.z = .27;
  eye.add(iris);
  const pupil = mesh(new THREE.CylinderGeometry(.065, .065, .042, 24), darkGlass, false);
  pupil.rotation.x = Math.PI / 2;
  pupil.position.z = .3;
  eye.add(pupil);
  return eye;
}

function createDice() {
  const dice = new THREE.Group();
  dice.add(mesh(new RoundedBoxGeometry(.58, .58, .58, 4, .1), roseQuartz));
  [[-.15, .15], [.15, -.15], [-.15, -.15], [.15, .15]].forEach(([x, y]) => {
    const pip = mesh(new THREE.SphereGeometry(.035, 10, 8), pearl, false);
    pip.position.set(x, y, .31);
    dice.add(pip);
  });
  return dice;
}

function createMoon() {
  const moon = mesh(new THREE.TorusGeometry(.28, .11, 14, 36, Math.PI * 1.46), gold);
  moon.rotation.z = -.7;
  return moon;
}

function createShell() {
  const shell = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(.34, 28, 18, 0, Math.PI * 2, 0, Math.PI * .56), pearl);
  body.scale.set(1.08, .82, .4);
  body.rotation.x = Math.PI;
  shell.add(body);
  for (let index = -2; index <= 2; index += 1) {
    const rib = mesh(new THREE.TorusGeometry(.24 + Math.abs(index) * .018, .014, 7, 18, Math.PI * .78), gold, false);
    rib.scale.set(.72, 1, .4);
    rib.rotation.z = Math.PI * .11 + index * .17;
    rib.position.set(index * .035, -.02, .15);
    shell.add(rib);
  }
  return shell;
}

function createCandy() {
  const candy = new THREE.Group();
  const center = mesh(new THREE.SphereGeometry(.23, 24, 18), lavenderGlass);
  center.scale.x = 1.2;
  candy.add(center);
  [-1, 1].forEach((side) => {
    const wrapper = mesh(new THREE.ConeGeometry(.17, .3, 5), crystal);
    wrapper.rotation.z = side * Math.PI / 2;
    wrapper.position.x = side * .34;
    candy.add(wrapper);
  });
  return candy;
}

function createBell() {
  const bell = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(.2, .34, .42, 28, 1, true), gold);
  bell.add(body);
  const rim = mesh(new THREE.TorusGeometry(.31, .035, 9, 28), gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -.21;
  bell.add(rim);
  const clapper = mesh(new THREE.SphereGeometry(.07, 14, 10), cherryRed);
  clapper.position.y = -.29;
  bell.add(clapper);
  return bell;
}

function createBead(kind) {
  if (kind === 'crystal') return mesh(new THREE.IcosahedronGeometry(.32, 2), crystal);
  if (kind === 'blue') return mesh(new THREE.IcosahedronGeometry(.34, 2), glassBlue);
  if (kind === 'aqua') return mesh(new THREE.IcosahedronGeometry(.35, 2), aquaGlass);
  if (kind === 'pearl') return mesh(new THREE.SphereGeometry(.32, 32, 22), pearl);
  if (kind === 'heart') return mesh(shapeGeometry('heart'), aquaGlass);
  if (kind === 'star') return mesh(shapeGeometry('star'), glassBlue);
  if (kind === 'cube') return mesh(new RoundedBoxGeometry(.54, .54, .54, 3, .08), crystal);
  if (kind === 'flower') return createFlower();
  if (kind === 'bow') return createBow();
  if (kind === 'cherry') return createCherries();
  if (kind === 'rose') return mesh(new THREE.IcosahedronGeometry(.35, 2), roseQuartz);
  if (kind === 'amber') return mesh(new RoundedBoxGeometry(.54, .54, .54, 3, .09), amberGlass);
  if (kind === 'jade') return mesh(new THREE.TorusGeometry(.28, .12, 16, 34), jadeGlass);
  if (kind === 'lavender') return mesh(shapeGeometry('heart'), lavenderGlass);
  if (kind === 'lime') return mesh(new THREE.OctahedronGeometry(.35, 1), limeResin);
  if (kind === 'coral') return mesh(new THREE.TorusKnotGeometry(.22, .075, 64, 10, 2, 3), coralResin);
  if (kind === 'eye') return createEye();
  if (kind === 'dice') return createDice();
  if (kind === 'moon') return createMoon();
  if (kind === 'shell') return createShell();
  if (kind === 'candy') return createCandy();
  if (kind === 'bell') return createBell();
  if (kind === 'cobalt') return mesh(new THREE.SphereGeometry(.33, 30, 22), cobaltResin);
  if (kind === 'sun') return mesh(new THREE.SphereGeometry(.34, 30, 22), butterResin);
  return mesh(new THREE.SphereGeometry(.3, 28, 20), pearl);
}

function createChain() {
  const rig = new THREE.Group();
  const points = [
    new THREE.Vector3(-1.4, .43, .75), new THREE.Vector3(-2, .43, 1.4),
    new THREE.Vector3(-1.7, .43, 2.65), new THREE.Vector3(-.5, .43, 3.4),
    new THREE.Vector3(.8, .43, 3.15), new THREE.Vector3(1.3, .43, 2.15),
    new THREE.Vector3(.85, .43, 1.25), new THREE.Vector3(-.6, .43, .75),
  ];
  points.forEach((p) => { p.x -= .3; });
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', .45);
  chainCurve = curve;
  rig.add(mesh(new THREE.TubeGeometry(curve, 128, .023, 8, true), cordMaterial));
  const anchor = new THREE.Vector3(-1.48, -2.6, .22).applyEuler(new THREE.Euler(-.16, 0, 0)).multiplyScalar(.84).add(new THREE.Vector3(-1.05, 3.05, -.7));
  const tether = new THREE.CatmullRomCurve3([anchor, new THREE.Vector3(-2.25, .6, .1), points[0], new THREE.Vector3(-2.15, .58, .18), anchor.clone().add(new THREE.Vector3(.09, 0, 0))]);
  rig.add(mesh(new THREE.TubeGeometry(tether, 40, .025, 8, false), cordMaterial));

  chainSlots = Array.from({ length: 14 }, (_, index) => curve.getPointAt(.055 + index * (.89 / 13)));
  chainBeadGroup = new THREE.Group();
  chainBeadGroup.name = 'composition';
  rig.add(chainBeadGroup);

  const topRing = mesh(new THREE.TorusGeometry(.19, .045, 10, 28), silver);
  topRing.position.copy(points[0]); topRing.rotation.x = Math.PI / 2;
  rig.add(topRing);
  return rig;
}

function findMaterial(id) {
  return MATERIALS.find((material) => material.id === id);
}

function makeMaterialBead(id) {
  const material = findMaterial(id);
  return finishBead(material,()=>createBead(material.kind));
}
const currentDraft = () => ({ ids: composition, box: game.boxes[saveKey(game)] });
function recordEdit() { editHistory.record(saveKey(game), currentDraft()); }
function commitTransfer(source, target) {
  if (shell.dataset.state !== 'compose') return false;
  if (source.kind === 'catalog' && !availableMaterials(game).some((m) => m.id === source.id)) return false;
  const next = transfer(currentDraft(), source, target);
  if (!next) return false;
  const sourceId=source.kind==='catalog'?source.id:(source.kind==='cord'?composition:game.boxes[saveKey(game)])[source.index];
  recordEdit(); composition = next.ids; game.boxes[saveKey(game)] = next.box;
  replacing = false; selectedIndex = -1;
  renderComposition(target.kind === 'cord'); updateBuilderUI();
  playSound(target.kind==='box'?'return':source.kind==='cord'?'reorder':'thread',sourceId,composition.length);
  showStatus(target.kind === 'box' ? 'Set aside in your bead box' : source.kind === 'cord' ? 'Order updated' : 'A little closer to your wish');
  return true;
}

function renderComposition(animateLatest = false) {
  needsRender = true;
  renderer.shadowMap.needsUpdate = true;
  chainSlots = Array.from({ length: Math.max(1, composition.length) }, (_, index) => chainCurve.getPointAt(.035 + index * (.93 / Math.max(1, composition.length))));
  for (const child of chainBeadGroup.children) {
    child.traverse((object) => { object.geometry?.dispose(); if (object.userData.ownedMaterial) object.material?.dispose(); });
  }
  chainBeadGroup.clear();
  const pieceSpan=chainCurve.getLength()*.82/Math.max(1,composition.length);
  composition.forEach((materialId, index) => {
    const bead = makeMaterialBead(materialId);
    const size=new THREE.Box3().setFromObject(bead).getSize(new THREE.Vector3());
    const displayScale=Math.min(1,pieceSpan/Math.max(size.x,size.y,size.z));
    bead.scale.setScalar(displayScale);bead.userData.displayScale=displayScale;
    bead.position.copy(chainSlots[index]);
    bead.rotation.set(-Math.PI / 2, 0, index * .33);
    if(bead.userData.threadingAxis) {
      const tangent=chainCurve.getTangentAt(.035+index*(.93/Math.max(1,composition.length)));
      bead.rotation.z=Math.atan2(-tangent.x,-tangent.z);
    }
    bead.updateMatrixWorld(true);
    bead.position.y += .11 - new THREE.Box3().setFromObject(bead).min.y;
    bead.userData.baseRotation = bead.rotation.clone();
    bead.userData.compositionIndex = index;
    bead.userData.materialId = materialId;
    bead.traverse((child) => {
      child.userData.compositionIndex = index;
      child.userData.materialId = materialId;
    });
    if (animateLatest && !reducedMotion && index === composition.length - 1) {
      bead.scale.setScalar(.04*displayScale);
      bead.userData.spawnedAt = performance.now();
    }
    chainBeadGroup.add(bead);

    if (index < composition.length - 1) {
      const ring = mesh(new THREE.TorusGeometry(.085, .016, 8, 18), silver);
      ring.position.copy(chainCurve.getPointAt(.035 + (index + .5) * (.93 / Math.max(1, composition.length))));
      ring.rotation.x = Math.PI / 2;
      ring.userData.connector = true;
      chainBeadGroup.add(ring);
    }
  });
  if(shell.dataset.debug==='true') shell.dataset.beadModels=JSON.stringify(chainBeadGroup.children.filter(b=>b.userData.materialId).map(b=>({id:b.userData.materialId,version:b.userData.detailVersion,triangles:b.userData.triangles,threadingAxis:b.userData.threadingAxis||null})));
}

function showStatus(message) {
  statusToast.textContent = message;
  statusToast.dataset.visible = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { statusToast.dataset.visible = 'false'; }, 2200);
}

function updateBuilderUI() {
  const count = composition.length;
  countOutput.textContent = String(count);
  undoButton.disabled = !editHistory.has(saveKey(game));
  clearButton.disabled = count === 0;
  const challenge = game.mode === 'challenge';
  finishButton.disabled = count < 3;
  finishButton.textContent = challenge ? `Show ${LEVELS.find((l) => l.id === game.levelId).client} ›` : 'Try it on ›';
  builderStatus.textContent = count === 0 ? 'Choose your first piece' : count === 14 ? 'Chain is full' : `${count} ${count === 1 ? 'piece' : 'pieces'} threaded`;
  game.drafts[saveKey(game)] = composition;
  const stored = writeStored('lucky-link.styling.v2', game);
  shell.dataset.storage = stored ? 'saved' : 'unavailable';
  shell.dataset.gameMode = game.mode;
  shell.dataset.levelId = game.levelId;
  shell.dataset.composition = composition.join(',');
  studioUI?.render(game, composition, selectedIndex);
  if (!stored) document.querySelector('[data-live-caption]').textContent = 'Session only · browser saving is unavailable';
  document.querySelector('[data-gesture-hint]').textContent = replacing ? `Replacing piece ${selectedIndex + 1} · tap a material` : count ? 'Tap a placed piece to edit · drag to look around' : 'Tap a piece to thread it';
  document.querySelector('[data-gesture-hint]').hidden = count > 0;
  document.querySelector('[data-action="cancel-replace"]').hidden = !replacing;
  document.querySelector('.edit-bar').dataset.replacing = String(replacing);
  beadInteraction?.refresh();
}

function addMaterial(materialId) {
  if (!findMaterial(materialId) || shell.dataset.state !== 'compose' || !availableMaterials(game).some((m) => m.id === materialId)) return;
  if (replacing && selectedIndex >= 0 && selectedIndex < composition.length) {
    recordEdit();
    composition[selectedIndex] = materialId; replacing = false; selectedIndex = -1;
    renderComposition(); updateBuilderUI(); playSound('replace',materialId); showStatus('Piece replaced'); return;
  }
  if (composition.length >= 14) {
    showStatus('Your chain is full');
    playSound('retry');
    return;
  }
  recordEdit();
  composition.push(materialId);
  lastAddedIndex = composition.length - 1;
  renderComposition(true);
  updateBuilderUI();
  focusOnPiece(lastAddedIndex);
  playSound('thread',materialId,composition.length);
  swayVelocity = reducedMotion ? 0 : Math.min(.7, swayVelocity + .18);
  showStatus(`${findMaterial(materialId).name} snapped in`);
}

function focusOnPiece(index) {
  if (!chainSlots[index] || !camera) return;
  focusPoint.copy(chainSlots[index]);
  chainRig.localToWorld(focusPoint);

  const projected = focusPoint.clone().project(camera);
  shell.style.setProperty('--focus-x', `${(projected.x * .5 + .5) * 100}%`);
  shell.style.setProperty('--focus-y', `${(-projected.y * .5 + .5) * 100}%`);
  shell.dataset.focus = 'true';
  clearTimeout(focusUiTimer);
  focusUiTimer = setTimeout(() => { shell.dataset.focus = 'false'; }, reducedMotion ? 80 : 920);
}

function removeMaterial(index) {
  if (index < 0 || index >= composition.length) return;
  if (!commitTransfer({ kind: 'cord', index }, { kind: 'box' })) showStatus('Your set-aside box is full. Take a bead out first.');
}

function renderMaterials() {
  const visible = MATERIALS.filter((material) => selectedCategory === 'all' || material.category === selectedCategory);
  materialsRoot.innerHTML = visible.map((material) => `
    <button class="material-button" type="button" data-material-id="${material.id}" aria-label="Add ${material.name}" style="--color:${material.color};--accent:${material.accent};--shape:${material.shape}">
      <span aria-hidden="true">${material.icon}</span><span>${material.name}</span>
    </button>
  `).join('');
}

function resize() {
  if (!renderer || !camera) return;
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobileRender ? 1.15 : 1.5));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = camera.aspect < .7 ? 52 : 48;
  camera.updateProjectionMatrix();
  if (shell.dataset.state === 'finished' && shell.dataset.finishView === 'charm') frameCharm(false,true);
  else if (shell.dataset.state === 'finished') { layoutShowcase(); cameraRig.reveal(); }
  else cameraRig.home(true);
  resolutionOutput.textContent = `${renderer.domElement.width}×${renderer.domElement.height}`;
}

function updateStats(now, rendered) {
  if (rendered) frameCount += 1;
  const elapsed = now - lastStatsTime;
  if (elapsed < 500) return;
  if (shell.dataset.debug === 'true' && phone?.visible) {
    // Actual world-space phone bounds, for read-only HUD occlusion regression checks.
    const bounds = new THREE.Box3().setFromObject(phone);
    const points = [];
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const p = new THREE.Vector3(x, y, z).project(camera);
      points.push({ x: (p.x + 1) * canvas.clientWidth / 2 + canvas.getBoundingClientRect().left, y: (1 - p.y) * canvas.clientHeight / 2 });
    }
    shell.dataset.phoneBounds = JSON.stringify({ left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) });
  }
  fpsOutput.textContent = String(Math.round(frameCount * 1000 / elapsed));
  callsOutput.textContent = String(renderer.info.render.calls);
  trianglesOutput.textContent = renderer.info.render.triangles > 999 ? `${(renderer.info.render.triangles / 1000).toFixed(1)}k` : String(renderer.info.render.triangles);
  frameCount = 0;
  lastStatsTime = now;
}

function animate(now) {
  animationFrame = requestAnimationFrame(animate);
  const delta = Math.min(.034, (now - lastFrameTime) / 1000 || .016);
  lastFrameTime = now;
  if (!reducedMotion) {
    swayVelocity += (-sway * 7.8 - swayVelocity * 4.6) * delta;
    sway += swayVelocity * delta;
    // The chain rests on a surface: only the newly inserted bead animates, never the whole rig.
    chainBeadGroup.children.forEach((child) => {
      if (child.userData.spawnedAt) {
        const t = Math.min(1, (now - child.userData.spawnedAt) / 360);
        child.scale.setScalar((child.userData.displayScale||1)*Math.max(.04, t * (1 + Math.sin(t * Math.PI) * .22)));
        if (t === 1) delete child.userData.spawnedAt;
      }
    });
  }
  world.update(now * .001, reducedMotion);
  cameraRig.update(now);
  if(shell.dataset.state==='finished' && shell.dataset.finishView==='charm' && shell.dataset.debug==='true') {
    const rect=canvas.getBoundingClientRect();
    shell.dataset.showcasePoints=JSON.stringify(charmShowcase.beads.children.map(b=>{
      const p=b.getWorldPosition(new THREE.Vector3()).project(camera);
      return {x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2};
    }));
  }
  const holding = beadInteraction?.update();
  const rendered = !reducedMotion || needsRender || cameraRig.touring || holding;
  if (rendered) {
    renderer.render(scene, camera);
    needsRender = false;
  }
  updateStats(now, rendered);
}

function setComposeView() {
  cameraRig.home();
  sway = 0;
}

function followChain() {
  subject.updateMatrixWorld(true);
  cameraRig.follow(Array.from({ length: 20 }, (_, i) => chainRig.localToWorld(chainCurve.getPointAt(i / 20))));
}

function layoutShowcase() {
  const controlsPanel=document.querySelector('[data-showcase-controls]');
  const stageRect=stage.getBoundingClientRect(), score=finishDock.getBoundingClientRect();
  controlsPanel.style.bottom=`${Math.max(12,stageRect.bottom-score.top+12)}px`;
  const tabs=document.querySelector('[data-showcase-tabs]').getBoundingClientRect();
  const panel=controlsPanel.getBoundingClientRect();
  const top=tabs.bottom-stageRect.top+12;
  const landscape=stageRect.width>stageRect.height;
  const rect={x:16,y:top,width:landscape ? score.left-stageRect.left-32 : stageRect.width-32,height:Math.max(100,(landscape ? stageRect.height-16 : panel.top-stageRect.top-12)-top)};
  shell.dataset.showcaseRect=JSON.stringify(rect);
  return rect;
}

function frameCharm(autoStart=false,preserve=false) {
  cameraRig.frameShowcase(charmShowcase.bounds(),layoutShowcase(),autoStart,preserve);
  needsRender=true;
}

function setFinishView(view, autoStart=false) {
  if(shell.dataset.state!=='finished') return;
  cameraRig.stop();
  shell.dataset.finishView=view;
  const charm=view==='charm';
  charmShowcase.root.visible=charm; phone.visible=!charm; chainRig.visible=!charm;
  subject.traverse(o=>{ if(o.userData.phoneSupport) o.visible=!charm; });
  const box=subject.getObjectByName('right-hand-bead-box'); if(box) box.visible=!charm;
  document.querySelector('[data-action="view-charm"]').setAttribute('aria-pressed',String(charm));
  document.querySelector('[data-action="view-phone"]').setAttribute('aria-pressed',String(!charm));
  document.querySelector('[data-action="showcase-spin"]').hidden=!charm;
  document.querySelector('[data-action="tour"]').hidden=charm;
  if(charm) frameCharm(autoStart && !reducedMotion);
  else { layoutShowcase(); cameraRig.reveal(); }
  renderer.shadowMap.needsUpdate=true; needsRender=true;
}

function finishComposition() {
  beadInteraction?.cancel();
  if (game.mode === 'challenge') {
    game.drafts[saveKey(game)] = composition;
    lastDelivery = deliver(game);
    if (!lastDelivery) return;
  } else if (composition.length < 3) return;
  replacing = false; selectedIndex = -1;
  updateBuilderUI();
  shell.dataset.state = 'finished';
  builderDock.hidden = true;
  finishDock.hidden = false;
  studioUI.showFinished(game, game.mode === 'free' ? null : lastDelivery);
  document.querySelector('[data-showcase-tabs]').hidden=false;
  document.querySelector('[data-showcase-controls]').hidden=false;
  charmShowcase.setComposition(composition);
  shell.dataset.showcaseComposition=composition.join(',');
  setFinishView('charm',true);
  playSound(game.mode==='free'?'complete':!lastDelivery.passed?'retry':lastDelivery.first?'reward':'complete');
  showStatus(game.mode === 'challenge' ? lastDelivery.passed ? 'Wish delivered' : 'Your design is safe. Keep trying.' : 'Your lucky is ready');
}

function editComposition() {
  shell.dataset.state = 'compose';
  builderDock.hidden = false;
  finishDock.hidden = true;
  document.querySelector('[data-showcase-tabs]').hidden=true;
  document.querySelector('[data-showcase-controls]').hidden=true;
  charmShowcase.root.visible=false; phone.visible=true; chainRig.visible=true;
  subject.traverse(o=>{ if(o.userData.phoneSupport) o.visible=true; });
  const box=subject.getObjectByName('right-hand-bead-box'); if(box) box.visible=true;
  delete shell.dataset.finishView;
  renderer.shadowMap.needsUpdate=true; needsRender=true;
  setComposeView();
  updateBuilderUI();
  showStatus('Keep building');
}

function restartComposition() {
  if (composition.length) recordEdit();
  selectedIndex = -1; replacing = false;
  composition = [];
  renderComposition();
  updateBuilderUI();
  editComposition();
}

function selectPiece(index) {
  if (shell.dataset.state !== 'compose' || !composition[index]) return;
  selectedIndex = index; replacing = false;
  updateBuilderUI(); openDialog('piece');
}

function changeGame(mode, levelId = game.levelId) {
  if (mode === 'challenge' && LEVELS.findIndex((l) => l.id === levelId) > game.completed.length) return;
  beadInteraction?.cancel();
  game.drafts[saveKey(game)] = composition;
  game.mode = mode; game.levelId = levelId;
  composition = game.drafts[saveKey(game)];
  selectedIndex = -1; replacing = false;
  document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
  renderComposition(); editComposition(); updateBuilderUI();
  beadInteraction?.resetPage();
}

function removeHitBead(event) {
  if (beadInteraction?.holding || !cameraRig.canTap()) return;
  const rect = canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(chainBeadGroup.children, true).find((item) => Number.isInteger(item.object.userData.compositionIndex));
  if (hit && shell.dataset.state === 'compose') selectPiece(hit.object.userData.compositionIndex);
  else {
    const prop = raycaster.intersectObjects(world.interactables, true)[0];
    if (prop?.object.userData.worldAction === 'chime') {
      prop.object.userData.chimeRoot.userData.impulse = 1;
      playSound('inspect');
      showStatus('A little summer breeze');
    } else if (prop && shell.dataset.state === 'compose' && findMaterial(prop.object.userData.worldAction)) {
      addMaterial(prop.object.userData.worldAction);
    }
  }
}

function setMode(mode) {
  shell.dataset.mode = mode;
  document.querySelectorAll('[data-mode-button]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.modeButton === mode)));
  renderState.textContent = mode === '3d' ? '3D live' : '2.5D reference';
}

let audioContext;
let gameSound;
let musicGain;
let musicTimer;
let muted = false;
try { muted = localStorage.getItem('lucky-link.muted') === 'yes'; } catch { /* Storage is optional. */ }
function startMusic() {
  if (musicTimer || !audioContext) return;
  musicGain = audioContext.createGain(); musicGain.gain.value = .018;
  musicGain.connect(audioContext.destination);
  let phrase = 0;
  const playPhrase = () => {
    if (muted || document.hidden) return;
    const now = audioContext.currentTime;
    const notes = phrase++ % 2 ? [293.66, 369.99, 440, 369.99] : [261.63, 329.63, 392, 493.88];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
      const at = now + index * 1.8;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(.55, at + .07); gain.gain.exponentialRampToValueAtTime(.0001, at + 3.2);
      oscillator.connect(gain).connect(musicGain); oscillator.start(at); oscillator.stop(at + 3.3);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  };
  playPhrase(); musicTimer = setInterval(playPhrase, 7200);
  shell.dataset.music = 'playing';
}
function unlockSound() {
  if (muted || document.hidden) return false;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    gameSound ??= createGameSound(audioContext);
    void audioContext.resume().catch(()=>{shell.dataset.music='unavailable';});
    startMusic();
    return true;
  } catch { shell.dataset.music='unavailable';return false; }
}
function playSound(event='select',id,count=composition.length) {
  if(!unlockSound()) return;
  try {
    if(gameSound.play(event,id,count)) {
      shell.dataset.lastSound=event;shell.dataset.soundMaterial=id||'';
      shell.dataset.soundCount=String(Number(shell.dataset.soundCount||0)+1);
    }
  } catch { /* Audio remains optional and cannot undo a valid game action. */ }
}

function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .06).texture;
  pmrem.dispose();
  scene.environmentIntensity = .55;
  scene.fog = new THREE.FogExp2(0xb6d8d0, .005);
  camera = new THREE.PerspectiveCamera(52, 1, .08, 200);
  cameraRig = createSphericalCamera(camera, canvas, shell, reducedMotion);
  controls = cameraRig.controls;
  controls.addEventListener('change', () => { needsRender = true; });
  scene.add(new THREE.HemisphereLight(0xe3f2ff, 0x9a754a, 1.2));
  const sun = new THREE.DirectionalLight(0xffeed5, 3.0);
  sun.position.set(-13, 22, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobileRender ? 512 : 1024, mobileRender ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 65 });
  sun.shadow.bias = -.001; sun.shadow.normalBias = .045;
  scene.add(sun);

  world = createWorld360();
  scene.add(world.root);
  subject = new THREE.Group();
  subject.name = 'phone-chain-workbench';
  subject.scale.setScalar(.68);
  subject.position.set(.25, .1, 0);
  subject.add(createWorkbench());
  phone=createPhone(); subject.add(phone);
  chainRig = createChain();
  subject.add(chainRig);
  charmShowcase=createCharmShowcase(makeMaterialBead,cordMaterial,woodTexture());
  subject.add(charmShowcase.root);
  scene.add(subject);
  shell.dataset.support = 'table-stand-mat';
  renderer.shadowMap.needsUpdate = true;
  shell.dataset.world = '360';
  shell.dataset.worldParts = String(world.root.userData.modelParts);
  shell.dataset.cameraMode = 'orbit';
  shell.dataset.debug = String(new URLSearchParams(location.search).has('debug'));
  document.querySelector('[data-action="sound"]').setAttribute('aria-pressed', String(!muted));
  renderMaterials();
  studioUI = createStudioUI({ onStatus: showStatus, getComposition: () => composition, onCord: (color) => { cordMaterial.color.set(color); needsRender = true; }, onSelect: selectPiece });
  renderComposition();
  updateBuilderUI();
  beadInteraction = createBeadInteraction({ canvas, shell, camera, cameraRig, subject, curve: chainCurve, beads: chainBeadGroup, makeBead: makeMaterialBead, getDraft: currentDraft, getGame: () => game, commit: commitTransfer, select: selectPiece, status: showStatus, sound: playSound, reducedMotion });
  resize();
  // Include the initially hidden pickup hand so its shader does not compile on first touch.
  shell.dataset.renderReady = 'false';
  showStatus('Preparing your bead box…');
  const preparationDeadline = new Promise((resolve) => setTimeout(resolve, 2000));
  void Promise.race([renderer.compileAsync(scene, camera), preparationDeadline]).then(() => {
    // Draw both warmup passes in one task; only the final hand-free frame is presented.
    beadInteraction.warmup(() => { renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); });
    // Construction can be expensive on first use. Prepare silently; never schedule music here.
    if (!muted) {
      try {
        audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
        // WebKit can leave this promise pending before a gesture; it must not gate the UI.
        void audioContext.suspend().catch(() => {});
      } catch { /* Optional audio must not delay or block a playable studio. */ }
    }
    shell.dataset.renderReady = 'true'; needsRender = true;
    statusToast.dataset.visible = 'false';
  }).catch(() => {
    shell.dataset.renderReady = 'true'; needsRender = true;
    showStatus('Your bead box is ready. First pickup may take a moment.');
  });
  addEventListener('resize', resize, { passive: true });
  new ResizeObserver(()=>{
    if(shell.dataset.state==='finished') {
      if(shell.dataset.finishView==='charm') frameCharm(false,true);
      else layoutShowcase();
    }
  }).observe(finishDock);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) cameraRig.stop(); });
  new MutationObserver(()=>{ if(document.querySelector('dialog[open]')) cameraRig.stop(); })
    .observe(shell,{subtree:true,attributes:true,attributeFilter:['open']});
  canvas.addEventListener('pointerup', removeHitBead);
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Home') {
      event.preventDefault();
      if (shell.dataset.finishView==='charm') cameraRig.frontShowcase();
      else if (shell.dataset.state === 'finished') cameraRig.reveal();
      else cameraRig.home();
    }
    const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (direction) {
      event.preventDefault(); cameraRig.stop();
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * .2);
      camera.position.copy(controls.target).add(offset);
    }
  });
  animationFrame = requestAnimationFrame(animate);
}

document.addEventListener('click', (event) => {
  if (!musicTimer && !muted && shell.dataset.renderReady !== 'false' && event.target.closest('button')?.dataset.action!=='sound' && event.target.closest('button')) unlockSound();
  const playMode = event.target.closest('[data-play-mode]')?.dataset.playMode;
  if (playMode) changeGame(playMode);
  const level = event.target.closest('[data-level]')?.dataset.level;
  if (level && !event.target.closest('button').disabled) changeGame('challenge', level);
  const materialButton = event.target.closest('[data-material-id]');
  if (materialButton && !materialButton.disabled) addMaterial(materialButton.dataset.materialId);
  const returned = event.target.closest('[data-returned-index]');
  if (returned) commitTransfer({ kind: 'box', index: Number(returned.dataset.returnedIndex) }, { kind: 'cord', index: composition.length });

  const category = event.target.closest('[data-category]')?.dataset.category;
  if (category) {
    selectedCategory = category;
    document.querySelectorAll('[data-category]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
    selectionLabel.textContent = category === 'all' ? 'All charms' : event.target.textContent.trim();
    renderMaterials();
    studioUI.render(game, composition, selectedIndex);
  }

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (['settings', 'customize', 'levels', 'sequence', 'collection'].includes(action)) cameraRig?.stop();
  if (action === 'undo') {
    const previous = editHistory.undo(saveKey(game));
    if (previous) { composition = previous.ids; game.boxes[saveKey(game)] = previous.box; replacing = false; selectedIndex = -1; renderComposition(); updateBuilderUI(); playSound('undo'); showStatus('Last change undone'); }
  }
  if (action === 'clear' && composition.length) {
    recordEdit();
    selectedIndex = -1; replacing = false;
    composition = [];
    renderComposition();
    updateBuilderUI();
    showStatus('Chain cleared');
    playSound('return');
  }
  if (action === 'finish') finishComposition();
  if (action === 'edit') editComposition();
  if (action === 'restart') restartComposition();
  if (action === 'next') {
    if (game.mode === 'free') restartComposition();
    else if (!lastDelivery?.passed) editComposition();
    else {
      const next = LEVELS[LEVELS.findIndex((l) => l.id === game.levelId) + 1];
      changeGame(next ? 'challenge' : 'free', next?.id ?? game.levelId);
    }
  }
  if (action === 'move-earlier' || action === 'move-later') {
    const to = selectedIndex + (action === 'move-earlier' ? -1 : 1);
    if (selectedIndex >= 0 && to >= 0 && to < composition.length) {
      recordEdit();
      [composition[to], composition[selectedIndex]] = [composition[selectedIndex], composition[to]];
      selectedIndex = to; renderComposition(); updateBuilderUI(); playSound('reorder',composition[to]); showStatus('Order updated');
    }
  }
  if (action === 'remove' && selectedIndex >= 0) { removeMaterial(selectedIndex); document.querySelector('[data-dialog="piece"]').close(); }
  if (action === 'replace' && selectedIndex >= 0) {
    replacing = true; document.querySelector('[data-dialog="piece"]').close();
    showStatus(`Pick a replacement for piece ${selectedIndex + 1}`);
    document.querySelector('[data-gesture-hint]').textContent = `Replacing piece ${selectedIndex + 1} · tap a material`;
    updateBuilderUI();
  }
  if (action === 'cancel-replace') { replacing = false; selectedIndex = -1; updateBuilderUI(); showStatus('Keep adding pieces'); }
  if (action === 'reset-camera' && camera) {
    if (shell.dataset.state === 'finished') cameraRig.reveal();
    else cameraRig.home();
  }
  if(action==='view-charm') setFinishView('charm');
  if(action==='view-phone') setFinishView('phone');
  if(action==='showcase-spin') cameraRig.toggleShowcase();
  if(action==='showcase-front') {
    if(shell.dataset.finishView==='charm') cameraRig.frontShowcase();
    else cameraRig.reveal();
    needsRender=true;
  }
  if (action === 'tour') followChain();
  if (action === 'sound') {
    muted = !muted;
    try { localStorage.setItem('lucky-link.muted', muted ? 'yes' : 'no'); } catch { /* Playback still works without persistence. */ }
    if (musicGain) musicGain.gain.setTargetAtTime(muted ? 0 : .018, audioContext.currentTime, .08);
    shell.dataset.music = muted ? 'muted' : 'playing';
    if (muted && audioContext) { gameSound?.stop();void audioContext.suspend().catch(()=>{}); }
    event.target.closest('button').setAttribute('aria-pressed', String(!muted));
    if (!muted) playSound('select');
  }
});

document.addEventListener('visibilitychange', () => {
  if (!audioContext) return;
  if (document.hidden) {gameSound?.stop();void audioContext.suspend().catch(()=>{});}
  else if (!muted && musicTimer) void audioContext.resume().catch(()=>{});
});

try {
  init();
} catch (error) {
  console.error(error);
  cancelAnimationFrame(animationFrame);
  fallback.hidden = false;
  document.querySelectorAll('.play-modes,.task-ticket,.edit-bar,.material-dock,.settings-control,.sound-control,.gesture-hint,.reward-ticket,.order-control,.box-controls,.bead-hotspots,.live-grade,[data-action="reset-camera"]').forEach((element) => { element.hidden = true; });
  setMode('2d');
  renderState.textContent = '2.5D fallback';
}
