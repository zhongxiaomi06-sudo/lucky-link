// Isolated light-blue background proposal: no gameplay, rewards or audio.
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
const scene=new THREE.Scene();scene.background=new THREE.Color(0xdceefa);
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
const texture=paper.material.map,{width,height,data}=texture.image;
// Only the background changes: a low-contrast ice-blue paper rather than a
// strong grey stripe. Existing model, studio light and exposure remain intact.
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=(x/(width-1)-.5)*2,v=(y/(height-1)-.5)*2;
  const shade=Math.exp(-Math.pow((u-.38*v-.12)*2.4,2)),index=(y*width+x)*4;
  data[index]=162-shade*8;data[index+1]=198-shade*5;data[index+2]=224-shade*2;data[index+3]=255;
}
texture.needsUpdate=true;
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
