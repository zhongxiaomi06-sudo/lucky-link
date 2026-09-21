import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { FIELD_HEIGHT, createGravityRound, dropAccessory, stepGravity, PHYSICS_STEP_MS, MAX_PHYSICS_SUBSTEPS } from '../src/gravity-game.js';
import { MATERIAL_PHYSICS, physicsFor } from '../src/material-physics.js';
import { normalizeCollection, ownedIds } from '../src/collection-game.js';
import { ICE_BLUE_MODULE_IDS, claimMainlineClear } from '../src/ice-blue-mainline.js';

const ids={glass:'aqua-drop',pearl:'pearl',resin:'ice-module-penguin',metal:'chrome-bow'};
const body=(type,id=100,extra={})=>({id,type,artId:type,shape:'bead',radius:24,...physicsFor(type,24),x:160,y:180,vx:0,vy:0,vr:0,rotation:0,age:1000,settled:0,impacted:false,seeded:false,...extra});
const scene=pieces=>({...createGravityRound('ice-module-star-drop',()=>.3),pieces,hasDropped:true});
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))];
function feel(type){
  let r=scene([body(type)]),hit=false,minimum=FIELD_HEIGHT,impact=null;
  for(let i=0;i<160;i++){
    const result=stepGravity(r,8);r=result.round;
    if(result.impact?.materialPair.includes('floor')){hit=true;impact||=result.impact;}
    if(hit){minimum=Math.min(minimum,r.pieces[0].y);if(r.pieces[0].vy>0)break;}
  }
  r=scene([body(type,100,{x:60,y:FIELD_HEIGHT-24,vx:.32})]);
  for(let i=0;i<180;i++)r=stepGravity(r,8).round;
  return{...physicsFor(type,24),radius:24,reboundHeight:FIELD_HEIGHT-24-minimum,slideDistance:r.pieces[0].x-60,firstFloorImpact:impact};
}
function packing(collection,random){
  let r=createGravityRound('ice-module-heart-bow',random,ownedIds(collection),11),lateImpacts=0;
  const timings=[];
  for(let i=0;i<600;i++){
    const at=performance.now(),result=stepGravity(r,16);r=result.round;
    if(i>60)timings.push(performance.now()-at);
    if(i>500&&result.event==='impact')lateImpacts++;
  }
  let maximum=0;
  r.pieces.forEach((a,i)=>r.pieces.slice(i+1).forEach(b=>{maximum=Math.max(maximum,(a.radius+b.radius)*.9-Math.hypot(a.x-b.x,a.y-b.y));}));
  return{bodyCount:r.pieces.length,palette:r.palette,maximumPenetration:maximum,occupiedHeightRatio:(Math.max(...r.pieces.map(p=>p.y+p.radius))-Math.min(...r.pieces.map(p=>p.y-p.radius)))/FIELD_HEIGHT,averageSpeed:r.pieces.reduce((sum,p)=>sum+Math.hypot(p.vx,p.vy),0)/r.pieces.length,spinningBodies:r.pieces.filter(p=>Math.abs(p.vr)>.00002).length,lateImpacts,stepMsP50:percentile(timings,.5),stepMsP95:percentile(timings,.95),droppedPhysicsMs:r.droppedPhysicsMs};
}
function play(initialSeed){
  let seed=initialSeed;const random=()=>((seed=seed*48271%2147483647)-1)/2147483646;
  let collection=normalizeCollection(null);const rounds=[];
  for(let level=1;level<=2;level++){
    let r=createGravityRound('ice-module-star-drop',random,ownedIds(collection),level),drops=0,elapsed=0,nextDrop=400;
    const slots=new Map();
    for(;r.status==='playing'&&elapsed<61_000;elapsed+=16){
      if(elapsed>=nextDrop){const type=r.nextTypes[0];if(!slots.has(type))slots.set(type,[42,101,160,219,278][slots.size]);r=dropAccessory(r,slots.get(type),random);drops++;nextDrop+=400;}
      r=stepGravity(r,16).round;
    }
    rounds.push({level,status:r.status,seconds:elapsed/1000,score:r.score,target:r.targetScore,drops});
    if(r.status!=='won')break;
    collection={...collection,mainline:claimMainlineClear(collection.mainline,{random,now:0}).state};
  }
  return{seed:initialSeed,rounds,modules:collection.mainline.unlocked.length,coupons:collection.mainline.coupons.length};
}
const materials=Object.fromEntries(Object.entries(ids).map(([family,id])=>[family,feel(id)]));
const fresh=normalizeCollection(null),full=normalizeCollection({version:2,mainline:{unlocked:ICE_BLUE_MODULE_IDS}});
const defaultPile=packing(fresh,()=>.9);
const legacyDenseBaselines=[{seed:.2,maximumPenetration:16.321569890661657},{seed:.5,maximumPenetration:12.52823564309783},{seed:.9,maximumPenetration:2.7275685892404553}];
const denseComparison=legacyDenseBaselines.map(before=>({seed:before.seed,before:{...before,runtime:'Node, original V41 stepGravity, 600 × 16ms; measured before implementation'},after:packing(full,()=>before.seed)}));
const progression=[7413,17,12345,91826].map(play);
const report={version:'v42',createdAt:new Date().toISOString(),runtime:`Node ${process.version}, ${process.platform}/${process.arch}; pure solver, not browser or physical iPhone`,units:'tray units; velocity per millisecond; radius 24 for material comparisons; relative mass',parameters:{fixedStepMs:PHYSICS_STEP_MS,maxSubsteps:MAX_PHYSICS_SUBSTEPS,solverPasses:16,colliderScale:.9,materialPhysics:MATERIAL_PHYSICS},materials,defaultPile,denseComparison,progression,checks:{differentMass:materials.metal.mass>materials.glass.mass&&materials.glass.mass>materials.resin.mass,differentBounce:materials.glass.reboundHeight>materials.pearl.reboundHeight+4&&materials.metal.reboundHeight>materials.resin.reboundHeight+2,differentFriction:materials.glass.slideDistance>materials.resin.slideDistance+10,defaultStable:defaultPile.maximumPenetration<4&&defaultPile.spinningBodies===0&&defaultPile.averageSpeed<.04,defaultSilentAtRest:defaultPile.lateImpacts===0,twoRoundsPerSeed:progression.every(p=>p.modules===2&&p.coupons===2),denseDoesNotMeaningfullyRegress:denseComparison.every(p=>p.after.maximumPenetration<=p.before.maximumPenetration+.1&&p.after.spinningBodies===0)},knownLimitations:['Crowded late-collection circle proxies remain above the 4-unit penetration acceptance limit. Smaller counts, altered radii, or relaxed scoring were not used to conceal it. Compound outline proxies remain follow-up work.','The deterministic lane-placement bot clears in a few seconds; this is solvability evidence, not proof of a 40–70 second human-play pacing target.','Physics time is bounded to 32ms per rendered frame; time above that is recorded as droppedPhysicsMs, while the game timer still uses real elapsed time.']};
const output=new URL('../evidence/material-physics-v42/',import.meta.url);
await mkdir(output,{recursive:true});
await writeFile(new URL('report.json',output),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({path:fileURLToPath(new URL('report.json',output)),...report},null,2));
if(Object.values(report.checks).some(value=>!value))process.exitCode=1;
