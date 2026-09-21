import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { fitHomeCamera, homeSafeRect } from './home-layout.js';

describe('iPhone home camera', () => {
  it.each([[320,568],[390,844],[402,874],[440,956],[844,390],[1440,1000]])('fits every corner at %i × %i including safe areas', (width,height) => {
    const rect=homeSafeRect(width,height,{top:59,bottom:34,left:width>height?59:0,right:width>height?59:0},112,height-112);
    const box=new THREE.Box3(new THREE.Vector3(-3,0,-4),new THREE.Vector3(3.5,6.7,5));
    for(const yaw of [-.14,0,.14]) {
      const camera=new THREE.PerspectiveCamera(36,width/height,.1,160);
      fitHomeCamera(camera,box,width,height,rect,yaw,.05);
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
        const p=new THREE.Vector3(x,y,z).project(camera);
        expect((p.x+1)*width/2).toBeGreaterThanOrEqual(rect.left-1);
        expect((p.x+1)*width/2).toBeLessThanOrEqual(rect.right+1);
        expect((1-p.y)*height/2).toBeGreaterThanOrEqual(rect.top-1);
        expect((1-p.y)*height/2).toBeLessThanOrEqual(rect.bottom+1);
        expect(p.z).toBeLessThan(1);
      }
    }
  });
  it('keeps a positive frame during collapsed browser and oversized text controls',()=>{
    const rect=homeSafeRect(320,320,{top:59,bottom:34,left:0,right:0},180,210);
    expect(rect.bottom-rect.top).toBeGreaterThan(0);
    expect(Object.values(rect).every(Number.isFinite)).toBe(true);
  });
});
