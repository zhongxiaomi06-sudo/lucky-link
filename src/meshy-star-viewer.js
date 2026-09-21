import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function mountMeshyStar(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  camera.position.set(0, 0.05, 5.4);
  scene.add(new THREE.HemisphereLight(0xf8fbff, 0x8aa3b7, 2.5));
  const key = new THREE.DirectionalLight(0xffffff, 4.5); key.position.set(-3, 5, 6); scene.add(key);
  const edge = new THREE.DirectionalLight(0x7fcdf2, 3); edge.position.set(4, 1, -2); scene.add(edge);
  const group = new THREE.Group(); scene.add(group);
  let frame = 0; let disposed = false; let loaded = false;

  function resize() {
    const width = Math.max(1, canvas.clientWidth); const height = Math.max(1, canvas.clientHeight);
    if (canvas.width !== Math.round(width * renderer.getPixelRatio()) || canvas.height !== Math.round(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    }
  }
  function draw(time = 0) {
    if (disposed) return;
    resize();
    if (loaded && !reducedMotion) { group.rotation.y = Math.sin(time * 0.00042) * 0.22; group.rotation.z = -0.07 + Math.sin(time * 0.0003) * 0.025; }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  new GLTFLoader().load('/assets/models/ice-blue-crystal-star-charm-lowpoly.glb', (gltf) => {
    if (disposed) return;
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model); const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
    const scale = 2.55 / Math.max(size.x, size.y, size.z); model.position.sub(center); model.scale.setScalar(scale);
    model.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = false; node.receiveShadow = false;
      if (!node.material) node.material = new THREE.MeshPhysicalMaterial({ color: 0xbce6fb, roughness: 0.08, metalness: 0.02, transmission: 0.72, thickness: 0.7, ior: 1.48 });
      else { node.material = node.material.clone(); node.material.roughness = Math.min(0.18, node.material.roughness ?? 0.12); node.material.envMapIntensity = 1.4; }
    });
    group.add(model); loaded = true; canvas.dataset.loaded = 'true';
  }, undefined, () => { canvas.dataset.loaded = 'failed'; });
  draw();
  return { destroy() { disposed = true; cancelAnimationFrame(frame); renderer.dispose(); scene.traverse((node) => { node.geometry?.dispose?.(); if (Array.isArray(node.material)) node.material.forEach((item) => item.dispose?.()); else node.material?.dispose?.(); }); } };
}
