import './ice-blue-drop.css';
import './ice-blue-drop-overrides.css';
import { FIELD_HEIGHT, FIELD_WIDTH, createIceBlueRound, dropAccessory, stepGravity } from './gravity-game.js';
import { mountMeshyStar } from './meshy-star-viewer.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.dataset.entry = 'ice-blue-drop';
document.title = 'Ice Blue Lucky Drop';
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f4f0e8');

document.body.innerHTML = `<main class="ice-app" data-phase="hook">
  <header class="ice-topbar"><span>Lucky Link</span><button class="ice-sound" type="button" aria-label="Mute soundtrack" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5 5.5 8.5H3v7h2.5L10 19V5Z"/><path d="M14 8.5c1.8 1.9 1.8 5.1 0 7M17 6c3.2 3.3 3.2 8.7 0 12"/></svg></button></header>
  <section class="ice-hook" aria-label="Ice Blue Star Dream phone chain">
    <div class="morning-light" aria-hidden="true"></div>
    <div class="ice-phone" role="img" aria-label="Silver phone on ivory linen"><span class="camera-cluster" aria-hidden="true"><i></i><i></i><i></i><b></b></span><span class="phone-loop" aria-hidden="true"></span></div>
    <svg class="hero-cord" viewBox="0 0 390 720" aria-hidden="true"><path d="M271 104C180 118 82 211 87 359c5 151 90 251 190 214 79-29 72-137 35-205-43-79-80-127-41-264Z"/></svg>
    <div class="hero-chain" data-hero-chain></div>
    <button class="hero-star" type="button" data-start aria-label="Drop the ice crystal star and start">
      <canvas data-meshy-star aria-hidden="true"></canvas>
      <span class="hero-star-fallback charm charm--star" aria-hidden="true"><i></i></span>
      <span class="hero-star-ring" aria-hidden="true"></span>
    </button>
    <p class="hook-word" aria-hidden="true">Ice Blue<br><em>Lucky Drop</em></p>
  </section>
  <section class="ice-game" hidden aria-label="Ice Blue Lucky Drop game">
    <div class="game-hud"><button type="button" data-restart aria-label="Restart round"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8a8 8 0 1 1-1 7"/><path d="M5 3v5h5"/></svg></button><div><small>TIME</small><strong data-time>60</strong></div><span class="hud-gem" aria-hidden="true"></span><div><small>SCORE</small><strong><b data-score>0</b><i>/1500</i></strong></div></div>
    <div class="game-tray" data-field role="application" tabindex="0" aria-label="Tap the tray to drop a charm">
      <div class="tray-sheen" aria-hidden="true"></div><div class="danger-thread" aria-hidden="true"></div><div class="drop-guide" data-drop-guide aria-hidden="true"></div>
      <div class="game-pieces" data-pieces></div><div class="game-effects" data-effects aria-hidden="true"></div>
    </div>
    <div class="next-charm" aria-label="Next charm"><span data-next></span></div>
  </section>
  <section class="ice-status" hidden role="status"><strong data-end-title></strong><button type="button" data-again>Try again</button></section>
</main>`;

const app = document.querySelector('.ice-app');
const hook = document.querySelector('.ice-hook');
const game = document.querySelector('.ice-game');
const field = document.querySelector('[data-field]');
const piecesLayer = document.querySelector('[data-pieces]');
const effectsLayer = document.querySelector('[data-effects]');
const scoreNode = document.querySelector('[data-score]');
const timeNode = document.querySelector('[data-time]');
const nextNode = document.querySelector('[data-next]');
const starViewer = mountMeshyStar(document.querySelector('[data-meshy-star]'), { reducedMotion });
const heroLayout = [
  ['pearl',70,14,19,0],['cube',58,15,21,10],['drop',45,17,20,-17],['pearl',33,21,17,0],
  ['star',24,29,22,12],['cube',20,39,21,-8],['drop',19,50,23,20],['pearl',22,62,19,0],
  ['cube',31,74,23,10],['drop',44,82,21,-16],['pearl',58,83,20,0],['star',70,77,23,-12],
  ['cube',78,68,21,8],['pearl',81,58,18,0],['drop',78,49,21,17],['cube',72,40,19,-8],['pearl',69,29,17,0],
];
const makeCharm = (shape, className = '') => { const node = document.createElement('span'); node.className = `charm charm--${shape} ${className}`; node.dataset.shape = shape; node.innerHTML = '<i></i>'; return node; };
const heroChain = document.querySelector('[data-hero-chain]');
heroLayout.forEach(([shape,x,y,size,rotation], index) => { const node=makeCharm(shape,'hero-piece'); node.style.cssText=`--x:${x}%;--y:${y}%;--size:${size}px;--r:${rotation}deg;--order:${index}`; heroChain.append(node); });

