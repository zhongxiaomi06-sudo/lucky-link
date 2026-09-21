import { MATERIALS, materialById } from './materials.js';
import { presentationFor } from './collection-catalog.js';

/** All positions are in the work surface's CSS pixels, shared by paint and input. */
export function tabletopLayout(width, height, finished = false, charmOnly = false) {
  const wide = width / height > 1.5;
  const rows = Math.min(5, Math.max(2, Math.floor((height - 140) / 52)));
  const trayW = Math.max(104, Math.min(184, width * (wide ? .22 : .36)));
  const rowH = Math.max(44, Math.min(trayW * .43, (height - 100) / rows));
  const tray = { x: width - trayW - 8, y: Math.max(44, Math.min(height * .19, height - rowH * rows - 56)), w: trayW, h:rowH * rows, rowH };
  const ph = Math.min(height * (wide ? .83 : .50), width * (wide ? .27 : .90));
  const phone = { x:width * .055, y:height * .015, w:ph * .52, h:ph, angle:-.10 };
  let loop = { x:width * (wide ? .47 : .28), y:height * (wide ? .54 : .75), rx:Math.min(width * .175, height * .20), ry:height * (wide ? .34 : .175), rotation:wide ? -Math.PI / 2 : -.12 };
  if (finished) {
    loop = charmOnly
      ? { x:width*.5, y:height*.49, rx:Math.min(width*.28,height*.28), ry:height*.35, rotation:-.12 }
      : { ...loop, x:width*(wide?.60:.40), rx:Math.min(width*.235,height*.25), ry:height*(wide?.35:.215), y:height*(wide?.55:.72) };
  }
  return { width, height, wide, rows, phone, loop, tray, count: rows * 2 };
}

export function loopPoint(loop, t) {
  const a = t * Math.PI * 2, factor = .54 + .46 * (1-Math.cos(a))/2;
  const u = Math.sin(a) * loop.rx * factor, v = -Math.cos(a) * loop.ry;
  const rotation = loop.rotation || 0, c = Math.cos(rotation), s = Math.sin(rotation);
  const b = a + .001, next = Math.sin(b)*loop.rx*(.54+.46*(1-Math.cos(b))/2);
  return { x:loop.x+u*c-v*s, y:loop.y+u*s+v*c, angle:Math.atan2(-Math.cos(b)*loop.ry-v,next-u)+rotation };
}

const paths = new WeakMap();
export function loopPath(loop) {
  if (paths.has(loop)) return paths.get(loop);
  const points = Array.from({length:257},(_,i)=>({...loopPoint(loop,i/256),t:i/256})), lengths=[0];
  for(let i=1;i<points.length;i++) lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
  const result={points,lengths,total:lengths.at(-1)}; paths.set(loop,result); return result;
}
export function pointAtLength(loop, distance) {
  const path=loopPath(loop), goal=Math.max(0,Math.min(path.total,distance));
  const j=Math.max(1,path.lengths.findIndex(v=>v>=goal));
  const t=(j-1+(goal-path.lengths[j-1])/(path.lengths[j]-path.lengths[j-1]))/256;
  return {...loopPoint(loop,t),t};
}

export const isCharm = id => presentationFor(id)?.atlas ? presentationFor(id).attachment==='charm' : ['moon','shell','cherry','flower','bell','bow','coral'].includes(materialById.get(id)?.kind);
export function beadPose(point,id){
  if(!isCharm(id))return{x:point.x,y:point.y,angle:point.angle-Math.PI/2};
  return{x:point.x+Math.sin(point.angle)*point.size*.28,y:point.y-Math.cos(point.angle)*point.size*.28,angle:point.angle-Math.PI};
}
export function beadSize(id) {
  const kind=materialById.get(id)?.kind;
  if(presentationFor(id)?.atlas)return presentationFor(id).size;
  if(kind==='pearl') return 22;
  if(['shell','bow','cherry'].includes(kind)) return 36;
  if(['rose','aqua','heart','lavender'].includes(kind)) return 29;
  if(['moon','flower','bell','star'].includes(kind)) return 31;
  return 25;
}

// Density follows physical bead widths; empty cord remains above a settled cluster.
export function beadPoints(loop, composition) {
  const ids=Array.isArray(composition)?composition:Array(Math.max(0,composition)).fill('pearl');
  if(!ids.length)return [];
  const path=loopPath(loop), raw=ids.map(beadSize), unit=loop.featured?loopPath(loop).total*.88/(raw.reduce((a,b)=>a+b,0)+ids.length*4.5):Math.min(loop.jewelry?2:1.4,Math.max(.75,loop.ry/96));
  const desired=raw.reduce((sum,size)=>sum+size*unit+4.5,0)-4.5;
  const scale=Math.min(1,path.total*((loop.jewelry||loop.featured) ? .88 : .72)/desired), gap=4.5*scale*unit;
  const sizes=raw.map(size=>size*unit*scale), total=sizes.reduce((a,b)=>a+b,0)+gap*(ids.length-1);
  let cursor=(path.total-total)/2;
  return sizes.map((size,index)=>{const distance=cursor+size/2;cursor+=size+gap;return{...pointAtLength(loop,distance),size,distance,gap,index};});
}

