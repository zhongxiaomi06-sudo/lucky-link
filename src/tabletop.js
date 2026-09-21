import './tabletop.css';
import './collection.css';
import './collections-v17.css';
import { createStyleUI, featuredRecipe } from './style-ui.js';
import { STYLE_BOOK_KEY, normalizeStyleBook, evaluateStyle, completeStyle } from './style-challenges.js';
import { tabletopMarkup } from './tabletop-markup.js';
import { jewelryLayout, phoneConnection, beadPoints, beadPose, loopPoint, loopPath, pointAtLength, cordTarget, isCharm } from './tabletop-layout.js';
import { pointerIntent, previewPieces } from './tabletop-placement.js';
import { loadTabletopArt, paintBead } from './tabletop-art.js';
import { createTabletopSound } from './tabletop-sound.js';
import { MATERIALS, materialById, FAMILIES, presentationFor, isDisplayMaterial } from './collection-catalog.js';
import { COMMISSIONS, normalizeProgress, deliver, transfer, history } from './styling-game.js';
import { COLLECTION_KEY, normalizeCollection, ownedIds } from './collection-game.js';
import { createCollectionUI } from './collection-ui.js';
import { createCreationCard } from './creation-card.js';
import { cordById, selectCord } from './cord-catalog.js';
import { paintCord } from './cord-art.js';
import { createCordUI } from './cord-ui.js';
import { readStored, writeStored, saveKey } from './studio-game.js';
import { createStudioUI, openDialog } from './studio-ui.js';

