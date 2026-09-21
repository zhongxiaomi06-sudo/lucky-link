import { describe, expect, it } from 'vitest';
import { MATERIALS } from './collection-catalog.js';
import { MATERIAL_PHYSICS, materialFamilyFor, physicsFor } from './material-physics.js';
import { FIELD_HEIGHT, FIELD_WIDTH, createGravityRound, dropAccessory, stepGravity } from './gravity-game.js';
import { normalizeCollection, ownedIds } from './collection-game.js';
import { ICE_BLUE_MODULE_IDS, claimMainlineClear } from './ice-blue-mainline.js';

const identities={glass:'aqua-drop',pearl:'pearl',resin:'ice-module-penguin',metal:'chrome-bow'};
function body(type,id=100,values={}){
  return {id,type,artId:type,shape:'bead',radius:24,...physicsFor(type,24),x:160,y:180,vx:0,vy:0,vr:0,rotation:0,age:1000,settled:0,impacted:false,seeded:false,...values};
}
function roundWith(pieces){return {...createGravityRound('ice-module-star-drop',()=>.3),pieces,hasDropped:true};}
function simulate(round,frames=240,dt=16){let r=round;for(let i=0;i<frames;i++)r=stepGravity(r,dt).round;return r;}
function reboundHeight(type){
  let r=roundWith([body(type)]),hit=false,minimum=FIELD_HEIGHT;
  for(let i=0;i<160;i++){
    const result=stepGravity(r,8);r=result.round;const p=r.pieces[0];
    if(result.impact?.materialPair.includes('floor'))hit=true;
    if(hit){minimum=Math.min(minimum,p.y);if(p.vy>0)break;}
  }
  return {hit,height:FIELD_HEIGHT-24-minimum};
}
function slideDistance(type){const start=60,r=simulate(roundWith([body(type,100,{x:start,y:FIELD_HEIGHT-24,vx:.32})]),180,8);return r.pieces[0].x-start;}

describe('material mass and tactile collision behavior',()=>{
  it('gives every catalog identity one of the four physical families',()=>{
    for(const item of MATERIALS)expect(Object.keys(MATERIAL_PHYSICS)).toContain(materialFamilyFor(item.id));
    for(const [family,id] of Object.entries(identities))expect(materialFamilyFor(id)).toBe(family);
  });
  it('makes equally sized metal heavier than glass and resin and derives inertia from scale',()=>{
    const resin=physicsFor(identities.resin,24),glass=physicsFor(identities.glass,24),metal=physicsFor(identities.metal,24);
    expect(metal.mass).toBeGreaterThan(glass.mass);expect(glass.mass).toBeGreaterThan(resin.mass);
    expect(metal.mass*metal.inverseMass).toBeCloseTo(1);expect(metal.inertia*metal.inverseInertia).toBeCloseTo(1);
    expect(physicsFor(identities.metal,32).mass).toBeGreaterThan(metal.mass);
    expect(physicsFor(identities.metal,32).inertia).toBeGreaterThan(metal.inertia);
    const r=dropAccessory(createGravityRound('ice-module-star-drop',()=>.3),160);
    r.pieces.forEach(p=>{expect(p.mass).toBeGreaterThan(0);expect(p.inverseMass).toBeGreaterThan(0);expect(p.family).toBe(materialFamilyFor(p.type));});
  });
  it('transfers more velocity from a moving heavy metal piece to a light resin target than the reverse',()=>{
    const targetSpeed=(moving,target)=>stepGravity(roundWith([body(moving,100,{x:120,y:220,vx:.3}),body(target,101,{x:163,y:220})]),8).round.pieces[1].vx;
    expect(targetSpeed(identities.metal,identities.resin)).toBeGreaterThan(targetSpeed(identities.resin,identities.metal)*2);
  });
  it('produces distinct measured rebound heights on the same tray',()=>{
    const glass=reboundHeight(identities.glass),pearl=reboundHeight(identities.pearl),resin=reboundHeight(identities.resin),metal=reboundHeight(identities.metal);
    [glass,pearl,resin,metal].forEach(result=>expect(result.hit).toBe(true));
    expect(glass.height).toBeGreaterThan(pearl.height+4);
    expect(metal.height).toBeGreaterThan(resin.height+2);
    expect(glass.height).toBeGreaterThan(8);
  });
  it('lets glass slide farther than grippier resin after the same lateral release',()=>{
    const glass=slideDistance(identities.glass),resin=slideDistance(identities.resin);
    expect(glass).toBeGreaterThan(resin+10);expect(resin).toBeGreaterThan(0);
  });
  it('converts an oblique contact into bounded spin and settles afterwards',()=>{
    const r=stepGravity(roundWith([body(identities.glass,100,{x:120,y:220,vx:.3,vy:.12}),body(identities.metal,101,{x:160,y:232})]),8).round;
    expect(r.pieces.some(p=>Math.abs(p.vr)>.00001)).toBe(true);
    r.pieces.forEach(p=>expect(Math.abs(p.vr)).toBeLessThanOrEqual(.02));
    simulate(r,400).pieces.forEach(p=>{expect(Math.hypot(p.vx,p.vy)).toBeLessThan(.04);expect(Math.abs(p.vr)).toBeLessThan(.00002);});
  });
  it('bounds fast body and wall crossings with fixed small substeps',()=>{
    const initial=roundWith([body(identities.metal,100,{x:160,y:365,vy:3}),body(identities.pearl,101,{x:160,y:440})]);
    const r=simulate(initial,12,32),[upper,lower]=r.pieces;
    expect(upper.y).toBeLessThan(lower.y);
    expect(Math.hypot(upper.x-lower.x,upper.y-lower.y)).toBeGreaterThan((upper.radius+lower.radius)*.9-1);
    r.pieces.forEach(p=>{expect(p.x-p.radius).toBeGreaterThanOrEqual(0);expect(p.x+p.radius).toBeLessThanOrEqual(FIELD_WIDTH);expect(p.y+p.radius).toBeLessThanOrEqual(FIELD_HEIGHT);});
  });
});

