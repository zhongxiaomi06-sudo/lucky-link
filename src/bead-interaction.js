import * as THREE from 'three';
import { createBeadBox, createPickupHand } from './bead-box.js';
import { COMMISSIONS, availableMaterials } from './styling-game.js';
import { materialById } from './materials.js';

export function createBeadInteraction({ canvas, shell, camera, cameraRig, subject, curve, beads, makeBead, getDraft, getGame, commit, select, status, sound, reducedMotion }) {
  const box = createBeadBox(makeBead); subject.add(box.root);
  const hand = createPickupHand(); subject.add(hand);
  const hotspots = document.querySelector('[data-bead-hotspots]');
  const boxControls = document.querySelector('[data-box-controls]');
  const dropButton = document.querySelector('[data-drop-target]');
  const cancelButton = document.querySelector('[data-action="cancel-pickup"]');
  const heldLabel = document.querySelector('[data-held-label]');
  const pointer = new THREE.Vector2(); const ray = new THREE.Raycaster(); const plane = new THREE.Plane();
  const target = new THREE.Vector3(); const activePointers = new Set();
  let mode = 'catalog', page = 0, held, gesture, suppressUntil = 0, targetIndex = 0, dirty = true, capacity = 6;
  let screenSlots = [];
  const editing = () => shell.dataset.state === 'compose' && shell.dataset.renderReady !== 'false' && !document.querySelector('dialog[open]');
  const coords = (world) => { const p = world.clone().project(camera), rect = shell.getBoundingClientRect(); return { x: (p.x + 1) * rect.width / 2, y: (1 - p.y) * rect.height / 2, z: p.z, rect }; };
  const pointAt = (index) => {
    const n = getDraft().ids.length;
    return curve.getPointAt(n ? Math.max(.006, .035 + (index - .5) * (.93 / n)) : .08);
  };
  function refresh() {
    dirty = true; capacity = shell.clientHeight < 680 ? 4 : 6;
    box.root.scale.setScalar(camera.aspect > 1.3 ? 1.15 : 1);
    const game = getGame(); const draft = getDraft();
    const preferred = COMMISSIONS.find((l) => l.id === game.levelId).example;
    const all = mode === 'box' ? draft.box.map((id, index) => ({ id, source: { kind: 'box', index } })) : availableMaterials(game).toSorted((a, b) => {
      const ai = preferred.indexOf(a.id), bi = preferred.indexOf(b.id); return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    }).map((m) => ({ id: m.id, source: { kind: 'catalog', id: m.id } }));
    const pages = Math.max(1, Math.ceil(all.length / capacity)); page = (page + pages) % pages;
    box.render(all.slice(page * capacity, page * capacity + capacity), capacity);
    hotspots.replaceChildren(...box.targets.map((item, index) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'box-hotspot'; b.dataset.boxSlot = String(index);
      b.setAttribute('aria-label', `Pick ${materialById.get(item.id).name}${mode === 'box' ? ' from set-aside box' : ''}`); b.title = materialById.get(item.id).name; return b;
    }));
    document.querySelector('[data-box-mode]').textContent = mode === 'box' ? `Set aside ${draft.box.length}` : `Beads ${page + 1}/${pages}`;
    shell.dataset.boxPage = String(page); shell.dataset.boxTab = mode;
    if (!held) targetIndex = getDraft().ids.length;
  }
  function clear() {
    dirty = true;
    if (held?.original) held.original.visible = true;
    if (held?.mesh) { subject.remove(held.mesh); held.mesh.traverse((o) => { o.geometry?.dispose(); if (o.userData.ownedMaterial) o.material?.dispose(); }); }
    held = undefined; gesture = undefined; hand.visible = false;
    dropButton.hidden = true; cancelButton.hidden = true; heldLabel.hidden = true;
    cameraRig.controls.enabled = true; shell.dataset.holding = 'false'; shell.dataset.draggingBead = 'false';
  }
  function begin(source, position, original) {
    clear(); cameraRig.stop();
    const draft = getDraft(); const id = source.kind === 'catalog' ? source.id : (source.kind === 'cord' ? draft.ids : draft.box)[source.index];
    if (!id || (source.kind !== 'cord' && draft.ids.length >= 14)) { status('Your chain is full. Return a bead first.'); sound('retry'); return false; }
    const m = makeBead(id); m.rotation.x = -Math.PI / 2; subject.add(m);
    held = { source, id, mesh: m, original }; if (original) original.visible = false;
    target.copy(position).add(new THREE.Vector3(0, .7, 0)); m.position.copy(target); hand.position.copy(target); hand.visible = true;
    targetIndex = draft.ids.length; dropButton.hidden = false; cancelButton.hidden = false; heldLabel.hidden = false;
    heldLabel.textContent = materialById.get(id).name; dropButton.setAttribute('aria-label', `Thread ${materialById.get(id).name} here`);
    shell.dataset.holding = 'true'; cameraRig.controls.enabled = false; sound('pickup',id);
    return true;
  }
  function closestCord(x, y) {
    let best;
    for (let index = 0; index <= getDraft().ids.length; index++) {
      const c = coords(subject.localToWorld(pointAt(index)));
      const distance = Math.hypot(x - c.rect.left - c.x, y - c.rect.top - c.y);
      if (!best || distance < best.distance) best = { kind: 'cord', index, distance };
    }
    return best && best.distance < 34 ? best : undefined;
  }
  function inBox(x, y) {
    const r = canvas.getBoundingClientRect(); pointer.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1); ray.setFromCamera(pointer, camera);
    plane.set(new THREE.Vector3(0, 1, 0), -box.root.localToWorld(new THREE.Vector3(0, .4, 0)).y);
    const hit = ray.ray.intersectPlane(plane, new THREE.Vector3()); if (!hit) return false;
    box.root.worldToLocal(hit); return Math.abs(hit.x) < 1.55 && Math.abs(hit.z) < 1.85;
  }
  function drop(x, y) {
    if (!held) return;
    const destination = held.source.kind === 'cord' && inBox(x, y) ? { kind: 'box' } : closestCord(x, y);
    const source = held.source; clear();
    if (destination) {
      if (!commit(source, destination)) {status(destination.kind === 'box' ? 'Your set-aside box is full.' : 'Your chain is full.');sound('retry');}
      if (destination.kind === 'box') { mode = 'box'; page = 0; }
    } else {status('Bead put back. Your chain is unchanged.');sound('cancel');}
    refresh();
  }
  function pickHit(event) {
    const slot = event.target.closest('[data-box-slot]');
    if (slot) {
      let index = Number(slot.dataset.boxSlot);
      if (event.type === 'pointerdown') index = screenSlots.map((p, i) => ({ i, d: Math.hypot(event.clientX - p.rect.left - p.x, event.clientY - p.rect.top - p.y) })).sort((a, b) => a.d - b.d)[0].i;
      const item = box.targets[index]; return { source: item.source, point: subject.worldToLocal(box.root.localToWorld(item.center.clone())), original: item.bead };
    }
    if (event.target !== canvas) return null;
    const r = canvas.getBoundingClientRect(); pointer.set((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(beads.children, true).find((h) => Number.isInteger(h.object.userData.compositionIndex));
    if (hit) { const index = hit.object.userData.compositionIndex; return { source: { kind: 'cord', index }, point: subject.worldToLocal(hit.point.clone()), original: beads.children.find((b) => b.userData.compositionIndex === index) }; }
    // Tiny charms retain a 44 px pickup diameter; nearest bead wins when zones meet.
    const nearby = beads.children.filter((b) => Number.isInteger(b.userData.compositionIndex)).map((b) => {
      const p = coords(b.getWorldPosition(new THREE.Vector3()));
      return { bead: b, distance: p.z < 1 ? Math.hypot(event.clientX - p.rect.left - p.x, event.clientY - p.rect.top - p.y) : Infinity };
    }).sort((a, b) => a.distance - b.distance)[0];
    if (nearby?.distance <= 22) return { source: { kind: 'cord', index: nearby.bead.userData.compositionIndex }, point: nearby.bead.position.clone(), original: nearby.bead };
    return null;
  }
  document.addEventListener('pointerdown', (e) => {
    activePointers.add(e.pointerId);
    if (activePointers.size > 1) { if(held)sound('cancel',held.id);clear(); suppressUntil = performance.now() + 350; return; }
    if (!editing() || e.button !== 0) return;
    const hit = held ? null : pickHit(e);
    if (!hit && !(held && (e.target === canvas || e.target === dropButton || e.target.closest('[data-box-slot]')))) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (hit && !begin(hit.source, hit.point, hit.original)) return;
    const wasHolding = !hit;
    gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, wasHolding };
    canvas.setPointerCapture(e.pointerId);
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!held || !gesture || e.pointerId !== gesture.id) return;
    if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 6) gesture.moved = true;
    if (!gesture.moved) return;
    e.preventDefault(); e.stopImmediatePropagation(); shell.dataset.draggingBead = 'true';
    const r = canvas.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(pointer, camera);
    plane.set(new THREE.Vector3(0, 1, 0), -subject.localToWorld(new THREE.Vector3(0, 1.0, 0)).y);
    const hit = ray.ray.intersectPlane(plane, new THREE.Vector3()); if (hit) target.copy(subject.worldToLocal(hit));
    const nearest = closestCord(e.clientX, e.clientY); if (nearest) targetIndex = nearest.index;
    shell.dataset.dropValid = String(Boolean(nearest || (held.source.kind === 'cord' && inBox(e.clientX, e.clientY))));
  }, { capture: true, passive: false });
  document.addEventListener('pointerup', (e) => {
    activePointers.delete(e.pointerId);
    if (!gesture || e.pointerId !== gesture.id || !held) return;
    e.preventDefault(); e.stopImmediatePropagation(); suppressUntil = performance.now() + 350;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (gesture.moved || gesture.wasHolding) drop(e.clientX, e.clientY);
    else if (held.source.kind === 'cord') { const i = held.source.index; clear(); select(i); }
    else { gesture = undefined; status('Tap the outlined spot to thread. Put back to cancel.'); }
  }, true);
  document.addEventListener('pointercancel', (e) => { activePointers.delete(e.pointerId); if (held) {sound('cancel',held.id);clear();} suppressUntil = performance.now() + 350; }, true);
  document.addEventListener('click', (e) => {
    if (e.detail !== 0 && (e.target.closest('[data-box-slot]') || e.target === canvas || e.target === dropButton) && performance.now() < suppressUntil) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    const slot = e.target.closest('[data-box-slot]');
    if (slot && editing()) { const hit = pickHit(e); if (begin(hit.source, hit.point, hit.original)) dropButton.focus({ preventScroll: true }); }
    if (e.target === dropButton && held) { const source = held.source; clear(); commit(source, { kind: 'cord', index: targetIndex }); refresh(); }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'cancel-pickup') {if(held)sound('cancel',held.id);clear();}
    if (action === 'box-prev' || action === 'box-next') { clear(); page += action === 'box-next' ? 1 : -1; refresh(); }
    if (action === 'box-mode') { clear(); mode = mode === 'catalog' ? 'box' : 'catalog'; page = 0; refresh(); }
    if (['levels', 'sequence', 'collection', 'settings', 'finish', 'edit', 'next', 'undo', 'clear', 'reset-camera'].includes(action)) clear();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && held) { e.preventDefault(); sound('cancel',held.id);clear(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { activePointers.clear(); clear(); } });
  window.addEventListener('blur', () => { activePointers.clear(); clear(); });
  function update() {
    if (capacity !== (shell.clientHeight < 680 ? 4 : 6)) { clear(); page = 0; refresh(); }
    subject.updateMatrixWorld(true);
    const front = Math.cos(cameraRig.controls.getAzimuthalAngle()) > .12;
    screenSlots = box.targets.map((item) => coords(box.root.localToWorld(item.center.clone())));
    [...hotspots.children].forEach((b, i) => { const p = screenSlots[i]; b.style.left = `${p.x}px`; b.style.top = `${p.y}px`; b.hidden = !front || !editing() || p.z > 1 || p.x < 22 || p.x > p.rect.width - 22 || p.y < (camera.aspect > 1.3 ? 150 : 165) || p.y > p.rect.height - 115; });
    const anchor = coords(box.anchor());
    boxControls.style.left = `${Math.max(74, Math.min(anchor.rect.width - 74, anchor.x))}px`; boxControls.style.top = `${Math.min(anchor.rect.height - 130, anchor.y + 6)}px`; boxControls.hidden = !front || !editing() || anchor.z > 1;
    if (held) {
      hand.position.lerp(target, reducedMotion ? 1 : .38); held.mesh.position.copy(hand.position);
      const p = coords(subject.localToWorld(pointAt(targetIndex))); dropButton.style.left = `${p.x}px`; dropButton.style.top = `${p.y}px`;
      const label = coords(subject.localToWorld(target.clone())); heldLabel.style.left = `${Math.max(55, Math.min(label.rect.width - 55, label.x))}px`; heldLabel.style.top = `${label.y - 12}px`;
    }
    shell.dataset.boxContents = getDraft().box.join(',');
    if (shell.dataset.debug === 'true') {
      const screen = (world) => { const p = coords(world); return { x: p.x + p.rect.left, y: p.y + p.rect.top }; };
      shell.dataset.beadPoints = JSON.stringify(beads.children.filter((b) => Number.isInteger(b.userData.compositionIndex)).map((b) => screen(b.getWorldPosition(new THREE.Vector3()))));
      shell.dataset.cordTargets = JSON.stringify(Array.from({ length: getDraft().ids.length + 1 }, (_, i) => screen(subject.localToWorld(pointAt(i)))));
      shell.dataset.boxCenter = JSON.stringify(screen(box.center()));
    }
    const changed = dirty; dirty = false;
    return Boolean(held) || changed;
  }
  refresh();
  function warmup(draw) {
    // Some mobile/Metal drivers defer pipeline creation until the first actual draw.
    hand.visible = true; hand.position.set(0, 2, 1);
    try { draw(); } finally { hand.visible = false; draw(); }
  }
  return { refresh, update, warmup, cancel: clear, get holding() { return Boolean(held); }, resetPage() { clear(); page = 0; mode = 'catalog'; refresh(); } };
}