document.documentElement.dataset.entry = 'tabletop';
document.body.dataset.tabletopPage = 'true';
document.body.innerHTML = tabletopMarkup();
document.title = 'Lucky Link · Your little studio';
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#d9aa74');
const $ = s => document.querySelector(s);
const shell = $('[data-tabletop]'), work = $('[data-work]'), canvas = $('[data-paint]'), ctx = canvas.getContext('2d');
const legacyRaw = readStored('lucky-link.styling.v2', readStored('lucky-link.studio.v1', null));
const game = normalizeProgress(legacyRaw);
const collectionRaw=readStored(COLLECTION_KEY,null),legacyCustom=readStored('lucky-link.custom.v1',null);
let collection = normalizeCollection(collectionRaw, legacyRaw);
if(!collectionRaw?.cordId&&['slate','ivory','rose'].includes(legacyCustom?.cord))collection.cordId='cord-classic';
let home = !location.pathname.includes('3d-lab') && !new URLSearchParams(location.search).has('studio');
let family = '', activeChallenge = '', styles;
let styleBook = normalizeStyleBook(readStored(STYLE_BOOK_KEY,null));
game.mode = 'free'; game.drafts.free = collection.ids; game.boxes.free = collection.box;
const displayMaterials=MATERIALS.filter(m=>isDisplayMaterial(m.id));
const availableMaterials = () => displayMaterials.filter(m => ownedIds(collection).includes(m.id));
const edits = history(), sound = createTabletopSound(shell, $('[data-action="sound"]'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let art, layout, held, pointer, target, selected = -1, replacing = false, category = 'all', boxMode = false, finished = false, charmOnly = false, result;
let cord = '#b8a68b', ui, toastTimer, lastPointerUp = 0, snapAt = -1000, raf = 0, trayGroup='beads', traySignature='';
let suppressOpeningClick=false,pendingHomeGame=false,openingHomeGame=false;
const visualPoints=new Map();
const draft = () => ({ ids: game.drafts[saveKey(game)], box: game.boxes[saveKey(game)] });
const position = (node, x, y, w, h = w) => { node.style.left = `${x}px`; node.style.top = `${y}px`; node.style.width = `${w}px`; node.style.height = `${h}px`; };
const status = message => { const node = $('[data-status]'); node.textContent = message; node.dataset.visible = 'true'; clearTimeout(toastTimer); toastTimer = setTimeout(() => node.dataset.visible = 'false', 2200); };
function save() { collection.ids = [...game.drafts.free]; collection.box = [...game.boxes.free]; if (!writeStored(COLLECTION_KEY, collection)) { shell.dataset.storage = 'session'; status('Session only · storage unavailable'); } }
function saveDraft(next, event, id) {
  const key = saveKey(game); edits.record(key, {...draft(),cordId:collection.cordId}); game.drafts[key] = next.ids; game.boxes[key] = next.box; save();
  sound.play(event, id, next.ids.length); snapAt = performance.now(); render();
}
function cancel(silent = false) {
  const had = held; held = pointer = target = null; $('[data-ghost]').hidden = true;
  if (had && !silent) sound.play('cancel', had.id, draft().ids.length);
  shell.dataset.held = ''; render();
}
function commit(destination) {
  if (!held || !destination) return false;
  const before = draft(), id = held.id, from = held.kind, next = transfer(before, held, destination,id=>materialById.has(id));
  if (!next) { status(destination.kind === 'box' ? 'Your box is full' : '14 pieces max'); cancel(); return false; }
  held = pointer = target = null; $('[data-ghost]').hidden = true; shell.dataset.held = '';
  if (destination.kind === 'box') boxMode = true;
  if (JSON.stringify(before) !== JSON.stringify(next)) saveDraft(next, destination.kind === 'box' ? 'return' : from === 'cord' ? 'reorder' : 'thread', id);
  else render();
  return true;
}
function pick(source) {
  if (!art || finished || home) return;
  const ids = draft(), id = source.kind === 'catalog' ? source.id : source.kind === 'cord' ? ids.ids[source.index] : ids.box[source.index];
  if (!materialById.has(id) || !ownedIds(collection).includes(id)) return;
  held = { ...source, id }; target = null; shell.dataset.held = id; sound.play('pickup', id, ids.ids.length);
  render();
}
const pointFrom = event => { const rect = work.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
function dropTarget(point) {
  const t = layout.tray;
  if (point.x >= t.x - 6 && point.x <= t.x + t.w + 6 && point.y >= t.y - 6 && point.y <= t.y + t.h + 56 && held?.kind === 'cord') return { kind: 'box' };
  return cordTarget(layout.loop, point, draft().ids);
}
function inventory() {
  if (boxMode) return draft().box.map((id, index) => ({ ...materialById.get(id), source: { kind: 'box', index } }));
  const owns = new Set(ownedIds(collection));
  const list = displayMaterials.filter(m => family ? presentationFor(m.id).family===family : isCharm(m.id)===(trayGroup==='charms')).map(m=>({...m,locked:!owns.has(m.id)}));
  // The first tray is a colorful starting palette, not a prescribed solution.
  const order = ['aqua-drop', 'pearl', 'lilac-heart', 'blue-star', 'rose-prism', 'amber-cube'];
  const sorted = [...list].sort((a, b) => Number(a.locked)-Number(b.locked) || (order.includes(a.id) ? order.indexOf(a.id) : 20 + MATERIALS.findIndex(m=>m.id===a.id)) - (order.includes(b.id) ? order.indexOf(b.id) : 20 + MATERIALS.findIndex(m=>m.id===b.id)));
  const teaser=sorted.findIndex(m=>m.locked);
  if(teaser>5)sorted.splice(5,0,...sorted.splice(teaser,1));
  return sorted.map(m => ({ ...m, source: { kind: 'catalog', id: m.id } }));
}
function defaultTarget() {
  const ids=draft().ids, pieces=previewPieces(ids,held,ids.length), points=beadPoints(layout.loop,pieces.map(p=>p.id));
  const i=pieces.findIndex(p=>p.held);
  return {kind:'cord',index:ids.length,point:i>=0?points[i]:points.at(-1)||loopPoint(layout.loop,.5)};
}
function render() {
  if (!layout) return;
  const ids = draft().ids, key = saveKey(game), free = game.mode === 'free', level = COMMISSIONS.find(l => l.id === game.levelId);
  shell.dataset.state = home ? 'home' : finished ? 'finished' : 'compose'; shell.dataset.count = String(ids.length); shell.dataset.boxCount = String(draft().box.length);
  work.inert=home;work.setAttribute('aria-hidden',String(home));
  shell.dataset.ids = ids.join(','); shell.dataset.boxIds = draft().box.join(','); shell.dataset.mode = game.mode; shell.dataset.levelId = game.levelId;
  shell.dataset.cordId=collection.cordId;shell.dataset.cordsCollected=String(collection.unlockedCords.length+3);
  shell.dataset.xp = String(game.claimed.length * 40); shell.dataset.finishView = charmOnly ? 'charm' : 'phone';
  $('[data-deliver-label]').textContent = free ? 'Finish' : `Show ${level.client}`;
  $('[data-action="finish"]').disabled = ids.length < 3 || !art;
  $('[data-action="undo"]').disabled = !edits.has(key);
  $('[data-action="clear"]').disabled = !ids.length;
  $('[data-compose-controls]').hidden = finished || home; $('[data-finish]').hidden = !finished; $('.tt-letter').hidden = finished;
  $('[data-action="view-charm"]').setAttribute('aria-pressed', String(charmOnly)); $('[data-action="view-phone"]').setAttribute('aria-pressed', String(!charmOnly));
  ui?.render(game, ids, selected);
  $('[data-level-name]').textContent = 'Unlock';
  $('[data-builder-status]').textContent = `${ownedIds(collection).length} / ${displayMaterials.length}`;
  shell.dataset.collected = String(ownedIds(collection).length);
  const displayIds=home?featuredRecipe(family):ids;
  styles?.render({isHome:home,finished,family,activeChallenge});
  const points = beadPoints(layout.loop, displayIds), buttons = $('[data-cord-buttons]');
  buttons.replaceChildren(...points.map((p, index) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.cordIndex = index; b.setAttribute('aria-label', `${home?'Start with':'Edit'} ${index + 1}. ${materialById.get(displayIds[index]).name}`);
    if(home){b.dataset.homeBead=displayIds[index];delete b.dataset.cordIndex;}
    b.setAttribute('aria-pressed', String(held?.kind === 'cord' && held.index === index)); b.disabled = finished;
    const hit=Math.max(44,p.size),pose=beadPose(p,displayIds[index]);position(b, pose.x - hit/2, pose.y - hit/2, hit); return b;
  }));
  const list=inventory(),t=layout.tray,scroll=$('[data-box-scroll]'),grid=$('[data-box-buttons]');
  const signature=`${Boolean(art)}:${family}:${boxMode}:${trayGroup}:${list.map(m=>`${m.id}:${Boolean(m.locked)}`).join(',')}`;
  position(scroll,t.x,t.y,t.w,t.h);
  grid.style.setProperty('--cell-height',`${t.rowH}px`);
  if(art) grid.style.backgroundImage=`url(${art.trayUrl})`;
  if(signature!==traySignature){
    traySignature=signature;grid.replaceChildren(...list.map(m=>{
      const b=document.createElement('button');b.type='button';
      if(m.locked){b.dataset.action='unlock';b.dataset.unlockId=m.id;b.className='locked-teaser';}
      else {b.dataset.pickId=m.id;b.dataset.source=JSON.stringify(m.source);}
      b.setAttribute('aria-label',`${m.locked?'Unlock':'Pick'} ${m.name}`);b.title=m.name;b.disabled=!art;
      if(art)for(let i=0;i<1;i++){const img=new Image();img.src=art.urls.get(m.id);img.alt='';img.draggable=false;b.append(img);}
      if(m.locked){const label=document.createElement('span');label.textContent='Locked';b.append(label);}
      return b;
    }));scroll.scrollTop=0;
  }
  grid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Boolean(held && held.id===b.dataset.pickId && held.kind!=='cord'))));
  const pager=$('[data-pager]');position(pager,t.x,t.y-44,t.w,44);
  $('[data-action="tray-beads"]').setAttribute('aria-pressed',String(!boxMode&&trayGroup==='beads'));
  $('[data-action="tray-charms"]').setAttribute('aria-pressed',String(!boxMode&&trayGroup==='charms'));
  position($('[data-all-beads]'),t.x,t.y+t.h+8,44);
  const aside = $('[data-aside]'); position(aside, t.x+48, t.y + t.h + 8, t.w-48, 48); aside.setAttribute('aria-pressed', String(boxMode)); aside.dataset.active = String(target?.kind === 'box');
  if(art)aside.style.backgroundImage=`url(${art.returnUrl})`;
  aside.querySelector('span').textContent = boxMode ? 'Beads' : 'Set aside'; aside.setAttribute('aria-label', boxMode ? 'Back to bead catalog' : 'Open beads set aside');
  const insert = $('[data-insert]'), drop = target?.kind === 'cord' ? target : defaultTarget();
  position(insert, drop.point.x - 22, drop.point.y - 22, 44); insert.disabled = !held; insert.hidden = home || finished || !held && ids.length > 0 || ids.length >= 14 && held?.kind !== 'cord'; insert.dataset.active = String(Boolean(held));
  [pager, aside, scroll, $('[data-all-beads]')].forEach(node => node.hidden = finished || home);
  if (art) {
    const available = new Set(availableMaterials(game).map(m => m.id));
    $('[data-materials]').replaceChildren(...displayMaterials.filter(m => (category === 'all' || m.category === category) && (!family || presentationFor(m.id).family===family)).map(m => {
      const b = document.createElement('button'); b.type = 'button'; const locked = !available.has(m.id);
      if (locked) b.dataset.unlockId = m.id; else b.dataset.materialId = m.id;
      b.setAttribute('aria-label', `${locked ? 'Unlock' : 'Add'} ${m.name}`);
      const img = new Image(); img.src = art.urls.get(m.id); img.alt = ''; const label = document.createElement('span'); label.textContent = m.name; b.append(img, label); return b;
    }));
  }
  draw(performance.now());
}
function draw(now = 0) {
  if (!art || !layout || !ctx) return;
  const dpr = canvas.width / layout.width; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, layout.width, layout.height);
  const { phone: p, loop } = layout, ids = home ? featuredRecipe(family) : draft().ids;
  if (!charmOnly || !finished) {
    ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.rotate(p.angle); ctx.shadowColor = '#46351e55'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 7; if(p.flip)ctx.scale(-1,1); ctx.drawImage(art.phone, -p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    const route=phoneConnection(p,loop);paintCord(ctx,route.points,home?'cord-cotton':collection.cordId,1,cord);
    paintBead(ctx,art.clasp,route.clasp.x,route.clasp.y,Math.min(30,p.h*.17),route.angle);
  }
  paintCord(ctx,loopPath(loop).points,home?'cord-cotton':collection.cordId,1,cord);
  if(finished&&charmOnly){const tip=loopPoint(loop,0);paintBead(ctx,art.clasp,tip.x,tip.y-13,38,-.12);}
  const previewIndex=!home&&held&&(!pointer?.moved||target?.kind==='cord')&&target?.kind!=='box'?(target?.index??ids.length):null;
  const pieces=previewPieces(ids,home?null:held,previewIndex),points=beadPoints(loop,pieces.map(piece=>piece.id));
  shell.dataset.previewIndex=previewIndex==null?'':String(previewIndex);
  const slot=pieces.findIndex(piece=>piece.held);
  $('[data-insert]').hidden=home||finished||(!held&&ids.length>0)||(held&&slot<0);
  if(slot>=0)position($('[data-insert]'),points[slot].x-22,points[slot].y-22,44);
  points.forEach((pnt, i) => {
    const piece=pieces[i],key=`${piece.originalIndex}:${piece.id}`,previous=visualPoints.get(key)||pnt;
    const smoothing=reduced.matches||home?1:.24;
    const shown={...pnt,x:previous.x+(pnt.x-previous.x)*smoothing,y:previous.y+(pnt.y-previous.y)*smoothing};
    visualPoints.set(key,shown);
    ctx.save(); if (piece.held) ctx.globalAlpha = .25;
    const pulse = reduced.matches ? 1 : 1 + Math.max(0, 1 - (now - snapAt) / 320) * .07;
    const charm=isCharm(piece.id),pose=beadPose(shown,piece.id);
    if(charm)paintBead(ctx,art.ring,shown.x,shown.y,8,0);
    paintBead(ctx, art.sprites.get(piece.id), pose.x, pose.y, pnt.size * pulse, pose.angle);
    if(i<points.length-1){const between=pointAtLength(loop,(pnt.distance+pnt.size/2+points[i+1].distance-points[i+1].size/2)/2);paintBead(ctx,art.spacer,between.x,between.y,Math.max(5,Math.min(8,pnt.size*.26)),between.angle-Math.PI/2);}
    ctx.restore();
  });
  for(const key of visualPoints.keys())if(!pieces.some(piece=>`${piece.originalIndex}:${piece.id}`===key))visualPoints.delete(key);
  if (!finished) {
    if (held && !pointer?.moved) {
      const d=slot>=0?points[slot]:defaultTarget().point;paintBead(ctx,art.sprites.get(held.id),d.x+8,d.y-37,32,-.08,.3);
    }
  }
}
function resize() {
  const rect = work.getBoundingClientRect(); if (rect.width <= 0 || rect.height <= 0) return;
  shell.dataset.state=home?'home':finished?'finished':'compose';
  layout = jewelryLayout(rect.width, rect.height, finished, charmOnly,home);
  const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  render();
}
ui = createStudioUI({ materials:displayMaterials, getAvailable:availableMaterials, onStatus: status, getComposition: () => draft().ids, onCord: color => {const changed=cord!==color;cord=color;if(ui&&changed){collection.cordId='cord-classic';save();render();}else draw();}, onSelect: index => { selected = index; render(); openDialog('piece'); } });
const collecting = createCollectionUI({shell, getCollection:()=>collection, setCollection:next=>{collection=next;save();render();}, getArt:()=>art, sound,
  beforeOpen:()=>{cancel(true);replacing=false;}, onUse:id=>{home=false;finished=false;charmOnly=false;boxMode=false;resize();if(cordById.has(id))applyCord(id);else pick({kind:'catalog',id});}});
