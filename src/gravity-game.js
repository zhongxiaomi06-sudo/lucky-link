import { MATERIALS, materialById, presentationFor, isDisplayMaterial } from './collection-catalog.js';
import { ICE_BLUE_MODULE_IDS, MAINLINE_TARGETS } from './ice-blue-mainline.js';
import { physicsFor } from './material-physics.js';

export const FIELD_WIDTH=320;
export const FIELD_HEIGHT=500;
export const DANGER_Y=72;
const GRAVITY=.00165;
const SPATIAL_CELL=64;
const LINEAR_DAMPING=.985;
const ANGULAR_DAMPING=.84;
const LINEAR_SLEEP_EPS=.08;
const ANGULAR_SLEEP_EPS=.000012;
export const PHYSICS_STEP_MS=8;
export const MAX_PHYSICS_SUBSTEPS=4;
const COLLIDER_SCALE=.9;
const MAX_ANGULAR_SPEED=.02;
const IMPACT_SPEED_THRESHOLD=.075;
const IMPACT_COOLDOWN_MS=180;
export const DROP_IDS=[...new Set(MATERIALS.map(item=>item.id).filter(id=>isDisplayMaterial(id)&&!ICE_BLUE_MODULE_IDS.includes(id)))];
export const ICE_BLUE_CHARMS=[
  {id:'ice-star',name:'Faceted ice star',shape:'star',kind:'star',palette:'ice-blue',size:29},
  {id:'moon-pearl',name:'Moon pearl',shape:'pearl',kind:'pearl',palette:'ice-blue',size:27},
  {id:'ice-drop',name:'Crystal drop',shape:'drop',kind:'drop',palette:'ice-blue',size:30},
  {id:'ice-cube',name:'Ice sugar cube',shape:'cube',kind:'cube',palette:'ice-blue',size:28},
];
export const ICE_BLUE_DROP_IDS=ICE_BLUE_CHARMS.map(item=>item.id);
export const ICE_BLUE_ROUND=Object.freeze({durationMs:60_000,targetScore:1500,seedCount:60});
const iceBlueById=new Map(ICE_BLUE_CHARMS.map(item=>[item.id,item]));
export const POINTS_PER_PIECE=100;
export const MAINLINE_LEVELS=MAINLINE_TARGETS.map((targetScore,index)=>({level:index+1,targetScore,paletteSize:5,seedCount:60,dangerY:72,chainWindowMs:1100,dropCooldown:360,durationMs:60_000}));
export const FIRST_SIX_LEVELS=MAINLINE_LEVELS.slice(0,6);
export function levelConfig(value=1){
  const level=Math.max(1,Math.floor(Number(value)||1));
  return{...(MAINLINE_LEVELS[Math.min(level,MAINLINE_LEVELS.length)-1]),level};
}
export const unlockPoints=round=>round.targetScore;
export const earnedUnlockPoints=round=>Math.min(unlockPoints(round),Math.max(0,round.score||0));
export const remainingUnlockPoints=round=>Math.max(0,unlockPoints(round)-earnedUnlockPoints(round));
export function scoreForClear(count,chain=1){
  const groupMultiplier=count>=6?1.75:count===5?1.5:count===4?1.25:1;
  const chainMultiplier=1+Math.min(3,Math.max(0,chain-1))*.2;
  return Math.round(count*POINTS_PER_PIECE*groupMultiplier*chainMultiplier/10)*10;
}
export const accessoryType=type=>{
  const item=iceBlueById.get(type)||materialById.get(type);if(!item)return null;
  const size=presentationFor(type)?.size||item.size||32;
  const radius=Math.max(23,Math.min(34,size*.88));
  return{type,shape:item.kind||'bead',artId:type,radius,...physicsFor(type,radius)};
};
function shuffle(list,random){const result=[...list];for(let i=result.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[result[i],result[j]]=[result[j],result[i]];}return result;}
function paletteFor(candidates,random,size=6){
  const preferred=[...new Set(Array.isArray(candidates)?candidates:[])].filter(id=>accessoryType(id));
  const fallback=DROP_IDS.filter(id=>!preferred.includes(id));
  return[...shuffle(preferred,random),...shuffle(fallback,random)].slice(0,size);
}
const refillBag=(palette,random)=>shuffle(palette.flatMap(id=>[id,id,id]),random);

