import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { drilledGeometry, gemGeometry, shellGeometry } from './bead-finish.js';
import { fitHomeCamera, homeSafeRect } from './home-layout.js';

const rng=n=>{const v=Math.sin(n*127.1+19.7)*43758.54;return v-Math.floor(v);};
const v3=(x,y,z)=>new THREE.Vector3(x,y,z);
const round=(w,h,d,r=.08)=>new RoundedBoxGeometry(w,h,d,4,r);
function mesh(geo,material,parent,position=[0,0,0]) {
  const object=new THREE.Mesh(geo,material);object.position.set(...position);
  object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
function woodMap() {
  const c=document.createElement('canvas');c.width=512;c.height=1024;
  const ctx=c.getContext('2d');ctx.fillStyle='#d5ae7b';ctx.fillRect(0,0,c.width,c.height);
  for(let i=0;i<1800;i++) {
    const x=rng(i)*512;ctx.strokeStyle=i%3?`rgba(80,43,21,${.025+rng(i+8)*.105})`:'rgba(255,240,204,.17)';
    ctx.lineWidth=.3+rng(i+9)*1.1;ctx.beginPath();
    for(let y=0;y<=1024;y+=12) {const px=x+Math.sin(y*.008+x*.03)*3+Math.sin(y*.028+x)*.5;if(y)ctx.lineTo(px,y);else ctx.moveTo(px,y);}
    ctx.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,2);t.anisotropy=8;return t;
}
function laceMap() {
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#fff';
  for(let i=0;i<256;i+=8){ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}
  for(const x of [32,96,160,224])for(const y of [32,96,160,224]) {
    ctx.lineWidth=2;
    for(let p=0;p<6;p++){const a=p*Math.PI/3;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*10,y+Math.sin(a)*10,12,4,a,0,Math.PI*2);ctx.stroke();}
    ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,5);return t;
}
function heartGeometry() {
  const s=new THREE.Shape();s.moveTo(0,-.43);s.bezierCurveTo(-.85,.05,-.53,.74,0,.32);s.bezierCurveTo(.53,.74,.85,.05,0,-.43);
  const g=new THREE.ExtrudeGeometry(s,{depth:.19,bevelEnabled:true,bevelThickness:.09,bevelSize:.075,bevelSegments:3,curveSegments:16,steps:1});g.center();return g;
}

