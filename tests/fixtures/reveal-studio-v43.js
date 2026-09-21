// Isolated visual proposal. Not imported by the application; no saved state,
// scoring, music or reward actions. V42 geometry and crystal parameters stay intact.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createStarCharm, createRefractionBackdrop } from '../../src/charm-geometry.js';

document.querySelector('dialog').showModal();
document.activeElement?.blur();
const canvas=document.querySelector('#studio-world');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.9;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.VSMShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xe8eff1);
const camera=new THREE.PerspectiveCamera(26,1,.1,80);
camera.position.set(0,.05,7.7);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const environment=pmrem.fromScene(room,.04);room.dispose();scene.environment=environment.texture;
const charm=createStarCharm();charm.scale.setScalar(.84);charm.rotation.set(-.08,-.18,0);scene.add(charm);
// Preserve the approved V42 display fill while changing only the surrounding
// studio. This is the existing screen-space transmission approximation, not
// physically traced light transport or a claim of optical backdrop continuity.
const approvedFill=createRefractionBackdrop();approvedFill.position.z=-.75;approvedFill.renderOrder=20;scene.add(approvedFill);
// Standard shadow maps cannot model transmissive caustics. Keep metal shadows,
// but do not turn the clear crystal into an opaque cut-out on the backdrop.
charm.traverse(object=>{if(object.material?.transmission){object.castShadow=false;object.receiveShadow=false;}});

// An opaque continuous floor, curved transition and back wall. The exact same
// surface is visible, receives shadows and participates in the transmission pass.
const sections=[[5,-2.15],[-.8,-2.15]];
for(let i=1;i<=28;i++){
  const angle=i/28*Math.PI/2;
  sections.push([-.8-1.25*Math.sin(angle),-2.15+1.25*(1-Math.cos(angle))]);
}
sections.push([-2.05,12]);
const points=[],indices=[],uv=[];
for(const [z,y] of sections){points.push(-14,y,z,14,y,z);uv.push(-14/6.5+.5,(y+.5)/6.5+.5,14/6.5+.5,(y+.5)/6.5+.5);}
for(let i=0;i<sections.length-1;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
const paperGeometry=new THREE.BufferGeometry();
paperGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
paperGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
paperGeometry.setIndex(indices);paperGeometry.computeVertexNormals();
// A broad neutral studio sweep supplies low-frequency detail to refraction;
// it is visible on the same paper, not an unrelated hidden blue light stripe.
const size=256,pixels=new Uint8Array(size*size*4);
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x/(size-1)-.5)*2,v=(y/(size-1)-.5)*2;
  const shade=Math.exp(-Math.pow((u-.38*v-.12)*3.5,2));
  const luminance=198-shade*53,i=(y*size+x)*4;
  pixels[i]=luminance;pixels[i+1]=luminance+3;pixels[i+2]=luminance+4;pixels[i+3]=255;
}
const paperMap=new THREE.DataTexture(pixels,size,size);paperMap.colorSpace=THREE.SRGBColorSpace;
paperMap.magFilter=THREE.LinearFilter;paperMap.minFilter=THREE.LinearFilter;paperMap.needsUpdate=true;
const paper=new THREE.Mesh(paperGeometry,new THREE.MeshStandardMaterial({color:0xffffff,map:paperMap,roughness:1,metalness:0,envMapIntensity:.15}));
paper.receiveShadow=true;paper.name='Visible refractable seamless studio';scene.add(paper);

scene.add(new THREE.HemisphereLight(0xf8faf5,0xa7bfc8,.65));
const key=new THREE.DirectionalLight(0xfffaf2,.8);key.position.set(-3.7,5.2,6.5);
key.castShadow=true;key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-5;
key.shadow.camera.near=.1;key.shadow.camera.far=25;key.shadow.normalBias=.018;
key.shadow.radius=7;key.shadow.blurSamples=8;key.shadow.intensity=.35;
scene.add(key);
const fill=new THREE.DirectionalLight(0xc7e3f1,.2);fill.position.set(4,-.3,4);scene.add(fill);

let yaw=-.18,pointer=null,lastX=0,frame=0;
function draw(){
  const bounds=canvas.getBoundingClientRect();
  const reference=document.querySelector('[data-reward-3d]').getBoundingClientRect();
  renderer.setSize(bounds.width,bounds.height,false);
  camera.aspect=bounds.width/bounds.height;
  camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(bounds.height/reference.height*Math.tan(THREE.MathUtils.degToRad(13))));
  const pixelsPerUnit=reference.height/(2*7.7*Math.tan(THREE.MathUtils.degToRad(13)));
  camera.position.y=.05+(reference.top+reference.height/2-bounds.height/2)/pixelsPerUnit;
  camera.position.x=-(reference.left+reference.width/2-bounds.width/2)/pixelsPerUnit;
  camera.updateProjectionMatrix();charm.rotation.y=yaw;renderer.render(scene,camera);
  canvas.dataset.ready='true';frame=requestAnimationFrame(draw);
}
canvas.addEventListener('pointerdown',event=>{pointer=event.pointerId;lastX=event.clientX;canvas.setPointerCapture(pointer);});
canvas.addEventListener('pointermove',event=>{if(event.pointerId!==pointer)return;yaw+=(event.clientX-lastX)*.012;lastX=event.clientX;});
const release=event=>{if(event.pointerId===pointer){if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;}};
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);scene.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});approvedFill.material.map.dispose();paperMap.dispose();environment.dispose();pmrem.dispose();renderer.dispose();},{once:true});
draw();