function applyCord(id){const next=selectCord(collection,id);if(!next||id===collection.cordId)return;edits.record(saveKey(game),{...draft(),cordId:collection.cordId});collection=next;save();render();sound.play('select');status(cordById.get(id).name);}
const cords=createCordUI({shell,getArt:()=>art,getCollection:()=>collection,onSelect:applyCord,onUnlock:id=>collecting.open(id)});
const card = createCreationCard({shell,getArt:()=>art,getDesign:()=>({ids:draft().ids,cord,cordId:collection.cordId}),getNote:()=>collection.note,
  setNote:note=>{collection.note=note;save();},sound});
const toolsRow = document.createElement('div'); toolsRow.className = 'dialog-actions'; toolsRow.innerHTML = '<button type="button" data-action="collection">All beads</button><button type="button" data-action="cords">Cords</button><button type="button" data-action="customize">Details</button><button type="button" data-action="settings">Shop settings</button>';
$('[data-dialog="sequence"]').append(toolsRow);
function enterDIY(){home=false;finished=false;charmOnly=false;game.mode='free';resize();sound.play('select');}
function enterUnlockGame(){
  if(openingHomeGame||document.querySelector('[data-dialog="match"]')?.open)return;
  openingHomeGame=true;home=false;finished=false;charmOnly=false;boxMode=false;game.mode='free';resize();
  if(!art){pendingHomeGame=true;openingHomeGame=false;return;}
  const opened=collecting.openAndStart();openingHomeGame=false;
  if(!opened)status('Collection complete');
}
$('[data-home-hook]').addEventListener('click',enterUnlockGame);
styles=createStyleUI({shell,getArt:()=>art,getIds:()=>draft().ids,getBook:()=>styleBook,
  onFamily:id=>{cancel(true);family=id;boxMode=false;render();sound.play('select');status(id?FAMILIES.find(f=>f.id===id).name:'All beads');},
  onChallenge:id=>{activeChallenge=id;family=id;cancel(true);render();sound.play('select');if(id)styles.showRules();},
  onStart:enterUnlockGame});
