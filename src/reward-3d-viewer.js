import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ICE_BLUE_MODULES } from './ice-blue-mainline.js';
import { createStarCharm, createRefractionBackdrop } from './charm-geometry.js';
import { createRewardStudio } from './reward-studio.js';
import { rewardFraming } from './reward-framing.js';

const moduleById=new Map(ICE_BLUE_MODULES.map(item=>[item.id,item]));
export function rewardPresentation(id){const item=moduleById.get(id)||ICE_BLUE_MODULES.at(-1);return{mode:'procedural-webgl',kind:item.kind,interactive:true,materials:['crystal','pearl','silver','resin']};}
const clamp01=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp01(value);return t*t*(3-2*t);};
export function rewardMotionSample(seconds,reducedMotion=false){
  if(reducedMotion)return{phase:'inspect',x:0,y:0,scale:.84,yaw:-.18,pitch:-.08,swing:0,cameraZ:7.7,light:1};
  const time=Math.max(0,Number(seconds)||0);
  if(time<.48){const t=smooth(time/.48);return{phase:'awaken',x:.72*(1-t),y:-1.75+1.02*t,scale:.16+.31*t,yaw:-2.55+1.25*t,pitch:.42-.12*t,swing:.46*(1-t),cameraZ:8.8-.35*t,light:.35+.32*t};}
  if(time<1.56){const t=smooth((time-.48)/1.08),arc=Math.sin(t*Math.PI);return{phase:'flight',x:-.34*arc,y:-.73+.78*t,scale:.47+.48*t,yaw:-1.3+4.95*t,pitch:.3-.48*t,swing:.34*Math.sin(t*Math.PI*2.4)*(1-.34*t),cameraZ:8.45-.82*t,light:.67+.43*arc};}
  if(time<2.42){const t=smooth((time-1.56)/.86),bounce=Math.sin(t*Math.PI)*Math.exp(-1.7*t);return{phase:'lock',x:.08*(1-t),y:.05-.05*t,scale:.95-.11*t+.09*bounce,yaw:3.65-3.83*t,pitch:-.18+.1*t,swing:-.19*Math.sin(t*Math.PI*3)*Math.exp(-2.1*t),cameraZ:7.63+.07*t,light:1.15-.15*t};}
  return{phase:'inspect',x:0,y:0,scale:.84,yaw:-.18,pitch:-.08,swing:.018*Math.sin((time-2.42)*1.45)*Math.exp(-.06*(time-2.42)),cameraZ:7.7,light:1};
}
const silver=()=>new THREE.MeshPhysicalMaterial({color:0xddecef,metalness:.86,roughness:.2,clearcoat:.72,clearcoatRoughness:.18});
const ice=()=>new THREE.MeshPhysicalMaterial({color:0x8edcff,roughness:.08,transmission:.78,thickness:.8,ior:1.46,transparent:true,opacity:.92,clearcoat:1});
const pearl=()=>new THREE.MeshPhysicalMaterial({color:0xf8fbf3,roughness:.2,iridescence:.42,iridescenceIOR:1.25,clearcoat:1});
const blue=()=>new THREE.MeshPhysicalMaterial({color:0x164b82,metalness:.08,roughness:.2,clearcoat:1});
const white=()=>new THREE.MeshPhysicalMaterial({color:0xe8f1f2,roughness:.38,clearcoat:.45});
const resinBlue=()=>new THREE.MeshPhysicalMaterial({color:0x79b8d2,roughness:.31,clearcoat:.68,clearcoatRoughness:.24});
const ink=()=>new THREE.MeshPhysicalMaterial({color:0x071b31,roughness:.26,clearcoat:.5});
const pink=()=>new THREE.MeshPhysicalMaterial({color:0xf0aab9,roughness:.2,clearcoat:1});
const mesh=(geometry,material,parent,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);m.rotation.set(...rotation);m.castShadow=true;parent.add(m);return m;};
function starGeometry(outer=.82,inner=.38,depth=.25){const s=new THREE.Shape();for(let i=0;i<10;i++){const r=i%2?inner:outer,a=Math.PI/2+i*Math.PI/5;s[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}s.closePath();return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.08,bevelThickness:.08});}
function heartGeometry(depth=.22){const s=new THREE.Shape();s.moveTo(0,-.58);s.bezierCurveTo(-1.08,-.02,-.82,.72,-.36,.72);s.bezierCurveTo(-.13,.72,0,.54,0,.38);s.bezierCurveTo(0,.54,.13,.72,.36,.72);s.bezierCurveTo(.82,.72,1.08,-.02,0,-.58);return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:4,bevelSize:.06,bevelThickness:.06});}
function ring(parent,y=1.1,x=0,r=.22){mesh(new THREE.TorusGeometry(r,.055,14,48),silver(),parent,[x,y,0]);}
function chain(parent,fromY=1.08,count=4){for(let i=0;i<count;i++)mesh(new THREE.TorusGeometry(.105,.025,8,24),silver(),parent,[0,fromY+i*.16,0],[1,1,1],[0,i%2?Math.PI/2:0,0]);}
function drop(parent,x,y,s=.3){mesh(new THREE.OctahedronGeometry(s,2),ice(),parent,[x,y,0],[.72,1.08,.72]);ring(parent,y+s*1.12,x,.09);}
function flower(parent,x,y,s=.32){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(new THREE.SphereGeometry(s*.45,24,16),white(),parent,[x+Math.cos(a)*s*.42,y+Math.sin(a)*s*.42,0],[1,.72,.62]);}mesh(new THREE.SphereGeometry(s*.18,20,14),silver(),parent,[x,y,.18]);}
function cloud(parent){for(const [x,y,s] of [[-.48,0,.42],[-.12,.15,.52],[.28,.08,.45],[.52,-.07,.3]])mesh(new THREE.SphereGeometry(s,28,20),white(),parent,[x,y,0],[1,.72,.58]);for(const x of [-.34,0,.34])drop(parent,x,-.78,Math.abs(x)<.1?.19:.14);}
function crescent(parent){const shape=new THREE.Shape();shape.absarc(0,0,.82,0,Math.PI*2);const hole=new THREE.Path();hole.absarc(.30,.16,.68,0,Math.PI*2,true);shape.holes.push(hole);mesh(new THREE.ExtrudeGeometry(shape,{depth:.2,bevelEnabled:true,bevelSegments:4,bevelSize:.05,bevelThickness:.06}),ice(),parent,[-.1,-.1,-.1]);mesh(starGeometry(.28,.13,.12),silver(),parent,[.54,.42,.12]);}
function checker(parent){for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)mesh(new THREE.BoxGeometry(.38,.38,.32),(x+y)%2?ice():white(),parent,[x*.39,y*.39,0]);drop(parent,0,-1.0,.2);}
function penguin(parent){
  mesh(new THREE.SphereGeometry(.67,36,24),resinBlue(),parent,[0,-.06,0],[.85,1.08,.72]);
  mesh(new THREE.SphereGeometry(.52,32,22),white(),parent,[0,-.15,.51],[.7,.86,.17]);
  for(const x of [-.21,.21]){mesh(new THREE.SphereGeometry(.057,18,14),ink(),parent,[x,.27,.69],[.82,1.08,.52]);mesh(new THREE.SphereGeometry(.014,10,8),new THREE.MeshBasicMaterial({color:0xffffff}),parent,[x-.014,.292,.724]);}
  mesh(new THREE.ConeGeometry(.095,.23,4),new THREE.MeshPhysicalMaterial({color:0xd9a449,roughness:.38,clearcoat:.25}),parent,[0,.08,.76],[1,1,1],[Math.PI/2,0,0]);
  for(const x of [-.66,.66])mesh(new THREE.SphereGeometry(.28,20,14),resinBlue(),parent,[x,-.05,-.02],[.38,1,.35],[0,0,x<0?-.45:.45]);
}
function envelope(parent){mesh(new THREE.BoxGeometry(1.6,1.02,.18),white(),parent,[0,-.05,0]);const tri=new THREE.Shape();tri.moveTo(-.78,.47);tri.lineTo(0,-.08);tri.lineTo(.78,.47);tri.closePath();mesh(new THREE.ExtrudeGeometry(tri,{depth:.08,bevelEnabled:true,bevelSize:.015,bevelThickness:.01}),pearl(),parent,[0,0,.12]);mesh(heartGeometry(.1),ice(),parent,[0,-.12,.25],[.24,.24,.24]);}
function rocket(parent){mesh(new THREE.CapsuleGeometry(.36,.85,10,24),white(),parent,[0,0,0],[1,1,1],[0,0,-.22]);mesh(new THREE.ConeGeometry(.37,.56,32),ice(),parent,[-.18,.76,0],[1,1,1],[0,0,-.22]);mesh(new THREE.TorusGeometry(.16,.055,12,32),silver(),parent,[.05,.12,.37]);for(const side of [-1,1])mesh(new THREE.ConeGeometry(.22,.56,4),ice(),parent,[side*.42,-.45,0],[1,1,1],[0,0,side*.22]);}
function shootingStar(parent){mesh(starGeometry(.72,.34,.24),blue(),parent,[-.34,.24,-.1],[1,1,1],[0,0,-.1]);for(const [material,y,s] of [[pink(),-.10,1],[ice(),-.42,.86]]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.1,y,0),new THREE.Vector3(.45,y+.08,0),new THREE.Vector3(.92,y-.18,0)]);mesh(new THREE.TubeGeometry(curve,32,.16*s,12,false),material,parent);}}
function heartBow(parent){mesh(heartGeometry(.22),pearl(),parent,[-.12,.16,0],[.78,.78,.78]);for(const x of [-.46,.46])mesh(new THREE.TorusGeometry(.32,.12,14,32),ice(),parent,[x,-.55,0],[1,.64,1],[0,0,x<0?-.35:.35]);mesh(new THREE.SphereGeometry(.15,22,16),silver(),parent,[0,-.54,.1]);}
function tulip(parent){for(const x of [-.24,0,.24])mesh(new THREE.SphereGeometry(.36,28,20),x?ice():white(),parent,[x,.25,0],[.72,1.12,.65],[0,0,x*.9]);mesh(new THREE.CylinderGeometry(.045,.06,1.0,16),silver(),parent,[0,-.45,0]);for(const x of [-.28,.28])mesh(new THREE.SphereGeometry(.34,24,18),ice(),parent,[x,-.4,0],[.34,1,.2],[0,0,x<0?.55:-.55]);drop(parent,0,-1.12,.16);}
function crystalHeart(parent){for(const [x,y,s] of [[-.48,.28,.34],[.48,.2,.3],[0,.52,.38]])mesh(new THREE.OctahedronGeometry(s,1),ice(),parent,[x,y,0]);flower(parent,0,-.12,.42);mesh(heartGeometry(.12),ice(),parent,[0,-.78,0],[.36,.36,.36]);}
function makeCharm(kind){if(kind==='star')return createStarCharm();const group=new THREE.Group();ring(group,1.47);chain(group,.87,4);if(kind==='flower')tulip(group);else if(kind==='cloud')cloud(group);else if(kind==='moon')crescent(group);else if(kind==='cube')checker(group);else if(kind==='penguin')penguin(group);else if(kind==='crystal')crystalHeart(group);else if(kind==='envelope')envelope(group);else if(kind==='rocket')rocket(group);else if(kind==='shooting-star')shootingStar(group);else heartBow(group);return group;}

