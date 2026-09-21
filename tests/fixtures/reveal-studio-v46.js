// Isolated saturated-blue editorial background proposal: no gameplay, rewards or audio.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createStarCharm, createRefractionBackdrop } from '../../src/charm-geometry.js';
import { createRewardStudio } from '../../src/reward-studio.js';
import { rewardFraming } from '../../src/reward-framing.js';

document.querySelector('dialog').showModal();
document.activeElement?.blur();
const canvas=document.querySelector('#studio-world');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.9;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x48b4ee);
const camera=new THREE.PerspectiveCamera(26,1,.1,80);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const environment=pmrem.fromScene(room,.04);room.dispose();scene.environment=environment.texture;
const charm=createStarCharm();charm.scale.setScalar(.84);charm.rotation.set(-.08,-.18,0);scene.add(charm);
// Keep the approved model's existing screen-space transmission approximation.
const refractionFill=createRefractionBackdrop();
refractionFill.position.z=-.75;refractionFill.renderOrder=20;scene.add(refractionFill);
charm.traverse(object=>{if(object.material?.transmission){object.castShadow=false;object.receiveShadow=false;}});
const studio=createRewardStudio();scene.add(studio.group);
const paper=studio.group.children.find(object=>object.isMesh);
const texture=paper.material.map;
const width=512,height=512,data=new Uint8Array(width*height*4);
const uv=paper.geometry.getAttribute('uv'),position=paper.geometry.getAttribute('position');
let distance=0;
for(let row=0;row<position.count/2;row++){
  if(row)distance+=Math.hypot(position.getY(row*2)-position.getY((row-1)*2),position.getZ(row*2)-position.getZ((row-1)*2));
  for(let side=0;side<2;side++)uv.setXY(row*2+side,position.getX(row*2+side)/10+.5,(distance-8.6635)/16+.35);
}
uv.needsUpdate=true;
const smooth=(a,b,value)=>{const t=THREE.MathUtils.clamp((value-a)/(b-a),0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a.map((value,index)=>value+(b[index]-value)*t);
// One off-centre diagonal fold, colour-bound to the ice-blue jewellery.
// This is a baked art-directed paper treatment, not traced caustics or a new
// light on the model. The original model materials and lights remain untouched.
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const px=(x/(width-1)-.5)*10,py=(y/(height-1)-.35)*16;
  const diagonal=px-.58*py-1.22;
  const shadow=smooth(-.03,.14,diagonal);
  const wash=Math.exp(-((px+3.1)**2/18+(py-4.1)**2/15))*.65;
  let color=mix([36,135,220],[114,205,244],wash);
  const cobalt=mix([13,64,173],[22,96,204],smooth(-5,4,py));
  color=mix(color,cobalt,shadow);
  const seam=Math.exp(-(((diagonal-.16)/.17)**2))*.14;
  const rim=Math.exp(-(((diagonal+.035)/.026)**2))*.18;
  color=mix(color,[5,40,113],seam);
  color=mix(color,[196,237,255],rim);
  const index=(y*width+x)*4;
  data[index]=color[0];data[index+1]=color[1];data[index+2]=color[2];data[index+3]=255;
}
texture.image={data,width,height};texture.needsUpdate=true;
let yaw=-.18,pointer=null,lastX=0,frame=0;
function draw(){
  const bounds=canvas.getBoundingClientRect();
  const reference=document.querySelector('[data-reward-frame]').getBoundingClientRect();
  const projection=rewardFraming(bounds,reference,7.7);
  const ratio=renderer.getPixelRatio();
  if(canvas.width!==Math.round(bounds.width*ratio)||canvas.height!==Math.round(bounds.height*ratio))renderer.setSize(bounds.width,bounds.height,false);
  camera.aspect=bounds.width/bounds.height;camera.fov=projection.fov;
  camera.position.set(projection.x,projection.y,7.7);camera.updateProjectionMatrix();
  charm.rotation.y=yaw;renderer.render(scene,camera);canvas.dataset.ready='true';
  frame=requestAnimationFrame(draw);
}
canvas.addEventListener('pointerdown',event=>{if(pointer!==null)return;pointer=event.pointerId;lastX=event.clientX;canvas.setPointerCapture(pointer);});
canvas.addEventListener('pointermove',event=>{if(event.pointerId!==pointer)return;yaw+=(event.clientX-lastX)*.012;lastX=event.clientX;});
const release=event=>{if(event.pointerId===pointer){if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;}};
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
window.addEventListener('pagehide',()=>{
  cancelAnimationFrame(frame);studio.dispose();
  scene.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
  refractionFill.material.map.dispose();environment.dispose();pmrem.dispose();renderer.dispose();
},{once:true});
draw();
