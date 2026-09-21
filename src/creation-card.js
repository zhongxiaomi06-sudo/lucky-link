import { cleanNote } from './collection-game.js';
import { beadPoints, beadPose, loopPath, isCharm, phoneConnection } from './tabletop-layout.js';
import { paintBead } from './tabletop-art.js';
import { paintCord } from './cord-art.js';
import { openDialog } from './studio-ui.js';

// Artwork only: never rasterize controls, branding or a sample composition.
export function paintCreationCard(art, snapshot) {
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.fillStyle='#f4efdf';ctx.fillRect(0,0,1080,1440);
  ctx.fillStyle='#dfe7d6';ctx.fillRect(38,38,1004,1110);
  ctx.strokeStyle='#b6c5aa';ctx.lineWidth=2;ctx.setLineDash([5,7]);ctx.strokeRect(52,52,976,1082);ctx.setLineDash([]);
  const p={x:110,y:78,w:230,h:442,angle:-.045};
  ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.rotate(p.angle);ctx.shadowColor='#33493740';ctx.shadowBlur=24;ctx.shadowOffsetY=16;ctx.drawImage(art.phone,-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
  const loop={x:560,y:758,rx:430,ry:260,rotation:-.12,jewelry:true};
  const route=phoneConnection(p,loop);
  paintCord(ctx,route.points,snapshot.cordId||'cord-classic',2,snapshot.cord);paintBead(ctx,art.clasp,route.clasp.x,route.clasp.y,40,route.angle);
  paintCord(ctx,loopPath(loop).points,snapshot.cordId||'cord-classic',2,snapshot.cord);
  const points=beadPoints({...loop,x:loop.x/2,y:loop.y/2,rx:loop.rx/2,ry:loop.ry/2},snapshot.ids).map(p=>({...p,x:p.x*2,y:p.y*2,size:p.size*2}));
  points.forEach((point,i)=>{
    const id=snapshot.ids[i], charm=isCharm(id), size=point.size;
    if(!art.sprites.get(id))throw new Error(`Missing bead art: ${id}`);
    if(charm)paintBead(ctx,art.ring,point.x,point.y,14);
    const pose=beadPose(point,id);paintBead(ctx,art.sprites.get(id),pose.x,pose.y,size,pose.angle);
  });
  const note=cleanNote(snapshot.note).trim();
  // Paragraphs remain intentional; excessive empty lines consume no card height.
  const paragraphs=note.replace(/\n+/g,'\n').split('\n');
  let font=36,lines=[];
  do {
    ctx.font=`${font}px Georgia, serif`;lines=[];
    for(const paragraph of paragraphs){let line='';for(const ch of paragraph){if(line&&ctx.measureText(line+ch).width>880){lines.push(line);line=ch;}else line+=ch;}lines.push(line);}
    if(lines.length*font*1.3<=218)break;font-=2;
  } while(font>=4);
  ctx.fillStyle='#244f52';ctx.textAlign='center';ctx.textBaseline='top';
  lines.forEach((line,i)=>ctx.fillText(line,540,1190+i*font*1.3));
  canvas.dataset.ids=snapshot.ids.join(',');canvas.dataset.note=note;canvas.dataset.cordId=snapshot.cordId||'cord-classic';
  return canvas;
}

export function createCreationCard({shell,getArt,getDesign,getNote,setNote,sound}) {
  const dialog=document.createElement('dialog');dialog.className='studio-dialog card-dialog';dialog.dataset.dialog='card';dialog.setAttribute('aria-labelledby','card-title');
  dialog.innerHTML=`<header><h2 id="card-title">Made by you</h2><button type="button" data-close aria-label="Close your card">×</button></header>
    <form data-card-form><label>A little note<textarea data-card-note rows="3" placeholder="A little luck, wherever I go." aria-describedby="card-privacy"></textarea></label><p class="card-count" data-card-count>0 / 120</p><p id="card-privacy">Your note will be part of the image.</p><button class="tt-primary" type="submit">Create card</button></form>
    <section data-card-result hidden><img class="card-preview" data-card-image alt="Your phone chain and personal note"><div class="card-actions"><a data-save-card download="my-phone-chain.png">Save image</a><button type="button" class="tt-primary" data-share-card>Share card</button></div><button type="button" data-edit-note>Edit note</button><p data-share-hint></p></section><p data-card-status role="status"></p>`;
  shell.append(dialog);
  const $=s=>dialog.querySelector(s);
  let file=null,url=null,generation=0,busy=false,sharing=false;
  function release(){if(url)URL.revokeObjectURL(url);url=null;file=null;$('[data-save-card]').removeAttribute('href');$('[data-card-image]').removeAttribute('src');}
  function updateNote(){const note=cleanNote($('[data-card-note]').value);$('[data-card-note]').value=note;$('[data-card-count]').textContent=`${[...note].length} / 120`;setNote(note);}
  function editing(){generation++;release();busy=false;sharing=false;$('[data-card-form]').hidden=false;$('[data-card-result]').hidden=true;$('[data-card-status]').textContent='';$('[type="submit"]').disabled=false;}
  function open(){editing();$('[data-card-note]').value=getNote();$('[data-card-count]').textContent=`${[...getNote()].length} / 120`;openDialog('card');}
  $('[data-card-note]').addEventListener('input',updateNote);
  $('[data-edit-note]').addEventListener('click',()=>{editing();$('[data-card-note]').focus();});
  $('[data-card-form]').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;busy=true;updateNote();const token=++generation;$('[type="submit"]').disabled=true;$('[data-card-status]').textContent='Making your card…';
    try {
      const design=getDesign();const snapshot={...design,ids:[...design.ids],note:getNote()};
      if(snapshot.ids.length<3)throw new Error('Not enough beads');
      const canvas=paintCreationCard(getArt(),snapshot);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image unavailable')),'image/png'));
      if(token!==generation||!dialog.open)return;
      release();file=new File([blob],'my-phone-chain.png',{type:'image/png'});url=URL.createObjectURL(blob);
      $('[data-card-image]').src=url;$('[data-save-card]').href=url;
      dialog.dataset.cardIds=snapshot.ids.join(',');dialog.dataset.cardNote=snapshot.note;dialog.dataset.cardCordId=snapshot.cordId||'cord-classic';
      let capable=false;try{capable=Boolean(navigator.share&&navigator.canShare?.({files:[file]}));}catch{/* Download remains available. */}
      $('[data-share-card]').hidden=!capable;$('[data-share-card]').disabled=false;
      $('[data-share-hint]').textContent=capable?'Choose where to share.':'Save the image, then share it from your device.';
      $('[data-card-form]').hidden=true;$('[data-card-result]').hidden=false;$('[data-card-status]').textContent='Your card is ready.';sound.play('complete');$('[data-save-card]').focus();
    } catch {if(token===generation)$('[data-card-status]').textContent='The image could not be made. Try again.';}
    finally {if(token===generation){busy=false;$('[type="submit"]').disabled=false;}}
  });
  $('[data-share-card]').addEventListener('click',async()=>{
    if(!file||sharing)return;sharing=true;$('[data-share-card]').disabled=true;
    const token=generation;
    try {await navigator.share({files:[file],title:'My phone chain'});if(token===generation)$('[data-card-status]').textContent='Card handed to your share app.';}
    catch(error){if(token===generation)$('[data-card-status]').textContent=error?.name==='AbortError'?'Not shared. Your card is still here.':'Sharing is unavailable. Save the image instead.';}
    finally{if(token===generation){sharing=false;$('[data-share-card]').disabled=false;}}
  });
  $('[data-save-card]').addEventListener('click',()=>{$('[data-card-status]').textContent='Image opened for saving. Check your downloads.';});
  dialog.addEventListener('close',()=>{generation++;release();busy=false;});
  return {open};
}
