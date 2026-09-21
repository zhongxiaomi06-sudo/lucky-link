import { MATERIALS } from './materials.js';
import { readStored, writeStored } from './studio-game.js';
import { createStylingUI } from './styling-ui.js';
import { normalizeCommerce, safeLink, createOrderText } from './commerce.js';
import defaults from './commerce-config.json';

const $ = (selector) => document.querySelector(selector);
const text = (tag, value, className) => { const node = document.createElement(tag); node.textContent = value; if (className) node.className = className; return node; };
export function openDialog(name) {
  document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
  $(`[data-dialog="${name}"]`).showModal();
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createStudioUI({ onStatus, getComposition, onCord, onSelect, materials = MATERIALS, getAvailable }) {
  const materialById = new Map(materials.map(item=>[item.id,item]));
  const styling = createStylingUI({catalog:materialById,getAvailable});
  let config = normalizeCommerce(readStored('lucky-link.commerce.v1', defaults),materialById);
  let materialDraft = {};
  let previousMaterial;
  let currentGame;
  const form = $('[data-shop-form]');
  const materialSelect = $('[data-link-material]');
  materials.forEach((item) => { const option = text('option', item.name); option.value = item.id; materialSelect.append(option); });
  const custom = readStored('lucky-link.custom.v1', {});
  $('[data-custom-name]').value = typeof custom?.name === 'string' ? custom.name.slice(0, 60) : 'My lucky link';
  $('[data-custom-note]').value = typeof custom?.note === 'string' ? custom.note.slice(0, 400) : '';
  $('[data-custom-cord]').value = ['slate', 'ivory', 'rose'].includes(custom?.cord) ? custom.cord : 'slate';
  onCord({ slate: '#43566c', ivory: '#eee4cc', rose: '#b76d88' }[$('[data-custom-cord]').value]);

  function renderRequirements(game, ids) {
    return styling.rules(game, ids);
  }
  function render(game, ids, selectedIndex) {
    currentGame = game;
    styling.render(game, ids);
    const sequence = $('[data-sequence]');
    sequence.replaceChildren(...ids.map((id, index) => {
      const li = document.createElement('li'); const button = text('button', `${index + 1}. ${materialById.get(id).name}`);
      button.type = 'button'; button.addEventListener('click', () => onSelect(index)); li.append(button); return li;
    }));
    if (!ids.length) sequence.append(text('li', 'Your chain is empty. Pick a bead from the box.'));
    if (selectedIndex >= 0 && ids[selectedIndex]) {
      $('[data-piece-title]').textContent = `${selectedIndex + 1}. ${materialById.get(ids[selectedIndex]).name}`;
      $('[data-action="move-earlier"]').disabled = selectedIndex === 0;
      $('[data-action="move-later"]').disabled = selectedIndex === ids.length - 1;
    }
  }
  function showFinished(game, result) {
    styling.finished(game, result);
  }
  function choices() { return { name: $('[data-custom-name]').value, cord: $('[data-custom-cord]').value, note: $('[data-custom-note]').value }; }
  function orderText() { return createOrderText(getComposition(), choices(),materialById); }
  function link(label, url) {
    const a = text('a', `${label} ↗`); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.append(text('small', new URL(url).hostname)); return a;
  }
  function refreshCustom() {
    const value = choices();
    $('[data-order-text]').textContent = orderText();
    onCord({ slate: '#43566c', ivory: '#eee4cc', rose: '#b76d88' }[value.cord]);
    writeStored('lucky-link.custom.v1', value);
    const links = [];
    if (config.customUrl) links.push(link('Contact maker', config.customUrl));
    if (config.shopUrl) links.push(link(config.shopName || 'Visit shop', config.shopUrl));
    $('[data-shop-links]').replaceChildren(...links);
    $('[data-shop-message]').textContent = links.length ? 'Opens an external shop. Confirm fit, price and availability there.' : 'No shop connected yet. Your design list is ready to copy or download.';
    const pieces = [...new Set(getComposition())].filter((id) => config.materialLinks[id]);
    $('[data-material-shop-links]').replaceChildren(...pieces.map((id) => link(materialById.get(id).name, config.materialLinks[id])));
  }
  function stashMaterial() { if (previousMaterial) materialDraft[previousMaterial] = form.elements.materialUrl.value.trim(); }
  materialSelect.addEventListener('change', () => { stashMaterial(); previousMaterial = materialSelect.value; form.elements.materialUrl.value = materialDraft[previousMaterial] || ''; });
  form.addEventListener('submit', (event) => {
    event.preventDefault(); stashMaterial();
    const raw = { shopName: form.elements.shopName.value.trim(), shopUrl: form.elements.shopUrl.value.trim(), customUrl: form.elements.customUrl.value.trim(), materialLinks: materialDraft };
    const invalid = [raw.shopUrl, raw.customUrl, ...Object.values(raw.materialLinks)].some((url) => url && !safeLink(url));
    if (invalid) { $('[data-shop-status]').textContent = 'Use complete HTTPS links without usernames or passwords. Nothing was saved.'; return; }
    const next = normalizeCommerce(raw,materialById);
    if (!writeStored('lucky-link.commerce.v1', next)) { $('[data-shop-status]').textContent = 'Browser storage is unavailable. Links were not saved.'; return; }
    config = next; $('[data-shop-status]').textContent = 'Links saved in this browser. Export to update the app build.';
  });
  ['[data-custom-name]', '[data-custom-cord]', '[data-custom-note]'].forEach((selector) => $(selector).addEventListener('input', refreshCustom));
  document.addEventListener('click', async (event) => {
    if (event.target.closest('[data-close]')) { event.target.closest('dialog').close(); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'levels') { renderRequirements(currentGame, getComposition()); openDialog('levels'); }
    if (action === 'sequence') openDialog('sequence');
    if (action === 'score') openDialog('score');
    if (action === 'collection') openDialog('collection');
    if (action === 'settings') {
      form.elements.shopName.value = config.shopName; form.elements.shopUrl.value = config.shopUrl; form.elements.customUrl.value = config.customUrl;
      materialDraft = { ...config.materialLinks }; previousMaterial = materialSelect.value;
      form.elements.materialUrl.value = materialDraft[previousMaterial] || ''; $('[data-shop-status]').textContent = '';
      openDialog('settings');
    }
    if (action === 'customize') { refreshCustom(); openDialog('customize'); }
    if (action === 'export-config') { download('commerce-config.json', JSON.stringify(config, null, 2), 'application/json'); $('[data-shop-status]').textContent = 'Saved configuration exported. Unsaved edits are not included.'; }
    if (action === 'download-list') { download('phone-chain-design.txt', orderText(), 'text/plain;charset=utf-8'); onStatus('Design list downloaded'); }
    if (action === 'copy-list') {
      try { await navigator.clipboard.writeText(orderText()); $('[data-custom-status]').textContent = 'List copied. Paste it into your message to the maker. Nothing was sent.'; }
      catch { $('[data-custom-status]').textContent = 'Clipboard unavailable here. Download the list instead.'; }
    }
  });
  return { render, showFinished, showRequirements: (game, ids) => { renderRequirements(game, ids); openDialog('levels'); } };
}
