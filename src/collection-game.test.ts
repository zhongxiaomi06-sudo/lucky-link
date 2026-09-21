import { describe, it, expect } from 'vitest';
import { STARTER_IDS, LEGACY_STARTER_IDS, COLLECTION_VERSION, ROUND_MS, REWARD_SEQUENCE, rewardLevel, normalizeCollection, ownedIds, cleanNote, startRound, chooseTile, refreshRound, claimReward, canUnlock, nextUnlockId, ownsReward } from './collection-game.js';
import { createGravityRound } from './gravity-game.js';
import { EXCLUDED_DISPLAY_IDS } from './collection-catalog.js';
import { ownedCordIds } from './cord-catalog.js';
const now = new Date(2026, 8, 14, 12).getTime();
function win(reward = 'sea-star') {
  let round = startRound(reward, now, 100, () => .3);
  for (const id of new Set(round.board)) {
    for (let i = 0; i < round.board.length; i++) if (round.board[i] === id) round = chooseTile(round, i, now + 1000, 1100).round;
  }
  return round;
}
describe('collection and preservation', () => {
  it('starts a new player with exactly six usable accessories', () => {
    const c = normalizeCollection(null);
    expect(c.version).toBe(COLLECTION_VERSION);expect(new Set(STARTER_IDS).size).toBe(6); expect(ownedIds(c)).toEqual(STARTER_IDS);
    expect(ownedIds(c)).not.toContain('sea-star'); expect(c.ids).toEqual([]);
  });
  it('preserves the former starter collection once while upgrading a V1 save',()=>{
    const migrated=normalizeCollection({version:1,ids:['pearl'],unlocked:[]});
    expect(migrated.version).toBe(COLLECTION_VERSION);
    expect(ownedIds(migrated)).toEqual(expect.arrayContaining(LEGACY_STARTER_IDS.filter(id=>!EXCLUDED_DISPLAY_IDS.includes(id))));
    EXCLUDED_DISPLAY_IDS.forEach(id=>expect(ownedIds(migrated)).not.toContain(id));
    expect(normalizeCollection(migrated)).toEqual(migrated);
  });
  it('migrates the active design and old used/unlocked beads without modifying legacy', () => {
    const legacy = { mode:'challenge', levelId:'ocean', drafts:{ocean:['sea-star','daisy'], free:['cherries']}, boxes:{ocean:['tiny-bell']}, claimed:['ocean'] };
    const before = JSON.stringify(legacy), c = normalizeCollection(null, legacy);
    expect(c.ids).toEqual(['sea-star','daisy']); expect(c.box).toEqual(['tiny-bell']);
    expect(ownedIds(c)).toEqual(expect.arrayContaining(['sea-star','daisy','cherries','tiny-bell'])); expect(JSON.stringify(legacy)).toBe(before);
  });
  it('does not restore removed display pieces through a legacy draft or a damaged claim list',()=>{
    const legacy={mode:'free',drafts:{free:['cinnamon-tassel','pearl','blue-star']},boxes:{free:['pink-dice','moon-pearl']},claimed:{ocean:true}};
    const before=JSON.stringify(legacy),c=normalizeCollection(null,legacy);
    expect(c.ids).toEqual(['pearl','blue-star']);expect(c.box).toEqual(['moon-pearl']);
    expect(JSON.stringify(legacy)).toBe(before);
    expect(normalizeCollection(c)).toEqual(c);
  });
  it('does not remigrate or unlock a forged stored composition', () => {
    const c = normalizeCollection({version:1, ids:['sea-star','pearl','bad'], box:['bad'], unlocked:['bad']}, {drafts:{free:['cherries']}});
    expect(c.ids).toEqual(['pearl']); expect(c.box).toEqual([]); expect(ownedIds(c)).not.toContain('cherries');
  });
  it('bounds corrupt and oversized storage', () => {
    const c = normalizeCollection({version:1, ids:Array(99).fill('pearl'), box:Array(100).fill('pearl'), unlocked:['sea-star','sea-star',{},'bad'], note:42,lastRewardDay:'bad'});
    expect(c.ids).toHaveLength(14); expect(c.box).toHaveLength(60); expect(c.unlocked).toContain('sea-star');expect(new Set(c.unlocked).size).toBe(c.unlocked.length); expect(c.note).toBe(''); expect(c.lastRewardDay).toBe('');
  });
  it('recovers malformed saved unlock lists without losing valid starter designs or mainline rewards',()=>{
    for(const unlocked of [{pearl:true},42,'sea-star',null]){
      const c=normalizeCollection({version:2,ids:['pearl','ice-module-cloud','sea-star'],box:['moon-pearl'],unlocked,note:'My saved chain',mainline:{unlocked:['ice-module-cloud'],coupons:[{value:5,claimedAt:12}]}});
      expect(c.ids).toEqual(['pearl','ice-module-cloud']);
      expect(c.box).toEqual(['moon-pearl']);expect(c.note).toBe('My saved chain');
      expect(c.unlocked).toEqual([]);expect(c.mainline.coupons).toEqual([{value:5,claimedAt:12}]);
    }
  });
  it('normalizes Note without HTML parsing and preserves Unicode', () => {
    expect(cleanNote('<b>mine</b>\u0000')).toBe('<b>mine</b>'); expect([...cleanNote('🌸'.repeat(130))]).toHaveLength(120);
    expect(cleanNote('a\r\nb')).toBe('a\nb');
  });
});
describe('timed face-up matching', () => {
  it('uses the confirmed thirty-second round', () => expect(ROUND_MS).toBe(30000));
  it('builds six pairs and does not mutate previous states', () => {
    const r = startRound('sea-star',now,100,()=>.5), copy = JSON.stringify(r);
    expect(r.board).toHaveLength(12); expect(new Set(r.board).size).toBe(6);
    for(const id of new Set(r.board)) expect(r.board.filter(x=>x===id)).toHaveLength(2);
    chooseTile(r,0,now+1,101); expect(JSON.stringify(r)).toBe(copy);
  });
  it('ignores self-pairing and invalid indexes', () => {
    let r = startRound('sea-star',now,100); r=chooseTile(r,0,now,100).round;
    expect(chooseTile(r,0,now,100).event).toBe('none'); expect(chooseTile(r,99,now,100).event).toBe('none'); expect(r.matched).toEqual([]);
  });
  it('wrong pair clears selection without removing beads', () => {
    let r=startRound('sea-star',now,100); r=chooseTile(r,0,now,100).round;
    const next=chooseTile(r,r.board.findIndex(x=>x!==r.board[0]),now+1,101);
    expect(next.event).toBe('miss'); expect(next.round.selected).toBeNull(); expect(next.round.matched).toEqual([]);
  });
  it('counts pairs once and wins at six', () => {
    const r=win(); expect(r.status).toBe('won'); expect(r.matched).toHaveLength(12);
    expect(chooseTile(r,0,now+30001,30101).event).toBe('none'); expect(refreshRound(r,now+90000,90100).status).toBe('won');
  });
  it('rejects the exact deadline and background-expired input', () => {
    const r=startRound('sea-star',now,100);
    expect(chooseTile(r,0,now+30000,30100).round.status).toBe('lost');
    expect(refreshRound(r,now+60000,101).status).toBe('lost');
  });
  it('does not gain time when wall clock moves backwards', () => {
    const r=refreshRound(startRound('sea-star',now,100),now+20000,20100);
    expect(refreshRound(r,now-10000,24100).elapsed).toBe(24000);
    expect(refreshRound(r,now-10000,30100).status).toBe('lost');
  });
  it('builds a three-step combo and gives one 800ms rhythm bonus', () => {
    let r=startRound('sea-star',now,100,()=>.3),at=now+1000,mono=1100;
    for(const id of [...new Set(r.board)].slice(0,3)){
      for(let i=0;i<r.board.length;i++)if(r.board[i]===id)r=chooseTile(r,i,at,mono).round;
      at+=500;mono+=500;
    }
    expect(r.combo).toBe(3);expect(r.bonusMs).toBe(800);
    expect(refreshRound(r,now+5000,5100).elapsed).toBe(4200);
  });
});
describe('continuous rewards', () => {
  it('keeps excluded brown pieces out of the ordered reward path',()=>{
    expect(REWARD_SEQUENCE.slice(0,4)).toEqual(['gold-medallion','silver-flower-bead','cord-sea-braid','cord-silver']);
    expect(REWARD_SEQUENCE).not.toContain('cinnamon-tassel');
    REWARD_SEQUENCE.slice(0,4).forEach((id,index)=>expect(rewardLevel(id)).toBe(index+1));
  });
  it('walks the complete reward catalog one gravity level at a time without duplicates',()=>{
    let collection=normalizeCollection(null),guard=0;const earned=[],expected=REWARD_SEQUENCE.filter(id=>!ownsReward(collection,id)).length;
    while(nextUnlockId(collection)){
      const rewardId=nextUnlockId(collection),round=createGravityRound(rewardId,()=>.2);
      const before=ownedIds(collection).length+ownedCordIds(collection).length;
      const result=claimReward(collection,{...round,score:round.targetScore,status:'won'},now+guard);
      expect(result.granted).toBe(true);collection=result.collection;earned.push(rewardId);guard++;
      expect(ownsReward(collection,rewardId)).toBe(true);
      expect(ownedIds(collection).length+ownedCordIds(collection).length).toBe(before+1);
      expect(guard).toBeLessThan(100);
    }
    expect(new Set(earned).size).toBe(earned.length);
    expect(earned).toHaveLength(expected);
    expect(nextUnlockId(collection)).toBeNull();
  });
  it('grants exactly one chosen accessory per completed gravity level and permits the next level',()=>{
    const first=createGravityRound('sea-star',()=>.1),wonFirst={...first,score:first.targetScore,status:'won'};
    const one=claimReward(normalizeCollection(null),wonFirst,now);expect(one.granted).toBe(true);expect(one.collection.unlocked).toEqual(['sea-star']);
    const second=createGravityRound('sunset-crystal',()=>.2),wonSecond={...second,score:second.targetScore,status:'won'};
    const two=claimReward(one.collection,wonSecond,now+1);expect(two.granted).toBe(true);expect(two.collection.unlocked).toEqual(['sea-star','sunset-crystal']);
    expect(claimReward(two.collection,wonFirst,now+2).granted).toBe(false);
  });
  it('grants a won target once without placing it on the chain', () => {
    const before=normalizeCollection(null), result=claimReward(before,win(),now+2000);
    expect(result.granted).toBe(true); expect(result.collection.ids).toEqual([]);
    expect(ownedIds(result.collection)).toContain('sea-star');
    expect(claimReward(result.collection,win(),now+3000).granted).toBe(false);
  });
  it('rejects incomplete, unknown and practice targets', () => {
    const c=normalizeCollection(null);
    expect(claimReward(c,startRound('sea-star',now,100),now).granted).toBe(false);
    expect(claimReward(c,win('bad'),now).granted).toBe(false);
    expect(claimReward(c,win('pearl'),now).granted).toBe(false);
  });
  it('allows another different reward immediately on the same day', () => {
    const c=claimReward(normalizeCollection(null),win(),now+1000).collection;
    expect(canUnlock(c,'sunset-crystal',now)).toBe(true);
    const second=claimReward(c,win('sunset-crystal'),now+2000);
    expect(second.granted).toBe(true);expect(ownedIds(second.collection)).toEqual(expect.arrayContaining(['sea-star','sunset-crystal']));
    expect(second.collection.lastRewardDay).toBe('');
  });
  it('ignores a legacy daily marker but never grants the same target twice', () => {
    const c=normalizeCollection({version:1,lastRewardDay:'2026-09-14'});
    expect(canUnlock(c,'sea-star',now)).toBe(true);
    const once=claimReward(c,win(),now+1000).collection;
    expect(claimReward(once,win(),now+2000).granted).toBe(false);
  });
});
