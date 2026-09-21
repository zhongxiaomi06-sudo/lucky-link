import { cordById } from './cord-catalog.js';

export function cordSamples(points,spacing=2){
  if(points.length<2)return [];
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
  const total=lengths.at(-1),out=[];let j=1;
  for(let d=0;d<=total;d+=spacing){
    while(j<points.length-1&&lengths[j]<d)j++;
    const a=points[j-1],b=points[j],t=(d-lengths[j-1])/(lengths[j]-lengths[j-1]||1);
    out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x),distance:d});
  }
  return out;
}
const cache=new WeakMap();
function trace(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));}
function renderTexture(ctx,points,material,scale,color){
  const w=material.width*scale;
  ctx.lineCap='round';ctx.lineJoin='round';
  trace(ctx,points);ctx.strokeStyle=material.dark;ctx.lineWidth=w;ctx.shadowColor='#34251c50';ctx.shadowBlur=scale*1.2;ctx.shadowOffsetY=scale*1.2;ctx.stroke();ctx.shadowColor='transparent';
  ctx.lineWidth=w*.74;ctx.strokeStyle=material.texture==='plain'?color:material.color;ctx.stroke();
  if(material.texture==='plain'||material.texture==='satin'){
    const samples=cordSamples(points,1.3*scale),edge=samples.map(p=>({x:p.x-Math.sin(p.angle)*w*.20,y:p.y+Math.cos(p.angle)*w*.20}));
    trace(ctx,edge);ctx.lineWidth=w*(material.texture==='satin'?.24:.20);ctx.strokeStyle=material.light;ctx.globalAlpha=.8;ctx.stroke();ctx.globalAlpha=1;return;
  }
  const metal=material.texture==='metal',samples=cordSamples(points,(metal?3.1:2.2)*scale);
  samples.forEach((p,i)=>{
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
    if(metal){
      ctx.beginPath();ctx.ellipse(0,0,2.7*scale,(i%2?1.05:1.7)*scale,0,0,Math.PI*2);
      ctx.lineWidth=1.55*scale;ctx.strokeStyle=material.dark;ctx.stroke();ctx.lineWidth=.72*scale;ctx.strokeStyle=i%2?material.color:material.light;ctx.stroke();
    }else{
      const side=i%2?1:-1;
      ctx.beginPath();ctx.moveTo(-1.5*scale,-w*.32*side);ctx.quadraticCurveTo(.2*scale,-w*.18*side,1.9*scale,w*.35*side);
      ctx.lineWidth=1.45*scale;ctx.strokeStyle=material.texture==='two-tone'?(i%2?material.light:material.color):material.light;ctx.globalAlpha=material.texture==='two-tone'?1:.72;ctx.stroke();
      ctx.beginPath();ctx.moveTo(-1.6*scale,-w*.31*side);ctx.lineTo(.5*scale,w*.14*side);ctx.lineWidth=.35*scale;ctx.strokeStyle=material.dark;ctx.globalAlpha=.85;ctx.stroke();
    }
    ctx.restore();
  });
}
/** Cached 2D fibres and interlocking links follow the exact live path. */
export function paintCord(ctx,points,id='cord-cotton',scale=1,color='#43566c'){
  if(points.length<2)return;
  const material=cordById.get(id)||cordById.get('cord-cotton'),key=`${material.id}:${scale}:${color}`;
  let variants=cache.get(points);if(!variants){variants=new Map();cache.set(points,variants);}
  let layer=variants.get(key);
  if(!layer){
    const pad=material.width*scale*3,left=Math.floor(Math.min(...points.map(p=>p.x))-pad),top=Math.floor(Math.min(...points.map(p=>p.y))-pad);
    const w=Math.ceil(Math.max(...points.map(p=>p.x))-left+pad),h=Math.ceil(Math.max(...points.map(p=>p.y))-top+pad);
    const canvas=document.createElement('canvas');canvas.width=w*2;canvas.height=h*2;
    const c=canvas.getContext('2d');c.scale(2,2);c.translate(-left,-top);renderTexture(c,points,material,scale,color);
    layer={canvas,left,top,w,h};variants.set(key,layer);
  }
  ctx.drawImage(layer.canvas,layer.left,layer.top,layer.w,layer.h);
}
export function cordPreview(id){
  const c=document.createElement('canvas');c.width=260;c.height=180;
  const points=Array.from({length:90},(_,i)=>{const t=i/89;return{x:24+t*212,y:94+24*Math.sin(t*Math.PI*2)};});
  paintCord(c.getContext('2d'),points,id,2.2);return c;
}
