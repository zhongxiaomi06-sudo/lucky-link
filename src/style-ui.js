import { FAMILIES, FEATURED_IDS } from './collection-catalog.js';
import { evaluateStyle } from './style-challenges.js';
import { openDialog } from './studio-ui.js';

export function featuredRecipe(id){
  const f=FAMILIES.find(f=>f.id===id);if(!f)return FEATURED_IDS;
  return [f.ids[0],'pearl',f.ids[1],f.ids[2],'pearl',f.ids[3],f.ids[4],'chrome-bow',f.ids[5],'pearl',f.ids[2],f.ids[0],f.ids[4],f.ids[1]];
}

export function createStyleUI({shell,getArt,getIds,getBook,onFamily,onChallenge,onStart}){
  const home=document.createElement('section');home.className='tt-home-controls';home.setAttribute('aria-label','Create your phone chain');
  home.innerHTML='<div class="style-rail" data-home-families aria-label="Material collections"></div><div class="home-actions"><button class="tt-primary" type="button" data-home-start aria-label="Play to unlock a charm"></button></div>';
  shell.append(home);
  const rail=document.createElement('div');rail.className='style-rail style-rail-diy';rail.setAttribute('aria-label','Material collections');shell.append(rail);
  const side=document.createElement('div');side.className='tt-side-actions';side.innerHTML='<button type="button" data-action="unlock" aria-label="Unlock hidden beads">Unlock</button><button type="button" data-action="cords" aria-label="Choose cord material">Cords</button><button type="button" data-action="style-challenge" aria-label="Choose a style challenge"><span data-style-word>Style</span><span data-style-progress aria-hidden="true"></span></button>';
  shell.querySelector('[data-work]').append(side);
  const dialog=document.createElement('dialog');dialog.dataset.dialog='styles';dialog.className='studio-dialog styles-dialog';dialog.setAttribute('aria-labelledby','styles-title');
  dialog.innerHTML='<header><h2 id="styles-title">Style play</h2><button data-close type="button" aria-label="Back to your chain">×</button></header><div data-style-choices></div><div data-style-rules></div><button type="button" data-style-free>Free DIY</button>';
  shell.append(dialog);
  let currentFamily='',challenge='',signature='';
  home.querySelector('[data-home-start]').onclick=()=>onStart();
  function choose(event){const b=event.target.closest('[data-family]');if(!b)return;onFamily(b.dataset.family===currentFamily?'':b.dataset.family);}
  home.querySelector('[data-home-families]').addEventListener('click',choose);rail.addEventListener('click',choose);
  dialog.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.styleChoice)onChallenge(b.dataset.styleChoice);if(b.hasAttribute('data-style-free')){onChallenge('');dialog.close();}});
  document.addEventListener('click',event=>{if(event.target.closest('[data-action="style-challenge"]'))openDialog('styles');});
  function render({isHome,finished,family,activeChallenge}){
    currentFamily=family;challenge=activeChallenge;home.hidden=true;rail.hidden=isHome||finished;side.hidden=isHome||finished;
    const art=getArt();if(!art)return;
    if(!signature){
      for(const target of [rail,home.querySelector('[data-home-families]')])target.replaceChildren(...FAMILIES.map(f=>{const b=document.createElement('button');b.type='button';b.dataset.family=f.id;b.setAttribute('aria-label',`${f.name} collection`);b.title=f.name;const img=new Image();img.src=art.urls.get(f.sample);img.alt='';b.append(img);return b;}));
      dialog.querySelector('[data-style-choices]').replaceChildren(...FAMILIES.map(f=>{const b=document.createElement('button');b.type='button';b.dataset.styleChoice=f.id;const img=new Image();img.src=art.urls.get(f.sample);img.alt='';const name=document.createElement('span');name.textContent=f.name;const stamp=document.createElement('span');stamp.dataset.stamp=f.id;b.append(img,name,stamp);return b;}));signature='ready';
    }
    shell.querySelectorAll('[data-family]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.family===family)));
    dialog.querySelectorAll('[data-stamp]').forEach(n=>{n.textContent=getBook().stamps.includes(n.dataset.stamp)?'✓':'';n.setAttribute('aria-label',n.textContent?'Completed':'Not completed');});
    dialog.querySelectorAll('[data-style-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.styleChoice===challenge)));
    const result=evaluateStyle(challenge,getIds());
    side.querySelector('[data-style-word]').textContent=FAMILIES.find(f=>f.id===challenge)?.name||'Style';
    side.querySelector('[data-style-progress]').textContent=challenge?result.rules.map(r=>r.passed?'●':'○').join(''):'';
    const rules=dialog.querySelector('[data-style-rules]');rules.replaceChildren();
    if(challenge){const title=document.createElement('h3');title.textContent=FAMILIES.find(f=>f.id===challenge).name;rules.append(title);for(const r of result.rules){const p=document.createElement('p');p.textContent=`${r.passed?'✓':'○'} ${r.label} · ${Math.min(r.value,r.target)} / ${r.target}`;rules.append(p);}}
  }
  return{render,showRules:()=>openDialog('styles')};
}
