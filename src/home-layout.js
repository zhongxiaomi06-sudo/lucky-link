import * as THREE from 'three';

export function homeSafeRect(width,height,insets={},headerBottom=72,buttonTop=height-100) {
  const left=Math.max(18,(insets.left||0)+12),right=width-Math.max(18,(insets.right||0)+12);
  const top=Math.min(height*.55,Math.max(headerBottom+12,(insets.top||0)+60));
  const bottom=Math.max(top+24,Math.min(buttonTop-20,height-(insets.bottom||0)-80));
  return {left,right,top,bottom};
}

/** Fit projected 3D bounds into the actual unobstructed DOM rectangle, not a cropped image. */
export function fitHomeCamera(camera,bounds,width,height,rect,yaw=0,pitch=0) {
  const points=Array.isArray(bounds)?bounds:[];
  if(!points.length)for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z));
  const center=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
  const direction=new THREE.Vector3(.08+Math.sin(yaw),.78+pitch,1).normalize();
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
  const up=new THREE.Vector3().crossVectors(direction,right).normalize();
  camera.aspect=width/height;
  const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const sx=Math.max(.02,(rect.right-rect.left)/width)*tanV*camera.aspect;
  const sy=Math.max(.02,(rect.bottom-rect.top)/height)*tanV;
  let distance=1;
  for(const point of points) {
    const p=point.clone().sub(center);
    distance=Math.max(distance,p.dot(direction)+Math.max(Math.abs(p.dot(right))/sx,Math.abs(p.dot(up))/sy));
  }
  camera.position.copy(center).addScaledVector(direction,distance*1.025);
  camera.lookAt(center);
  camera.setViewOffset(width,height,width/2-(rect.left+rect.right)/2,height/2-(rect.top+rect.bottom)/2,width,height);
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
  return distance;
}
