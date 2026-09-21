import { MATERIALS, materialById, NEW_STARTER_IDS, CRAFT_REWARD_IDS, isDisplayMaterial } from './collection-catalog.js';
import { cordById, CORD_REWARD_IDS, ownedCordIds, normalizeCordState } from './cord-catalog.js';
import { ICE_BLUE_MODULE_IDS, normalizeMainline } from './ice-blue-mainline.js';

export const COLLECTION_KEY = 'lucky-link.collection.v1';
export const COLLECTION_VERSION = 2;
export const LEGACY_STARTER_IDS = ['aqua-drop', 'pearl', 'lilac-heart', 'blue-star', 'rose-prism', 'amber-cube', 'coral-shell', 'blue-eye', 'jade-ring', 'lime-gem', 'cobalt-gem', 'coral-knot', 'cobalt-orb', 'sun-orb', ...NEW_STARTER_IDS];
export const STARTER_IDS = ['pearl','moon-pearl','chrome-bow','chrome-star','aqua-drop','blue-star'];
export const ROUND_MS = 30000;
const valid = list => Array.isArray(list) ? list.filter(id => typeof id === 'string' && materialById.has(id)) : [];
export const cleanNote = value => typeof value === 'string' ? [...value.replace(/\r\n?/g, '\n')].filter(ch => {const code=ch.codePointAt(0);return code===9||code===10||code>=32&&code!==127;}).slice(0, 120).join('') : '';
export const dayKey = now => { const d = new Date(now); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const ownedIds = c => [...new Set([...STARTER_IDS, ...valid(c?.unlocked),...normalizeMainline(c?.mainline).unlocked])].filter(isDisplayMaterial);
export const rewardItem = id => materialById.get(id)||cordById.get(id);
export const ownsReward = (c,id) => cordById.has(id)?ownedCordIds(c).includes(id):ownedIds(c).includes(id);
export const REWARD_SEQUENCE=[...new Set([...CRAFT_REWARD_IDS.filter(isDisplayMaterial),...CORD_REWARD_IDS,...MATERIALS.map(m=>m.id).filter(isDisplayMaterial)])];
export const rewardLevel=id=>Math.max(1,REWARD_SEQUENCE.indexOf(id)+1);
export const nextUnlockId = c => REWARD_SEQUENCE.find(id=>!ownsReward(c,id)) || null;
export function normalizeCollection(raw, legacy) {
  const c = {version:COLLECTION_VERSION, ids:[], box:[], unlocked:[], note:'', lastRewardDay:'',mainline:normalizeMainline(raw?.mainline),...normalizeCordState(raw)};
  if (raw?.version === COLLECTION_VERSION || raw?.version === 1) {
    const preserved = raw.version === 1 ? LEGACY_STARTER_IDS : [];
    c.unlocked = [...new Set([...valid(raw.unlocked),...preserved])].filter(id => !STARTER_IDS.includes(id));
    const owns = new Set(ownedIds(c));
    c.ids = valid(raw.ids).filter(id => owns.has(id)).slice(0,14);
    c.box = valid(raw.box).filter(id => owns.has(id)).slice(0,60);
    c.note = cleanNote(raw.note);
    c.lastRewardDay = typeof raw.lastRewardDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastRewardDay) ? raw.lastRewardDay : '';
    c.mainline=normalizeMainline(raw.mainline);
  } else if (legacy) {
    const key = legacy.mode === 'free' || !legacy.levelId ? 'free' : legacy.levelId;
    c.ids = valid(legacy.drafts?.[key]).slice(0,14); c.box = valid(legacy.boxes?.[key]).slice(0,60);
    const prior = [...Object.values(legacy.drafts || {}), ...Object.values(legacy.boxes || {})].flatMap(valid);
    const claimed=Array.isArray(legacy.claimed)?legacy.claimed:[];
    const rewards = MATERIALS.filter(m => m.reward && claimed.includes(m.reward)).map(m => m.id);
    c.unlocked = [...new Set([...LEGACY_STARTER_IDS,...prior,...rewards])].filter(id => !STARTER_IDS.includes(id));
  }
  c.unlocked=c.unlocked.filter(id=>!ICE_BLUE_MODULE_IDS.includes(id));
  const owns=new Set(ownedIds(c));
  c.ids=c.ids.filter(id=>owns.has(id));
  c.box=c.box.filter(id=>owns.has(id));
  return c;
}
export const canUnlock = (c,id) => Boolean(rewardItem(id)) && (cordById.has(id)||isDisplayMaterial(id)) && !ownsReward(c,id);
function shuffle(list, random) {
  const result = [...list];
  for (let i=result.length-1;i>0;i--) { const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1)))); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function startRound(rewardId, now=Date.now(), mono=performance.now(), random=Math.random) {
  const types = shuffle(STARTER_IDS, random).slice(0,6);
  return {rewardId, board:shuffle([...types,...types],random), selected:null, matched:[], startedAt:now, startedMono:mono, elapsed:0, combo:0, lastMatchAt:null, bonusMs:0, bonusGranted:false, status:'playing'};
}
export function refreshRound(round, now=Date.now(), mono=performance.now()) {
  if (round.status !== 'playing') return round;
  const elapsed = Math.max(round.elapsed, now-round.startedAt-(round.bonusMs||0), mono-round.startedMono-(round.bonusMs||0), 0);
  return {...round,elapsed,status:elapsed>=ROUND_MS?'lost':'playing'};
}
export function chooseTile(round, index, now=Date.now(), mono=performance.now()) {
  const r = refreshRound(round, now, mono);
  if(r.status!=='playing'||!Number.isInteger(index)||index<0||index>=r.board.length||r.matched.includes(index)||r.selected===index) return {round:r,event:'none'};
  if(r.selected===null) return {round:{...r,selected:index},event:'select'};
  const pair=[r.selected,index];
  if(r.board[r.selected]!==r.board[index]) return {round:{...r,selected:null},event:'miss',pair};
  const matched=[...r.matched,...pair];
  const combo=r.lastMatchAt!==null&&now-r.lastMatchAt<=2000?Math.min(3,(r.combo||0)+1):1;
  const earnsBonus=combo===3&&!r.bonusGranted;
  return {round:{...r,selected:null,matched,combo,lastMatchAt:now,bonusMs:(r.bonusMs||0)+(earnsBonus?800:0),bonusGranted:r.bonusGranted||earnsBonus,status:matched.length===12?'won':'playing'},event:'match',pair,combo,bonus:earnsBonus?800:0};
}
export function claimReward(collection, round, now=Date.now()) {
  const legacyWin=round?.status==='won'&&round.matched?.length===12&&new Set(round.matched).size===12&&round.elapsed<ROUND_MS;
  const gravityWin=round?.mode==='gravity'&&round.status==='won'&&round.score>=round.targetScore;
  const legitimate = legacyWin||gravityWin;
  if(!legitimate||!canUnlock(collection,round.rewardId,now))return {collection,granted:false,grantedIds:[]};
  const granted=cordById.has(round.rewardId)?{unlockedCords:[...(collection.unlockedCords||[]),round.rewardId]}:{unlocked:[...collection.unlocked,round.rewardId]};
  return {collection:{...collection,...granted},granted:true,grantedIds:[round.rewardId]};
}
