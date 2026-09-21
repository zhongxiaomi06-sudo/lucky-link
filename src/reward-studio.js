import * as THREE from 'three';

// The approved V43 paper and lights, independent of the model and camera.
// The caller selects VSMShadowMap on its renderer and owns the environment.
export function createRewardStudio(){
  const group=new THREE.Group();group.name='V43 reward photography studio';
  const sections=[[5,-2.15],[-.8,-2.15]];
  for(let index=1;index<=28;index++){
    const angle=index/28*Math.PI/2;
    sections.push([-.8-1.25*Math.sin(angle),-2.15+1.25*(1-Math.cos(angle))]);
  }
  sections.push([-2.05,12]);
  const points=[],indices=[],uv=[];
  for(const [z,y] of sections){
    points.push(-14,y,z,14,y,z);
    uv.push(-14/6.5+.5,(y+.5)/6.5+.5,14/6.5+.5,(y+.5)/6.5+.5);
  }
  for(let index=0;index<sections.length-1;index++){
    const a=index*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();

  const size=256,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x/(size-1)-.5)*2,v=(y/(size-1)-.5)*2;
    const shade=Math.exp(-Math.pow((u-.38*v-.12)*3.5,2));
    const luminance=198-shade*53,index=(y*size+x)*4;
    pixels[index]=luminance;pixels[index+1]=luminance+3;
    pixels[index+2]=luminance+4;pixels[index+3]=255;
  }
  const texture=new THREE.DataTexture(pixels,size,size);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;
  texture.needsUpdate=true;
  const material=new THREE.MeshStandardMaterial({color:0xffffff,map:texture,roughness:1,metalness:0,envMapIntensity:.15});
  const paper=new THREE.Mesh(geometry,material);
  paper.receiveShadow=true;paper.name='Visible refractable seamless studio';
  const hemisphere=new THREE.HemisphereLight(0xf8faf5,0xa7bfc8,.65);
  const key=new THREE.DirectionalLight(0xfffaf2,.8);
  key.position.set(-3.7,5.2,6.5);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-5;key.shadow.camera.right=5;
  key.shadow.camera.top=6;key.shadow.camera.bottom=-5;
  key.shadow.camera.near=.1;key.shadow.camera.far=25;
  key.shadow.normalBias=.018;key.shadow.radius=7;
  key.shadow.blurSamples=8;key.shadow.intensity=.35;
  const fill=new THREE.DirectionalLight(0xc7e3f1,.2);fill.position.set(4,-.3,4);
  group.add(paper,hemisphere,key,fill);

  // Explicit ownership avoids disposing a model, environment or foreign object
  // merely because a caller later attaches it under the same scene/group.
  const resources={
    geometries:new Set([geometry]),materials:new Set([material]),
    textures:new Set([texture]),shadows:new Set([key.shadow]),
  };
  let disposed=false;
  return{
    group,key,fill,resources,
    dispose(){
      if(disposed)return;disposed=true;
      group.removeFromParent();
      const owned=new Set([...resources.geometries,...resources.materials,...resources.textures,...resources.shadows]);
      owned.forEach(resource=>resource.dispose());
      group.clear();
    },
  };
}
