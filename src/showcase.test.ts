import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createHangingCurve, createCharmShowcase } from './charm-showcase.js';
import { createOrbitPlayback, fitShowcaseOrbit } from './showcase-orbit.js';

describe('closed phone-charm showcase', () => {
  it('has a continuous closed loop, two sides and an open center', () => {
    const c = createHangingCurve();
    expect(c.closed).toBe(true);
    expect(c.getPoint(0).distanceTo(c.getPoint(1))).toBeLessThan(1e-8);
    const points = c.getPoints(160);
    expect(Math.min(...points.map(p => p.x))).toBeLessThan(-.4);
    expect(Math.max(...points.map(p => p.x))).toBeGreaterThan(1.5);
    expect(Math.min(...points.map(p => p.y))).toBeGreaterThan(.5);
  });
  it.each([3, 6, 14])('preserves all %i pieces in order, above a supported base', n => {
    const ids = Array.from({ length: n }, (_, i) => `bead-${i}`);
    const material = new THREE.MeshStandardMaterial();
    const display = createCharmShowcase(() => new THREE.Mesh(new THREE.SphereGeometry(.3), material), material);
    display.setComposition(ids);
    expect(display.beads.children.map(b => b.userData.materialId)).toEqual(ids);
    expect(display.root.getObjectByName('showcase-foot')).toBeTruthy();
    expect(display.root.getObjectByName('showcase-hook')).toBeTruthy();
    expect(display.beads.children.every(b => b.position.y > .5)).toBe(true);
    display.setComposition(ids.slice().reverse());
    expect(display.beads.children.map(b => b.userData.materialId)).toEqual(ids.slice().reverse());
    expect(ids[0]).toBe('bead-0');
    display.dispose(); material.dispose();
  });
});

describe('one-revolution clock', () => {
  it('pauses without consuming time and stops at exactly one revolution', () => {
    const clock = createOrbitPlayback(24);
    clock.start(1000); expect(clock.step(984)).toBe(0);
    expect(clock.step(13000)).toBe(.5);
    clock.pause(); expect(clock.step(100000)).toBe(.5);
    clock.start(100000); expect(clock.step(112000)).toBe(1);
    expect(clock.running).toBe(false); expect(clock.step(200000)).toBe(1);
    clock.start(200000); expect(clock.step(206000)).toBe(.25);
  });
  it('starts still and resets independently of the game state', () => {
    const clock = createOrbitPlayback();
    expect(clock.running).toBe(false); expect(clock.step(99999)).toBe(0);
    clock.start(100000); clock.step(104000); clock.reset();
    expect(clock.phase).toBe(0); expect(clock.running).toBe(false);
  });
});

describe('all-angle mobile framing', () => {
  it.each([[320,568], [390,844], [844,390], [1440,1000]])('keeps the subject inside the clear region at %i × %i', (w,h) => {
    const camera = new THREE.PerspectiveCamera(52, w/h, .08, 200);
    const box = new THREE.Box3(new THREE.Vector3(-1, .1, -.8), new THREE.Vector3(1.8, 4.3, .8));
    const rect = w > h ? { x: 20, y: 70, width: w - 340, height: h - 90 } : { x: 16, y: 116, width: w - 32, height: h - 306 };
    const f = fitShowcaseOrbit(camera, box, { width:w, height:h }, rect);
    camera.setViewOffset(w,h,w/2-(rect.x+rect.width/2),h/2-(rect.y+rect.height/2),w,h);
    for (let i=0;i<=72;i++) {
      camera.position.setFromSpherical(new THREE.Spherical(f.radius,f.phi,i*Math.PI/36)).add(f.target);
      camera.lookAt(f.target); camera.updateMatrixWorld(true);
      for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) {
        const p = new THREE.Vector3(x,y,z).project(camera), sx=(p.x+1)*w/2, sy=(1-p.y)*h/2;
        expect(sx).toBeGreaterThanOrEqual(rect.x); expect(sx).toBeLessThanOrEqual(rect.x+rect.width);
        expect(sy).toBeGreaterThanOrEqual(rect.y); expect(sy).toBeLessThanOrEqual(rect.y+rect.height);
      }
    }
  });
});
