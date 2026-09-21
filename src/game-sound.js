import { materialById } from './collection-catalog.js';
import { materialFamilyFor } from './material-physics.js';

export function soundFamily(id) {
  const item=materialById.get(id);if(item?.sound)return item.sound;
  const kind=item?.kind;
  if(['moon','bell'].includes(kind)) return 'metal';
  if(['pearl','shell','eye'].includes(kind)) return 'pearl';
  if(['crystal','blue','aqua','rose','amber','cube','jade'].includes(kind)) return 'glass';
  return 'resin';
}

const timbres={glass:[1,2.72,.85],pearl:[.76,1.52,.62],resin:[.56,2,.48],metal:[1.35,3.16,1.05]};
const CONTACT_HARDNESS={glass:.95,pearl:.84,resin:.68,metal:1,floor:.55};
const IMPACT_TONES={
  glass:{frequencies:[860,2340,3620],weights:[1,.43,.15],types:['sine','sine','sine'],decay:.18,cutoff:7200},
  pearl:{frequencies:[370,740],weights:[1,.23],types:['sine','triangle'],decay:.09,cutoff:2900},
  resin:{frequencies:[190,520],weights:[1,.28],types:['triangle','sine'],decay:.065,cutoff:1300},
  metal:{frequencies:[1050,2917,4370],weights:[1,.49,.24],types:['sine','sine','sine'],decay:.27,cutoff:10500},
};

/** Physics normalizes contact energy; audio compresses its dynamic range and bounds pan. */
export function impactParameters(id,options={}) {
  const family=Object.hasOwn(IMPACT_TONES,options.materialFamily)?options.materialFamily:materialFamilyFor(id);
  const raw=options.intensity===undefined ? .45 : options.intensity;
  const intensity=Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):0;
  const x=Number.isFinite(options.x)?Math.max(0,Math.min(1,options.x)):.5;
  const pair=Array.isArray(options.materialPair)?options.materialPair:[];
  const partner=pair.find(value=>value!==family&&Object.hasOwn(CONTACT_HARDNESS,value))||(pair.includes(family)?family:undefined);
  return {family,partner,intensity,energy:Math.sqrt(intensity),pan:(x-.5)*1.2,hardness:CONTACT_HARDNESS[partner]??1};
}

function buildImpactCue(id,options) {
  const contact=impactParameters(id,options);
  if(contact.intensity<.035)return [];
  const profile=IMPACT_TONES[contact.family],energy=contact.energy;
  return profile.frequencies.map((frequency,index)=>({
    frequency,at:index*.003,duration:profile.decay*(.58+.42*energy)*(.68+.32*contact.hardness),
    gain:(.008+.049*energy)*profile.weights[index]*(index===0?1:.25+.75*energy),type:profile.types[index],pan:contact.pan,
    cutoff:profile.cutoff*(.45+.55*energy)*contact.hardness,
  }));
}
/** Original compact scores, not recordings from another game. Time is in seconds. */
export function buildCue(event,id,count=0,options={}) {
  if(event==='impact')return buildImpactCue(id,options);
  const step=Math.max(0,Math.min(14,Number.isFinite(count)?count:0));
  const [pitch,partial,decay]=timbres[soundFamily(id)];
  const f=540*pitch,chainLift=1+Math.min(3,step)*.075;
  const scores={
    pickup:[[f,0,.10,.052],[f*partial,.008,.15*decay,.017]],
    thread:[[720+step*12,0,.16,.059],[1080+step*18,.048,.22,.025],[f*partial,0,.11,.015]],
    match:[[f*chainLift,0,.18,.056],[f*partial*chainLift,.035,.26*decay,.026],[f*2*chainLift,.12,.32,.015]],
    return:[[260*pitch,0,.10,.065],[190*pitch,.045,.09,.025]],
    cancel:[[210,0,.075,.036]],
    undo:[[530,0,.09,.04],[360,.07,.12,.035]],
    reorder:[[480,0,.09,.032],[620,.06,.13,.032]],
    replace:[[620,0,.11,.04],[930,.05,.15,.025]],
    retry:[[330,0,.20,.035],[293.66,.15,.28,.028]],
    complete:[[523.25,0,.30,.04],[659.25,.10,.32,.035],[783.99,.20,.44,.03]],
    reward:[[196,0,.72,.022],[523.25,.04,.30,.042],[659.25,.14,.32,.038],[783.99,.25,.38,.034],[1046.5,.39,.60,.032],[1567.98,.55,.72,.015]],
    'unlock-theme':[[98,0,3.35,.028],[146.83,.04,2.7,.022],[293.66,.34,.74,.027],[392,.72,.5,.034],[523.25,1.08,.52,.042],[698.46,1.48,.62,.048],[1046.5,1.78,.82,.042],[1396.91,2.14,1.06,.026]],
    'coupon-reveal':[[523.25,0,.24,.04],[783.99,.11,.34,.048],[1046.5,.24,.48,.029]],
    select:[[660,0,.065,.022]],
    inspect:[[880,0,.26,.03],[1764,.035,.38,.014]],
  };
  return (scores[event]||[]).map(([frequency,at,duration,gain])=>({frequency,at,duration,gain,type:['return','cancel','unlock-theme'].includes(event)&&frequency<400?'triangle':'sine'}));
}

