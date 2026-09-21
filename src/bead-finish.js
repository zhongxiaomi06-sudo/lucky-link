import * as THREE from 'three';

const cache=new Map();
const pearlKinds=['pearl','shell','eye'];
const glassKinds=['crystal','blue','aqua','rose','amber','cube','jade','heart','lavender','star'];
const hardware=new THREE.MeshStandardMaterial({color:'#dac19b',metalness:.86,roughness:.26});

function surface(item) {
  if(cache.has(item.id)) return cache.get(item.id);
  const nacre=pearlKinds.includes(item.kind),glass=glassKinds.includes(item.kind);
  const material=new THREE.MeshPhysicalMaterial({
    color:'#ffffff',vertexColors:true,metalness:0,roughness:nacre?.25:glass?.13:.23,
    transmission:glass?.52:0,thickness:.64,ior:1.46,attenuationColor:item.color,attenuationDistance:1.1,
    clearcoat:1,clearcoatRoughness:nacre?.18:.09,iridescence:nacre?.72:.08,
    iridescenceIOR:1.3,iridescenceThicknessRange:[180,380],
  });
  cache.set(item.id,material);return material;
}

/** An actual bore along Y: the outside profile closes through an inside wall. */
export function drilledGeometry(radius=.32,baroque=false) {
  const points=[];
  for(let i=0;i<=24;i++) {
    const t=.17+(Math.PI-.34)*i/24;
    points.push(new THREE.Vector2(Math.sin(t)*radius,Math.cos(t)*radius));
  }
  points.push(points[0].clone());
  const geo=new THREE.LatheGeometry(points.reverse(),32);
  if(baroque) {
    const p=geo.getAttribute('position');
    for(let i=0;i<p.count;i++) {
      const a=Math.atan2(p.getZ(i),p.getX(i)),r=Math.hypot(p.getX(i),p.getZ(i));
      if(r>radius*.25){const f=1+.023*Math.sin(a*3+p.getY(i)*7);p.setXYZ(i,p.getX(i)*f,p.getY(i),p.getZ(i)*f);}
    }
    geo.computeVertexNormals();
  }
  return geo;
}

export function gemGeometry(radius=.34) {
  const profile=[[.055,.35],[.18,.27],[radius,.075],[radius,-.065],[.18,-.27],[.055,-.35],[.055,.35]];
  const indexed=new THREE.LatheGeometry(profile.reverse().map(([x,y])=>new THREE.Vector2(x,y)),10);
  const geo=indexed.toNonIndexed();indexed.dispose();geo.computeVertexNormals();return geo;
}

function dropGeometry() {
  const profile=[[.048,.46],[.1,.34],[.19,.18],[.28,-.02],[.29,-.14],[.24,-.27],[.14,-.35],[.05,-.36],[.048,.46]];
  return new THREE.LatheGeometry(profile.reverse().map(([x,y])=>new THREE.Vector2(x,y)),32);
}

/** Joined front and back surfaces with nine radial flutes and a scalloped rim. */
export function shellGeometry() {
  const vertices=[],indices=[],steps=36,rings=12,stride=steps+1;
  for(const side of [1,-1]) for(let r=0;r<=rings;r++) for(let a=0;a<=steps;a++) {
    const u=r/rings,angle=-1.12+2.24*a/steps,flute=Math.cos(angle*25),length=.71*(1+.025*flute);
    vertices.push(Math.sin(angle)*u*length*.73,Math.cos(angle)*u*length-.30,side*(.014+Math.sin(u*Math.PI)*(.09+.018*flute)));
  }
  const face=(rings+1)*stride;
  for(let side=0;side<2;side++) for(let r=0;r<rings;r++) for(let a=0;a<steps;a++) {
    const i=side*face+r*stride+a;
    if(!side) indices.push(i,i+1,i+stride,i+1,i+stride+1,i+stride);
    else indices.push(i,i+stride,i+1,i+1,i+stride,i+stride+1);
  }
  for(let a=0;a<steps;a++){const i=rings*stride+a;indices.push(i,i+face,i+1,i+1,i+face,i+face+1);}
  for(const a of [0,steps])for(let r=0;r<rings;r++){const i=r*stride+a;indices.push(i,i+stride,i+face,i+face,i+stride,i+stride+face);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

function tint(geometry,item) {
  const base=new THREE.Color(item.color),accent=new THREE.Color(item.accent),p=geometry.getAttribute('position'),colors=[];
  for(let i=0;i<p.count;i++) {
    const y=p.getY(i),angle=Math.atan2(p.getZ(i),p.getX(i));
    // Color lives in the material, not a screen-space glow. Keep each score color legible.
    const mix=THREE.MathUtils.clamp(.12+(y+.35)*.32+.065*Math.sin(angle*3+y*11),.02,.46);
    const c=base.clone().lerp(accent,mix);colors.push(c.r,c.g,c.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geometry;
}

export function finishBead(item,fallback) {
  const root=new THREE.Group();root.name=`bead-${item.id}`;root.userData.materialId=item.id;root.userData.detailVersion='v9';
  const add=(geo,mat,name)=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
  let geo;
  if(['crystal','blue','rose','lime'].includes(item.kind))geo=gemGeometry();
  if(['pearl','cobalt','sun'].includes(item.kind))geo=drilledGeometry(.32,item.kind==='pearl');
  if(item.kind==='aqua')geo=dropGeometry();
  if(item.kind==='shell')geo=shellGeometry();
  if(geo) {
    add(tint(geo,item),surface(item),'sculpted-body');
    if(item.kind!=='shell') {
      root.userData.threadingAxis='y';
      geo.computeBoundingBox();
      for(const y of [geo.boundingBox.min.y,geo.boundingBox.max.y]) {
        const ring=add(new THREE.TorusGeometry(.055,.009,6,20),hardware,'threading-collar');ring.rotation.x=Math.PI/2;ring.position.y=y;
      }
    }
  } else {
    const body=fallback();
    body.traverse(o=>{
      if(!o.isMesh) return;
      if(body.isMesh || item.reward) {
        o.material=surface(item);tint(o.geometry,item);delete o.userData.ownedMaterial;
      }
    });root.add(body);
  }
  if(['heart','lavender','star','flower','shell','moon','bow','candy','cherry','bell'].includes(item.kind)) {
    const bounds=new THREE.Box3().setFromObject(root);
    const loop=add(new THREE.TorusGeometry(.064,.018,8,24),hardware,'attachment-eyelet');loop.position.y=bounds.max.y+.045;
  }
  let triangles=0;
  root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});
  root.userData.triangles=triangles;
  return root;
}
