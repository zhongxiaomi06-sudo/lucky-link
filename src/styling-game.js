import { MATERIALS, materialById, colorFamily } from './materials.js';

// Each commission has multiple solutions. Examples are test fixtures, not required recipes.
export const COMMISSIONS = [
  { id: 'ocean', name: 'Ocean wish', client: 'Mia', brief: 'Blue, airy, a little playful.', tags: ['Ocean', 'Airy', 'Playful'], colors: ['blue', 'neutral'], accent: ['green', 'pink'], reward: 'sea-star', reaction: 'It feels like a day by the sea.', example: ['blue-eye', 'aqua-drop', 'pearl', 'coral-shell', 'clear-quartz', 'cobalt-gem'] },
  { id: 'rose', name: 'Rose letter', client: 'Lily', brief: 'A soft little gift for someone dear.', tags: ['Sweet', 'Soft', 'Elegant'], colors: ['pink', 'purple', 'neutral'], accent: ['red'], reward: 'rose-heart', reaction: 'A little love, to take everywhere.', example: ['rose-prism', 'lilac-heart', 'pearl', 'pink-dice', 'clear-quartz', 'violet-candy'] },
  { id: 'garden', name: 'Garden picnic', client: 'June', brief: 'Fresh greens, sunshine and flowers.', tags: ['Natural', 'Airy', 'Playful'], colors: ['green', 'yellow', 'neutral'], accent: ['blue'], reward: 'garden-jade', reaction: 'You brought a tiny garden with you.', example: ['jade-ring', 'lime-gem', 'daisy', 'pearl', 'sun-orb', 'coral-shell'] },
  { id: 'twins', name: 'Moonlight walk', client: 'Noa', brief: 'Cool sparkle, with a balanced rhythm.', tags: ['Glow', 'Elegant', 'Ocean'], colors: ['blue', 'purple', 'neutral'], accent: ['yellow'], reward: 'moon-pearl', reaction: 'A quiet little constellation.', example: ['cobalt-gem', 'clear-quartz', 'pearl', 'pearl', 'clear-quartz', 'cobalt-gem'], mirror: true },
  { id: 'festival', name: 'Color story', client: 'Bea', brief: 'A joyful mix for a festival afternoon.', tags: ['Playful', 'Bright', 'Sweet'], colors: ['pink', 'blue', 'green', 'yellow', 'red', 'purple', 'orange'], accent: ['neutral'], reward: 'sunset-crystal', reaction: 'This one is a whole celebration.', example: ['cherries', 'pink-dice', 'violet-candy', 'sun-bow', 'blue-star', 'lime-gem'], rainbow: true },
];
const keys = ['free', ...COMMISSIONS.map((l) => l.id)];
const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export const gradeFor = (score) => score >= 90 ? 'S' : score >= 80 ? 'A' : score >= 70 ? 'B' : 'C';

export function affinity(id, tag) {
  const m = materialById.get(id); if (!m) return 0;
  const family = colorFamily(id);
  const crystal = m.category === 'crystal'; const charm = m.category === 'symbol';
  switch (tag) {
    case 'Ocean': return family === 'blue' ? 1 : family === 'neutral' ? .75 : family === 'green' ? .65 : .12;
    case 'Airy': return crystal ? 1 : ['shell', 'jade', 'flower'].includes(m.kind) ? .9 : .65;
    case 'Playful': return charm ? 1 : ['heart', 'lavender', 'lime'].includes(m.kind) ? .85 : .55;
    case 'Sweet': return ['pink', 'purple', 'red'].includes(family) ? 1 : family === 'neutral' ? .85 : .55;
    case 'Soft': return ['pink', 'purple', 'neutral'].includes(family) ? 1 : .45;
    case 'Elegant': return crystal || ['moon', 'jade', 'shell', 'lavender', 'heart'].includes(m.kind) ? 1 : .65;
    case 'Natural': return ['green', 'yellow', 'neutral'].includes(family) || m.kind === 'flower' ? 1 : .35;
    case 'Glow': return crystal || ['moon', 'star', 'bell'].includes(m.kind) ? 1 : .65;
    case 'Bright': return family === 'neutral' ? .5 : 1;
    default: return 0;
  }
}