function seededPieces(palette,count){
  const rows=Math.ceil(count/6),base=Math.floor(count/rows),extra=count%rows,topCenter=157,bottomCenter=470,positions=[];
  for(let row=0;row<rows;row++){
    const columns=base+(row<extra?1:0),y=bottomCenter-(bottomCenter-topCenter)*row/(rows-1),margin=28;
    for(let column=0;column<columns;column++){
      const x=columns===1?FIELD_WIDTH/2:margin+(FIELD_WIDTH-margin*2)*column/(columns-1);
      positions.push([x,y,row,column]);
    }
  }
  return positions.slice(0,count).map(([x,y,row,column],index)=>{const type=palette[(row*2+column)%palette.length],definition=accessoryType(type);return{id:index+1,...definition,x,y,vx:(column%3-1)*.0015,vy:.006+(row%4)*.001,rotation:(index%2?1:-1)*(.08+(index%5)*.045),vr:(index%3-1)*.000018,age:0,settled:0,impacted:false,seeded:true};});
}

export function createGravityRound(rewardId,random=Math.random,candidates=DROP_IDS,level=1){
  const config=levelConfig(level),palette=paletteFor(candidates,random,config.paletteSize),bag=refillBag(palette,random),nextTypes=bag.splice(0,3),pieces=seededPieces(palette,config.seedCount);
  return {mode:'gravity',rewardId,...config,remainingMs:config.durationMs,palette,bag,pieces,nextTypes,nextId:pieces.length+1,target:config.targetScore,cleared:0,score:0,chain:0,chainWindow:0,hasDropped:false,status:'playing',physicsAccumulatorMs:0,physicsTimeMs:0,droppedPhysicsMs:0,impactClockMs:0,impactTimes:{}};
}

export function createIceBlueRound(random=Math.random){
  const round=createGravityRound('ice-blue-star-dream',random,ICE_BLUE_DROP_IDS,1);
  return {...round,...ICE_BLUE_ROUND,palette:[...ICE_BLUE_DROP_IDS],target:ICE_BLUE_ROUND.targetScore};
}

export function dropAccessory(round,x,random=Math.random){
  if(round.status!=='playing')return round;const type=round.nextTypes[0],definition=accessoryType(type);if(!definition)return round;const radius=definition.radius;
  const piece={id:round.nextId,...definition,x:Math.max(radius,Math.min(FIELD_WIDTH-radius,Number(x)||FIELD_WIDTH/2)),y:radius+3,vx:(random()-.5)*.035,vy:.035,rotation:(random()-.5)*.4,vr:(random()-.5)*.0006,age:0,settled:0,impacted:false,seeded:false};
  let bag=[...(round.bag||[])];if(!bag.length)bag=refillBag(round.palette,random);const next=bag.shift();
  return {...round,pieces:[...round.pieces,piece],bag,nextTypes:[round.nextTypes[1],round.nextTypes[2],next],nextId:round.nextId+1,hasDropped:true};
}

export function contactGroups(pieces){
  const seen=new Set(),groups=[],neighbors=Array.from({length:pieces.length},()=>[]);
  for(const[i,j]of collisionPairs(pieces)){const a=pieces[i],b=pieces[j];if(a.type!==b.type)continue;const dx=b.x-a.x,dy=b.y-a.y;if(Math.hypot(dx,dy)<=a.radius+b.radius+3){neighbors[i].push(j);neighbors[j].push(i);}}
  for(let startIndex=0;startIndex<pieces.length;startIndex++){const start=pieces[startIndex];if(seen.has(start.id))continue;const group=[],stack=[startIndex];seen.add(start.id);
    while(stack.length){const index=stack.pop(),current=pieces[index];group.push(current);for(const otherIndex of neighbors[index]){const other=pieces[otherIndex];if(seen.has(other.id))continue;seen.add(other.id);stack.push(otherIndex);}}
    if(group.length>=3)groups.push(group);
  }
  return groups;
}

