import { describe, expect, it } from 'vitest';
import { Vector3, type BufferGeometry } from 'three';
import { createCutStarGeometry, createPearDropGeometry, createStarCharm, createCrystalMaterial, createRefractionBackdrop } from './charm-geometry.js';

function audit(geometry:BufferGeometry){
  const positions=geometry.getAttribute('position'),indices=geometry.index;
  const edges=new Map<string,number>();let minArea=Infinity;const normals=new Set<string>();
  const vertex=(i:number)=>new Vector3().fromBufferAttribute(positions,indices?indices.getX(i):i);
  const key=(v:Vector3)=>v.toArray().map(n=>n.toFixed(5)).join(',');
  for(let i=0;i<(indices?.count||positions.count);i+=3){
    const a=vertex(i),b=vertex(i+1),c=vertex(i+2),normal=b.clone().sub(a).cross(c.clone().sub(a));
    minArea=Math.min(minArea,normal.length()/2);normal.normalize();
    if(normal.z>.1)normals.add(normal.toArray().map(n=>n.toFixed(2)).join(','));
    for(const [v,w] of [[a,b],[b,c],[c,a]]){const edge=[key(v),key(w)].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}
  }
  geometry.computeBoundingBox();return{edges,minArea,normals,box:geometry.boundingBox!};
}
describe('V42 closed cut-crystal proof module',()=>{
  it('keeps the refraction studio out of the visible page background',()=>{
    const backdrop=createRefractionBackdrop();
    backdrop.onBeforeRender({getRenderTarget:()=>({})});expect(backdrop.material.colorWrite).toBe(true);
    backdrop.onBeforeRender({getRenderTarget:()=>null});expect(backdrop.material.colorWrite).toBe(false);
    expect(backdrop.material.depthWrite).toBe(false);
    expect(backdrop.material.transparent).toBe(false);
    backdrop.material.map.dispose();backdrop.material.dispose();backdrop.geometry.dispose();
  });
  it('has a watertight star crown, girdle and pavilion with actual changing normals',()=>{
    const geometry=createCutStarGeometry(),result=audit(geometry);
    expect([...result.edges.values()].every(count=>count===2)).toBe(true);
    expect(result.minArea).toBeGreaterThan(.00001);
    expect(result.normals.size).toBeGreaterThanOrEqual(10);
    const size=result.box.getSize(new Vector3());expect(size.z/size.x).toBeGreaterThan(.22);expect(size.z/size.x).toBeLessThan(.4);
    expect(result.box.min.z).toBeLessThan(-.2);expect(result.box.max.z).toBeGreaterThan(.2);
    geometry.dispose();
  });
  it('has a closed pear profile with a narrowed neck and fuller lower half',()=>{
    const geometry=createPearDropGeometry(),result=audit(geometry),p=geometry.getAttribute('position');
    expect([...result.edges.values()].every(count=>count===2)).toBe(true);expect(result.minArea).toBeGreaterThan(.000001);
    let upper=0,lower=0;for(let i=0;i<p.count;i++){const r=Math.abs(p.getX(i));if(p.getY(i)>.2)upper=Math.max(upper,r);else if(p.getY(i)<0)lower=Math.max(lower,r);}
    expect(lower).toBeGreaterThan(upper*1.5);expect(result.normals.size).toBeGreaterThan(8);geometry.dispose();
  });
  it('uses volume transmission instead of stacked transparent colored facets',()=>{
    const material=createCrystalMaterial();expect(material.opacity).toBe(1);expect(material.transparent).toBe(false);expect(material.transmission).toBeGreaterThan(.75);expect(material.thickness).toBeGreaterThan(.2);material.dispose();
    const charm=createStarCharm(),names:string[]=[];charm.traverse(item=>names.push(item.name));
    for(const name of ['cut-star','pear-drop','star-bail','drop-bail','hanger-ring'])expect(names).toContain(name);
    expect(names.filter(name=>name==='cut-star')).toHaveLength(1);
    charm.traverse((item:any)=>{item.geometry?.dispose();item.material?.dispose();});
  });
});
