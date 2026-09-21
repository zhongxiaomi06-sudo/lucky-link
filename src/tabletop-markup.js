import { dialogs } from './tabletop-dialogs.js';

export const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${{
  back: '<path d="m14 5-7 7 7 7"/>', next: '<path d="m9 5 7 7-7 7"/>',
  sound: '<path d="m11 4-6 4H2v8h3l6 4Z"/><path class="waves" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  undo: '<path d="m8 4-5 5 5 5M4 9h9a6 6 0 0 1 0 12H9"/>',
  letter: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  box: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 3v18M3 12h18"/>',
  order: '<path d="M8 7h12M8 12h12M8 17h12"/><circle cx="3" cy="7" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="17" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', return: '<path d="M5 10v10h14V10M12 3v11m-4-4 4 4 4-4"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
}[name] || ''}</svg>`;

export function tabletopMarkup() {
  return `<main class="tt-app" data-tabletop data-lab-shell data-state="compose" data-ready="false">
    <button class="tt-home-hook" type="button" data-home-hook aria-label="Play to unlock a charm">
      <picture>
        <source srcset="/assets/home-hook-comic-v22.webp" type="image/webp">
        <img src="/assets/home-hook-comic-v22.png" alt="A blue and pearl phone chain filled with glossy comic-style charms and attached to a silver phone">
      </picture>
      <span class="home-drop-ring" aria-hidden="true"><i></i></span>
    </button>
    <header class="tt-header"><button class="tt-round" type="button" data-action="collection" aria-label="Your bead collection" aria-haspopup="dialog">${icon('box')}</button><h1>Lucky Link</h1><button class="tt-round" type="button" data-action="sound" aria-label="Mute soundtrack" aria-pressed="false">${icon('sound')}</button></header>
    <button class="tt-letter" type="button" data-action="unlock" aria-haspopup="dialog" aria-label="Unlock hidden beads"><strong data-level-name>Unlock beads</strong>${icon('next')}</button>
    <section class="tt-work" data-work aria-label="Phone chain worktable">
      <canvas data-paint aria-hidden="true"></canvas>
      <div class="tt-cord-buttons" data-cord-buttons aria-label="Placed beads"></div>
      <div class="tt-box-scroll" data-box-scroll role="region" aria-label="Scrollable bead box" tabindex="0"><div class="tt-box-buttons" data-box-buttons aria-label="Beads in the right box"></div></div>
      <button class="tt-insert" data-insert type="button" aria-label="Thread held bead" disabled>${icon('plus')}</button>
      <div class="tt-pager" data-pager role="group" aria-label="Material types"><button type="button" data-action="tray-beads" aria-pressed="true">Beads</button><button type="button" data-action="tray-charms" aria-pressed="false">Charms</button></div>
      <button type="button" data-all-beads data-action="collection" aria-label="All beads and categories">${icon('box')}</button>
      <button class="tt-aside" type="button" data-action="box-mode" aria-label="Open beads set aside" data-aside>${icon('return')}<span>Set aside</span></button>
      <div class="tt-load" data-loading role="status">A little sunshine…</div>
    </section>
    <footer class="tt-footer" data-compose-controls><button class="tt-round tt-undo" type="button" data-action="undo" aria-label="Undo last change" disabled>${icon('undo')}</button><button class="tt-order" type="button" data-action="sequence" aria-label="Threading order and settings">${icon('order')}</button><button class="tt-primary" type="button" data-action="finish" disabled><span data-deliver-label>Show Mia</span>${icon('next')}</button></footer>
    <div class="tt-result" data-finish hidden><div class="tt-result-top"><button type="button" data-action="view-charm">Charm</button><button type="button" data-action="view-phone" aria-pressed="true">On phone</button><button class="tt-score" type="button" data-action="score" aria-label="Score and reward"><span data-result-grade></span></button></div><footer class="tt-footer"><button class="tt-round" type="button" data-action="edit" aria-label="Edit your chain">${icon('back')}</button><button class="tt-order" type="button" data-action="unlock">Unlock more</button><button class="tt-primary" type="button" data-action="make-card">Make card</button></footer></div>
    <div hidden><button type="button" data-action="levels" tabindex="-1">Letters</button><button type="button" data-action="next" tabindex="-1">Next</button><span data-studio-level></span><span data-client-seal></span><span data-limit></span><span data-live-stars></span><span data-live-caption></span><span data-reward-icon></span><span data-reward-label></span><span data-finish-title></span><span data-finish-summary></span></div>
    ${dialogs}
    <p class="tt-toast" data-status role="status" aria-live="polite"></p>
    <div class="tt-ghost" data-ghost hidden aria-hidden="true"></div>
  </main>`;
}
