import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createRewardStudio } from './reward-studio.js';

const paperOf = (studio: ReturnType<typeof createRewardStudio>) =>
  studio.group.children.find(object => object instanceof THREE.Mesh) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

describe('approved V43 reward studio', () => {
  it('contains only the opaque receiving paper and the three approved lights', () => {
    const studio = createRewardStudio();
    const paper = paperOf(studio);
    expect(studio.group.children).toHaveLength(4);
    expect(studio.group.children.map(object => object.type).sort()).toEqual([
      'DirectionalLight', 'DirectionalLight', 'HemisphereLight', 'Mesh',
    ]);
    expect(paper.name).toBe('Visible refractable seamless studio');
    expect(paper.receiveShadow).toBe(true);
    expect(paper.castShadow).toBe(false);
    expect(paper.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(paper.material.transparent).toBe(false);
    expect(paper.material.opacity).toBe(1);
    expect(paper.material.depthWrite).toBe(true);
    expect(paper.material.colorWrite).toBe(true);
    expect(paper.material.roughness).toBe(1);
    expect(paper.material.metalness).toBe(0);
    expect(paper.material.envMapIntensity).toBe(.15);
    studio.dispose();
  });

  it('builds a continuous floor-to-wall surface with finite UVs and outward normals', () => {
    const studio = createRewardStudio();
    const geometry = paperOf(studio).geometry;
    const position = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const normal = geometry.getAttribute('normal');
    expect(position.count).toBe(62);
    expect(uv.count).toBe(position.count);
    expect(normal.count).toBe(position.count);
    expect(geometry.index?.count).toBe(180);
    for (const attribute of [position, uv, normal]) {
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    }
    for (let index = 0; index < normal.count; index++) {
      expect(Math.hypot(normal.getX(index), normal.getY(index), normal.getZ(index))).toBeCloseTo(1, 6);
    }
    expect(normal.getY(0)).toBeCloseTo(1, 6);
    expect(normal.getZ(normal.count - 1)).toBeCloseTo(1, 6);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.min.toArray()).toEqual([-14, expect.closeTo(-2.15, 5), expect.closeTo(-2.05, 5)]);
    expect(geometry.boundingBox!.max.toArray()).toEqual([14, 12, 5]);
    // The UVs intentionally extend outside 0–1 and clamp at the sweep edges.
    expect(uv.getX(0)).toBeCloseTo(-14 / 6.5 + .5, 6);
    expect(uv.getX(1)).toBeCloseTo(14 / 6.5 + .5, 6);
    studio.dispose();
  });

  it('feeds the visible paper shader the approved neutral 256px studio sweep', () => {
    const studio = createRewardStudio();
    const material = paperOf(studio).material;
    const texture = material.map as THREE.DataTexture;
    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture.image.width).toBe(256);
    expect(texture.image.height).toBe(256);
    expect(texture.image.data.length).toBe(256 * 256 * 4);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    expect(texture.minFilter).toBe(THREE.LinearFilter);
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.version).toBeGreaterThan(0);
    const reds: number[] = [];
    for (let index = 0; index < texture.image.data.length; index += 4) {
      const pixels = texture.image.data;
      reds.push(pixels[index]);
      expect(pixels[index + 1] - pixels[index]).toBe(3);
      expect(pixels[index + 2] - pixels[index]).toBe(4);
      expect(pixels[index + 3]).toBe(255);
    }
    expect(Math.min(...reds)).toBe(145);
    // The positive Gaussian tail is truncated by Uint8Array, just as in the preview.
    expect(Math.max(...reds)).toBe(197);
    expect(material.color.getHex()).toBe(0xffffff);
    expect(material.toneMapped).toBe(true);
    expect(studio.resources.textures.has(texture)).toBe(true);
    studio.dispose();
  });

  it('keeps the approved neutral key, cool fill and VSM shadow parameters', () => {
    const studio = createRewardStudio();
    const hemisphere = studio.group.children.find(object => object instanceof THREE.HemisphereLight) as THREE.HemisphereLight;
    expect(hemisphere.intensity).toBe(.65);
    expect(hemisphere.color.getHex()).toBe(0xf8faf5);
    expect(hemisphere.groundColor.getHex()).toBe(0xa7bfc8);
    expect(studio.key.intensity).toBe(.8);
    expect(studio.key.color.getHex()).toBe(0xfffaf2);
    expect(studio.key.position.toArray()).toEqual([-3.7, 5.2, 6.5]);
    expect(studio.key.castShadow).toBe(true);
    expect(studio.key.shadow.mapSize.toArray()).toEqual([1024, 1024]);
    expect(studio.key.shadow).toMatchObject({normalBias: .018, radius: 7, blurSamples: 8, intensity: .35});
    expect(studio.key.shadow.camera).toMatchObject({left: -5, right: 5, top: 6, bottom: -5, near: .1, far: 25});
    expect(studio.fill.intensity).toBe(.2);
    expect(studio.fill.color.getHex()).toBe(0xc7e3f1);
    expect(studio.fill.position.toArray()).toEqual([4, -.3, 4]);
    expect(studio.fill.castShadow).toBe(false);
    studio.dispose();
  });

  it('releases owned resources once without touching other objects in the scene', () => {
    const studio = createRewardStudio();
    const scene = new THREE.Scene();
    const unrelated = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    scene.add(studio.group, unrelated);
    const unrelatedGeometry = vi.spyOn(unrelated.geometry, 'dispose');
    const unrelatedMaterial = vi.spyOn(unrelated.material, 'dispose');
    const geometrySpies = [...studio.resources.geometries].map(resource => vi.spyOn(resource, 'dispose'));
    const materialSpies = [...studio.resources.materials].map(resource => vi.spyOn(resource, 'dispose'));
    const textureSpies = [...studio.resources.textures].map(resource => vi.spyOn(resource, 'dispose'));
    // Shadow render targets are created later by the renderer, but owned here.
    studio.key.shadow.map = new THREE.WebGLRenderTarget(2, 2);
    studio.key.shadow.mapPass = new THREE.WebGLRenderTarget(2, 2);
    const shadowMap = vi.spyOn(studio.key.shadow.map, 'dispose');
    const shadowPass = vi.spyOn(studio.key.shadow.mapPass, 'dispose');
    studio.dispose();
    studio.dispose();
    [...geometrySpies, ...materialSpies, ...textureSpies, shadowMap, shadowPass].forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    expect(unrelatedGeometry).not.toHaveBeenCalled();
    expect(unrelatedMaterial).not.toHaveBeenCalled();
    expect(scene.children).toEqual([unrelated]);
    expect(studio.group.children).toHaveLength(0);
    unrelated.geometry.dispose();unrelated.material.dispose();
  });
});