export function mountReward3D(canvas,{id,reducedMotion=false,frameElement=null,onReady=()=>{},onError=()=>{}}={}){
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'high-performance'});}catch(error){onError(error);return{pause(){},resume(){},destroy(){}};}
  renderer.setPixelRatio(Math.min(2,globalThis.devicePixelRatio||1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environmentTarget=pmrem.fromScene(room,.04),environment=environmentTarget.texture;room.dispose();
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(26,1,.01,100);scene.environment=environment;scene.background=new THREE.Color(0xe8eff1);camera.position.set(0,.05,8.8);const root=new THREE.Group(),hanger=new THREE.Group(),charm=makeCharm(rewardPresentation(id).kind);charm.position.y=-1.47;hanger.position.y=1.47;hanger.add(charm);root.add(hanger);root.scale.setScalar(.16);root.rotation.set(.42,-2.55,0);scene.add(root);
  const backdrop=rewardPresentation(id).kind==='star'?createRefractionBackdrop():null;if(backdrop){backdrop.position.z=-.75;backdrop.renderOrder=20;scene.add(backdrop);}
  charm.traverse(object=>{if(object.material?.transmission){object.castShadow=false;object.receiveShadow=false;}});
  const studio=createRewardStudio();scene.add(studio.group);
  let disposed=false,paused=false,inspected=false,frame=0,pointerId=null,lastX=0,inspectionYaw=-.18,lastFrame=0,elapsed=0;canvas.dataset.loaded='true';canvas.dataset.mode='procedural-webgl';canvas.dataset.motion='awaken';canvas.dataset.motionHistory='';onReady();
  function resize(distance){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),ratio=renderer.getPixelRatio();if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio))renderer.setSize(w,h,false);const viewport=canvas.getBoundingClientRect?.()||{left:0,top:0,width:w,height:h};const framing=rewardFraming(viewport,frameElement?.getBoundingClientRect(),distance);camera.aspect=w/h;camera.fov=framing.fov;camera.position.set(framing.x,framing.y,distance);camera.updateProjectionMatrix();}
  function draw(now=0){frame=0;if(disposed||paused)return;if(lastFrame)elapsed+=Math.max(0,(now-lastFrame)/1000);lastFrame=now;const motion=rewardMotionSample(reducedMotion?3:elapsed,reducedMotion);canvas.dataset.motion=motion.phase;const history=new Set((canvas.dataset.motionHistory||'').split(',').filter(Boolean));history.add(motion.phase);canvas.dataset.motionHistory=[...history].join(',');root.position.set(motion.x,motion.y,0);root.scale.setScalar(motion.scale);root.rotation.x=motion.pitch;if(motion.phase==='inspect'){if(!inspected&&!reducedMotion)inspectionYaw=-.18+Math.sin(elapsed*.31)*.38;root.rotation.y=reducedMotion?inspectionYaw:root.rotation.y+(inspectionYaw-root.rotation.y)*.075;}else root.rotation.y=motion.yaw;hanger.rotation.z=motion.swing;resize(motion.cameraZ);studio.key.intensity=.8*motion.light;renderer.render(scene,camera);frame=requestAnimationFrame(draw);}
  function releasePointer(){const released=pointerId;pointerId=null;if(released!==null&&canvas.hasPointerCapture?.(released))canvas.releasePointerCapture(released);}
  const down=e=>{if(paused||canvas.dataset.motion!=='inspect'||pointerId!==null)return;inspected=true;inspectionYaw=root.rotation.y;pointerId=e.pointerId;lastX=e.clientX;canvas.setPointerCapture?.(pointerId);},move=e=>{if(e.pointerId!==pointerId)return;inspectionYaw+=(e.clientX-lastX)*.012;lastX=e.clientX;},up=e=>{if(e.pointerId===pointerId)releasePointer();};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);draw();
  return{
    pause(){if(disposed||paused)return;paused=true;cancelAnimationFrame(frame);frame=0;lastFrame=0;releasePointer();},
    resume(){if(disposed||!paused)return;paused=false;lastFrame=0;frame=requestAnimationFrame(draw);},
    destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);releasePointer();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);studio.dispose();scene.traverse(object=>{object.geometry?.dispose();if(Array.isArray(object.material))object.material.forEach(m=>m.dispose());else object.material?.dispose();});backdrop?.material.map.dispose();environmentTarget.dispose();pmrem.dispose();renderer.dispose();delete canvas.dataset.loaded;},
  };
}
