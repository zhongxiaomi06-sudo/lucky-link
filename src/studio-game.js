import { materialById, colorFamily } from './materials.js';

export const LEVELS = [
  { id: 'ocean', name: 'Ocean wish', count: 6, brief: '6 pieces · 2 blue · 1 shell' },
  { id: 'rose', name: 'Rose letter', count: 7, brief: '7 pieces · 2 pink · 2 pearls · a lilac heart' },
  { id: 'garden', name: 'Garden path', count: 8, brief: '8 pieces · 3 green · jade first · sun last' },
  { id: 'twins', name: 'Twin stars', count: 6, brief: '6 pieces · 2 stars · mirror the order' },
  { id: 'festival', name: 'Color story', count: 9, brief: '9 pieces · 4 colors · 3 shapes · 2 charms' },
];
const countWhere = (ids, predicate) => ids.filter(predicate).length;

export function evaluateLevel(levelId, ids) {
  const level = LEVELS.find((l) => l.id === levelId);
  if (!level || !Array.isArray(ids)) return { passed: false, checks: [], missing: 'Choose a challenge' };
  const valid = ids.every((id) => materialById.has(id));
  const checks = [];
  const add = (label, passed) => checks.push({ label, passed });
  const amount = (label, value, target, exact = false) => add(`${label}: ${value}/${target}${exact ? '' : '+'}`, exact ? value === target : value >= target);
  amount('Pieces', ids.length, level.count, true);
  const family = (name) => countWhere(ids, (id) => colorFamily(id) === name);
  const named = (id) => countWhere(ids, (value) => value === id);
  if (levelId === 'ocean') { amount('Blue', family('blue'), 2); amount('Shell', named('coral-shell'), 1, true); }
  if (levelId === 'rose') { amount('Pink', family('pink'), 2); amount('Pearls', named('pearl'), 2); amount('Lilac heart', named('lilac-heart'), 1); }
  if (levelId === 'garden') {
    amount('Green', family('green'), 3); add('Jade ring first', ids[0] === 'jade-ring'); add('Sun orb last', ids.length > 0 && ids.at(-1) === 'sun-orb');
  }
  if (levelId === 'twins') { amount('Blue stars', named('blue-star'), 2); add('Same order from both ends', ids.length === 6 && ids.every((id, i) => id === ids.at(-1 - i))); }
  if (levelId === 'festival') {
    amount('Colors', new Set(ids.map(colorFamily).filter(Boolean)).size, 4);
    amount('Shapes', new Set(ids.map((id) => materialById.get(id)?.kind).filter(Boolean)).size, 3);
    amount('Charms', countWhere(ids, (id) => materialById.get(id)?.category === 'symbol'), 2);
    add('At most 2 of each piece', ids.every((id) => named(id) <= 2));
  }
  return { passed: valid && checks.every((check) => check.passed), checks, missing: !valid ? 'Unknown piece' : checks.find((check) => !check.passed)?.label ?? '' };
}

export const saveKey = (state) => state.mode === 'free' ? 'free' : state.levelId;
export function createEditHistory() {
  const histories = new Map();
  return {
    record(key, ids) { const list = histories.get(key) ?? []; list.push([...ids]); if (list.length > 50) list.shift(); histories.set(key, list); },
    undo(key) { return histories.get(key)?.pop(); },
    has(key) { return Boolean(histories.get(key)?.length); },
  };
}
export function normalizeSave(value) {
  const data = value && typeof value === 'object' ? value : {};
  const completed = [];
  for (const level of LEVELS) { if (Array.isArray(data.completed) && data.completed.includes(level.id)) completed.push(level.id); else break; }
  const accessible = LEVELS.slice(0, Math.min(LEVELS.length, completed.length + 1));
  const levelId = accessible.some((l) => l.id === data.levelId) ? data.levelId : 'ocean';
  const drafts = {};
  for (const key of ['free', ...LEVELS.map((l) => l.id)]) {
    drafts[key] = Array.isArray(data.drafts?.[key]) ? data.drafts[key].filter((id) => materialById.has(id)).slice(0, 14) : [];
  }
  return { version: 1, mode: data.mode === 'free' ? 'free' : 'challenge', levelId, completed, drafts };
}
export function completeLevel(state, id) {
  const index = LEVELS.findIndex((l) => l.id === id);
  if (index < 0 || index > state.completed.length || !evaluateLevel(id, state.drafts[id]).passed) return false;
  if (!state.completed.includes(id)) state.completed.push(id);
  return true;
}
export function readStored(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
export function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
