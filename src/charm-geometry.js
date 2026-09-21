import * as THREE from 'three';

// One closed solid per gem. Face normals, rather than transparent overlays,
// make the cut respond to the same environment as its connecting metalwork.
function hardSolid(vertices, faces, name){
  const source=new THREE.BufferGeometry();
  source.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));
  source.setIndex(faces.flat());
  const geometry=source.toNonIndexed();source.dispose();
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.name=name;
  return geometry;
}

export function createCutStarGeometry(){
  const vertices=[],faces=[],rings=[];
  // Small table, crown breaks, polished girdle, and a cut rear pavilion.
  for(const [scale,z] of [[.25,.285],[.69,.175],[1,.045],[1,-.045],[.66,-.165],[.22,-.255]]){
    const ring=[];
    for(let i=0;i<10;i++){
      const angle=Math.PI/2+i*Math.PI/5;
      const radius=(i%2?.38:.83)*scale;
      ring.push(vertices.length);vertices.push([Math.cos(angle)*radius,Math.sin(angle)*radius,z]);
    }
    rings.push(ring);
  }
  const front=vertices.length;vertices.push([0,0,.285]);
  const back=vertices.length;vertices.push([0,0,-.255]);
  for(let i=0;i<10;i++){
    const next=(i+1)%10;
    faces.push([front,rings[0][i],rings[0][next]]);
    for(let row=0;row<rings.length-1;row++){
      const a=rings[row][i],b=rings[row][next],c=rings[row+1][next],d=rings[row+1][i];
      faces.push([a,d,c],[a,c,b]);
    }
    faces.push([back,rings.at(-1)[next],rings.at(-1)[i]]);
  }
  return hardSolid(vertices,faces,'Closed double-sided star cut');
}

export function createPearDropGeometry(){
  const vertices=[[0,.49,0]],faces=[],rings=[],segments=12;
  for(const [y,radius] of [[.31,.066],[.15,.153],[-.07,.257],[-.25,.223],[-.39,.115]]){
    const ring=[];
    for(let i=0;i<segments;i++){
      const angle=i*Math.PI*2/segments;
      ring.push(vertices.length);vertices.push([Math.cos(angle)*radius,y,Math.sin(angle)*radius*.72]);
    }
    rings.push(ring);
  }
  const bottom=vertices.length;vertices.push([0,-.445,0]);
  for(let i=0;i<segments;i++){
    const next=(i+1)%segments;
    faces.push([0,rings[0][next],rings[0][i]]);
    for(let row=0;row<rings.length-1;row++){
      const a=rings[row][i],b=rings[row][next],c=rings[row+1][next],d=rings[row+1][i];
      faces.push([a,b,c],[a,c,d]);
    }
    faces.push([bottom,rings.at(-1)[i],rings.at(-1)[next]]);
  }
  return hardSolid(vertices,faces,'Closed pear-cut drop');
}

export function createCrystalMaterial(){
  return new THREE.MeshPhysicalMaterial({
    color:0xffffff,metalness:0,roughness:.055,transmission:.97,
    thickness:.54,ior:1.5,attenuationColor:0x94d9ff,attenuationDistance:1.6,
    dispersion:.035,clearcoat:.18,clearcoatRoughness:.09,
    envMapIntensity:1.2,opacity:1,transparent:false,side:THREE.FrontSide,
  });
}

// CSS is absent from WebGL's transmission buffer. These studio softboxes are
// rendered into that buffer only, never over the approved page background.
export function createRefractionBackdrop(){
  const size=256,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x/(size-1)-.5)*2,v=(y/(size-1)-.5)*2,i=(y*size+x)*4;
    const key=Math.exp(-Math.pow((u+.38*v+.18)*7,2));
    const edge=Math.exp(-Math.pow((u-.45*v-.43)*16,2));
    const shade=Math.exp(-Math.pow((u-.14*v-.1)*13,2));
    pixels[i]=Math.min(255,128+key*112+edge*110-shade*93);
    pixels[i+1]=Math.min(255,192+key*57+edge*58-shade*90);
    pixels[i+2]=Math.min(255,220+key*33+edge*34-shade*70);
    pixels[i+3]=255;
  }
  const texture=new THREE.DataTexture(pixels,size,size);texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(6.5,6.5),new THREE.MeshBasicMaterial({map:texture,depthWrite:false,toneMapped:false}));
  backdrop.onBeforeRender=renderer=>{backdrop.material.colorWrite=renderer.getRenderTarget()!==null;};
  backdrop.name='Refractable reveal studio';backdrop.position.z=-2.2;return backdrop;
}

export function createStarCharm(){
  const group=new THREE.Group();group.name='Ice crystal star proof module';
  const metal=new THREE.MeshPhysicalMaterial({color:0xe6ebee,metalness:1,roughness:.18,envMapIntensity:1.15});
  const crystal=createCrystalMaterial();
  const add=(name,geometry,material,x,y,z=0)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  };
  const loop=(name,x,y,r,tube,turn=0)=>{
    const mesh=add(name,new THREE.TorusGeometry(r,tube,10,40),metal,x,y);
    mesh.rotation.y=turn;return mesh;
  };
  add('cut-star',createCutStarGeometry(),crystal,0,-.05);
  // A bonded silver cap supports the eyelet: no fake hole through uncut glass.
  add('star-bail',new THREE.CylinderGeometry(.039,.086,.12,28),metal,0,.779);
  loop('star-eyelet',0,.895,.071,.016);
  loop('chain-link-1',0,1.028,.097,.021,Math.PI/2);
  loop('chain-link-2',0,1.19,.097,.021);
  loop('hanger-ring',0,1.47,.215,.041,Math.PI/2.8);
  // A capped lower point and two interlocking links carry the pear-shaped drop.
  const lower=add('star-lower-cap',new THREE.CylinderGeometry(.057,.027,.105,24),metal,.474,-.704);
  lower.rotation.z=-.18;
  loop('drop-link-1',.487,-.792,.069,.016,Math.PI/2);
  loop('drop-link-2',.487,-.900,.071,.016);
  add('drop-bail',new THREE.CylinderGeometry(.027,.044,.075,24),metal,.487,-.994);
  const drop=add('pear-drop',createPearDropGeometry(),crystal,.487,-1.304);
  drop.scale.set(.66,.66,.66);
  return group;
}
