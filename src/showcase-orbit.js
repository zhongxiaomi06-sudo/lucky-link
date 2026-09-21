import * as THREE from 'three';

/** A finite revolution. Paused/background time never advances the shot. */
export function createOrbitPlayback(duration=24) {
  let seconds=0, last, running=false;
  return {
    start(now) { if(seconds>=duration) seconds=0; last=now; running=true; },
    pause() { running=false; last=undefined; },
    reset() { seconds=0; running=false; last=undefined; },
    step(now) {
      if(running && now>=last) {
        seconds=Math.min(duration,seconds+(now-last)/1000); last=now;
        if(seconds>=duration) running=false;
      }
      return seconds/duration;
    },
    get running() { return running; },
    get phase() { return seconds/duration; },
  };
}

/** Fit every azimuth, not only the attractive front. Rect is the unobscured canvas area. */
export function fitShowcaseOrbit(camera, bounds, viewport, rect) {
  const target=bounds.getCenter(new THREE.Vector3()), phi=1.24;
  const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2);
  const h=tanV*camera.aspect*rect.width/viewport.width;
  const v=tanV*rect.height/viewport.height;
  let radius=0;
  const corners=[];
  for(const x of [bounds.min.x,bounds.max.x]) for(const y of [bounds.min.y,bounds.max.y]) for(const z of [bounds.min.z,bounds.max.z]) corners.push(new THREE.Vector3(x,y,z).sub(target));
  for(let i=0;i<360;i++) {
    const theta=i*Math.PI/180;
    const back=new THREE.Vector3().setFromSpherical(new THREE.Spherical(1,phi,theta));
    const right=new THREE.Vector3(Math.cos(theta),0,-Math.sin(theta));
    const up=new THREE.Vector3().crossVectors(back,right);
    for(const p of corners) radius=Math.max(radius,p.dot(back)+Math.max(Math.abs(p.dot(right))/h,Math.abs(p.dot(up))/v));
  }
  return { target, phi, radius:Math.max(3,radius*1.10) };
}
