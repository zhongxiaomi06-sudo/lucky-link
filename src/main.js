import { addPiece as appendPiece, canFinish, curvePosition, MAX_PIECES, MIN_PIECES, removePieceAt, undoPiece } from './model.js';

const materials = [
  { id: 'cobalt', name: 'Cobalt bubble', category: 'crystal', col: 0, row: 0 },
  { id: 'crystal', name: 'Crystal bubble', category: 'crystal', col: 1, row: 0 },
  { id: 'aqua-heart', name: 'Aqua heart', category: 'crystal', col: 2, row: 0 },
  { id: 'sky-cube', name: 'Sky cube', category: 'crystal', col: 3, row: 2 },
  { id: 'mint-crystal', name: 'Mint crystal', category: 'crystal', col: 1, row: 0, hue: 62, sat: 0.86 },
  { id: 'rose-heart', name: 'Rose heart', category: 'crystal', col: 2, row: 0, hue: 142, sat: 0.72, bright: 1.08 },
  { id: 'yellow-bow', name: 'Butter bow', category: 'lucky', col: 3, row: 0 },
  { id: 'daisy', name: 'Crystal daisy', category: 'lucky', col: 2, row: 1 },
  { id: 'cherry', name: 'Lucky cherries', category: 'lucky', col: 3, row: 1 },
  { id: 'clover', name: 'Silver clover', category: 'lucky', col: 2, row: 2 },
  { id: 'lemon-daisy', name: 'Lemon daisy', category: 'lucky', col: 2, row: 1, hue: 194, sat: 1.18 },
  { id: 'berry-cherry', name: 'Berry cherries', category: 'lucky', col: 3, row: 1, hue: 294, sat: 1.18 },
  { id: 'pearl', name: 'Moon pearl', category: 'metal', col: 0, row: 1 },
  { id: 'silver-heart', name: 'Silver heart', category: 'metal', col: 1, row: 1 },
  { id: 'pewter-clover', name: 'Pewter clover', category: 'metal', col: 2, row: 2, sat: 0.45, bright: 0.88 },
  { id: 'gold-pearl', name: 'Golden pearl', category: 'metal', col: 0, row: 1, hue: 178, sat: 1.35 },
  { id: 'blush-heart', name: 'Blush heart', category: 'metal', col: 1, row: 1, hue: 118, sat: 0.68, bright: 1.05 },
  { id: 'ice-clover', name: 'Ice clover', category: 'metal', col: 2, row: 2, hue: 30, sat: 0.72, bright: 1.12 },
  { id: 'dice', name: 'Lucky dice', category: 'play', col: 0, row: 2 },
  { id: 'star', name: 'Cobalt star', category: 'play', col: 1, row: 2 },
  { id: 'sunny-dice', name: 'Sunny dice', category: 'play', col: 0, row: 2, hue: 188, sat: 1.24 },
  { id: 'violet-star', name: 'Violet star', category: 'play', col: 1, row: 2, hue: 54, sat: 1.2 },
  { id: 'aqua-bow', name: 'Aqua bow', category: 'play', col: 3, row: 0, hue: 226, sat: 1.12 },
  { id: 'pop-heart', name: 'Pop heart', category: 'play', col: 2, row: 0, hue: 105, sat: 1.3 },
];

const materialCategories = [
  { id: 'all', name: 'All 24' },
  { id: 'crystal', name: 'Crystal' },
  { id: 'lucky', name: 'Lucky' },
  { id: 'metal', name: 'Metal' },
  { id: 'play', name: 'Play' },
];

const state = { view: 'cover', pieces: [] };
const views = [...document.querySelectorAll('[data-view]')];
const materialTray = document.querySelector('[data-materials]');
const materialFilters = document.querySelector('[data-material-filters]');
const coverScene = document.querySelector('[data-cover-scene]');
const placed = document.querySelector('[data-placed-beads]');
const preview = document.querySelector('[data-preview-beads]');
const dropZone = document.querySelector('[data-drop-zone]');
const ghost = document.querySelector('[data-drag-ghost]');
const soundButton = document.querySelector('[data-action="sound"]');
const finishButton = document.querySelector('[data-action="finish"]');
const undoButton = document.querySelector('[data-action="undo"]');
const emptyHint = document.querySelector('[data-empty-hint]');
const countOutput = document.querySelector('[data-piece-count]');
const makerStatus = document.querySelector('[data-maker-status]');

