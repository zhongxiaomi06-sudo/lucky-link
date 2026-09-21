import { describe, expect, it } from 'vitest';
import { COMMISSIONS, assess, deliver, normalizeProgress, transfer, history, availableMaterials, gradeFor } from './styling-game.js';

const ocean = ['blue-eye', 'aqua-drop', 'pearl', 'coral-shell', 'clear-quartz', 'cobalt-gem'];
describe('styling commissions', () => {
  it('has five unique commissions and reachable rewards', () => {
    expect(COMMISSIONS).toHaveLength(5);
    expect(new Set(COMMISSIONS.map((l) => l.reward)).size).toBe(5);
    const state = normalizeProgress(null);
    for (const level of COMMISSIONS) {
      state.levelId = level.id;
      state.drafts[level.id] = [...level.example];
      expect(assess(level.id, level.example).passed).toBe(true);
      expect(assess(level.id, [...level.example].reverse()).passed).toBe(true);
      expect(deliver(state).first).toBe(true);
    }
    expect(state.claimed).toHaveLength(5);
    expect(availableMaterials(state)).toHaveLength(29);
  });
  it('scores exactly the visible three parts and preserves multiple solutions', () => {
    for (const ids of [ocean, [...ocean, 'aqua-heart']]) {
      const result = assess('ocean', ids);
      expect(result.passed).toBe(true);
      expect(result.total).toBe(result.parts.reduce((sum, p) => sum + p.score, 0));
    }
  });
  it('rejects unknown, undersized, oversized and inappropriate designs', () => {
    for (const ids of [[], ['pearl'], ['fake', ...ocean], Array(15).fill('pearl'), Array(8).fill('cherries')]) expect(assess('ocean', ids).passed).toBe(false);
  });
  it('does not award more for stacking one item', () => {
    expect(assess('ocean', Array(14).fill('blue-eye')).total).toBeLessThan(assess('ocean', ocean).total);
  });
  it('grades threshold scores without random variation', () => {
    expect([69, 70, 79, 80, 89, 90, 100].map(gradeFor)).toEqual(['C', 'B', 'B', 'A', 'A', 'S', 'S']);
    expect(assess('ocean', ocean)).toEqual(assess('ocean', ocean));
  });
  it('awards first clear once, preserves best and never skips locked levels', () => {
    const state = normalizeProgress(null);
    state.drafts.ocean = ocean;
    expect(deliver(state).first).toBe(true);
    const score = state.best.ocean;
    expect(deliver(state).first).toBe(false);
    expect(state.claimed).toEqual(['ocean']);
    expect(state.best.ocean).toBe(score);
    state.levelId = 'festival'; state.drafts.festival = COMMISSIONS[4].example;
    expect(deliver(state)).toBe(null);
  });
  it('migrates drafts and progress without inventing historical scores', () => {
    const state = normalizeProgress({ mode: 'free', completed: ['ocean', 'rose'], drafts: { free: ['pearl', 'unknown'] } });
    expect(state.drafts.free).toEqual(['pearl']);
    expect(state.completed).toEqual(['ocean', 'rose']);
    expect(state.best).toEqual({});
    expect(state.claimed).toEqual([]);
  });
  it('sanitizes corrupt saves, invalid rewards and nonfinite scores', () => {
    const state = normalizeProgress({ mode: 'bad', levelId: 'festival', completed: ['festival'], claimed: ['festival'], best: { ocean: Infinity }, boxes: { free: Array(80).fill('pearl') } });
    expect(state.levelId).toBe('ocean'); expect(state.completed).toEqual([]); expect(state.claimed).toEqual([]);
    expect(state.best).toEqual({}); expect(state.boxes.free).toHaveLength(60);
    expect(availableMaterials(state)).toHaveLength(24);
  });
});
describe('atomic bead transfers', () => {
  const draft = { ids: ['pearl', 'blue-eye', 'coral-shell'], box: ['clear-quartz'] };
  it('takes from catalogue without mutating it', () => {
    expect(transfer(draft, { kind: 'catalog', id: 'aqua-drop' }, { kind: 'cord', index: 1 })?.ids).toEqual(['pearl', 'aqua-drop', 'blue-eye', 'coral-shell']);
    expect(draft.ids).toHaveLength(3);
  });
  it('returns a threaded bead to the box and can take it back', () => {
    const moved = transfer(draft, { kind: 'cord', index: 1 }, { kind: 'box' });
    expect(moved).toEqual({ ids: ['pearl', 'coral-shell'], box: ['clear-quartz', 'blue-eye'] });
    expect(transfer(moved, { kind: 'box', index: 1 }, { kind: 'cord', index: 1 })).toEqual(draft);
  });
  it('reorders at full capacity and rejects additional beads', () => {
    const full = { ids: Array(14).fill('pearl'), box: ['blue-eye'] };
    expect(transfer(full, { kind: 'box', index: 0 }, { kind: 'cord', index: 0 })).toBe(null);
    expect(transfer(full, { kind: 'cord', index: 1 }, { kind: 'cord', index: 5 })?.ids).toHaveLength(14);
    expect(full.box).toEqual(['blue-eye']);
  });
  it('invalid source, target, indices and full box do not partially mutate', () => {
    expect(transfer(draft, { kind: 'cord', index: -1 }, { kind: 'box' })).toBe(null);
    expect(transfer(draft, { kind: 'catalog', id: 'bad' }, { kind: 'cord', index: 0 })).toBe(null);
    expect(transfer(draft, { kind: 'cord', index: 1 }, { kind: 'outside' })).toBe(null);
    expect(transfer({ ...draft, box: Array(60).fill('pearl') }, { kind: 'cord', index: 1 }, { kind: 'box' })).toBe(null);
    expect(draft.ids).toEqual(['pearl', 'blue-eye', 'coral-shell']);
  });
  it('undo snapshots both sides, isolates drafts and caps history', () => {
    const h = history(); h.record('ocean', draft);
    const changed = { ids: [...draft.ids], box: [...draft.box] }; changed.ids.pop();
    expect(h.undo('free')).toBe(undefined); expect(h.undo('ocean')).toEqual(draft);
    for (let i = 0; i < 55; i++) h.record('free', { ids: ['pearl'], box: [] });
    let count = 0; while (h.undo('free')) count++;
    expect(count).toBe(50);
  });
});