function createArt(scene,wood) {
  const hero=new THREE.Group();hero.name='supported-phone-and-closed-loop';scene.add(hero);
  const gold=new THREE.MeshPhysicalMaterial({color:'#e8bf70',metalness:1,roughness:.2,clearcoat:.7});
  const silver=new THREE.MeshPhysicalMaterial({color:'#d9d9d3',metalness:.9,roughness:.24,clearcoat:.7});
  const pearl=new THREE.MeshPhysicalMaterial({color:'#fff1dd',metalness:.12,roughness:.2,clearcoat:1,iridescence:.42,iridescenceIOR:1.3});
  const black=new THREE.MeshPhysicalMaterial({color:'#071622',metalness:.48,roughness:.1,clearcoat:1});
  const glass=color=>new THREE.MeshPhysicalMaterial({color,metalness:0,roughness:.08,transmission:.91,thickness:.85,ior:1.48,attenuationColor:color,attenuationDistance:3,clearcoat:1,envMapIntensity:1.3});
  const mats={aqua:glass('#66c8d6'),rose:glass('#e79fba'),lilac:glass('#b0a0d6'),amber:glass('#dba037'),clear:glass('#e9f6f1'),jade:glass('#93b68d'),pearl,gold};

  const phone=new THREE.Group();phone.name='silver-phone';hero.add(phone);
  const frame=mesh(round(2.9,5.95,.29,.17),silver,phone);frame.name='metal-phone-frame';
  const back=mesh(round(2.79,5.84,.035,.16),new THREE.MeshPhysicalMaterial({color:'#e4ded1',metalness:.25,roughness:.34,clearcoat:.7}),phone,[0,0,.163]);back.name='satin-back-glass';
  mesh(round(2.77,5.82,.025,.15),black,phone,[0,0,-.16]);
  mesh(round(.7,.16,.018,.06),black,phone,[0,2.63,-.18]);
  mesh(round(1.3,1.4,.105,.17),silver,phone,[-.62,1.98,.23]);
  for(const [x,y] of [[-.91,2.29],[-.91,1.68],[-.33,1.98]]) {
    const ring=mesh(new THREE.CylinderGeometry(.267,.267,.11,48),silver,phone,[x,y,.34]);ring.rotation.x=Math.PI/2;
    const lens=mesh(new THREE.CylinderGeometry(.225,.225,.03,48),black,phone,[x,y,.415]);lens.rotation.x=Math.PI/2;
    const iris=mesh(new THREE.CircleGeometry(.15,40),new THREE.MeshPhysicalMaterial({color:'#163752',metalness:.4,roughness:.08,clearcoat:1}),phone,[x,y,.433]);iris.name='optical-lens';
    const glint=mesh(new THREE.SphereGeometry(.035,12,8),new THREE.MeshBasicMaterial({color:'#a6ddea'}),phone,[x-.085,y+.08,.444]);glint.scale.set(1,.5,.15);
  }
  mesh(new THREE.SphereGeometry(.086,20,12),pearl,phone,[-.34,2.43,.33]).scale.z=.3;
  mesh(new THREE.SphereGeometry(.055,16,10),black,phone,[-.33,1.57,.32]).scale.z=.3;
  for(const [x,y,h] of [[-1.465,.9,.43],[-1.465,.22,.43],[1.465,.72,.62]])mesh(round(.028,h,.12,.012),silver,phone,[x,y,0]);
  mesh(round(.32,.014,.09,.006),black,phone,[0,-2.981,0]);
  for(let i=0;i<10;i++)mesh(new THREE.SphereGeometry(.021,8,6),black,phone,[(i<5?-.9:.5)+(i%5)*.075,-2.982,0]).scale.y=.2;
  const socket=mesh(new THREE.TorusGeometry(.12,.035,10,28),gold,phone,[-1.27,-2.47,.205]);socket.name='case-eyelet';
  phone.rotation.x=-.24;phone.position.set(.85,3.1,-2.12);
  // Angled backboard and a retaining lip visibly hold the phone above the table.
  const support=mesh(round(2.82,4.72,.24,.08),wood,hero,[.85,2.33,-2.52]);support.rotation.x=-.24;
  mesh(round(3.24,.18,2.05,.09),wood,hero,[.85,.1,-2.34]);
  mesh(round(2.95,.18,.23,.04),wood,hero,[.85,.24,-1.53]);
  const brace=mesh(round(.32,2.7,.35,.04),wood,hero,[.85,1.4,-3.0]);brace.rotation.x=.38;

  const cordMat=new THREE.MeshPhysicalMaterial({color:'#9fc9dd',roughness:.46,clearcoat:.32,clearcoatRoughness:.5});
  const curve=new THREE.CatmullRomCurve3([
    v3(.04,.38,-1.03),v3(-1.63,.38,-.2),v3(-2.37,.38,1.77),v3(-1.9,.38,3.59),
    v3(-.3,.38,4.34),v3(1.63,.38,3.52),v3(2.05,.38,1.54),v3(1.24,.38,-.2),
  ],true,'centripetal');
  const cord=mesh(new THREE.TubeGeometry(curve,160,.024,8,true),cordMat,hero);cord.name='continuous-closed-thread';
  hero.updateMatrixWorld(true);const anchor=socket.getWorldPosition(new THREE.Vector3()),join=curve.getPoint(0);
  const tether=new THREE.CatmullRomCurve3([anchor,anchor.clone().add(v3(-.06,-.2,.08)),join.clone().add(v3(.13,.07,-.13)),join]);
  mesh(new THREE.TubeGeometry(tether,28,.038,10,false),cordMat,hero).name='attached-case-cord';
  const clasp=mesh(new THREE.TorusGeometry(.15,.044,12,32),gold,hero,join.toArray());clasp.rotation.x=Math.PI/2;

  const recipe=['pearl','lilac','clear','ceramic','rose','aqua','heart','pearl','amber','shell','flower','jade','pearl','aqua'];
  const beads=[];
  function bead(kind,index) {
    const root=new THREE.Group();root.name=`hero-bead-${index}-${kind}`;
    if(['aqua','lilac','clear','rose','amber'].includes(kind)) {
      mesh(gemGeometry(.37),mats[kind],root).scale.set(1.12,1.12,1.12);root.userData.bore=true;
    } else if(kind==='pearl'||kind==='ceramic') {
      const body=mesh(drilledGeometry(.38,true),pearl,root);root.userData.bore=true;
      if(kind==='ceramic') {
        // Tiny glaze leaves follow the ceramic surface; no screen-space stickers.
        const glaze=new THREE.MeshStandardMaterial({color:'#547f61',roughness:.3});
        for(let i=0;i<12;i++){const a=i*2.4,y=Math.sin(i*1.7)*.23,r=Math.sqrt(.38**2-y*y);const leaf=mesh(new THREE.SphereGeometry(.065,10,8),glaze,root,[Math.cos(a)*r,y,Math.sin(a)*r]);leaf.scale.set(.55,1.6,.25);leaf.lookAt(0,y,0);}
        body.scale.y=1.14;
      }
    } else if(kind==='heart') {mesh(heartGeometry(),mats.rose,root).rotation.x=-Math.PI/2;}
    else if(kind==='shell') {const body=mesh(shellGeometry(),pearl,root);body.rotation.x=-Math.PI/2;body.scale.setScalar(1.22);}
    else if(kind==='flower') {
      for(let i=0;i<6;i++){const a=i*Math.PI/3;mesh(new THREE.SphereGeometry(.16,20,12),pearl,root,[Math.cos(a)*.26,0,Math.sin(a)*.26]).scale.set(1,.6,1.3);}
      mesh(new THREE.SphereGeometry(.12,20,12),gold,root,[0,.05,0]);
    } else {const body=mesh(drilledGeometry(.33),mats.jade,root);body.scale.set(.92,1.4,.92);root.userData.bore=true;}
    return root;
  }
  recipe.forEach((kind,i)=>{
    const t=(i+.55)/recipe.length,p=curve.getPointAt(t),tangent=curve.getTangentAt(t);
    const b=bead(kind,i);if(b.userData.bore)b.quaternion.setFromUnitVectors(v3(0,1,0),tangent);
    else b.rotation.y=Math.atan2(tangent.x,tangent.z)+Math.PI/2;
    b.position.copy(p);hero.add(b);b.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(b);b.position.y+=.035-box.min.y;beads.push(b);
    for(const delta of [-.032,.032]){
      const q=curve.getPointAt((t+delta+1)%1),ring=mesh(new THREE.TorusGeometry(.09,.03,10,28),gold,hero,q.toArray());
      ring.quaternion.setFromUnitVectors(v3(0,0,1),curve.getTangentAt((t+delta+1)%1));
    }
  });
  hero.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(hero),points=[];
  // Tight projected mesh bounds keep the portrait hero large without cropping any actual surface.
  hero.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(v3(x,y,z).applyMatrix4(o.matrixWorld));});
  const props=new THREE.Group();scene.add(props);
  for(const [kind,x,z] of [['aqua',-3.3,-.2],['pearl',-3.6,1],['lilac',-2.9,-1.2],['aqua',3.45,5.2]]) {
    const b=bead(kind,20);props.add(b);b.position.set(x,.42,z);b.rotation.set(.35,.2,.5);
  }
  // A shallow porcelain dish for spare materials.
  const dish=mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.6,0),new THREE.Vector2(.95,.15),new THREE.Vector2(1.2,.5),new THREE.Vector2(1.17,.55),new THREE.Vector2(.92,.22),new THREE.Vector2(.57,.08),new THREE.Vector2(0,.08)],48),pearl,props,[-4,.01,-1.9]);
  dish.name='porcelain-material-dish';
  return {hero,beads,bounds,points};
}

