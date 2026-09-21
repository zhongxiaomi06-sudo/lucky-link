import { describe, expect, it, vi } from 'vitest';
import { MATERIALS, CRAFT_IDS, CRAFT_REWARD_IDS, presentationFor } from './collection-catalog.js';
import { normalizeCollection, ownedIds, nextUnlockId } from './collection-game.js';
import { jewelryLayout, phoneConnection } from './tabletop-layout.js';
import { paintBead } from './tabletop-art.js';

describe('V18 real craft collection',()=>{
  it('adds six independently addressed pieces to the progressive catalog',()=>{
    expect(MATERIALS).toHaveLength(70);
    expect(CRAFT_IDS).toHaveLength(6);
    const art=CRAFT_IDS.map(presentationFor);
    expect(art.map(p=>p.cell)).toEqual([0,1,2,3,4,5]);
    expect(new Set(art.map(p=>p.atlas))).toEqual(new Set(['/assets/collections-craft-v18.png']));
    expect(art.every(p=>p.chromaKey)).toBe(true);
    const collection=normalizeCollection(null);
    expect(ownedIds(collection)).toHaveLength(6);
    expect(CRAFT_IDS.filter(id=>ownedIds(collection).includes(id))).toHaveLength(0);
    expect(CRAFT_REWARD_IDS).toHaveLength(3);
    expect(nextUnlockId(collection)).toBe(CRAFT_REWARD_IDS[0]);
    collection.unlocked=[CRAFT_REWARD_IDS[0]];
    expect(nextUnlockId(collection)).toBe('silver-flower-bead');
    collection.unlocked=[...CRAFT_REWARD_IDS];
    expect(CRAFT_IDS).not.toContain(nextUnlockId(collection));
  });
  it('uses material highlights, not drawn sparkle symbols',()=>{
    const ctx={save:vi.fn(),restore:vi.fn(),translate:vi.fn(),rotate:vi.fn(),drawImage:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn()};
    paintBead(ctx,{width:100,height:100},30,30,40,0,1);
    expect(ctx.drawImage).toHaveBeenCalledOnce();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });
});

describe('complete phone framing, including the reported DIY crop',()=>{
  for(const [w,h] of [[304,352],[374,620],[386,650],[552,191],[828,262],[1334,764]]){
    for(const home of [false,true])it(`${home?'home':'DIY'} ${w} × ${h}`,()=>{
      const {phone:p,loop}=jewelryLayout(w,h,false,false,home);
      const c=Math.cos(p.angle),s=Math.sin(p.angle);
      for(const dx of [-p.w/2,p.w/2])for(const dy of [-p.h/2,p.h/2]){
        const x=p.x+p.w/2+dx*c-dy*s,y=p.y+p.h/2+dx*s+dy*c;
        expect(x).toBeGreaterThanOrEqual(4);expect(x).toBeLessThanOrEqual(w-4);
        expect(y).toBeGreaterThanOrEqual(4);expect(y).toBeLessThanOrEqual(h-4);
      }
      const route=phoneConnection(p,loop);
      // Cord after the mount must stay outside the physical case, not slash its back.
      route.points.slice(2).forEach(q=>{
        const dx=q.x-(p.x+p.w/2),dy=q.y-(p.y+p.h/2),x=dx*c+dy*s,y=-dx*s+dy*c;
        // V19's right eyelet extends beyond the case; bodyRight is measured from that sprite.
        expect(x<=-p.w*.5||x>=p.w*p.bodyRight||y>=p.h*.48||y<=-p.h*.5).toBe(true);
      });
    });
  }
});
