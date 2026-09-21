import { describe, expect, it } from 'vitest';
import { CORDS, ownedCordIds, selectCord } from './cord-catalog.js';
import { normalizeCollection, canUnlock, startRound, chooseTile, claimReward } from './collection-game.js';
import { jewelryLayout, phoneConnection } from './tabletop-layout.js';
import { cordSamples } from './cord-art.js';

const now=new Date(2026,8,15,12).getTime();
const win=(id)=>{let r=startRound(id,now,0,()=>.3);for(const value of new Set(r.board))for(let i=0;i<12;i++)if(r.board[i]===value)r=chooseTile(r,i,now+1000,1000).round;return r;};
describe('V19 collectible cord materials',()=>{
  it('offers four new textures and preserves the original cord',()=>{
    expect(CORDS).toHaveLength(5);expect(new Set(CORDS.map(c=>c.texture)).size).toBe(5);
    expect(ownedCordIds(normalizeCollection(null))).toEqual(['cord-cotton','cord-satin','cord-classic']);
    const defaultCord=CORDS.find(c=>c.id==='cord-cotton');
    expect(defaultCord?.name).toBe('Ice blue braid');expect(defaultCord?.color).toBe('#9fc9dd');
    expect([defaultCord?.color,defaultCord?.dark,defaultCord?.light]).not.toContain('#a46337');
  });
  it('keeps unknown/unearned cords and cord IDs out of the bead draft',()=>{
    const c=normalizeCollection({version:1,cordId:'cord-silver',unlockedCords:['fake'],ids:['pearl','cord-silver'],box:[],unlocked:[]});
    expect(c.cordId).toBe('cord-cotton');expect(c.ids).toEqual(['pearl']);expect(c.unlockedCords).toEqual([]);
    expect(selectCord(c,'cord-silver')).toBeNull();expect(selectCord(c,'fake')).toBeNull();
  });
  it('selects a starter without rewriting the design or Note',()=>{
    const c=normalizeCollection({version:1,ids:['pearl','amber-cube','pearl'],box:['aqua-drop'],note:'mine'});
    const next=selectCord(c,'cord-satin');expect(next.cordId).toBe('cord-satin');
    expect(next.ids).toEqual(c.ids);expect(next.box).toEqual(c.box);expect(next.note).toBe(c.note);
    expect(normalizeCollection(next)).toEqual(next);
  });
  it('earns a cord through real matching, but does not automatically apply it',()=>{
    const c=normalizeCollection(null);expect(canUnlock(c,'cord-silver',now)).toBe(true);
    const r=claimReward(c,win('cord-silver'),now);
    expect(r.granted).toBe(true);expect(r.collection.unlockedCords).toEqual(['cord-silver']);
    expect(r.collection.unlocked).toEqual([]);expect(r.collection.cordId).toBe('cord-cotton');
    expect(selectCord(r.collection,'cord-silver').cordId).toBe('cord-silver');
    expect(canUnlock(r.collection,'gold-medallion',now)).toBe(true);
    expect(claimReward(r.collection,win('cord-silver'),now).granted).toBe(false);
  });
  it('a bead reward still allows a different cord reward the same day',()=>{
    const r=claimReward(normalizeCollection(null),win('gold-medallion'),now);
    expect(canUnlock(r.collection,'cord-sea-braid',now)).toBe(true);
    expect(canUnlock(r.collection,'cord-sea-braid',now+86400000)).toBe(true);
  });
  it('samples the actual path evenly instead of stretching one fixed rope image',()=>{
    const s=cordSamples([{x:0,y:0},{x:10,y:0},{x:10,y:10}],2);
    expect(s.length).toBe(11);expect(s[5]).toMatchObject({x:10,y:0});expect(s.at(-1)).toMatchObject({x:10,y:10});
    expect(s.every(p=>Number.isFinite(p.angle))).toBe(true);
  });
  it('the approved portrait phone is large and connects through its right eyelet',()=>{
    const l=jewelryLayout(374,603,false,false,true);
    expect(l.phone.w).toBeGreaterThanOrEqual(374*.33);expect(l.phone.w).toBeLessThanOrEqual(374*.41);
    const route=phoneConnection(l.phone,l.loop);
    expect(route.anchor.x).toBeGreaterThan(l.phone.x+l.phone.w*.8);
  });
});