export function cordTarget(loop, point, composition) {
  const {points}=loopPath(loop); let nearest=points[0],distance=Infinity;
  for(const candidate of points){const d=Math.hypot(candidate.x-point.x,candidate.y-point.y);if(d<distance){nearest=candidate;distance=d;}}
  if(distance>54)return null;
  const positions=beadPoints(loop,composition), index=positions.findIndex(p=>p.t>=nearest.t);
  return{kind:'cord',index:index<0?positions.length:index,point:nearest};
}

const rewards = { 'sea-star': ['blue-star', '-64deg'], 'rose-heart': ['aqua-heart', '145deg'], 'garden-jade': ['jade-ring', '-18deg'], 'moon-pearl': ['pearl', '185deg'], 'sunset-crystal': ['clear-quartz', '-20deg'] };
export function spriteFrame(id) {
  const [base, hue] = rewards[id] || [id, '0deg'];
  const index = Math.max(0, MATERIALS.findIndex(m => m.id === base));
  return { base, hue, crop: [index%6*256,Math.floor(index/6)*256,256,256] };
}

/** Keep the actual phone fully framed; never use negative cropping coordinates. */
function framedPhone(width,height,home=false){
  const wide=width/height>1.5;
  const h=Math.min(height*(wide?.66:home?.48:.27),width*(home?.72:.44));
  return {x:Math.max(16,width*(wide?.07:home?.08:.08)),y:12+h*.02,w:h*.52,h,angle:-.045,bodyRight:.425};
}

const connections=new WeakMap();
/** A short cord exits the real lower-right eyelet, never crossing the case. */
export function phoneConnection(phone,loop){
  let byLoop=connections.get(phone);if(!byLoop){byLoop=new WeakMap();connections.set(phone,byLoop);}if(byLoop.has(loop))return byLoop.get(loop);
  const p=phone,c=Math.cos(p.angle),s=Math.sin(p.angle);
  const local=(x,y)=>({x:p.x+p.w/2+x*c-y*s,y:p.y+p.h/2+x*s+y*c});
  const anchor=local(p.w*.455,p.h*.382),top=loopPoint(loop,0);
  const needsBelow=top.x<anchor.x;
  const c1=local(p.w*.66,p.h*(needsBelow?.64:.41)),c2={x:top.x-6,y:needsBelow?Math.max(top.y-10,p.y+p.h+10):top.y-10};
  const segments=[[anchor,c1,c2,top]];
  const points=segments.flatMap(([a,b,c,d],index)=>Array.from({length:33},(_,i)=>{
    const t=i/32,u=1-t;return{x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};
  }).slice(index?1:0));
  const clasp=points[18],next=points[19];
  const result={anchor,segments,points,clasp,angle:Math.atan2(next.y-clasp.y,next.x-clasp.x)-Math.PI/2};byLoop.set(loop,result);return result;
}

/** The box stays below the jewelry silhouette; both use the same input geometry. */
export function jewelryLayout(width,height,finished=false,charmOnly=false,home=false){
  const layout=tabletopLayout(width,height,finished,charmOnly);
  layout.phone=framedPhone(width,height,home);
  if(home){
    const wide=width/height>1.5,ry=Math.min(height*(wide?.33:.21),width*.56);
    layout.loop={x:width*(wide?.61:.53),y:height*(wide?.51:.67),rx:Math.min(width*.43,height*(wide?.40:.34)),ry,rotation:wide?-.8:-.12,jewelry:true,featured:true};
  }else if(height>=470&&!layout.wide){
    const trayW=Math.min(154,width*.40),rowH=58;
    layout.tray={x:width-trayW-8,y:height-rowH*2-56,w:trayW,h:rowH*2,rowH};
    layout.rows=2;layout.count=4;
    const bottom=layout.tray.y-90,top=layout.phone.y+layout.phone.h+14;
    layout.loop={x:width*.48,y:(top+bottom)/2,rx:width*.42,ry:(bottom-top)/2,rotation:-.10,jewelry:true};
    if(finished)layout.loop={x:width*.5,y:height*.48,rx:width*.43,ry:Math.min(height*.34,width*.56),rotation:-.12,jewelry:true};
  }else{layout.loop.jewelry=true;}
  return layout;
}
