import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { woodTexture, fabricTexture } from './world-360.js';

export function createBeadBox(makeBead) {
  const root = new THREE.Group(); root.name = 'right-hand-bead-box'; root.position.set(2.48, .06, 1.9);
  const wood = new THREE.MeshStandardMaterial({ color: '#cf9f71', map: woodTexture(), roughness: .55 });
  const lining = new THREE.MeshStandardMaterial({ color: '#e8decb', map: fabricTexture(), roughness: .95 });
  const contents = new THREE.Group(); const targets = []; root.add(contents);
  function box(w, h, d, x, y, z, material = wood) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, .035), material); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; root.add(m); return m;
  }
  box(2.8, .16, 3.5, 0, .08, 0);
  box(2.6, .025, 3.3, 0, .17, 0, lining);
  for (const x of [-1.37, 0, 1.37]) box(.1, .42, 3.5, x, .36, 0);
  for (const z of [-1.7, 1.7]) box(2.8, .42, .1, 0, .36, z);
  const dividers = [-.57, .57].map((z) => box(2.8, .42, .1, 0, .36, z));
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 384; labelCanvas.height = 96;
  const context = labelCanvas.getContext('2d'); context.fillStyle = '#ece0c7'; context.fillRect(0, 0, 384, 96);
  context.fillStyle = '#4b5244'; context.textAlign = 'center'; context.font = '36px Georgia'; context.fillText('Bead box', 192, 60);
  const texture = new THREE.CanvasTexture(labelCanvas); texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .38), new THREE.MeshStandardMaterial({ map: texture, roughness: .9 }));
  label.position.set(0, .33, 1.762); root.add(label);
  function render(items, capacity = 6) {
    const compact = capacity === 4;
    dividers[0].position.z = compact ? 0 : -.57; dividers[1].visible = !compact;
    contents.traverse((m) => { m.geometry?.dispose(); if (m.userData.ownedMaterial) m.material?.dispose(); }); contents.clear(); targets.length = 0;
    items.forEach((item, index) => {
      const center = new THREE.Vector3(index % 2 ? .7 : -.7, .36, compact ? -.85 + Math.floor(index / 2) * 1.7 : -1.13 + Math.floor(index / 2) * 1.13);
      const bead = makeBead(item.id); bead.position.copy(center); bead.rotation.set(-Math.PI / 2, 0, .12 * index);
      contents.add(bead); targets.push({ ...item, center: center.clone(), bead });
      // A pair of loose beads makes each compartment read as a material source, not a UI card.
      if (item.source.kind === 'catalog') for (let i = 0; i < 2; i++) {
        const extra = makeBead(item.id); extra.scale.setScalar(.5); extra.position.copy(center).add(new THREE.Vector3(i ? .28 : -.27, -.11, i ? .28 : -.25));
        extra.rotation.set(-Math.PI / 2, 0, i * .8); contents.add(extra);
      }
    });
    root.updateMatrixWorld(true);
  }
  return { root, targets, render, center: () => root.localToWorld(new THREE.Vector3(0, .35, 0)), anchor: () => root.localToWorld(new THREE.Vector3(0, .2, 1.85)) };
}

/** A small articulated pickup cue, not a photograph pasted over the WebGL scene. */
export function createPickupHand() {
  const root = new THREE.Group(); root.name = 'articulated-pickup-hand'; root.visible = false;
  const skin = new THREE.MeshPhysicalMaterial({ color: '#eab294', roughness: .66, clearcoat: .12 });
  const nail = new THREE.MeshStandardMaterial({ color: '#f7d6c5', roughness: .38 });
  function part(geometry, material, position) { const m = new THREE.Mesh(geometry, material); m.position.set(...position); m.castShadow = true; root.add(m); return m; }
  function segment(a, b, radiusA, radiusB = radiusA) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const m = part(new THREE.CylinderGeometry(radiusB, radiusA, from.distanceTo(to), 14), skin, from.clone().add(to).multiplyScalar(.5).toArray());
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
  }
  function finger(points, radii) {
    points.forEach((point, i) => {
      const joint = part(new THREE.SphereGeometry(radii[i], 16, 12), skin, point); joint.scale.y = .92;
      if (i) segment(points[i - 1], point, radii[i - 1], radii[i]);
    });
  }
  const palm = part(new RoundedBoxGeometry(.78, .29, .84, 5, .14), skin, [1.02, .72, -.03]); palm.rotation.z = .14;
  segment([1.35, .73, -.03], [2.2, .8, -.03], .24, .29);
  finger([[.85, .76, -.31], [.37, .83, -.3], [-.03, .55, -.26], [-.08, .19, -.23]], [.105, .1, .087, .075]);
  finger([[1.04, .65, .34], [.53, .33, .44], [.11, .08, .26]], [.14, .12, .095]);
  for (let i = 0; i < 3; i++) {
    const z = -.09 + i * .18;
    finger([[.84, .7, z], [.56, .65, z], [.59, .41, z], [.83, .47, z]], [.105 - i * .01, .092 - i * .01, .082 - i * .008, .07]);
  }
  const indexNail = part(new RoundedBoxGeometry(.11, .16, .02, 3, .025), nail, [-.077, .29, -.296]); indexNail.rotation.x = -.15;
  const thumbNail = part(new RoundedBoxGeometry(.14, .025, .18, 3, .025), nail, [.18, .18, .32]); thumbNail.rotation.z = -.2;
  return root;
}
