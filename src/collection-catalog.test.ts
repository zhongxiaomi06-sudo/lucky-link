import { describe, expect, it } from 'vitest';
import { MATERIALS as legacy } from './materials.js';
import { MATERIALS, materialById, FAMILIES, FEATURED_IDS, presentationFor, NEW_STARTER_IDS } from './collection-catalog.js';
import { normalizeCollection, ownedIds } from './collection-game.js';
import { evaluateStyle, completeStyle, normalizeStyleBook } from './style-challenges.js';
import { transfer } from './styling-game.js';
import { createOrderText, normalizeCommerce } from './commerce.js';
import { jewelryLayout, beadPoints, beadPose } from './tabletop-layout.js';
import { featuredRecipe } from './style-ui.js';

describe('V17 independent playable collection', () => {
  it('preserves the legacy catalog and adds eleven ice-blue mainline modules', () => {
    expect(legacy).toHaveLength(29); expect(MATERIALS).toHaveLength(70);
    expect(new Set(MATERIALS.map(m=>m.id)).size).toBe(70);
    expect(MATERIALS.slice(0,29).map(m=>m.id)).toEqual(legacy.map(m=>m.id));
    expect(FAMILIES).toHaveLength(6);
    const art=MATERIALS.map(m=>presentationFor(m.id)).filter(p=>p.atlas);
    expect(art).toHaveLength(53);
    expect(new Set(art.map(p=>`${p.atlas}:${p.cell}`)).size).toBe(53);
    expect(FEATURED_IDS).toHaveLength(14);
    FEATURED_IDS.forEach(id=>expect(presentationFor(id).atlas).toBeTruthy());
  });
  it('keeps the expanded catalog while new players begin with six pieces', () => {
    expect(NEW_STARTER_IDS).toHaveLength(15);
    expect(ownedIds(normalizeCollection(null))).toHaveLength(6);
    const collection=normalizeCollection(null,{drafts:{free:['sea-star','pearl']},boxes:{free:['chrome-bow']},claimed:[]});
    expect(collection.ids).toEqual(['sea-star','pearl']);
    expect(collection.box).toEqual(['chrome-bow']);
    expect(ownedIds(collection)).toContain('sea-star');
  });
  it('injects a new ID into transfer and commerce without changing legacy defaults', () => {
    const source={kind:'catalog',id:'chrome-bow'}, draft={ids:[],box:[]};
    expect(transfer(draft,source,{kind:'cord',index:0})).toBeNull();
    expect(transfer(draft,source,{kind:'cord',index:0},id=>materialById.has(id))?.ids).toEqual(['chrome-bow']);
    expect(createOrderText(['chrome-bow'],{},materialById)).toContain('Silver bow');
    expect(normalizeCommerce({materialLinks:{'chrome-bow':'https://example.com/bow'}},materialById).materialLinks).toHaveProperty('chrome-bow');
  });
});

describe('six optional style challenges',()=>{
  it('has genuinely distinct rules, catalog-valid samples, and no invalid design wins',()=>{
    for(const family of FAMILIES){
      expect(family.solution.every(id=>materialById.has(id))).toBe(true);
      const result=evaluateStyle(family.id,family.solution);
      expect(result.rules).toHaveLength(3);expect(result.passed).toBe(true);
      expect(evaluateStyle(family.id,[]).passed).toBe(false);
      expect(evaluateStyle(family.id,['unknown',...family.solution]).passed).toBe(false);
    }
  });
  it('awards local stamps idempotently and never changes the collection economy',()=>{
    const family=FAMILIES[0],book=normalizeStyleBook(null);
    expect(completeStyle(book,family.id,[]).stamps).toEqual([]);
    const once=completeStyle(book,family.id,family.solution);
    expect(once.stamps).toEqual([family.id]);
    expect(completeStyle(once,family.id,family.solution)).toEqual(once);
    expect(normalizeStyleBook({stamps:['fake',family.id,family.id]}).stamps).toEqual([family.id]);
  });
});

describe('V17 enlarged, shared jewelry geometry',()=>{
  for(const f of ['',...FAMILIES.map(f=>f.id)])it(`keeps every ${f||'featured'} home charm inside the frame`,()=>{
    const l=jewelryLayout(374,603,false,false,true);
    beadPoints(l.loop,featuredRecipe(f)).forEach((p,i)=>{const pose=beadPose(p,featuredRecipe(f)[i]);expect(pose.x-p.size/2).toBeGreaterThanOrEqual(0);expect(pose.x+p.size/2).toBeLessThanOrEqual(374);});
  });
  for(const [width,height] of [[374,620],[386,650],[304,372],[828,262],[552,191]]){
    it(`keeps chain art away from the box at ${width}x${height}`,()=>{
      const layout=jewelryLayout(width,height),points=beadPoints(layout.loop,FEATURED_IDS);
      points.forEach((p,i)=>{
        const pose=beadPose(p,FEATURED_IDS[i]),r=p.size/2;
        expect(pose.x-r).toBeGreaterThanOrEqual(-2);expect(pose.x+r).toBeLessThanOrEqual(width+2);
        expect(pose.y-r).toBeGreaterThanOrEqual(-2);expect(pose.y+r).toBeLessThanOrEqual(height+2);
        const box=layout.tray;
        expect(pose.x+r<box.x||pose.x-r>box.x+box.w||pose.y+r<box.y-40||pose.y-r>box.y+box.h).toBe(true);
      });
    });
  }
});
