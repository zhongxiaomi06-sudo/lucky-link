import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const random = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function woodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c8945a'; ctx.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 420; i += 1) {
    const x = random(i) * 128;
    ctx.strokeStyle = i % 3 ? `rgba(88,45,18,${.035 + random(i + 9) * .12})` : 'rgba(255,220,160,.18)';
    ctx.lineWidth = .3 + random(i + 3) * 1.2;
    ctx.beginPath();
    for (let y = 0; y <= 512; y += 8) {
      const xx = x + Math.sin(y * .023 + x) * 1.8 + Math.sin(y * .006 + x * 3) * 2.4;
      if (!y) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 5; i += 1) {
    for (let j = 1; j < 8; j += 1) {
      ctx.strokeStyle = `rgba(92,49,21,${.15 - j * .014})`;
      ctx.beginPath(); ctx.ellipse(20 + random(i + 19) * 90, 40 + random(i + 44) * 400, j * 1.05, j * 4, .08, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function fabricTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#eae7d8'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 3) {
    ctx.fillStyle = i % 2 ? '#e0ddcd' : '#f8f5e7';
    ctx.fillRect(i, 0, 1, 128); ctx.fillRect(0, i, 128, 1);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
  return t;
}

/** An open, furnished pavilion with geometry in all azimuths, not a camera-facing backdrop. */
export function createWorld360() {
  const root = new THREE.Group(); root.name = 'lakeside-atelier-360';
  const batches = new Map();
  const animated = [];
  const interactables = [];
  const temp = new THREE.Object3D();
  let pieces = 0;
  const map = woodTexture();
  const timber = new THREE.MeshStandardMaterial({ color: '#c28e56', map, roughness: .66, bumpMap: map, bumpScale: .025 });
  const paleWood = new THREE.MeshStandardMaterial({ color: '#ecd2a3', map, roughness: .72, bumpMap: map, bumpScale: .018 });
  const darkWood = new THREE.MeshStandardMaterial({ color: '#93603b', map, roughness: .71 });
  const teal = new THREE.MeshStandardMaterial({ color: '#277b82', roughness: .6 });
  const cream = new THREE.MeshStandardMaterial({ color: '#fff3dc', roughness: .76 });
  const brass = new THREE.MeshStandardMaterial({ color: '#d6ad65', metalness: .72, roughness: .25 });
  const porcelain = new THREE.MeshPhysicalMaterial({ color: '#f2eddc', roughness: .27, clearcoat: .8 });
  const ink = new THREE.MeshStandardMaterial({ color: '#174861', roughness: .4 });

  function put(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    temp.position.set(...position); temp.rotation.set(...rotation); temp.scale.set(...scale); temp.updateMatrix();
    geometry.applyMatrix4(temp.matrix);
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geometry);
    pieces += 1;
  }
  function box(size, position, material = timber, rotation = [0, 0, 0], radius = .035) {
    put(new RoundedBoxGeometry(...size, 2, radius), material, position, rotation);
  }
  function cylinder(a, b, radius, material) {
    const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b);
    const center = p.clone().add(q).multiplyScalar(.5);
    const geometry = new THREE.CylinderGeometry(radius, radius, p.distanceTo(q), 8);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.sub(p).normalize());
    geometry.applyQuaternion(quaternion); geometry.translate(...center.toArray());
    put(geometry, material);
  }

  // Complete sky sphere; the shader receives a normalized world direction on every face.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 40, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vDirection; void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vDirection;
      void main(){
        vec3 d=normalize(vDirection);
        vec3 sky=mix(vec3(.88,.93,.86),vec3(.18,.58,.79),pow(max(0.,d.y),.48));
        float sun=pow(max(0.,dot(d,normalize(vec3(-.6,.7,.3)))),260.);
        float cloud=sin(d.x*16.+sin(d.z*7.))*sin(d.z*19.-d.x*8.);
        cloud=smoothstep(.15,.63,cloud)*smoothstep(.12,.25,d.y)*(1.-smoothstep(.38,.65,d.y));
        sky=mix(sky,vec3(.98,.97,.90),cloud*.53)+vec3(1.,.85,.5)*sun*.7;
        gl_FragColor=vec4(sky,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.name = 'complete-sky-sphere'; root.add(sky);

  // Lake is horizontal and extends behind, left and right of the building.
  const water = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `varying vec3 vWorld;uniform float uTime;
      void main(){
        vec2 p=vWorld.xz;float t=uTime*.5;
        float a=sin(p.x*1.3+p.y*.65+t), b=sin(p.y*2.2-p.x*.4-t*.8);
        vec3 n=normalize(vec3(a*.10,1.,b*.06));
        vec3 v=normalize(cameraPosition-vWorld);
        float fresnel=pow(1.-max(0.,dot(n,v)),3.);
        float spec=pow(max(0.,dot(reflect(-normalize(vec3(-.6,.7,.3)),n),v)),150.);
        vec3 col=mix(vec3(.045,.38,.42),vec3(.34,.67,.74),fresnel);
        col+=vec3(1.,.90,.62)*spec*1.7+(.5+.5*a*b)*.025;
        float haze=smoothstep(28.,95.,length(p));col=mix(col,vec3(.62,.80,.78),haze);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), water);
  lake.rotation.x = -Math.PI / 2; lake.position.y = -4.45; lake.name = 'surrounding-lake'; root.add(lake);

  // Irregular ridgelines surround the world, with geometry relief instead of cones.
  for (let layer = 0; layer < 3; layer += 1) {
    const g = new THREE.CylinderGeometry(57 + layer * 20, 57 + layer * 20, 1, 144, 7, true);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i), z = pos.getZ(i), v = pos.getY(i) + .5;
      const angle = Math.atan2(x, z);
      const h = 7 + layer * 3 + Math.sin(angle * 3 + layer) * 3 + Math.sin(angle * 7 + layer * 3) * 2 + Math.sin(angle * 15) * .9;
      const r = 1 + (1 - v) * .2 + Math.sin(v * 7 + angle * 11) * .025;
      pos.setXYZ(i, x * r, -4.4 + v * h, z * r);
    }
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ color: ['#43756c', '#6d9589', '#92b2a3'][layer], roughness: 1, side: THREE.DoubleSide });
    put(g, m);
  }

  // Joinery, planks, rails, roof beams. The camera orbit remains inside this perimeter.
  for (let i = 0; i < 36; i += 1) box([.88, .17, 32], [-15.75 + i * .9, -3.94, 0], i % 4 ? paleWood : timber);
  for (const x of [-14.3, 14.3]) {
    for (const z of [-14.3, -5, 5, 14.3]) {
      box([.38, 13.6, .38], [x, 2.8, z]);
      box([.7, .18, .7], [x, -3.78, z], darkWood);
      box([.68, .2, .68], [x, 9.45, z], darkWood);
    }
    box([.45, .45, 29.4], [x, 9.6, 0]);
  }
  for (const z of [-14.3, 14.3]) {
    box([29, .5, .46], [0, 9.6, z]);
    for (const x of [-5, 5]) box([.38, 13.6, .38], [x, 2.8, z]);
  }
  for (let i = 0; i < 15; i += 1) box([.19, .26, 29], [-13.4 + i * 1.91, 9.9, 0], paleWood);
  // Four rails; back includes sliding shoji and the material cabinet.
  for (let side = 0; side < 4; side += 1) {
    const angle = side * Math.PI / 2;
    const transform = (x, y, z) => [x * Math.cos(angle) + z * Math.sin(angle), y, z * Math.cos(angle) - x * Math.sin(angle)];
    for (const y of [-.4, -2.7]) box([28.5, .17, .22], transform(0, y, -14.2), timber, [0, angle, 0]);
    for (let i = 0; i < 26; i += 1) box([.075, 2.3, .11], transform(-13.8 + i * 1.1, -1.55, -14.2), paleWood, [0, angle, 0]);
  }
  for (const x of [-9.5, 9.5]) {
    box([7.8, 10.8, .12], [x, 1.4, 14.1], cream);
    for (let i = 0; i < 8; i += 1) box([.055, 10.7, .16], [x - 3.7 + i * 1.06, 1.4, 13.99], timber);
    for (let i = 0; i < 9; i += 1) box([7.8, .065, .18], [x, -3.5 + i * 1.24, 13.96], timber);
  }

  // Rear atelier: inset drawers, glass collection boxes and hanging spare charms.
  box([7.4, 2.1, 1.4], [0, -2.8, 12.7], teal);
  box([7.65, .16, 1.65], [0, -1.68, 12.7], paleWood);
  for (let i = 0; i < 6; i += 1) {
    box([1.13, 1.75, .08], [-3.08 + i * 1.23, -2.77, 11.96], teal);
    box([.28, .04, .07], [-3.08 + i * 1.23, -2.1, 11.87], brass);
  }
  for (let row = 0; row < 2; row += 1) {
    box([7.6, .13, .8], [0, .9 + row * 2, 13.1], paleWood);
    for (let i = 0; i < 3; i += 1) {
      const color = ['#76caba', '#e79cb3', '#eabf64', '#96a4d4', '#e1b38d', '#79bdd3'][row * 3 + i];
      const jarMat = new THREE.MeshPhysicalMaterial({ color, roughness: .15, clearcoat: 1, transmission: .15 });
      const jar = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.1, .68, 3, .08), jarMat);
      jar.position.set(-2.35 + i * 2.35, 1.51 + row * 2, 13.1);
      jar.userData.worldAction = ['jade-ring', 'rose-prism', 'sun-orb', 'lilac-heart', 'amber-cube', 'aqua-drop'][row * 3 + i];
      jar.userData.worldLabel = 'A little color from the shelf';
      root.add(jar); interactables.push(jar);
      box([1.13, .06, .72], [jar.position.x, jar.position.y + .58, 13.1], brass);
    }
  }

  function table(x, z, rotation = 0) {
    box([3.8, .19, 2.25], [x, -1.5, z], paleWood, [0, rotation, 0]);
    for (const dx of [-1.52, 1.52]) for (const dz of [-.82, .82]) box([.15, 2.2, .15], [x + dx, -2.66, z + dz]);
    // Tea tray and porcelain cups are fully modeled, including openings.
    box([1.1, .045, .68], [x - .6, -1.38, z], darkWood);
    for (const dx of [-.85, -.35]) {
      put(new THREE.CylinderGeometry(.14, .105, .22, 18, 1, true), porcelain, [x + dx, -1.25, z]);
      put(new THREE.CircleGeometry(.127, 18), ink, [x + dx, -1.17, z], [-Math.PI / 2, 0, 0]);
    }
    const profile = [new THREE.Vector2(0, 0), new THREE.Vector2(.3, 0), new THREE.Vector2(.39, .45), new THREE.Vector2(.2, .72), new THREE.Vector2(.12, 1.08), new THREE.Vector2(.16, 1.12)];
    put(new THREE.LatheGeometry(profile, 24), porcelain, [x + 1.05, -1.38, z]);
    for (let i = 0; i < 5; i += 1) {
      const end = [x + .7 + i * .17, .45 + random(i) * .5, z + (i % 2) * .2];
      cylinder([x + 1.05, -.4, z], end, .018, teal);
      for (let petal = 0; petal < 5; petal += 1) {
        const a = petal * Math.PI * 2 / 5;
        put(new THREE.SphereGeometry(.09, 10, 6), cream, [end[0] + Math.cos(a) * .1, end[1] + Math.sin(a) * .1, end[2]], [0, 0, a], [1, 1, .45]);
      }
    }
  }
  table(-9.1, -7.7); table(9.4, 6.5);
  // Low linen lounge and cushion, behind the right shoulder.
  const linen = new THREE.MeshStandardMaterial({ color: '#e8d4aa', map: fabricTexture(), roughness: .98 });
  box([3.7, .22, 2.2], [9.8, -2.6, -6.2], timber);
  box([3.55, .46, 2.0], [9.8, -2.3, -6.2], linen, [0, 0, 0], .16);
  box([3.55, 1.18, .38], [9.8, -1.48, -7.12], linen, [.08, 0, 0], .16);
  for (const dx of [-1.5, 1.5]) for (const dz of [-.8, .8]) box([.16, 1.2, .16], [9.8 + dx, -3.27, -6.2 + dz]);
  box([.8, .8, .28], [8.7, -1.65, -6.85], teal, [.12, .1, -.2], .16);

  // Real folded cloth with soft backlighting; each curtain anchored at the top.
  const clothTime = { value: 0 };
  const cloth = new THREE.MeshStandardMaterial({ color: '#fff4dd', map: fabricTexture(), roughness: .93, side: THREE.DoubleSide, transparent: true, opacity: .78, depthWrite: false });
  cloth.onBeforeCompile = (shader) => {
    shader.uniforms.uClothTime = clothTime;
    shader.vertexShader = 'uniform float uClothTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float freeEdge=1.0-uv.y;
      transformed.z+=sin(position.x*6.4)*.16+sin(position.y*.7+uClothTime)*.26*freeEdge;
      transformed.x+=sin(uClothTime*.6+position.y*.4)*.18*freeEdge;`);
  };
  for (let i = 0; i < 4; i += 1) {
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 11.5, 24, 38), cloth);
    curtain.position.set(i % 2 ? 12.8 : -12.8, 2.6, i < 2 ? -12.4 : 12.4);
    curtain.rotation.y = i % 2 ? -.25 : .25;
    root.add(curtain);
  }

  // Branches and 1,000 instanced, vein-shaped leaves give near/far occlusion at all angles.
  const leafGeometry = new THREE.SphereGeometry(1, 8, 5);
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#719953', roughness: .9 });
  const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, 1000);
  leaves.name = 'garden-leaf-canopy'; leaves.castShadow = true;
  const leafColor = new THREE.Color();
  for (let i = 0; i < 1000; i += 1) {
    const side = i % 8, a = side * Math.PI / 4;
    const near = i < 360;
    // Keep foliage outside the camera's near orbit/reveal envelope.
    const r = (near ? 17 : 22) + random(i * 7) * 4;
    temp.position.set(Math.sin(a) * r + (random(i * 3) - .5) * 7, (near ? 7.9 : 2.7) + random(i * 11) * 6, Math.cos(a) * r + (random(i + 33) - .5) * 7);
    temp.rotation.set(random(i) * 2, random(i + 9) * 6, random(i + 17) * 6);
    const size = .2 + random(i + 61) * .25;
    temp.scale.set(size, size * .15, size * 2.1); temp.updateMatrix(); leaves.setMatrixAt(i, temp.matrix);
    leafColor.setHSL(.22 + random(i + 18) * .10, .3 + random(i + 4) * .3, .23 + random(i) * .24); leaves.setColorAt(i, leafColor);
  }
  root.add(leaves);
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const x = Math.sin(a) * 22, z = Math.cos(a) * 22;
    cylinder([x, -4.4, z], [x - 1, 8, z], .27, darkWood);
    cylinder([x - 1, 4, z], [x - 4, 7.5, z - 3], .12, darkWood);
  }

  // Three tappable wind chimes with actual hanger, bell, clapper and paper sail.
  for (const [x, z] of [[-6, -10.5], [7.8, -9], [-10, 7]]) {
    const chime = new THREE.Group(); chime.name = 'wind-chime';
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, 2.0, 6), ink); cord.position.y = -.95; chime.add(cord);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(.32, 24, 16, 0, Math.PI * 2, 0, Math.PI * .58), new THREE.MeshPhysicalMaterial({ color: '#84c8cb', metalness: .1, roughness: .12, transmission: .35, clearcoat: 1, side: THREE.DoubleSide }));
    bell.position.y = -2.25; chime.add(bell);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(.31, .018, 8, 24), brass); lip.rotation.x = Math.PI / 2; lip.position.y = -2.32; chime.add(lip);
    const string = cord.clone(); string.scale.y = .45; string.position.y = -2.72; chime.add(string);
    const sail = new THREE.Mesh(new THREE.BoxGeometry(.22, .8, .015), teal); sail.position.y = -3.3; chime.add(sail);
    const touchArea = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 2, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    touchArea.position.y = -2.4; chime.add(touchArea);
    chime.position.set(x, 8.2, z); chime.userData.worldAction = 'chime'; chime.userData.impulse = 0;
    chime.traverse((m) => { m.userData.worldAction = 'chime'; m.userData.chimeRoot = chime; });
    root.add(chime); animated.push(chime); interactables.push(chime);
  }

  // Merge static solids by material; detailed world does not imply one draw per plank.
  for (const [material, geometries] of batches) {
    // All primitives use position/normal/uv; remove unsupported extras before merging.
    const normalized = geometries.map((g) => g.index ? g.toNonIndexed() : g);
    const merged = mergeGeometries(normalized, false);
    if (!merged) throw new Error('World geometry could not be merged');
    const m = new THREE.Mesh(merged, material); m.castShadow = true; m.receiveShadow = true;
    root.add(m); geometries.forEach((g) => g.dispose());
    normalized.forEach((g) => g.dispose());
  }
  root.userData.modelParts = pieces + 1000;
  root.userData.coverage = 'front back left right ceiling floor';

  return {
    root, interactables,
    update(seconds, reducedMotion) {
      if (reducedMotion) return;
      water.uniforms.uTime.value = seconds;
      clothTime.value = seconds;
      leaves.rotation.y = Math.sin(seconds * .2) * .006;
      animated.forEach((item, index) => {
        item.userData.impulse *= .97;
        item.rotation.z = Math.sin(seconds * 1.25 + index) * (.022 + item.userData.impulse * .14);
      });
    },
  };
}
