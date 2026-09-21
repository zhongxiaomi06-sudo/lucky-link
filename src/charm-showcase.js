import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** One closed cord, with both branches meeting beneath the phone-attachment loop. */
export function createHangingCurve() {
  return new THREE.CatmullRomCurve3([
    [.6,4.7,0], [.15,3.85,.01], [-.38,2.9,.035], [-.55,2.05,.06],
    [-.2,1.42,.035], [.6,1.22,0], [1.4,1.42,-.035], [1.75,2.05,-.06],
    [1.58,2.9,-.035], [1.05,3.85,-.01],
  ].map(p => new THREE.Vector3(...p)), true, 'centripetal');
}

export function createCharmShowcase(makeBead, cordMaterial, woodMap) {
  const root = new THREE.Group(); root.name = 'closed-loop-showcase'; root.position.z = 2.25; root.visible = false;
  const wood = new THREE.MeshStandardMaterial({ color:'#d3a270', roughness:.48, map:woodMap });
  const metal = new THREE.MeshStandardMaterial({ color:'#d9e2df', metalness:.88, roughness:.23 });
  const black = new THREE.MeshStandardMaterial({ color:'#303a3b', roughness:.65 });
  const curve = createHangingCurve();
  const beads = new THREE.Group(); beads.name = 'showcase-beads';
  function add(geometry, material, name, x=0,y=0,z=0) {
    const m = new THREE.Mesh(geometry,material); m.name=name; m.position.set(x,y,z);
    m.castShadow=true; m.receiveShadow=true; root.add(m); return m;
  }
  const foot = add(new THREE.CylinderGeometry(1.58,1.62,.24,64),wood,'showcase-foot',.18,.22,0);
  foot.scale.z=.66;
  add(new RoundedBoxGeometry(.3,5.22,.3,4,.10),wood,'showcase-upright',-1.03,2.91,-.30);
  add(new RoundedBoxGeometry(1.94,.3,.3,4,.10),wood,'showcase-arm',-.19,5.43,-.30);
  const hook = new THREE.CatmullRomCurve3([
    [.70,5.43,-.30],[.86,5.30,-.18],[.91,5.27,.05],[.98,5.41,.20],[.95,5.61,.22],
  ].map(p=>new THREE.Vector3(...p)));
  add(new THREE.TubeGeometry(hook,36,.055,10,false),metal,'showcase-hook');
  const tether = new THREE.CatmullRomCurve3([
    [.6,4.73,0],[.51,5.13,.08],[.72,5.40,.10],[.85,5.31,.09],[.6,4.73,0],
  ].map(p=>new THREE.Vector3(...p)));
  add(new THREE.TubeGeometry(tether,40,.035,8,false),black,'phone-attachment-loop');
  add(new RoundedBoxGeometry(.19,.15,.14,3,.05),black,'loop-connector',.6,4.73,0);
  add(new THREE.TubeGeometry(curve,160,.024,10,true),cordMaterial,'closed-beaded-cord');
  root.add(beads);

  function clearBeads() {
    beads.traverse(o=>o.geometry?.dispose());
    beads.clear();
  }
  function setComposition(ids) {
    clearBeads();
    const diameter = Math.min(.76,curve.getLength()*.77/Math.max(1,ids.length));
    ids.forEach((id,index)=>{
      const b=makeBead(id), size=new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3());
      // Dense 14-piece loops stay separated; a three-piece design still uses the same real pieces.
      b.scale.multiplyScalar(Math.min(1,diameter/Math.max(size.x,size.y,size.z)));
      const u=.11+(index+.5)*.78/ids.length;
      b.position.copy(curve.getPointAt(u));
      const tangent=curve.getTangentAt(u);
      b.rotation.z=-Math.atan2(tangent.x,Math.abs(tangent.y))*.3;
      if(b.userData.threadingAxis) b.rotation.z=Math.atan2(-tangent.x,tangent.y);
      b.userData.materialId=id; b.userData.compositionIndex=index;
      beads.add(b);
    });
    root.userData.composition=[...ids]; root.updateMatrixWorld(true);
  }
  function bounds() { root.updateWorldMatrix(true,true); return new THREE.Box3().setFromObject(root); }
  function dispose() { root.traverse(o=>o.geometry?.dispose()); wood.dispose(); metal.dispose(); black.dispose(); }
  return { root, beads, curve, setComposition, bounds, dispose };
}