function createVeranda(scene,wood) {
  const table=mesh(round(24,.22,21,.09),wood,scene,[0,-.12,4.5]);table.name='wood-tabletop';
  const rails=new THREE.Group();scene.add(rails);
  for(const x of [-8,-1.9,8])mesh(round(.2,13,.25,.025),wood,rails,[x,3.8,-8]);
  for(const y of [.4,4.6])mesh(round(20,.16,.3,.025),wood,rails,[0,y,-8]);
  const lake=mesh(new THREE.PlaneGeometry(220,180),new THREE.MeshStandardMaterial({color:'#61a9b5',roughness:.32,metalness:.2}),scene,[0,-2.5,-75]);lake.rotation.x=-Math.PI/2;lake.castShadow=false;
  for(let layer=0;layer<3;layer++) {
    const g=new THREE.PlaneGeometry(160,12,120,4),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),u=(p.getY(i)+6)/12,h=5+Math.sin(x*.095+layer)*2+Math.sin(x*.26+layer)*1.6+Math.sin(x*.59)*.4;p.setXYZ(i,x,-4+u*h,Math.sin(x*.13)*2);}
    g.computeVertexNormals();mesh(g,new THREE.MeshStandardMaterial({color:['#7c9b8d','#94afa2','#b1c3b9'][layer],roughness:1}),scene,[0,0,-32-layer*12]).castShadow=false;
  }
  const clothGeo=new THREE.PlaneGeometry(5.6,11,30,48),pos=clothGeo.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getX(i)*5)*.23+Math.sin(pos.getY(i)*.45)*.2);
  clothGeo.computeVertexNormals();
  const curtain=mesh(clothGeo,new THREE.MeshPhysicalMaterial({color:'#fff3d9',roughness:.87,side:THREE.DoubleSide,map:laceMap(),transparent:true,opacity:.82,depthWrite:false}),scene,[-6.1,5.1,-6.9]);
  curtain.castShadow=false;
  const leafMat=new THREE.MeshStandardMaterial({color:'#45612c',roughness:.75,side:THREE.DoubleSide});
  const leaves=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,6),leafMat,100);leaves.castShadow=true;scene.add(leaves);const dummy=new THREE.Object3D();
  for(let i=0;i<100;i++) {
    const a=i*2.39,r=1+rng(i)*3;
    dummy.position.set(-7+Math.cos(a)*r,7+rng(i+4)*3,-2+Math.sin(a)*r);
    dummy.scale.set(.16+rng(i)*.15,.035,.42+rng(i+8)*.27);dummy.rotation.set(rng(i)*.6,a,.4);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
  }
  return {curtain,leaves};
}

