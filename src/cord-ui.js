import { CORDS, ownedCordIds } from './cord-catalog.js';
import { openDialog } from './studio-ui.js';

export function createCordUI({shell,getArt,getCollection,onSelect,onUnlock}){
  const dialog=document.createElement('dialog');dialog.className='studio-dialog cord-dialog';dialog.dataset.dialog='cords';dialog.setAttribute('aria-labelledby','cord-title');
  dialog.innerHTML='<header><h2 id="cord-title">Your cord</h2><button type="button" data-close aria-label="Back to your chain">×</button></header><div class="cord-options" data-cord-options></div>';
  shell.append(dialog);
  function open(){
    const art=getArt();if(!art)return;
    const collection=getCollection(),owns=ownedCordIds(collection);
    dialog.querySelector('[data-cord-options]').replaceChildren(...CORDS.map(c=>{
      const b=document.createElement('button');b.type='button';b.dataset.cordChoice=c.id;
      b.setAttribute('aria-label',`${owns.includes(c.id)?'Use':'Unlock'} ${c.name}`);b.setAttribute('aria-pressed',String(collection.cordId===c.id));
      const img=new Image();img.src=art.urls.get(c.id);img.alt='';b.append(img);
      const name=document.createElement('span');name.textContent=c.name;b.append(name);
      if(!owns.includes(c.id)){b.dataset.locked='true';const lock=document.createElement('small');lock.textContent='Locked';b.append(lock);}
      return b;
    }));openDialog('cords');
  }
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('[data-cord-choice]');if(!button)return;
    const id=button.dataset.cordChoice;dialog.close();
    if(ownedCordIds(getCollection()).includes(id))onSelect(id);else onUnlock(id);
  });
  return{open};
}
