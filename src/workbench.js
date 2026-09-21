import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { woodTexture, fabricTexture } from './world-360.js';

/** Physical support hierarchy: floor → legs → tabletop → stand → phone. */
export function createWorkbench() {
  const group = new THREE.Group(); group.name = 'grounded-worktable';
  const grain = woodTexture();
  const wood = new THREE.MeshStandardMaterial({ color: '#dcad76', map: grain, roughness: .64, bumpMap: grain, bumpScale: .018 });
  const trim = new THREE.MeshStandardMaterial({ color: '#986846', map: grain, roughness: .6 });
  const weave = fabricTexture();
  const fabric = new THREE.MeshStandardMaterial({ color: '#aaba9c', map: weave, bumpMap: weave, bumpScale: .026, roughness: .98 });
  const cream = new THREE.MeshStandardMaterial({ color: '#fff1d9', roughness: .42 });
  const steel = new THREE.MeshStandardMaterial({ color: '#bfd1d0', roughness: .25, metalness: .85 });
  function box(w, h, d, x, y, z, material = wood, radius = .05) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
  }
  box(13, .32, 10, 0, -.19, 1.5);
  for (const x of [-5.7, 5.7]) for (const z of [-2.6, 5.7]) box(.38, 5.5, .38, x, -3.05, z, trim);
  box(11.8, .55, .18, 0, -.6, -2.9, trim);
  box(7.3, .1, 5.05, 0, .05, 2.38, fabric, .04);
  // Base, retaining lip and sloped rear support. Phone's bottom sits at y=.3.
  box(3.4, .25, 1.9, -1.05, .14, -.85).userData.phoneSupport=true;
  box(3.3, .32, .23, -1.05, .38, -.21).userData.phoneSupport=true;
  const support = box(2.75, 3.55, .18, -1.05, 1.83, -1.36, trim);
  support.rotation.x = -.16;
  support.userData.phoneSupport=true;
  const brace = box(.3, 2.35, .27, -1.05, 1.12, -1.85); brace.rotation.x = .32;
  brace.userData.phoneSupport=true;
  // Material organizer rests on the table, outside the beading area.
  box(2.4, .13, 2.85, -4.55, .065, .45);
  for (const x of [-5.73, -4.55, -3.37]) box(.075, .36, 2.85, x, .28, .45);
  for (const z of [-.95, .45, 1.85]) box(2.4, .36, .075, -4.55, .28, z);
  const palette = ['#267bb9', '#eee1c3', '#d9f4ff', '#c687a7'];
  palette.forEach((color, cell) => {
    const material = new THREE.MeshPhysicalMaterial({ color, roughness: .14, metalness: .04, clearcoat: 1 });
    for (let i = 0; i < 9; i += 1) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 8), material);
      bead.position.set(-5.38 + (cell % 2) * 1.16 + (i % 3) * .23, .22 + (i % 2) * .04, -.71 + Math.floor(cell / 2) * 1.4 + Math.floor(i / 3) * .28);
      bead.castShadow = true; group.add(bead);
    }
  });
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.5, 0), new THREE.Vector2(.77, .3), new THREE.Vector2(.83, .52), new THREE.Vector2(.76, .52), new THREE.Vector2(.68, .27), new THREE.Vector2(.45, .08), new THREE.Vector2(0, .08)], 28), cream);
  bowl.position.set(-4.45, 0, 3.3); bowl.castShadow = true; group.add(bowl);
  for (let i = 0; i < 9; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.14, .025, 8, 20), steel);
    ring.position.set(-4.75 + (i % 3) * .21, .16 + (i % 2) * .025, 3 + Math.floor(i / 3) * .22); ring.rotation.x = -Math.PI / 2; group.add(ring);
  }
  return group;
}
