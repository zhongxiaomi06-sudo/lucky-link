import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MATERIALS } from './materials.js';
import { finishBead, drilledGeometry, gemGeometry, shellGeometry } from './bead-finish.js';

const fallback=()=>new THREE.Mesh(new THREE.SphereGeometry(.32,20,14),new THREE.MeshStandardMaterial());
describe('colorful dimensional bead finishing', () => {
  it('preserves all 29 identities with finite geometry and a bounded size', () => {
    for(const item of MATERIALS) {
      const b=finishBead(item,fallback); let triangles=0;
      expect(b.userData.materialId).toBe(item.id);
      b.traverse((o)=>{if(o instanceof THREE.Mesh) {
        const p=o.geometry.getAttribute('position'); expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
        triangles+=(o.geometry.index?.count ?? p.count)/3;
      }});
      const size=new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3());
      expect(Math.max(size.x,size.y,size.z)).toBeLessThan(1.6);
      expect(triangles).toBeLessThan(8000);
    }
  });
  it('builds a real open threading bore, not a painted dot', () => {
    const geo=drilledGeometry(), pos=geo.getAttribute('position');
    let min=Infinity; for(let i=0;i<pos.count;i++) min=Math.min(min,Math.hypot(pos.getX(i),pos.getZ(i)));
    expect(min).toBeGreaterThan(.03); expect(min).toBeLessThan(.08);
  });
  it('provides hard crystal facets and a two-sided sculpted shell', () => {
    const gem=gemGeometry();expect(gem.index).toBeNull();
    const n=gem.getAttribute('normal');
    expect(Math.abs(n.getX(0)-n.getX(1))+Math.abs(n.getY(0)-n.getY(1))).toBeLessThan(.001);
    const shell=shellGeometry();shell.computeBoundingBox();
    expect(shell.boundingBox!.min.z).toBeLessThan(0);expect(shell.boundingBox!.max.z).toBeGreaterThan(0);
  });
  it('shares PBR finishes but never geometry between instances', () => {
    const item=MATERIALS.find(x=>x.id==='rose-prism')!;
    const a=finishBead(item,fallback), b=finishBead(item,fallback);
    const ma=a.children.find(o=>o instanceof THREE.Mesh) as THREE.Mesh;
    const mb=b.children.find(o=>o instanceof THREE.Mesh) as THREE.Mesh;
    expect(ma.material).toBe(mb.material);expect(ma.geometry).not.toBe(mb.geometry);
    const color=ma.geometry.getAttribute('color');expect(color).toBeDefined();
    expect(new Set(Array.from(color.array).map(x=>x.toFixed(3))).size).toBeGreaterThan(6);
  });
});
