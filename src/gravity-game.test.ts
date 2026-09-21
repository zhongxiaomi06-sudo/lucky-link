import { describe,expect,it } from 'vitest';
import { FIELD_WIDTH,FIELD_HEIGHT,DROP_IDS,POINTS_PER_PIECE,FIRST_SIX_LEVELS,levelConfig,scoreForClear,createGravityRound,dropAccessory,stepGravity,contactGroups,unlockPoints,earnedUnlockPoints,remainingUnlockPoints } from './gravity-game.js';
import { materialById } from './collection-catalog.js';

describe('irregular accessory gravity elimination',()=>{
  it('starts level one dense with five real chain-part types, 60 pieces and a 1500-point goal',()=>{
    const r=createGravityRound('sea-star',()=>.2);
    expect(r.mode).toBe('gravity');expect(r.level).toBe(1);expect(r.palette).toHaveLength(5);expect(r.pieces).toHaveLength(60);expect(r.nextTypes).toHaveLength(3);
    expect(r.targetScore).toBe(1500);expect(r.status).toBe('playing');
    for(const id of [...r.palette,...r.pieces.map(piece=>piece.artId)])expect(materialById.has(id)).toBe(true);
  });
  it('defines the approved steadily increasing first-six curve',()=>{
    expect(FIRST_SIX_LEVELS.map(({targetScore,paletteSize,seedCount,dangerY})=>[targetScore,paletteSize,seedCount,dangerY])).toEqual([
      [1500,5,60,72],[1600,5,60,72],[1700,5,60,72],[1800,5,60,72],[1900,5,60,72],[2000,5,60,72],
    ]);
    expect(levelConfig(4).targetScore).toBeGreaterThan(levelConfig(3).targetScore);
    expect(levelConfig(99).targetScore).toBe(2500);
  });
  it('materializes every first-six level with its own density and color count',()=>{
    FIRST_SIX_LEVELS.forEach(config=>{
      const round=createGravityRound('sea-star',()=>.23,DROP_IDS,config.level);
      expect(round.targetScore).toBe(config.targetScore);
      expect(round.palette).toHaveLength(config.paletteSize);
      expect(round.pieces).toHaveLength(config.seedCount);
      expect(new Set(round.pieces.map(piece=>piece.type))).toHaveLength(config.paletteSize);
    });
    const first=createGravityRound('sea-star',()=>.23);
    const counts=first.palette.map(id=>first.pieces.filter(piece=>piece.type===id).length);
    expect(Math.max(...counts)-Math.min(...counts)).toBeLessThanOrEqual(3);
  });
  it('uses real score as the unlock meter and keeps combo points',()=>{
    const r=createGravityRound('sea-star',()=>.2);
    expect(POINTS_PER_PIECE).toBe(100);expect(unlockPoints(r)).toBe(1500);
    expect(earnedUnlockPoints({...r,score:900})).toBe(900);
    expect(remainingUnlockPoints({...r,score:900})).toBe(600);
    expect(remainingUnlockPoints({...r,score:9999})).toBe(0);
  });
  it('rewards larger groups and caps the fourth cascade at 1.6x',()=>{
    expect(scoreForClear(3,1)).toBe(300);
    expect(scoreForClear(4,1)).toBe(500);
    expect(scoreForClear(5,1)).toBe(750);
    expect(scoreForClear(6,1)).toBe(1050);
    expect(scoreForClear(3,2)).toBe(360);
    expect(scoreForClear(3,3)).toBe(420);
    expect(scoreForClear(3,4)).toBe(480);
    expect(scoreForClear(3,9)).toBe(480);
  });
  it('settles a real multi-layer pile across about four fifths of the field',()=>{
    let r=createGravityRound('sea-star',()=>.2);
    expect(new Set(r.pieces.map(piece=>piece.y)).size).toBe(10);
    expect(new Set(r.pieces.map(piece=>piece.rotation)).size).toBeGreaterThan(8);
    for(let i=0;i<600;i++)r=stepGravity(r,16).round;
    const top=Math.min(...r.pieces.map(piece=>piece.y-piece.radius)),bottom=Math.max(...r.pieces.map(piece=>piece.y+piece.radius));
    expect((bottom-top)/FIELD_HEIGHT).toBeGreaterThanOrEqual(.78);
    expect((bottom-top)/FIELD_HEIGHT).toBeLessThanOrEqual(1.01);
    const occupiedBands=Array.from({length:10},(_,band)=>r.pieces.filter(piece=>piece.y>=band*FIELD_HEIGHT/10&&piece.y<(band+1)*FIELD_HEIGHT/10).length);
    expect(occupiedBands.slice(1).every(count=>count>=2)).toBe(true);
    for(const piece of r.pieces){
      expect(piece.y-piece.radius).toBeGreaterThanOrEqual(0);
      expect(piece.x-piece.radius).toBeGreaterThanOrEqual(0);
      expect(piece.x+piece.radius).toBeLessThanOrEqual(FIELD_WIDTH);
    }
  });
  it('keeps the dense seeded opening intact until the first user drop',()=>{
    let r=createGravityRound('sea-star',()=>.2);
    for(let i=0;i<120;i++)r=stepGravity(r,16).round;
    expect(r.pieces).toHaveLength(60);
    expect(r.hasDropped).toBe(false);
    r=dropAccessory(r,160,()=>.4);
    expect(r.hasDropped).toBe(true);
    expect(r.pieces).toHaveLength(61);
  });
  it('uses a balanced three-copy bag for every five-piece palette',()=>{
    const r=createGravityRound('sea-star',()=>.37,DROP_IDS,6);
    const completeBag=[...r.nextTypes,...r.bag];
    expect(completeBag).toHaveLength(15);
    for(const id of r.palette)expect(completeBag.filter(value=>value===id)).toHaveLength(3);
  });
  it('exposes only actual DIY materials in the drop catalog',()=>{
    expect(DROP_IDS.length).toBeGreaterThanOrEqual(18);
    expect(new Set(DROP_IDS).size).toBe(DROP_IDS.length);
    DROP_IDS.forEach(id=>expect(materialById.has(id)).toBe(true));
  });
  it('drops one accessory at the tapped horizontal position without drag state',()=>{
    const r=dropAccessory(createGravityRound('sea-star',()=>.1),-40);
    expect(r.pieces).toHaveLength(61);const dropped=r.pieces.at(-1);expect(dropped.x).toBeGreaterThan(0);
    expect(dropped.x).toBeLessThan(FIELD_WIDTH);expect(dropped.y).toBeLessThan(50);
    expect(materialById.has(dropped.artId)).toBe(true);expect(dropped.type).toBe(dropped.artId);
  });
  it('gravity moves a dropped piece down and keeps it inside the tray',()=>{
    let r=dropAccessory(createGravityRound('sea-star',()=>.3),160);
    r={...r,pieces:[r.pieces.at(-1)]};
    for(let i=0;i<240;i++)r=stepGravity(r,16).round;
    const p=r.pieces.at(-1);expect(p.y).toBeGreaterThan(100);expect(p.y+p.radius).toBeLessThanOrEqual(FIELD_HEIGHT+.01);
    expect(p.x-p.radius).toBeGreaterThanOrEqual(0);
  });
  it('reports the first physical impact once per dropped accessory',()=>{
    let r=dropAccessory(createGravityRound('sea-star',()=>.3),160),impacts=0;
    const droppedId=r.pieces.at(-1).id;
    r={...r,pieces:[r.pieces.at(-1)]};
    for(let i=0;i<260;i++){const result=stepGravity(r,16);r=result.round;if(result.event==='impact'&&result.artId===r.pieces.find(piece=>piece.id===droppedId)?.artId)impacts++;}
    expect(impacts).toBeGreaterThanOrEqual(1);expect(r.pieces.find(piece=>piece.id===droppedId)?.impacted).toBe(true);
  });
  it('detects three touching accessories of the same type, not nearby different ones',()=>{
    const base={radius:24,vx:0,vy:0,rotation:0,vr:0,age:1000,settled:300};
    const pieces=[{...base,id:1,type:'heart',shape:'heart',x:100,y:420},{...base,id:2,type:'heart',shape:'heart',x:145,y:420},{...base,id:3,type:'heart',shape:'heart',x:122,y:382},{...base,id:4,type:'star',shape:'star',x:180,y:420}];
    expect(contactGroups(pieces).map(g=>g.length)).toEqual([3]);
  });
  it('eliminates a touching trio and reports a clear burst',()=>{
    let r=createGravityRound('sea-star',()=>.1);const base={radius:24,vx:0,vy:0,rotation:0,vr:0,age:1000,settled:400};
    r={...r,pieces:[{...base,id:1,type:'heart',shape:'heart',x:100,y:450},{...base,id:2,type:'heart',shape:'heart',x:145,y:450},{...base,id:3,type:'heart',shape:'heart',x:122,y:411}]};
    const result=stepGravity(r,16);expect(result.event).toBe('clear');expect(result.removed).toHaveLength(3);
    expect(result.round.pieces).toHaveLength(0);expect(result.round.cleared).toBe(3);
  });
  it('releases nearby survivors with lateral and rotational collapse energy',()=>{
    let r=createGravityRound('sea-star',()=>.1);const base={radius:24,vx:0,vy:0,rotation:0,vr:0,age:1000,settled:400};
    r={...r,pieces:[
      {...base,id:1,type:'heart',shape:'heart',x:100,y:450},{...base,id:2,type:'heart',shape:'heart',x:145,y:450},{...base,id:3,type:'heart',shape:'heart',x:122,y:411},
      {...base,id:4,type:'star',shape:'star',x:126,y:350},
    ]};
    const result=stepGravity(r,16),survivor=result.round.pieces[0];
    expect(result.event).toBe('clear');expect(survivor.id).toBe(4);
    expect(Math.abs(survivor.vx)).toBeGreaterThan(.02);expect(Math.abs(survivor.vr)).toBeGreaterThan(.00003);expect(survivor.settled).toBe(0);
    let settling=result.round;
    for(let i=0;i<180;i++)settling=stepGravity(settling,16).round;
    expect(Math.abs(settling.pieces[0].vr)).toBeLessThan(.00002);
  });
  it('converges without deep penetration or perpetual rotation',()=>{
    let r=createGravityRound('sea-star',()=>.2);
    for(let i=0;i<720;i++)r=stepGravity(r,16).round;
    let maxPenetration=0;
    for(let i=0;i<r.pieces.length;i++)for(let j=i+1;j<r.pieces.length;j++){
      const a=r.pieces[i],b=r.pieces[j],penetration=(a.radius+b.radius)*.9-Math.hypot(b.x-a.x,b.y-a.y);
      maxPenetration=Math.max(maxPenetration,penetration);
    }
    const averageSpeed=r.pieces.reduce((sum,piece)=>sum+Math.hypot(piece.vx,piece.vy),0)/r.pieces.length;
    const spinning=r.pieces.filter(piece=>Math.abs(piece.vr)>.00002).length;
    expect(maxPenetration).toBeLessThan(4);
    expect(averageSpeed).toBeLessThan(.04);
    expect(spinning).toBe(0);
  });
  it('counts a second clear inside the collapse window as a cascade',()=>{
    const r=createGravityRound('sea-star',()=>.1),base={radius:24,vx:0,vy:0,rotation:0,vr:0,age:1000,settled:400,impacted:true};
    const first=stepGravity({...r,pieces:[
      {...base,id:1,type:'heart',shape:'heart',x:100,y:450},{...base,id:2,type:'heart',shape:'heart',x:145,y:450},{...base,id:3,type:'heart',shape:'heart',x:122,y:411},
    ]},16);
    const second=stepGravity({...first.round,pieces:[
      {...base,id:4,type:'star',shape:'star',x:175,y:450},{...base,id:5,type:'star',shape:'star',x:220,y:450},{...base,id:6,type:'star',shape:'star',x:197,y:411},
    ]},16);
    expect(first.event).toBe('clear');expect(first.round.chain).toBe(1);
    expect(second.event).toBe('clear');expect(second.round.chain).toBe(2);
    expect(second.round.score).toBeGreaterThan(first.round.score+300);
  });
  it('wins when actual score reaches the configured target',()=>{
    let r=createGravityRound('sea-star',()=>.1),nextId=100;const base={radius:24,vx:0,vy:0,rotation:0,vr:0,age:1000,settled:400,impacted:true};
    for(let group=0;group<6&&r.status==='playing';group++){
      const type=r.palette[group%r.palette.length];
      const shape=materialById.get(type).kind;
      r=stepGravity({...r,pieces:[{...base,id:nextId++,type,artId:type,shape,x:100,y:450},{...base,id:nextId++,type,artId:type,shape,x:145,y:450},{...base,id:nextId++,type,artId:type,shape,x:122,y:411}]},16).round;
    }
    expect(r.score).toBeGreaterThanOrEqual(r.targetScore);expect(r.status).toBe('won');
  });
  it('keeps a sixty-second deadline when rendering is slower than the physics step',()=>{
    let r={...createGravityRound('ice-module-star-drop',()=>.3),pieces:[]};
    for(let i=0;i<599;i++)r=stepGravity(r,100).round;
    expect(r.remainingMs).toBe(100);expect(r.status).toBe('playing');
    r=stepGravity(r,100).round;
    expect(r.remainingMs).toBe(0);expect(r.status).toBe('lost');
  });
  it('charges clear frames and expires a cascade using elapsed time',()=>{
    const base={radius:24,vx:0,vy:0,rotation:0,vr:0,age:1000,settled:400,impacted:true,seeded:false,type:'pearl',shape:'pearl'};
    const pieces=[{...base,id:1,x:100,y:450},{...base,id:2,x:145,y:450},{...base,id:3,x:122,y:411}];
    const r={...createGravityRound('ice-module-star-drop',()=>.3),pieces,chain:2,chainWindow:100,hasDropped:true};
    const result=stepGravity(r,200);
    expect(result.event).toBe('clear');expect(result.round.remainingMs).toBe(59800);
    expect(result.round.chain).toBe(1);expect(result.gained).toBe(300);
    const expired=stepGravity({...r,score:1200,remainingMs:200},200);
    expect(expired.round.status).toBe('lost');expect(expired.round.score).toBe(1200);
    expect(expired.removed).toEqual([]);
  });
});