function collisionPairs(pieces){
  const cells=new Map(),pairs=[],offsets=[[0,0],[1,-1],[1,0],[1,1],[0,1]];
  for(let index=0;index<pieces.length;index++){const p=pieces[index],x=Math.floor(p.x/SPATIAL_CELL),y=Math.floor(p.y/SPATIAL_CELL),key=`${x},${y}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(index);}
  for(const[key,indices]of cells){const[x,y]=key.split(',').map(Number);for(const[dx,dy]of offsets){const others=cells.get(`${x+dx},${y+dy}`);if(!others)continue;if(dx===0&&dy===0){for(let a=0;a<indices.length;a++)for(let b=a+1;b<indices.length;b++)pairs.push([indices[a],indices[b]]);}else for(const i of indices)for(const j of others)pairs.push([i,j]);}}
  return pairs;
}

const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const supported=(p,pieces)=>p.y+p.radius>=FIELD_HEIGHT-.5||pieces.some(other=>other.id!==p.id&&other.y>p.y&&Math.hypot(other.x-p.x,other.y-p.y)<=(other.radius+p.radius)*.92);
function contactImpulse(a,b,nx,ny,record,pairKey,x,y,surface='floor'){
  const inverseMass=a.inverseMass+(b?.inverseMass||0);
  const relative=((b?.vx||0)-a.vx)*nx+((b?.vy||0)-a.vy)*ny;
  if(relative>=0)return;
  const normalSpeed=-relative;
  // Tiny support impulses are inelastic so gravity cannot make a resting pile chatter.
  const restitution=normalSpeed>.09?(b?Math.sqrt(a.restitution*b.restitution):a.restitution*.82):0;
  const impulse=(1+restitution)*normalSpeed/inverseMass;
  const incomingA=Math.abs(a.vx*nx+a.vy*ny),incomingB=b?Math.abs(b.vx*nx+b.vy*ny):0;
  const primary=incomingB>incomingA?b:a;
  a.vx-=impulse*nx*a.inverseMass;a.vy-=impulse*ny*a.inverseMass;
  if(b){b.vx+=impulse*nx*b.inverseMass;b.vy+=impulse*ny*b.inverseMass;}
  const tx=-ny,ty=nx,ra=a.radius*COLLIDER_SCALE,rb=b?b.radius*COLLIDER_SCALE:0;
  const slip=((b?.vx||0)-a.vx)*tx+((b?.vy||0)-a.vy)*ty-a.vr*ra-(b?.vr||0)*rb;
  const tangentMass=inverseMass+ra*ra*a.inverseInertia+(b?rb*rb*b.inverseInertia:0);
  const friction=b?Math.sqrt(a.friction*b.friction):a.friction;
  const tangentImpulse=clamp(-slip/tangentMass,-friction*impulse,friction*impulse);
  a.vx-=tangentImpulse*tx*a.inverseMass;a.vy-=tangentImpulse*ty*a.inverseMass;
  a.vr=clamp(a.vr-ra*tangentImpulse*a.inverseInertia,-MAX_ANGULAR_SPEED,MAX_ANGULAR_SPEED);
  if(b){b.vx+=tangentImpulse*tx*b.inverseMass;b.vy+=tangentImpulse*ty*b.inverseMass;b.vr=clamp(b.vr-rb*tangentImpulse*b.inverseInertia,-MAX_ANGULAR_SPEED,MAX_ANGULAR_SPEED);}
  if(normalSpeed>=IMPACT_SPEED_THRESHOLD){
    a.impacted=true;if(b)b.impacted=true;
    record({normalSpeed,impulse,intensity:clamp(Math.log1p(impulse*2.5)/Math.log1p(8),0,1),materialFamily:primary.family,materialPair:[a.family,b?.family||surface],x,y,pairKey,artId:primary.artId});
  }
}
function constrain(p,record){
  if(p.x-p.radius<0){p.x=p.radius;contactImpulse(p,null,-1,0,record,`${p.id}:left`,0,p.y,'wall');}
  if(p.x+p.radius>FIELD_WIDTH){p.x=FIELD_WIDTH-p.radius;contactImpulse(p,null,1,0,record,`${p.id}:right`,FIELD_WIDTH,p.y,'wall');}
  if(p.y-p.radius<0){p.y=p.radius;contactImpulse(p,null,0,-1,record,`${p.id}:ceiling`,p.x,0,'wall');}
  if(p.y+p.radius>FIELD_HEIGHT){p.y=FIELD_HEIGHT-p.radius;contactImpulse(p,null,0,1,record,`${p.id}:floor`,p.x,FIELD_HEIGHT);}
}
function resolve(a,b,correctionA,correctionB,record){
  let dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),minimum=(a.radius+b.radius)*COLLIDER_SCALE;
  if(dist>=minimum)return;
  if(dist<.01){dx=.01;dy=0;dist=.01;}
  const nx=dx/dist,ny=dy/dist,overlap=minimum-dist,inverseMass=a.inverseMass+b.inverseMass;
  correctionA[0]-=nx*overlap*a.inverseMass/inverseMass;correctionA[1]-=ny*overlap*a.inverseMass/inverseMass;correctionA[2]++;
  correctionB[0]+=nx*overlap*b.inverseMass/inverseMass;correctionB[1]+=ny*overlap*b.inverseMass/inverseMass;correctionB[2]++;
  contactImpulse(a,b,nx,ny,record,`${Math.min(a.id,b.id)}:${Math.max(a.id,b.id)}`,(a.x+b.x)/2,(a.y+b.y)/2);
}
function integrate(pieces,record){
  const h=PHYSICS_STEP_MS,frame=h/16,linearDrag=Math.pow(LINEAR_DAMPING,frame),angularDrag=Math.pow(ANGULAR_DAMPING,frame);
  const previousPositions=new Map(pieces.map(p=>[p.id,[p.x,p.y]]));
  for(const p of pieces){
    p.age+=h;
    const asleep=p.settled>160&&p.vx===0&&p.vy===0&&p.vr===0&&supported(p,pieces);
    if(!asleep){
      p.vx=clamp(p.vx*linearDrag,-.72,.72);p.vy=clamp(p.vy*linearDrag+GRAVITY*h,-.72,.72);p.vr=clamp(p.vr*angularDrag,-MAX_ANGULAR_SPEED,MAX_ANGULAR_SPEED);
      if(Math.abs(p.vr)<ANGULAR_SLEEP_EPS)p.vr=0;
      p.x+=p.vx*h;p.y+=p.vy*h;p.rotation+=p.vr*h;
    }
    constrain(p,record);
  }
  for(let pass=0;pass<16;pass++){
    const corrections=pieces.map(()=>[0,0,0]);
    for(const[i,j]of collisionPairs(pieces))resolve(pieces[i],pieces[j],corrections[i],corrections[j],record);
    // Apply positional constraints together so a dense pile is not biased toward
    // the last pair visited by the solver. Velocity impulses remain mass weighted.
    pieces.forEach((p,index)=>{const c=corrections[index],scale=.8/Math.max(1,c[2]*.5);p.x+=c[0]*scale;p.y+=c[1]*scale;constrain(p,record);});
  }
  for(const p of pieces){
    constrain(p,record);
    const previous=previousPositions.get(p.id);
    // Sleep only after a sustained quiet contact, including rotational surface speed.
    // This absorbs solver support noise without suppressing a fresh bounce or slide.
    const stable=supported(p,pieces)&&Math.hypot(p.vx,p.vy)<LINEAR_SLEEP_EPS&&Math.abs(p.vr)*p.radius<.04&&Math.hypot(p.x-previous[0],p.y-previous[1])<.35;
    if(stable){p.settled+=h;if(p.settled>160){p.vx=0;p.vy=0;p.vr=0;}}else p.settled=0;
  }
}
function eliminate(round,pieces){
  if(!round.hasDropped&&pieces.every(p=>p.seeded))return null;
  const groups=contactGroups(pieces).filter(group=>group.every(p=>p.age>220)&&group.some(p=>!p.seeded));if(!groups.length)return null;
  const ids=new Set(groups.flat().map(p=>p.id)),removed=pieces.filter(p=>ids.has(p.id)),chain=round.chainWindow>0?round.chain+1:1,cleared=round.cleared+removed.length;
  const gained=groups.reduce((sum,group)=>sum+scoreForClear(group.length,chain),0),score=round.score+gained;
  const cx=removed.reduce((sum,p)=>sum+p.x,0)/removed.length,cy=removed.reduce((sum,p)=>sum+p.y,0)/removed.length;
  const survivors=pieces.filter(p=>!ids.has(p.id)).map(p=>{const dx=p.x-cx,dy=p.y-cy,distance=Math.hypot(dx,dy);if(distance>170)return p;const strength=1-distance/170,side=Math.abs(dx)>4?Math.sign(dx):(p.id%2?1:-1);return{...p,vx:p.vx+side*(.025+.045*strength),vy:Math.min(p.vy,-.025-.04*strength),vr:p.vr+side*(.00005+.0001*strength),settled:0};});
  return {round:{...round,pieces:survivors,cleared,score,chain,chainWindow:round.chainWindowMs,status:score>=round.targetScore?'won':'playing'},event:'clear',removed,gained};
}

export function stepGravity(round,dt=16){
  if(round.status!=='playing')return{round,event:'none',removed:[]};
  const elapsedMs=Number.isFinite(dt)?Math.max(0,dt):16;
  const clock=(round.impactClockMs||0)+elapsedMs;
  const remainingMs=Math.max(0,(round.remainingMs??60_000)-elapsedMs);
  round={...round,remainingMs,chainWindow:Math.max(0,round.chainWindow-elapsedMs),chain:round.chainWindow>elapsedMs?round.chain:0,impactClockMs:clock};
  if(remainingMs<=0)return{round:{...round,status:'lost'},event:'lost',removed:[]};
  const immediate=eliminate(round,round.pieces);if(immediate)return immediate;
  const impactTimes=Object.fromEntries(Object.entries(round.impactTimes||{}).filter(([,at])=>clock-at<1000));let impact=null;
  const record=contact=>{const at=impactTimes[contact.pairKey]??-Infinity;if(at!==clock&&clock-at<IMPACT_COOLDOWN_MS)return;impactTimes[contact.pairKey]=clock;if(!impact||contact.impulse>impact.impulse)impact=contact;};
  const pieces=round.pieces.map(source=>({...physicsFor(source.type,source.radius),...source,settled:source.settled||0}));
  const acceptedMs=Math.min(PHYSICS_STEP_MS*MAX_PHYSICS_SUBSTEPS,elapsedMs);
  let accumulator=(round.physicsAccumulatorMs||0)+acceptedMs,substeps=0;
  while(accumulator>=PHYSICS_STEP_MS&&substeps<MAX_PHYSICS_SUBSTEPS){integrate(pieces,record);accumulator-=PHYSICS_STEP_MS;substeps++;}
  const base={...round,pieces,physicsAccumulatorMs:accumulator,physicsTimeMs:(round.physicsTimeMs||0)+substeps*PHYSICS_STEP_MS,droppedPhysicsMs:(round.droppedPhysicsMs||0)+elapsedMs-acceptedMs,impactClockMs:clock,impactTimes};
  const cleared=eliminate(base,pieces);if(cleared)return cleared;
  const overflow=pieces.filter(p=>!p.seeded&&p.y-p.radius<(round.dangerY??DANGER_Y)&&p.age>1200&&p.settled>500).length,lost=overflow>=10;return{round:{...base,status:lost?'lost':'playing'},event:lost?'lost':impact?'impact':'fall',artId:impact?.artId,impact,removed:[]};
}