let round = createIceBlueRound();
let nodes = new Map(); let raf = 0; let lastFrame = 0; let startedAt = 0; let phase = 'hook'; let lastDrop = 0; let audioContext = null; let muted = false;
try { muted = localStorage.getItem('lucky-link.muted') === 'yes'; } catch { /* session-only */ }
const soundButton = document.querySelector('.ice-sound');
function syncSound() { soundButton.setAttribute('aria-pressed', String(muted)); soundButton.setAttribute('aria-label', muted ? 'Turn on soundtrack' : 'Mute soundtrack'); }
syncSound();
async function unlockAudio() { if (muted) return; const Context=globalThis.AudioContext||globalThis.webkitAudioContext; if(!Context)return; audioContext ||= new Context(); await audioContext.resume().catch(()=>{}); }
function ping(frequency=880, gainValue=.035, duration=.12) { if(!audioContext||muted)return; const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime; osc.type='sine';osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(frequency*1.22,now+duration);gain.gain.setValueAtTime(gainValue,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain).connect(audioContext.destination);osc.start(now);osc.stop(now+duration); }

function renderNext() { const id=round.nextTypes[0]||'ice-star'; const shape=id.replace('ice-','').replace('moon-',''); nextNode.replaceChildren(makeCharm(shape)); }
function render() {
  const rect=field.getBoundingClientRect(); if(!rect.width||!rect.height)return;
  const live=new Set(round.pieces.map(piece=>piece.id));
  for(const [id,node] of nodes) if(!live.has(id)){node.remove();nodes.delete(id);}
  for(const piece of round.pieces){ let node=nodes.get(piece.id); if(!node){node=makeCharm(piece.shape,'game-piece');node.dataset.id=String(piece.id);piecesLayer.append(node);nodes.set(piece.id,node);} const size=piece.radius*2*Math.min(rect.width/FIELD_WIDTH,rect.height/FIELD_HEIGHT);node.style.width=`${size}px`;node.style.height=`${size}px`;node.style.left=`${piece.x/FIELD_WIDTH*100}%`;node.style.top=`${piece.y/FIELD_HEIGHT*100}%`;node.style.transform=`translate(-50%,-50%) rotate(${piece.rotation}rad)`;node.dataset.motion=piece.settled>180?'settled':'moving'; }
  scoreNode.textContent=String(round.score); renderNext();
}
function burst(removed, chain) { const x=removed.reduce((sum,p)=>sum+p.x,0)/removed.length/FIELD_WIDTH*100; const y=removed.reduce((sum,p)=>sum+p.y,0)/removed.length/FIELD_HEIGHT*100; const wave=document.createElement('span');wave.className='ice-wave';wave.style.cssText=`left:${x}%;top:${y}%;--chain:${Math.min(4,chain)}`;effectsLayer.append(wave);setTimeout(()=>wave.remove(),650);ping(780+chain*95,.04+.008*chain,.15); }
function frame(now) { if(phase!=='playing')return; const elapsed=now-startedAt; const remaining=Math.max(0,60_000-elapsed);timeNode.textContent=String(Math.ceil(remaining/1000));const result=stepGravity(round,lastFrame?Math.min(32,now-lastFrame):16);lastFrame=now;round=result.round;if(result.event==='clear')burst(result.removed,round.chain);else if(result.event==='impact')ping(620,.012,.07);render();if(round.status==='won'||remaining<=0){finish(round.status==='won');return;}raf=requestAnimationFrame(frame); }
function startRound() { cancelAnimationFrame(raf); nodes.forEach(node=>node.remove());nodes=new Map();round=createIceBlueRound();lastFrame=0;startedAt=performance.now();phase='playing';app.dataset.phase='playing';document.querySelector('.ice-status').hidden=true;render();raf=requestAnimationFrame(frame);field.focus({preventScroll:true}); }
function enterGame(){if(phase!=='hook')return;void unlockAudio().then(()=>ping(960,.05,.18));phase='releasing';app.dataset.phase='releasing';hook.classList.add('is-releasing');setTimeout(()=>{hook.hidden=true;game.hidden=false;startRound();},reducedMotion?300:1150);}
function finish(won){phase=won?'won':'lost';cancelAnimationFrame(raf);app.dataset.phase=phase;game.hidden=true;const status=document.querySelector('.ice-status');status.hidden=false;document.querySelector('[data-end-title]').textContent=won?'Star dream unlocked':'One more drop';document.querySelector('[data-again]').focus();}
function drop(event){if(phase!=='playing'||performance.now()-lastDrop<380)return;const rect=field.getBoundingClientRect();round=dropAccessory(round,(event.clientX-rect.left)/rect.width*FIELD_WIDTH);lastDrop=performance.now();ping(490,.022,.09);render();}
field.addEventListener('pointermove',event=>{const rect=field.getBoundingClientRect();document.querySelector('[data-drop-guide]').style.left=`${Math.max(5,Math.min(95,(event.clientX-rect.left)/rect.width*100))}%`;});
field.addEventListener('pointerup',drop);
document.querySelector('[data-start]').addEventListener('click',enterGame);
document.querySelector('[data-restart]').addEventListener('click',startRound);
document.querySelector('[data-again]').addEventListener('click',()=>{document.querySelector('.ice-status').hidden=true;game.hidden=false;startRound();});
soundButton.addEventListener('click',()=>{muted=!muted;try{localStorage.setItem('lucky-link.muted',muted?'yes':'no');}catch{/* session-only */}syncSound();if(!muted)void unlockAudio().then(()=>ping());});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);void audioContext?.suspend().catch(()=>{});}else if(phase==='playing'){startedAt=performance.now()-(60-Number(timeNode.textContent))*1000;lastFrame=0;raf=requestAnimationFrame(frame);}});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);starViewer.destroy();void audioContext?.close().catch(()=>{});});
