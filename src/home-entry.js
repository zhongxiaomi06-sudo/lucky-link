const params=new URLSearchParams(location.search);
const requestedView=params.get('view');
if(!requestedView&&!params.has('legacy')) {
  await import('./tabletop.js');
} else if(requestedView!=='legacy-2d'&&requestedView!=='3d') {
  await import('./tabletop.js');
} else {
const fallback=requestedView==='legacy-2d';
document.documentElement.dataset.entry=fallback?'fallback':'hero';

if(fallback) {
  await import('./styles.css');
  // Optional legacy fonts must not delay the fallback's geometry and overflow rules.
  const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.media='print';
  fonts.href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@1,600&display=swap';
  fonts.onload=()=>{fonts.media='all';};document.head.append(fonts);
  const image=document.querySelector('[data-fallback-src]');image.src=image.dataset.fallbackSrc;
  document.querySelector('[data-action="start"] span').textContent='Build your lucky';
  await import('./main.js');
} else {
  const scene=document.querySelector('[data-cover-scene]');
  const view=document.querySelector('[data-view="cover"]');
  const sound=document.querySelector('[data-action="sound"]');
  const start=document.querySelector('[data-action="start"]');
  const status=document.createElement('p');status.className='home-status';status.textContent='A little sunshine…';status.setAttribute('role','status');view.append(status);
  view.dataset.homeState='loading';
  let muted=false,context=null,master=null,hero=null,unavailable=false,started=false;
  try {muted=localStorage.getItem('lucky-link.muted')==='yes';}catch{/* Session-only preference. */}
  sound.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 5 8H2v8h3l6 4Z"/><g class="sound-waves"><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></g></svg>';
  function updateSound(){sound.setAttribute('aria-pressed',String(muted));sound.setAttribute('aria-label',muted?'Turn on soundtrack':'Mute soundtrack');if(master&&context)master.gain.setTargetAtTime(muted?0:.055,context.currentTime,.05);}
  async function beginSound() {
    if(muted||document.hidden)return;
    try {
      const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;
      if(!context) {
        context=new Context();master=context.createGain();master.gain.value=.055;master.connect(context.destination);
        // Quiet original summer harmony, bounded persistent voices; never created before a gesture.
        for(const [i,hz] of [174.61,261.63,349.23].entries()) {
          const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.value=hz;gain.gain.value=i? .10:.22;osc.connect(gain).connect(master);osc.start();
        }
      }
      await context.resume();started=true;view.dataset.audioState=context.state;
    } catch {view.dataset.audioState='unavailable';}
  }
  updateSound();
  sound.addEventListener('click',()=>{muted=!muted;try{localStorage.setItem('lucky-link.muted',muted?'yes':'no');}catch{/* Core flow remains available. */}updateSound();if(!muted)void beginSound();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){void context?.suspend().catch(()=>{});view.dataset.audioState=context?'suspended':'idle';}
    else if(started&&!muted)void beginSound();
  });
  start.addEventListener('click',event=>{
    event.preventDefault();
    if(unavailable){event.preventDefault();location.href='/?view=2d';}
    else {void context?.suspend().catch(()=>{});location.href='/3d-lab.html?view=3d';}
  });
  function useFallback() {
    unavailable=true;hero?.destroy();hero=null;scene.querySelector('canvas')?.remove();
    view.dataset.homeState='fallback';status.hidden=false;status.textContent='3D unavailable. Start in 2D.';
    const image=document.querySelector('[data-fallback-src]');image.src=image.dataset.fallbackSrc;
  }
  scene.addEventListener('hero-unavailable',useFallback);
  try {
    const {createHomeHero}=await import('./home-hero.js');
    const created=await createHomeHero({container:scene,header:document.querySelector('.cover-brand'),button:start,onGesture:()=>{void beginSound();}});
    if(unavailable)created.destroy();else {hero=created;view.dataset.homeState='ready';status.hidden=true;}
  } catch(error) {if(new URLSearchParams(location.search).has('debug'))view.dataset.renderError=String(error);useFallback();}
  window.addEventListener('pagehide',e=>{void context?.suspend().catch(()=>{});if(!e.persisted){hero?.destroy();void context?.close().catch(()=>{});}});
  window.addEventListener('pageshow',()=>hero?.draw());
}
}