const homeButton=$('.tt-header>button:first-child');homeButton.dataset.action='home';homeButton.setAttribute('aria-label','Back to home');homeButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>';
new ResizeObserver(resize).observe(work); resize();
async function prepare() {
  try {
    if (!ctx) throw new Error('Canvas is unavailable');
    art = await loadTabletopArt(); shell.style.backgroundImage = `url("${art.backgroundUrl}")`; shell.dataset.ready = 'true'; $('[data-loading]').hidden = true; if(!home)save(); resize();
    if(pendingHomeGame){pendingHomeGame=false;queueMicrotask(enterUnlockGame);}
    const tick = now => { raf = 0; draw(now); if (!document.hidden && !reduced.matches) raf = requestAnimationFrame(tick); };
    const resume = () => { if (!raf && !document.hidden && !reduced.matches) raf = requestAnimationFrame(tick); else draw(); };
    reduced.addEventListener('change', resume); document.addEventListener('visibilitychange', resume); resume();
  } catch {
    shell.dataset.ready = 'failed'; const message = $('[data-loading]'); message.textContent = 'Your bead box could not load.';
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Try again'; retry.onclick = () => { message.textContent = 'A little sunshine…'; void prepare(); }; message.append(retry);
  }
}
void prepare();
work.addEventListener('pointerdown', event => {
  if (home || finished || !art || event.button !== 0) return;
  if (pointer && pointer.id !== event.pointerId) { cancel(); return; }
  const bead = event.target.closest('[data-source]'), placed = event.target.closest('[data-cord-index]');
  if(event.target.closest('[data-action]'))return;
  const intent=pointerIntent(Boolean(held),bead?'catalog':placed?'cord':'surface');
  if(intent==='none')return;
  if(intent==='browse'){
    pointer={id:event.pointerId,start:pointFrom(event),moved:false,intent:'pending',source:JSON.parse(bead.dataset.source)};return;
  }
  if(intent==='pick-cord'){
    // Dense 44px buttons overlap: pick the geometrically closest actual bead.
    const p=pointFrom(event),points=beadPoints(layout.loop,draft().ids).map((point,i)=>({...point,...beadPose(point,draft().ids[i])}));
    const index=points.reduce((best,point,i)=>Math.hypot(point.x-p.x,point.y-p.y)<Math.hypot(points[best].x-p.x,points[best].y-p.y)?i:best,0);
    pick({kind:'cord',index});
  }
  const explicitSlot=event.target.closest('[data-insert]') ? (target?.kind==='cord'?target:defaultTarget()) : null;
  pointer = { id: event.pointerId, start: pointFrom(event), moved: false, picked:intent==='pick-cord',intent,explicitSlot };
  if(intent==='place')target=explicitSlot||dropTarget(pointFrom(event));
  work.setPointerCapture(event.pointerId);
});
work.addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const point = pointFrom(event),dx=point.x-pointer.start.x,dy=point.y-pointer.start.y;
  if(pointer.intent==='pending'){
    if(Math.abs(dy)>9&&Math.abs(dy)>Math.abs(dx)*1.1){pointer.intent='scroll';return;}
    if(Math.abs(dx)<=8)return;
    const prior=pointer;pick(prior.source);pointer=prior;pointer.intent='drag';pointer.picked=true;work.setPointerCapture(event.pointerId);
  }
  if(pointer.intent==='scroll'||!held)return;
  pointer.moved ||= Math.hypot(dx,dy)>6;
  if (!pointer.moved) return;
  target = dropTarget(point); const ghost = $('[data-ghost]'); ghost.hidden = false;
  if(ghost.dataset.id!==held.id){ghost.dataset.id=held.id;const img=new Image();img.src=art.urls.get(held.id);img.alt='';ghost.replaceChildren(img);}
  ghost.style.left = `${event.clientX}px`; ghost.style.top = `${event.clientY-26}px`;
  const insert = $('[data-insert]'); if (target?.kind === 'cord') position(insert, target.point.x - 22, target.point.y - 22, 44);
  $('[data-aside]').dataset.active = String(target?.kind === 'box');
  draw(performance.now());
});
work.addEventListener('pointerup', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const prior = pointer; pointer = null; lastPointerUp = performance.now();
  if(prior.intent==='scroll')return;
  if(prior.intent==='pending'){pick(prior.source);return;}
  if (prior.moved || !prior.picked) {
    const destination = !prior.moved&&prior.explicitSlot ? prior.explicitSlot : dropTarget(pointFrom(event)); if (destination) commit(destination); else cancel();
  } else if (held?.kind === 'cord') { selected = held.index; cancel(true); render(); suppressOpeningClick=true; openDialog('piece'); }
  else render();
});
work.addEventListener('pointercancel', () => {if(pointer?.intent==='scroll'||pointer?.intent==='pending')pointer=null;else cancel();});
work.addEventListener('lostpointercapture', () => { if (pointer) cancel(); });
window.addEventListener('blur', () => { if (held) cancel(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && held) cancel(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && held) { event.preventDefault(); cancel(); } });
document.addEventListener('pointerdown', event => {
  suppressOpeningClick=false;
  if (pointer && pointer.id !== event.pointerId) { cancel(); return; }
  if (!event.target.closest('[data-action="sound"]')) void sound.unlock();
}, { capture: true });
$('[data-dialog="collection"]').addEventListener('close', () => { replacing = false; });
// A tap opens the editor on pointerup; consume its trailing click before it can
// land on a newly revealed dialog action. A new gesture is never suppressed.
document.addEventListener('click',event=>{const block=suppressOpeningClick&&event.detail>0;suppressOpeningClick=false;if(block){event.preventDefault();event.stopImmediatePropagation();}}, {capture:true});
document.addEventListener('click', event => {
  const b = event.target.closest('button'); if (!b || b.disabled) return;
  const originatingDialog = b.closest('dialog');
  if(b.dataset.homeBead){enterDIY();if(ownedIds(collection).includes(b.dataset.homeBead))pick({kind:'catalog',id:b.dataset.homeBead});else collecting.open(b.dataset.homeBead);return;}
  if (event.detail === 0 && b.dataset.source) { pick(JSON.parse(b.dataset.source)); $('[data-insert]').focus(); return; }
  if (event.detail === 0 && b.dataset.cordIndex !== undefined) { selected = Number(b.dataset.cordIndex); render(); openDialog('piece'); return; }
  if (b.hasAttribute('data-insert') && held && performance.now() - lastPointerUp > 50) { commit(defaultTarget()); return; }
  const action = b.dataset.action;
  if(action==='cords'){cancel(true);cords.open();return;}
  if(action==='home'){cancel(true);home=true;finished=false;charmOnly=false;resize();return;}
  if (action === 'unlock' || b.dataset.unlockId) { collecting.open(b.dataset.unlockId); return; }
  if (action === 'make-card') { if (finished) card.open(); return; }
  if(action==='tray-beads'||action==='tray-charms'){cancel(true);boxMode=false;family='';trayGroup=action==='tray-charms'?'charms':'beads';render();sound.play('select');}
  if (action === 'open-letter') ui.showRequirements(game, draft().ids);
  if (['levels', 'sequence', 'collection', 'settings', 'customize'].includes(action) && held) cancel(true);
  if (action === 'box-mode') {
    if (held?.kind === 'cord') commit({ kind: 'box' }); else { cancel(true); boxMode = !boxMode; render(); sound.play('select'); }
  }
  if (b.dataset.category) { category = b.dataset.category; boxMode = false; document.querySelectorAll('[data-category]').forEach(n => n.setAttribute('aria-pressed', String(n === b))); render(); }
  if (b.dataset.materialId || b.dataset.returnedIndex !== undefined) {
    const id = b.dataset.materialId;
    if (id && !availableMaterials(game).some(m => m.id === id)) return;
    if (id && replacing && selected >= 0 && draft().ids[selected]) {
      const next = { ids: [...draft().ids], box: [...draft().box] }; next.ids[selected] = id; replacing = false; saveDraft(next, 'replace', id);
    } else { pick(id ? { kind: 'catalog', id } : { kind: 'box', index: Number(b.dataset.returnedIndex) }); commit({ kind: 'cord', index: draft().ids.length }); }
    originatingDialog?.close();
  }
  if (b.dataset.playMode || b.dataset.level) {
    cancel(true); if (b.dataset.playMode) game.mode = b.dataset.playMode;
    if (b.dataset.level) { if (COMMISSIONS.findIndex(l => l.id === b.dataset.level) > game.completed.length) return; game.mode = 'challenge'; game.levelId = b.dataset.level; }
    finished = false; boxMode = false; replacing = false; save(); resize(); originatingDialog?.close();
  }
  if (action === 'undo') { cancel(true); const previous = edits.undo(saveKey(game)); if (previous) { game.drafts[saveKey(game)] = previous.ids; game.boxes[saveKey(game)] = previous.box;if(previous.cordId)collection=selectCord(collection,previous.cordId)||collection; save(); sound.play('undo'); render(); } }
  if (action === 'clear') { cancel(true); saveDraft({ ids: [], box: [...draft().box] }, 'undo'); originatingDialog?.close(); }
  if (action === 'remove' || action === 'move-earlier' || action === 'move-later') {
    pick({ kind: 'cord', index: selected }); commit(action === 'remove' ? { kind: 'box' } : { kind: 'cord', index: selected + (action === 'move-earlier' ? -1 : 2) }); originatingDialog?.close();
  }
  if (action === 'replace') { replacing = true; openDialog('collection'); }
  if (action === 'finish' && draft().ids.length >= 3) {
    if(activeChallenge){
      const check=evaluateStyle(activeChallenge,draft().ids);
      if(!check.passed){cancel(true);styles.showRules();sound.play('retry');return;}
      const wasComplete=styleBook.stamps.includes(activeChallenge);styleBook=completeStyle(styleBook,activeChallenge,draft().ids);
      if(!writeStored(STYLE_BOOK_KEY,styleBook))status('Stamp kept for this session');else if(!wasComplete)status(`${FAMILIES.find(f=>f.id===activeChallenge).name} · Complete`);
    }
    cancel(true); result = game.mode === 'free' ? null : deliver(game); save(); finished = true; charmOnly = false; resize(); ui.showFinished(game, result);
    sound.play(result?.first ? 'reward' : result && !result.passed ? 'retry' : 'complete');
    if (result?.first) status(`Unlocked ${materialById.get(result.reward).name}`);
  }
  if (action === 'view-charm' || action === 'view-phone') { charmOnly = action === 'view-charm'; resize(); }
  if (action === 'edit') { finished = false; charmOnly = false; resize(); }
  if (action === 'next') {
    const index = COMMISSIONS.findIndex(l => l.id === game.levelId);
    if (game.mode === 'free') saveDraft({ ids: [], box: [...draft().box] }, 'undo');
    else if (result?.passed && index < 4) game.levelId = COMMISSIONS[index + 1].id;
    else if (result?.passed) game.mode = 'free';
    finished = false; charmOnly = false; boxMode = false; save(); resize();
  }
});