export function assess(levelId, ids) {
  const level = COMMISSIONS.find((l) => l.id === levelId);
  const valid = Boolean(level && Array.isArray(ids) && ids.length >= 3 && ids.length <= 14 && ids.every((id) => materialById.has(id)));
  const pieces = Array.isArray(ids) ? ids.filter((id) => materialById.has(id)).slice(0, 14) : [];
  const n = pieces.length;
  const styles = (level?.tags ?? []).map((tag) => ({ tag, value: n ? Math.round(pieces.reduce((sum, id) => sum + affinity(id, tag), 0) / n * 100) : 0 }));
  const theme = Math.round(styles.reduce((sum, s) => sum + s.value, 0) / 300 * 45);
  const colorFit = n && level ? pieces.reduce((sum, id) => sum + (level.colors.includes(colorFamily(id)) ? 1 : level.accent.includes(colorFamily(id)) ? .7 : .1), 0) / n : 0;
  const colorVariety = new Set(pieces.map(colorFamily)).size;
  const palette = Math.round(30 * colorFit * (level?.rainbow ? Math.min(1, colorVariety / 4) : 1));
  const maxRepeat = Math.max(0, ...pieces.map((id) => pieces.filter((p) => p === id).length));
  const diversity = n ? Math.min(1, new Set(pieces).size / Math.min(5, n)) : 0;
  const rhythm = level?.mirror && n ? pieces.filter((id, i) => colorFamily(id) === colorFamily(pieces.at(-i - 1))).length / n : diversity;
  const repeatPenalty = n ? clamp(1 - Math.max(0, maxRepeat / n - .4) * 1.5) : 0;
  const balance = Math.round(25 * (.45 * diversity + .35 * rhythm + .2 * Math.min(1, n / 6)) * repeatPenalty);
  const parts = [{ label: 'Theme fit', score: theme, max: 45 }, { label: 'Color harmony', score: palette, max: 30 }, { label: 'Balance', score: balance, max: 25 }];
  const total = valid ? clamp(theme + palette + balance, 0, 100) : 0;
  const grade = gradeFor(total); const stars = total >= 90 ? 3 : total >= 80 ? 2 : total >= 70 ? 1 : 0;
  const weakest = [...parts].sort((a, b) => a.score / a.max - b.score / b.max)[0];
  const tip = !valid ? 'Choose 3–14 pieces to show your design.' : weakest.label === 'Theme fit' ? `Try a piece with more ${styles.toSorted((a, b) => a.value - b.value)[0].tag.toLowerCase()} character.` : weakest.label === 'Color harmony' ? level.rainbow ? 'Try four different color families.' : 'Bring the colors closer to the mood of the letter.' : 'Try fewer repeats and a more balanced order.';
  return { valid, passed: valid && total >= 70, total, grade, stars, parts, styles, tip };
}

export function normalizeProgress(value) {
  const data = value && typeof value === 'object' ? value : {};
  const completed = [];
  for (const level of COMMISSIONS) { if (Array.isArray(data.completed) && data.completed.includes(level.id)) completed.push(level.id); else break; }
  const claimed = completed.filter((id) => Array.isArray(data.claimed) && data.claimed.includes(id));
  const allowed = new Set(MATERIALS.filter((m) => !m.reward || claimed.includes(m.reward)).map((m) => m.id));
  const clean = (ids, max) => Array.isArray(ids) ? ids.filter((id) => allowed.has(id)).slice(0, max) : [];
  const drafts = Object.fromEntries(keys.map((key) => [key, clean(data.drafts?.[key], 14)]));
  const boxes = Object.fromEntries(keys.map((key) => [key, clean(data.boxes?.[key], 60)]));
  const best = Object.fromEntries(COMMISSIONS.filter((l) => Number.isFinite(data.best?.[l.id])).map((l) => [l.id, Math.round(clamp(data.best[l.id], 0, 100))]));
  const accessible = COMMISSIONS.slice(0, Math.min(5, completed.length + 1));
  return { version: 2, mode: data.mode === 'free' ? 'free' : 'challenge', levelId: accessible.some((l) => l.id === data.levelId) ? data.levelId : 'ocean', completed, claimed, best, drafts, boxes };
}
export const availableMaterials = (state) => MATERIALS.filter((m) => !m.reward || state.claimed.includes(m.reward));
export function deliver(state) {
  const index = COMMISSIONS.findIndex((l) => l.id === state.levelId);
  if (state.mode !== 'challenge' || index < 0 || index > state.completed.length) return null;
  const result = assess(state.levelId, state.drafts[state.levelId]);
  if (!result.valid) return null;
  state.best[state.levelId] = Math.max(state.best[state.levelId] || 0, result.total);
  const first = result.passed && !state.claimed.includes(state.levelId);
  if (result.passed && !state.completed.includes(state.levelId)) state.completed.push(state.levelId);
  if (first) state.claimed.push(state.levelId);
  return { ...result, first, xp: first ? 40 : 0, reward: first ? COMMISSIONS[index].reward : null };
}

export function transfer(draft, source, target, isValidId = id => materialById.has(id)) {
  if (!draft || !['catalog', 'cord', 'box'].includes(source?.kind) || !['cord', 'box'].includes(target?.kind)) return null;
  const ids = [...draft.ids]; const box = [...draft.box];
  const list = source.kind === 'cord' ? ids : box;
  if (source.kind !== 'catalog' && (!Number.isInteger(source.index) || source.index < 0 || source.index >= list.length)) return null;
  const id = source.kind === 'catalog' ? source.id : list[source.index];
  if (!isValidId(id)) return null;
  if (target.kind === 'box' && (source.kind !== 'cord' || box.length >= 60)) return null;
  if (target.kind === 'cord' && (!Number.isInteger(target.index) || target.index < 0 || target.index > ids.length || (ids.length >= 14 && source.kind !== 'cord'))) return null;
  if (source.kind !== 'catalog') list.splice(source.index, 1);
  if (target.kind === 'box') box.push(id);
  else ids.splice(target.index - (source.kind === 'cord' && source.index < target.index ? 1 : 0), 0, id);
  return { ids, box };
}
export function history() {
  const map = new Map();
  return {
    record(key, draft) { const list = map.get(key) ?? []; list.push({ ids: [...draft.ids], box: [...draft.box],...(typeof draft.cordId==='string'?{cordId:draft.cordId}:{}) }); if (list.length > 50) list.shift(); map.set(key, list); },
    undo(key) { return map.get(key)?.pop(); },
    has(key) { return Boolean(map.get(key)?.length); },
  };
}