export async function createHomeHero({container,header,button,onGesture}) {
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#d8e7dc');scene.fog=new THREE.Fog('#d8e7dc',38,115);
  const camera=new THREE.PerspectiveCamera(36,1,.1,180);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;
  room.dispose();pmrem.dispose();scene.environmentIntensity=.75;
  scene.add(new THREE.HemisphereLight('#eaf7ff','#986440',.65));
  const sun=new THREE.DirectionalLight('#fff0ce',3.2);sun.position.set(-8,13,7);sun.target.position.set(0,0,0);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:40});sun.shadow.bias=-.00025;sun.shadow.normalBias=.022;sun.shadow.radius=3;
  const map=woodMap(),wood=new THREE.MeshStandardMaterial({map,color:'#dcc096',roughness:.62,bumpMap:map,bumpScale:.012});
  const art=createArt(scene,wood),world=createVeranda(scene,wood);
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','A closed crystal phone charm on a sunlit table. Drag sideways or use arrow keys to look around.');
  container.append(canvas);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let yaw=0,pitch=0,drag=null,raf=0,dead=false,frame=0;
  let width=1,height=1,rect;const debug=new URLSearchParams(location.search).has('debug');
  function resize() {
    width=container.clientWidth;height=container.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);const c=container.getBoundingClientRect(),style=getComputedStyle(document.documentElement);
    const inset=side=>parseFloat(style.getPropertyValue('--home-'+side))||0;
    rect=homeSafeRect(width,height,{top:inset('top'),bottom:inset('bottom'),left:inset('left'),right:inset('right')},header.getBoundingClientRect().bottom-c.top+18,button.getBoundingClientRect().top-c.top);
    draw();
  }
  function draw() {
    if(dead||!rect)return;
    fitHomeCamera(camera,art.points,width,height,rect,yaw,pitch);renderer.render(scene,camera);frame++;
    if(debug) {
      container.dataset.camera=JSON.stringify(camera.position.toArray());container.dataset.frame=String(frame);
      container.dataset.safe=JSON.stringify(rect);
      const points=art.points.map(point=>{const p=point.clone().project(camera);return [(p.x+1)*width/2,(1-p.y)*height/2];});
      container.dataset.subject=JSON.stringify(points);container.dataset.triangles=String(renderer.info.render.triangles);container.dataset.calls=String(renderer.info.render.calls);
    }
  }
  function tick(t) {
    raf=0;if(dead||document.hidden||reduced.matches)return;
    world.curtain.rotation.y=Math.sin(t*.0004)*.018;world.leaves.rotation.z=Math.sin(t*.00027)*.008;
    draw();raf=requestAnimationFrame(tick);
  }
  function schedule(){cancelAnimationFrame(raf);raf=0;if(!document.hidden&&!reduced.matches)raf=requestAnimationFrame(tick);else draw();}
  const listeners=[];
  const listen=(target,name,fn,options)=>{target.addEventListener(name,fn,options);listeners.push(()=>target.removeEventListener(name,fn,options));};
  listen(canvas,'pointerdown',e=>{if(!e.isPrimary){drag=null;return;}drag={x:e.clientX,y:e.clientY,yaw,pitch,id:e.pointerId};canvas.setPointerCapture?.(e.pointerId);onGesture();});
  listen(canvas,'pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;yaw=THREE.MathUtils.clamp(drag.yaw+(e.clientX-drag.x)/width*.32,-.14,.14);pitch=THREE.MathUtils.clamp(drag.pitch-(e.clientY-drag.y)/height*.18,-.05,.05);draw();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,event,()=>{drag=null;});
  listen(canvas,'keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();onGesture();if(e.key==='Home'){yaw=0;pitch=0;}else if(e.key.includes('Left')||e.key.includes('Right'))yaw=THREE.MathUtils.clamp(yaw+(e.key==='ArrowLeft'?-.035:.035),-.14,.14);else pitch=THREE.MathUtils.clamp(pitch+(e.key==='ArrowUp'?.025:-.025),-.05,.05);draw();});
  listen(document,'visibilitychange',schedule);listen(reduced,'change',schedule);
  const observer=new ResizeObserver(resize);observer.observe(container);observer.observe(header);observer.observe(button);
  listen(window,'resize',resize);if(window.visualViewport)listen(visualViewport,'resize',resize);
  listen(canvas,'webglcontextlost',e=>{e.preventDefault();container.dispatchEvent(new Event('hero-unavailable'));});
  resize();await renderer.compileAsync(scene,camera);renderer.render(scene,camera);renderer.shadowMap.autoUpdate=false;schedule();
  return {destroy(){dead=true;cancelAnimationFrame(raf);observer.disconnect();listeners.forEach(off=>off());scene.traverse(o=>{o.geometry?.dispose();});const materials=new Set();scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});materials.forEach(m=>m.dispose());map.dispose();world.curtain.material.map.dispose();environment.dispose();renderer.dispose();canvas.remove();},draw};
}