/** A quiet original three-layer loop: submerged pad, water pulse and glass shimmer. */
export function buildAmbientPhrase(index=0){
  const roots=[220,246.94,196,293.66],root=roots[Math.abs(Math.trunc(index))%roots.length];
  const upper=index%2?1.5:1.333;
  return[
    {role:'pad',frequency:root/2,at:0,duration:6.8,gain:.026,type:'sine',pan:-.12},
    {role:'pad',frequency:root,at:.05,duration:6.5,gain:.013,type:'triangle',pan:.12},
    {role:'pulse',frequency:root,at:.35,duration:.72,gain:.034,type:'sine',pan:-.22},
    {role:'pulse',frequency:root*upper,at:2.05,duration:.78,gain:.03,type:'sine',pan:.18},
    {role:'pulse',frequency:root*2,at:4.18,duration:.86,gain:.027,type:'sine',pan:-.08},
    {role:'shimmer',frequency:root*4,at:1.18,duration:.48,gain:.009,type:'sine',pan:.3},
    {role:'shimmer',frequency:root*5,at:5.28,duration:.62,gain:.007,type:'sine',pan:-.3},
  ];
}

export function createVoiceBudget(limit=24) {
  let ends=[];
  return {
    reserve(now,durations) {
      ends=ends.filter(t=>t>now);
      if(ends.length+durations.length>limit) return false;
      ends.push(...durations.map(d=>now+d));return true;
    },
    clear(){ends=[];},
    get size(){return ends.length;},
  };
}

export function createGameSound(context, { limit = 24 } = {}) {
  const master=context.createGain();master.gain.value=.8;
  const limiter=context.createDynamicsCompressor();
  limiter.threshold.value=-14;limiter.knee.value=8;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.12;
  master.connect(limiter).connect(context.destination);
  const budget=createVoiceBudget(limit);const active=new Set();
  return {
    play(event,id,count,options) {
      const notes=buildCue(event,id,count,options),now=context.currentTime;
      if(!notes.length || !budget.reserve(now,notes.map(n=>n.at+n.duration+.025))) return false;
      notes.forEach(n=>{
        const oscillator=context.createOscillator(),gain=context.createGain(),at=now+n.at;
        const filter=n.cutoff?context.createBiquadFilter():null,pan=Number.isFinite(n.pan)?context.createStereoPanner?.():null;
        oscillator.type=n.type;oscillator.frequency.value=n.frequency;
        const theme=event==='unlock-theme',pad=theme&&n.frequency<200;
        gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(n.gain*(theme?1.6:1),at+(pad ? .18 : .004));
        if(theme)gain.gain.setValueAtTime(n.gain*1.6,at+(pad ? .65 : n.duration*.22));
        gain.gain.exponentialRampToValueAtTime(.0001,at+n.duration);
        if(filter){filter.type='lowpass';filter.frequency.value=n.cutoff;oscillator.connect(filter).connect(gain);}else oscillator.connect(gain);
        if(pan){pan.pan.value=n.pan;gain.connect(pan).connect(master);}else gain.connect(master);active.add(oscillator);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();filter?.disconnect();pan?.disconnect();active.delete(oscillator);};
        oscillator.start(at);oscillator.stop(at+n.duration+.02);
      });return true;
    },
    stop(){for(const node of active){try{node.stop();}catch{/* An ended voice is already silent. */}}budget.clear();},
    get voices(){return active.size;},
  };
}
