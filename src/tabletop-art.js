import { MATERIALS } from './materials.js';
import { MATERIALS as CATALOG, presentationFor } from './collection-catalog.js';
import { spriteFrame } from './tabletop-layout.js';
import { deliveryUrl } from './art-delivery.js';
import { CORDS } from './cord-catalog.js';
import { cordPreview } from './cord-art.js';

const load = src => new Promise((resolve, reject) => {
  const img = new Image(); let fallback = deliveryUrl(src) === src;
  img.onload = () => resolve(img);
  img.onerror = () => {
    if (!fallback) { fallback = true; img.src = src; }
    else reject(new Error(`Missing art: ${src}`));
  };
  img.src = deliveryUrl(src);
});

export async function loadTabletopArt() {
  const atlasUrls=[...new Set(CATALOG.map(m=>presentationFor(m.id).atlas).filter(Boolean))];
  const [phone, tray, atlas, hardware, room, ...families] = await Promise.all([
    load('/assets/tabletop-phone-v19.png'), load('/assets/box-v12.png'), load('/assets/jewelry-v12.png'), load('/assets/hardware-v12.png'), load('/assets/tabletop-room-v17.png'), ...atlasUrls.map(load),
  ]);
  const sprites = new Map();
  for (const material of MATERIALS) {
    const frame = spriteFrame(material.id);
    let source = sprites.get(frame.base);
    if (!source) source = keyedSprite(atlas, frame.crop);
    if (material.reward) {
      const tint = document.createElement('canvas'); tint.width = source.width; tint.height = source.height;
      const ctx = tint.getContext('2d');
      ctx.filter = `hue-rotate(${frame.hue})${material.id === 'moon-pearl' ? ' sepia(.2) saturate(1.5)' : ''}`;
      ctx.drawImage(source, 0, 0); source = tint;
    }
    sprites.set(material.id, source);
  }
  for(const {id} of CATALOG){
    const p=presentationFor(id);if(!p.atlas)continue;
    const image=families[atlasUrls.indexOf(p.atlas)],columns=p.grid?.[0]||3,rows=p.grid?.[1]||2,w=image.width/columns,h=image.height/rows;
    sprites.set(id,(p.chromaKey?keyedSprite:alphaSprite)(image,[p.cell%columns*w,Math.floor(p.cell/columns)*h,w,h]));
  }
  const traySprite=keyedSprite(tray,[190,44,644,1110]), returnTray=keyedSprite(tray,[200,1170,624,306]);
  for(const c of CORDS)sprites.set(c.id,cordPreview(c.id));
  return { backgroundUrl:room.src, phone: keyedSprite(phone, [0,0,phone.width,phone.height],true), tray:traySprite, returnTray,
    clasp:keyedSprite(hardware,[0,0,724,724]), spacer:keyedSprite(hardware,[724,0,724,724]), ring:keyedSprite(hardware,[1448,0,724,724]),
    trayUrl:traySprite.toDataURL(), returnUrl:returnTray.toDataURL(), sprites, urls: new Map([...sprites].map(([id, c]) => [id, c.toDataURL()])) };
}

/** Opaque chroma-key sources are intentional; preserve original files and colors. */
function keyedSprite(image, [sx,sy,w,h], neutralMatte=false) {
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,sx,sy,w,h,0,0,w,h);
  const pixels=ctx.getImageData(0,0,w,h),d=pixels.data;
  let left=w,top=h,right=0,bottom=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2];
    if(r>145&&b>145&&g<85&&Math.abs(r-b)<65){d[i+3]=0;continue;}
    if(neutralMatte&&r>g+24&&b>g+24&&Math.abs(r-b)<70){
      // Neutral silver edges against a saturated key: green carries coverage.
      // Using chroma magnitude as alpha leaves faint full-image padding behind.
      const neutral=Math.max(r,b),alpha=g/neutral;
      if(alpha<.06){d[i+3]=0;continue;}
      d[i]=neutral;d[i+1]=neutral;d[i+2]=neutral;d[i+3]=alpha*255;
    }
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  ctx.putImageData(pixels,0,0);
  if(left>right)return canvas;
  const trimmed=document.createElement('canvas');trimmed.width=right-left+1;trimmed.height=bottom-top+1;
  trimmed.getContext('2d').drawImage(canvas,left,top,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);return trimmed;
}

export function paintBead(ctx, source, x, y, size, angle = 0) {
  if (!source) return;
  const scale = size / Math.max(source.width, source.height);
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.shadowColor = '#493c325c'; ctx.shadowBlur = size * .14; ctx.shadowOffsetY = size * .10;
  ctx.drawImage(source, -source.width * scale / 2, -source.height * scale / 2, source.width * scale, source.height * scale);
  ctx.shadowColor = 'transparent';
  ctx.restore();
}

/** Crop the generator's actual alpha, not a color-keyed approximation. */
function alphaSprite(image,[x,y,w,h]){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,x,y,w,h,0,0,w,h);
  const data=ctx.getImageData(0,0,w,h).data;let left=w,right=0,top=h,bottom=0;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(data[(j*w+i)*4+3]>20){left=Math.min(left,i);right=Math.max(right,i);top=Math.min(top,j);bottom=Math.max(bottom,j);}
  if(left>=right||top>=bottom)throw new Error('Empty jewelry sprite');
  const trimmed=document.createElement('canvas');trimmed.width=right-left+1;trimmed.height=bottom-top+1;
  trimmed.getContext('2d').drawImage(canvas,left,top,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);
  return trimmed;
}