describe('physical impact reports',()=>{
  it('reports actual strength and position, suppresses the same pair briefly, then permits a new impact',()=>{
    const hit=(r,dt=16)=>stepGravity({...r,pieces:[{...r.pieces[0],x:150,y:FIELD_HEIGHT-25,vy:.5,vx:0,settled:0}]},dt);
    const first=hit(roundWith([body(identities.metal)]));
    expect(first.event).toBe('impact');expect(first.impact.normalSpeed).toBeGreaterThan(.1);expect(first.impact.impulse).toBeGreaterThan(0);
    expect(first.impact.intensity).toBeGreaterThan(0);expect(first.impact.intensity).toBeLessThanOrEqual(1);
    expect(first.impact.materialFamily).toBe('metal');expect(first.impact.materialPair).toEqual(['metal','floor']);
    expect(first.impact.x).toBeCloseTo(150);expect(first.impact.y).toBe(FIELD_HEIGHT);
    expect(hit(first.round).event).not.toBe('impact');
    expect(hit(first.round,300).event).toBe('impact');
  });
  it('keeps a resting tray contact silent and selects the strongest simultaneous hit',()=>{
    let r=roundWith([body(identities.pearl,100,{y:FIELD_HEIGHT-24})]);
    for(let i=0;i<100;i++){const result=stepGravity(r,16);expect(result.event).not.toBe('impact');r=result.round;}
    const hit=stepGravity(roundWith([body(identities.glass,100,{x:80,y:FIELD_HEIGHT-25,vy:.15}),body(identities.metal,101,{x:240,y:FIELD_HEIGHT-25,vy:.6})]),16);
    expect(hit.impact.materialFamily).toBe('metal');expect(hit.artId).toBe(identities.metal);
  });
});

describe('unchanged dense round and progression constraints',()=>{
  it.each([[.2,16.4],[.5,12.6],[.9,3]])('does not worsen the pre-existing late-collection packing at seed %s',(seed,maxBefore)=>{
    const collection=normalizeCollection({version:2,mainline:{unlocked:ICE_BLUE_MODULE_IDS}});
    const r=simulate(createGravityRound('ice-module-heart-bow',()=>seed,ownedIds(collection),11),600);
    expect(r.pieces).toHaveLength(60);expect(r.palette).toHaveLength(5);expect(r.targetScore).toBe(2500);
    let maximum=0;
    r.pieces.forEach((a,i)=>r.pieces.slice(i+1).forEach(b=>{maximum=Math.max(maximum,(a.radius+b.radius)*.9-Math.hypot(a.x-b.x,a.y-b.y));}));
    // The first two baselines were already over capacity before this change.
    // Preserve that measured limit; do not call it penetration acceptance.
    expect(maximum).toBeLessThan(maxBefore);
    expect(r.pieces.filter(p=>Math.abs(p.vr)>.00002)).toHaveLength(0);
  });
  it.each([7413,17,12345,91826])('keeps two real first-round clears possible with deterministic input seed %s',initialSeed=>{
    let seed=initialSeed;const random=()=>((seed=seed*48271%2147483647)-1)/2147483646;
    let collection=normalizeCollection(null);
    for(let level=1;level<=2;level++){
      let r=createGravityRound('ice-module-star-drop',random,ownedIds(collection),level),nextDrop=400;
      const slots=new Map();
      for(let elapsed=0;r.status==='playing'&&elapsed<60_000;elapsed+=16){
        if(elapsed>=nextDrop){const type=r.nextTypes[0];if(!slots.has(type))slots.set(type,[42,101,160,219,278][slots.size]);r=dropAccessory(r,slots.get(type),random);nextDrop+=400;}
        r=stepGravity(r,16).round;
      }
      expect(r.status).toBe('won');expect(r.score).toBeGreaterThanOrEqual(r.targetScore);
      collection={...collection,mainline:claimMainlineClear(collection.mainline,{random,now:0}).state};
    }
    expect(collection.mainline.unlocked).toHaveLength(2);expect(collection.mainline.coupons).toHaveLength(2);
  });
});
