import { COMMISSIONS, assess, availableMaterials } from './styling-game.js';
import { materialById } from './materials.js';
const $ = (s) => document.querySelector(s);
const node = (tag, value, cls) => { const el = document.createElement(tag); el.textContent = value; if (cls) el.className = cls; return el; };

export function createStylingUI({catalog=materialById,getAvailable=availableMaterials}={}) {
  const lookup=catalog;
  function rules(game, ids) {
    const result = assess(game.levelId, ids);
    $('[data-requirements]').replaceChildren(...(game.mode === 'free'
      ? [node('li', '3–14 pieces · No score, just your colors.'), node('li', 'Pick a bead, then tap the cord. Return pieces to the box to try again.')]
      : [node('li', '3–14 pieces · 70 points to complete the letter'), ...result.parts.map((p) => node('li', `${p.label} · ${p.score} / ${p.max}`)), node('li', 'B 70+ · A 80+ · S 90+'), node('li', 'Style and colors are averaged. More repeats do not mean more points.')]));
    return result;
  }
  function render(game, ids) {
    const level = COMMISSIONS.find((l) => l.id === game.levelId); const free = game.mode === 'free';
    $('[data-action="score"]').hidden=free;
    const result = rules(game, ids);
    $('[data-studio-level]').textContent = `Studio Lv. ${1 + Math.floor(game.claimed.length / 2)} · ${game.claimed.length * 40} XP`;
    $('[data-client-seal]').textContent = free ? 'L' : level.client[0];
    $('[data-level-number]').textContent = free ? 'YOUR STUDIO' : `${COMMISSIONS.indexOf(level) + 1} / 5 · For ${level.client}`;
    $('[data-level-name]').textContent = free ? 'Free DIY' : level.name;
    $('[data-letter-title]').textContent = free ? 'A little you' : level.name;
    $('[data-action="levels"]').title = free ? 'Free DIY · Letters & rules' : `${level.name} · Letters & rules`;
    $('[data-level-brief]').textContent = free ? 'Your colors. Your little lucky.' : level.brief;
    $('[data-style-tags]').replaceChildren(...(free ? [] : result.styles.map((s) => { const tag = node('span', s.tag); tag.style.setProperty('--fill', `${s.value}%`); tag.title = `${s.tag}: ${s.value}%`; return tag; })));
    $('[data-limit]').textContent = '14';
    $('[data-lab-shell]').dataset.challengePassed = String(result.passed);
    $('[data-lab-shell]').dataset.score = String(result.total);
    $('[data-live-stars]').textContent = free ? '✧' : '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
    $('[data-live-caption]').textContent = !ids.length ? 'Pick a bead from the box' : ids.length < 3 ? `${3 - ids.length} more to show your design` : free ? 'Ready when you are' : `${result.total} points · ${result.passed ? 'Ready for delivery' : 'Keep trying your colors'}`;
    const reward = lookup.get(level.reward);
    $('[data-reward-icon]').textContent = reward.icon; $('[data-reward-icon]').style.color = reward.color;
    $('[data-reward-label]').textContent = game.claimed.includes(level.id) ? 'Collection' : 'Win a charm';
    document.querySelectorAll('[data-play-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.playMode === game.mode)));
    $('[data-level-list]').replaceChildren(...COMMISSIONS.map((l, i) => {
      const b = node('button', `${i + 1}. ${l.name}`); b.type = 'button'; b.dataset.level = l.id; b.disabled = i > game.completed.length; b.setAttribute('aria-current', String(l.id === game.levelId));
      b.append(node('small', b.disabled ? 'Locked' : game.best[l.id] !== undefined ? `${game.best[l.id]} / 100` : 'Open letter')); return b;
    }));
    const key = free ? 'free' : game.levelId;
    $('[data-returned-list]').replaceChildren(...game.boxes[key].map((id, index) => { const b = node('button', lookup.get(id).name); b.type = 'button'; b.dataset.returnedIndex = String(index); return b; }));
    if (!game.boxes[key].length) $('[data-returned-list]').append(node('p', 'No beads set aside yet.'));
    const available = new Set(getAvailable(game).map((m) => m.id));
    document.querySelectorAll('[data-material-id]').forEach((b) => { b.disabled = !available.has(b.dataset.materialId); b.setAttribute('aria-label', `${b.disabled ? 'Locked' : 'Add'} ${lookup.get(b.dataset.materialId).name}`); });
  }
  function finished(game, result) {
    const level = COMMISSIONS.find((l) => l.id === game.levelId); const free = game.mode === 'free';
    $('[data-client-reaction]').textContent = free ? 'Made by you' : result.passed ? `${level.client}: “${level.reaction}”` : `${level.client}: “A little closer to the mood of my letter?”`;
    $('[data-finish-title]').textContent = free ? 'Your lucky is ready' : result.passed ? 'A little wish, delivered' : 'Keep making it yours';
    $('[data-finish-summary]').textContent = free ? 'Your design, exactly as you made it.' : result.first ? 'First delivery' : `Personal best · ${game.best[level.id]} / 100`;
    $('[data-result-grade]').replaceChildren(...(free ? [] : [node('strong', result.grade), node('span', `${result.total} / 100`)]));
    $('[data-score-parts]').replaceChildren(...(free ? [] : result.parts.flatMap((p) => [node('dt', p.label), node('dd', `${p.score} / ${p.max}`)])));
    $('[data-score-tip]').textContent = free ? '' : result.tip;
    const reward = $('[data-reward-reveal]'); reward.hidden = !result?.first;
    if (result?.first) { const item = lookup.get(result.reward); reward.replaceChildren(node('span', item.icon), node('div', `Unlocked: ${item.name} · +40 Studio XP`)); }
    const next = $('[data-action="next"]');
    next.textContent = free ? 'Make another' : !result.passed ? 'Try again' : game.levelId === COMMISSIONS.at(-1).id ? 'Free DIY' : 'Next letter';
    document.querySelector('[data-lab-shell]').dataset.deliveryPassed = String(free || result.passed);
  }
  return { rules, render, finished };
}