let audioContext;
let bedGain;
let muted = localStorage.getItem('lucky-link.muted') === 'yes';
let draggedMaterial = null;
let dragStart = null;
let dragMoved = false;
let suppressMaterialClick = false;
let activeCategory = 'all';
let parallaxFrame = 0;

const spriteStyle = (material) => `--sprite-x:${material.col};--sprite-y:${material.row};--hue:${material.hue ?? 0}deg;--sat:${material.sat ?? 1};--bright:${material.bright ?? 1}`;
const materialById = (id) => materials.find((material) => material.id === id);
const beadMarkup = (material, className = '') => `<span class="bead-sprite ${className}" style="${spriteStyle(material)}" aria-hidden="true"></span>`;

function renderMaterials() {
  const visibleMaterials = activeCategory === 'all' ? materials : materials.filter((material) => material.category === activeCategory);
  materialFilters.innerHTML = materialCategories.map((category) => `<button class="material-filter" type="button" data-category="${category.id}" aria-pressed="${category.id === activeCategory}">${category.name}</button>`).join('');
  materialTray.innerHTML = visibleMaterials.map((material) => `
    <button class="material-button" type="button" data-material="${material.id}" aria-label="Add ${material.name}">
      ${beadMarkup(material)}<span>${material.name}</span>
    </button>`).join('');
}

function renderChain(target, previewMode = false) {
  target.innerHTML = state.pieces.map((id, index) => {
    const material = materialById(id);
    const position = curvePosition(index, state.pieces.length, previewMode);
    const style = `${spriteStyle(material)};--x:${position.x}%;--y:${position.y}%;--rotate:${position.rotation}deg;--delay:${index * 28}ms`;
    if (previewMode) return `<span class="chain-piece preview-piece" style="${style}" data-piece-id="${id}">${beadMarkup(material)}</span>`;
    return `<button class="chain-piece" type="button" style="${style}" data-remove-index="${index}" aria-label="Remove ${material.name}">${beadMarkup(material)}</button>`;
  }).join('');
}

function render() {
  views.forEach((view) => {
    const active = view.dataset.view === state.view;
    view.hidden = !active;
    view.classList.toggle('is-active', active);
  });
  renderChain(placed);
  renderChain(preview, true);
  const count = state.pieces.length;
  countOutput.value = `${count} / ${MAX_PIECES}`;
  emptyHint.hidden = count > 0;
  undoButton.disabled = count === 0;
  finishButton.disabled = !canFinish(state.pieces);
  if (count === 0) makerStatus.textContent = 'Choose at least 3 pieces';
  else if (count < MIN_PIECES) makerStatus.textContent = `${MIN_PIECES - count} more to try it on`;
  else if (count === MAX_PIECES) makerStatus.textContent = 'Your chain is full';
  else makerStatus.textContent = `${count} pieces · looking lucky`;
}

function setView(view) {
  state.view = view;
  render();
}

async function unlockAudio() {
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context) return;
  audioContext ??= new Context();
  await audioContext.resume().catch(() => {});
  if (bedGain) return;
  bedGain = audioContext.createGain();
  bedGain.gain.value = muted ? 0 : 0.025;
  bedGain.connect(audioContext.destination);
  [174.61, 261.63, 392].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index === 0 ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.34 : 0.09;
    oscillator.connect(gain).connect(bedGain);
    oscillator.start();
  });
}

function cue(kind = 'snap') {
  if (!audioContext || muted) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(kind === 'complete' ? 523 : 880, now);
  oscillator.frequency.exponentialRampToValueAtTime(kind === 'complete' ? 1046 : 1320, now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === 'remove' ? 0.025 : 0.07, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'complete' ? 0.34 : 0.16));
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.36);
}

function updateSoundControl() {
  soundButton.setAttribute('aria-pressed', String(muted));
  soundButton.setAttribute('aria-label', muted ? 'Turn on soundtrack' : 'Mute soundtrack');
  soundButton.firstElementChild.textContent = muted ? '◖×' : '◖))';
  if (bedGain) bedGain.gain.value = muted ? 0 : 0.025;
}

