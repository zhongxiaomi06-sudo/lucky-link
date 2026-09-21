import { describe, it, expect } from 'vitest';
import { LEVELS, evaluateLevel, normalizeSave, completeLevel, saveKey, createEditHistory } from './studio-game.js';
import { safeLink, normalizeCommerce, createOrderText } from './commerce.js';

const solutions = [
  ['cobalt-gem', 'cobalt-orb', 'coral-shell', 'pearl', 'pearl', 'clear-quartz'],
  ['rose-prism', 'pink-dice', 'lilac-heart', 'pearl', 'pearl', 'clear-quartz', 'sun-orb'],
  ['jade-ring', 'lime-gem', 'jade-ring', 'pearl', 'aqua-drop', 'rose-prism', 'clear-quartz', 'sun-orb'],
  ['blue-star', 'pearl', 'rose-prism', 'rose-prism', 'pearl', 'blue-star'],
  ['cobalt-gem', 'rose-prism', 'lime-gem', 'sun-orb', 'coral-shell', 'blue-star', 'pearl', 'lilac-heart', 'amber-cube'],
];
describe('studio challenges', () => {
  it('undoes complete edit snapshots separately for each draft', () => {
    const history = createEditHistory(); const before = ['pearl', 'rose-prism'];
    history.record('free', before); before.reverse();
    history.record('ocean', ['cobalt-gem']);
    expect(history.undo('free')).toEqual(['pearl', 'rose-prism']);
    expect(history.has('free')).toBe(false); expect(history.has('ocean')).toBe(true);
    expect(history.undo('ocean')).toEqual(['cobalt-gem']);
  });
  LEVELS.forEach((level, index) => {
    it(`${level.id} accepts its valid design and rejects incomplete/unknown designs`, () => {
      expect(evaluateLevel(level.id, solutions[index]).passed).toBe(true);
      expect(evaluateLevel(level.id, solutions[index].slice(1)).passed).toBe(false);
      expect(evaluateLevel(level.id, solutions[index].map(() => 'missing')).passed).toBe(false);
    });
  });
  it('checks color, shell, order, symmetry and diversity independently of count', () => {
    expect(evaluateLevel('ocean', Array(6).fill('pearl')).passed).toBe(false);
    expect(evaluateLevel('garden', [...solutions[2]].reverse()).passed).toBe(false);
    expect(evaluateLevel('twins', ['blue-star', 'rose-prism', 'pearl', 'rose-prism', 'pearl', 'blue-star']).passed).toBe(false);
    expect(evaluateLevel('festival', Array(9).fill('blue-star')).passed).toBe(false);
  });
  it('unlocks only a genuinely completed accessible challenge, idempotently', () => {
    const state = normalizeSave(null);
    state.drafts.ocean = solutions[0];
    expect(completeLevel(state, 'festival')).toBe(false);
    expect(completeLevel(state, 'ocean')).toBe(true);
    expect(completeLevel(state, 'ocean')).toBe(true);
    expect(state.completed).toEqual(['ocean']);
  });
  it('sanitizes damaged storage and isolates drafts', () => {
    const state = normalizeSave({ mode: 'unknown', completed: ['fake'], drafts: { free: ['pearl', 'missing', ...Array(20).fill('pearl')], ocean: ['blue-star'] } });
    expect(state.mode).toBe('challenge');
    expect(state.completed).toEqual([]);
    expect(state.drafts.free).toHaveLength(14);
    expect(state.drafts.ocean).toEqual(['blue-star']);
    expect(saveKey({ mode: 'free', levelId: 'ocean' })).toBe('free');
  });
});
describe('commerce boundary', () => {
  it('accepts HTTPS only without credentials and rejects unsafe schemes', () => {
    expect(safeLink('https://shop.example.com/custom?a=1')).toContain('https://shop.example.com/');
    for (const url of ['', 'javascript:alert(1)', 'data:text/html,x', 'http://shop.example.com', 'https://user:pass@shop.example.com', '//shop.example.com']) expect(safeLink(url)).toBe('');
  });
  it('normalizes hostile or malformed local configuration', () => {
    expect(normalizeCommerce({ shopUrl: 'javascript:x', materialLinks: { pearl: 'https://shop.example.com/p', bad: 'https://shop.example.com/' } }).materialLinks).toEqual({ pearl: 'https://shop.example.com/p' });
    expect(normalizeCommerce(null).shopUrl).toBe('');
  });
  it('exports actual ordered materials, amounts and custom choices without claiming an order', () => {
    const text = createOrderText(['pearl', 'rose-prism', 'pearl'], { name: 'Ocean', cord: 'slate', note: 'Gift' });
    expect(text).toContain('1. Cloud pearl'); expect(text).toContain('2. Rose prism'); expect(text).toContain('3. Cloud pearl');
    expect(text).toContain('Cloud pearl × 2'); expect(text).toContain('Gift'); expect(text).toContain('Not an order');
  });
});
