import { describe, expect, it } from 'vitest';
import { tabletopLayout, loopPoint, beadPoints, cordTarget, spriteFrame } from './tabletop-layout.js';
import { MATERIALS } from './materials.js';
import { pointerIntent, previewPieces } from './tabletop-placement.js';

describe('V12 placement and settled loop', () => {
  const loop = tabletopLayout(390, 634).loop;
  it('narrows the top of the loop and keeps a continuous closed bottom', () => {
    const upper = loopPoint(loop, .15), lower = loopPoint(loop, .35);
    expect(Math.abs(upper.x - loop.x)).toBeLessThan(Math.abs(lower.x - loop.x));
    expect(loopPoint(loop, 0).y).toBeCloseTo(loopPoint(loop, 1).y, 5);
  });
  it('settles a few beads together at the bottom rather than distributing them all around', () => {
    const three = beadPoints(loop, ['pearl', 'rose-prism', 'aqua-drop']);
    expect(three.every(p => p.y > loop.y)).toBe(true);
    expect(three.at(-1)!.t - three[0].t).toBeLessThan(.35);
    expect(new Set(three.map(p => Math.round(p.size))).size).toBeGreaterThan(1);
  });
  it('accepts forgiving nearby drops, but not distant empty space', () => {
    const p = loopPoint(loop, .5);
    expect(cordTarget(loop, { x:p.x, y:p.y+43 }, ['pearl'])).not.toBeNull();
    expect(cordTarget(loop, { x:p.x, y:p.y+80 }, ['pearl'])).toBeNull();
  });
  it('never changes a held new bead into editing the existing bead underneath', () => {
    expect(pointerIntent(true, 'cord')).toBe('place');
    expect(pointerIntent(false, 'cord')).toBe('pick-cord');
    expect(pointerIntent(true, 'catalog')).toBe('browse');
  });
  it('previews insertion and reordering without modifying the actual sequence', () => {
    const ids = ['pearl', 'rose-prism', 'aqua-drop'];
    const shown = previewPieces(ids, { kind:'catalog', id:'daisy' }, 1);
    expect(shown.map(p => p.id)).toEqual(['pearl','daisy','rose-prism','aqua-drop']);
    expect(shown.filter(p => p.held)).toHaveLength(1);
    expect(ids).toEqual(['pearl','rose-prism','aqua-drop']);
    const reorder = previewPieces(ids, {kind:'cord',id:'pearl',index:0},3);
    expect(reorder.map(p => p.id)).toEqual(['rose-prism','aqua-drop','pearl']);
    expect(reorder.map(p => p.originalIndex)).toEqual([1,2,0]);
    expect(previewPieces(Array(14).fill('pearl'),{kind:'catalog',id:'daisy'},4)).toHaveLength(14);
  });
});

describe('2D tabletop geometry', () => {
  for (const [width, height] of [[390, 634], [320, 378], [402, 684], [844, 236], [568, 190], [800, 790]]) {
    it(`keeps a real phone, closed loop and right box separated at ${width}×${height}`, () => {
      const l = tabletopLayout(width, height);
      expect(l.phone.x).toBeGreaterThanOrEqual(0);
      expect(l.phone.y + l.phone.h).toBeLessThanOrEqual(height);
      expect(l.tray.x + l.tray.w).toBeLessThanOrEqual(width);
      expect(l.tray.y).toBeGreaterThanOrEqual(44);
      expect(l.tray.y + l.tray.h + 56).toBeLessThanOrEqual(height);
      expect(l.tray.w / 2).toBeGreaterThanOrEqual(44);
      expect(loopPoint(l.loop, 0).x).toBeCloseTo(loopPoint(l.loop, 1).x, 5);
      for (const p of beadPoints(l.loop, 14)) {
        expect(p.x - 17).toBeGreaterThanOrEqual(0);
        expect(p.y - 17).toBeGreaterThanOrEqual(0);
        expect(p.y + 17).toBeLessThanOrEqual(height);
        expect(p.x + 17).toBeLessThan(l.tray.x);
      }
      expect(cordTarget(l.loop, loopPoint(l.loop, .4), 6)).not.toBeNull();
      expect(cordTarget(l.loop, { x: l.tray.x + 20, y: l.tray.y + 20 }, 6)).toBeNull();
      expect(beadPoints(l.loop, 14)).toHaveLength(14);
    });
  }
  it('maps every existing material to the correct base silhouette', () => {
    expect(MATERIALS).toHaveLength(29);
    for (const m of MATERIALS) expect(spriteFrame(m.id).crop.every(Number.isFinite)).toBe(true);
    expect(spriteFrame('sea-star').base).toBe('blue-star');
    expect(spriteFrame('coral-shell').base).toBe('coral-shell');
    expect(spriteFrame('moon-pearl').base).toBe('pearl');
  });
});