function addPiece(id) {
  void unlockAudio();
  if (state.pieces.length >= MAX_PIECES) {
    makerStatus.textContent = 'Your chain is full';
    cue('remove');
    return;
  }
  state.pieces = appendPiece(state.pieces, id);
  render();
  cue('snap');
  placed.lastElementChild?.classList.add('just-added');
}

function removeAt(index) {
  const material = materialById(state.pieces[index]);
  state.pieces = removePieceAt(state.pieces, index);
  render();
  cue('remove');
  makerStatus.textContent = `${material.name} removed`;
}

function beginDrag(event, id) {
  draggedMaterial = id;
  dragStart = { x: event.clientX, y: event.clientY };
  dragMoved = false;
  ghost.innerHTML = beadMarkup(materialById(id));
  ghost.classList.add('is-dragging');
  moveGhost(event.clientX, event.clientY);
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function moveGhost(x, y) {
  ghost.style.translate = `${x - 28}px ${y - 28}px`;
}

function finishDrag(event) {
  if (!draggedMaterial) return;
  const rect = dropZone.getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  const id = draggedMaterial;
  const moved = dragMoved;
  draggedMaterial = null;
  dragStart = null;
  dragMoved = false;
  suppressMaterialClick = true;
  ghost.classList.remove('is-dragging');
  ghost.replaceChildren();
  dropZone.classList.remove('is-targeted');
  if (!moved || inside) addPiece(id);
}

renderMaterials();
updateSoundControl();
render();

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  const materialId = event.target.closest('[data-material]')?.dataset.material;
  const removeIndex = event.target.closest('[data-remove-index]')?.dataset.removeIndex;
  const category = event.target.closest('[data-category]')?.dataset.category;
  if (category) { activeCategory = category; renderMaterials(); }
  if (materialId && !suppressMaterialClick) addPiece(materialId);
  suppressMaterialClick = false;
  if (removeIndex !== undefined) removeAt(Number(removeIndex));
  if (action === 'start') {
    event.preventDefault();
    if (new URLSearchParams(location.search).get('view') !== '2d') { location.href = '/3d-lab.html'; return; }
    setView('compose'); void unlockAudio(); cue('snap');
  }
  if (action === 'back-cover') setView('cover');
  if (action === 'undo' && state.pieces.length) { state.pieces = undoPiece(state.pieces); render(); cue('remove'); }
  if (action === 'clear' && state.pieces.length && globalThis.confirm('Clear this chain?')) { state.pieces = []; render(); cue('remove'); }
  if (action === 'finish' && canFinish(state.pieces)) { setView('preview'); cue('complete'); }
  if (action === 'edit') setView('compose');
  if (action === 'restart') { state.pieces = []; setView('compose'); }
  if (action === 'sound') {
    muted = !muted;
    localStorage.setItem('lucky-link.muted', muted ? 'yes' : 'no');
    updateSoundControl();
    if (!muted) { void unlockAudio().then(() => cue('snap')); }
  }
});

function updateCoverParallax(event) {
  if (!coverScene || state.view !== 'cover' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = coverScene.getBoundingClientRect();
  const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
  const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
  cancelAnimationFrame(parallaxFrame);
  parallaxFrame = requestAnimationFrame(() => {
    coverScene.style.setProperty('--mx', x.toFixed(3));
    coverScene.style.setProperty('--my', y.toFixed(3));
  });
}

coverScene?.addEventListener('pointermove', updateCoverParallax);
coverScene?.addEventListener('pointerleave', () => {
  coverScene.style.setProperty('--mx', '0');
  coverScene.style.setProperty('--my', '0');
});

materialTray.addEventListener('pointerdown', (event) => {
  const button = event.target.closest('[data-material]');
  if (button) beginDrag(event, button.dataset.material);
});
materialTray.addEventListener('dragstart', (event) => event.preventDefault());
materialTray.addEventListener('pointermove', (event) => {
  if (!draggedMaterial) return;
  if (dragStart && Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 8) dragMoved = true;
  moveGhost(event.clientX, event.clientY);
  const rect = dropZone.getBoundingClientRect();
  dropZone.classList.toggle('is-targeted', event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
});
materialTray.addEventListener('pointerup', finishDrag);
materialTray.addEventListener('pointercancel', finishDrag);
