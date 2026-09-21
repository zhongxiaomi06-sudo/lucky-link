import { impactParameters, soundFamily } from './game-sound.js';

export const SAMPLE_FILES = Object.freeze({
  beads: '/assets/audio/beads-v15.wav', wood: '/assets/audio/wood-v15.wav',
  clink: '/assets/audio/clink-v15.wav', wind: '/assets/audio/wind-v15.mp3',
});
const FAMILIES = {
  glass: { rate: 1, cutoff: 10000 }, pearl: { rate: .88, cutoff: 3900 },
  resin: { rate: 1.07, cutoff: 2400 }, metal: { rate: 1.16, cutoff: 11500 },
};
// Existing licensed textures: brittle beads, dry wood taps and short metallic clinks.
const IMPACT_SAMPLES={
  glass:{sample:'beads',rate:1.04,duration:.16,cutoff:8500,gain:.32},
  pearl:{sample:'wood',rate:1.38,duration:.10,cutoff:3400,gain:.38},
  resin:{sample:'wood',rate:.78,duration:.078,cutoff:1450,gain:.42},
  metal:{sample:'clink',rate:1.02,duration:.28,cutoff:11200,gain:.28},
};

function buildImpactSample(id,variant,options){
  const contact=impactParameters(id,options);
  if(contact.intensity<.035)return [];
  const bank=IMPACT_SAMPLES[contact.family],energy=contact.energy;
  const turn=Number.isFinite(variant)?Math.abs(Math.trunc(variant))%3:0;
  const cue=[{sample:bank.sample,offset:bank.sample==='clink'?0:turn*.65+(bank.sample==='wood' ? .028 : 0),
    rate:bank.rate*[1,1.018,.984][turn],gain:bank.gain*(.12+.88*energy),
    duration:(contact.family==='metal' ? .045+.23*contact.intensity : bank.duration*(.55+.45*energy))*(.68+.32*contact.hardness),
    cutoff:bank.cutoff*(contact.family==='metal' ? .08+.92*contact.intensity : .45+.55*energy)*contact.hardness,pan:contact.pan,at:0}];
  if(contact.partner==='metal'&&contact.family!=='metal')cue.push({sample:'clink',offset:0,rate:1.12,gain:.095*energy,duration:.08+.07*energy,cutoff:4600+3600*energy,pan:contact.pan,at:.003});
  if(contact.partner==='floor'&&bank.sample!=='wood')cue.push({sample:'wood',offset:turn*.65,rate:.76,gain:.075*energy,duration:.05+.03*energy,cutoff:650+600*energy,pan:contact.pan,at:0});
  return cue;
}

// Slots are separate source cuts, not three copies of one synthetic note.
export function buildSampleCue(event, id, count = 0, variant = 0, options = {}) {
  if(event==='impact')return buildImpactSample(id,variant,options);
  const family = FAMILIES[soundFamily(id)];
  const turn = Number.isFinite(variant) ? Math.abs(Math.trunc(variant)) % 3 : 0;
  const step = Number.isFinite(count) ? Math.max(0, Math.min(6, count)) : 0;
  const rate = family.rate * [1, 1.025, .98][turn];
  const cut = (sample, gain, extra = {}) => ({ sample, offset: sample === 'clink' ? 0 : turn * .65,
    duration: sample === 'clink' ? .48 : sample === 'wood' ? .44 : .30,
    gain, rate, cutoff: family.cutoff, pan: -.08, at: 0, ...extra });
  switch (event) {
    case 'pickup': return [cut('beads', .40, { duration: .20, pan: .18 })];
    case 'thread': return [cut('beads', .66)];
    case 'return': return [cut('wood', .57, { pan: .24, cutoff: 4800 })];
    case 'cancel': return [cut('wood', .19, { duration: .18, rate: .78, cutoff: 1300 })];
    case 'retry': return [cut('wood', .23, { duration: .25, rate: .8, cutoff: 1700 })];
    case 'undo': return [cut('wood', .32, { duration: .23, rate: .9, pan: .08 })];
    case 'reorder': return [cut('beads', .43, { duration: .24, rate: rate * .94 })];
    case 'replace': return [cut('wood', .26, { duration: .18 }), cut('beads', .48, { at: .075 })];
    case 'select': return [cut('wood', .20, { duration: .14, cutoff: 2400 })];
    case 'inspect': return [cut('beads', .30, { duration: .20, rate: rate * 1.05 })];
    case 'match': return [cut('beads', .48), cut('clink', .38, { at: .04, rate: 1 + step * .045, cutoff: 9500, pan: .06 }),cut('clink', .22, { at: .13,rate:1.42+step*.055,cutoff:11500,pan:.22 })];
    case 'complete': return [cut('clink', .48, { rate: 1, cutoff: 10000 }), cut('clink', .35, { at: .18, rate: 1.25, cutoff: 10000, pan: .12 })];
    case 'reward': return [cut('wind', .12, { duration: .9, rate: .92, cutoff: 3600, pan: 0 }),cut('beads',.30,{at:.04,duration:.26,rate:rate*.86,pan:-.2}),cut('clink', .48, { at:.10,rate: 1, cutoff: 10000 }), cut('clink', .40, { at: .28, rate: 1.25, cutoff: 10000 }), cut('clink', .34, { at: .49, rate: 1.58, cutoff: 11500, pan: .18 })];
    case 'unlock-theme': return [cut('wind',.21,{duration:3.35,rate:.68,cutoff:2800,pan:0}),cut('wood',.21,{at:.09,duration:.30,rate:.58,cutoff:1200,pan:-.12}),cut('beads',.36,{at:.62,duration:.26,rate:rate*.76,cutoff:5600,pan:-.24}),cut('beads',.41,{at:1.08,duration:.28,rate:rate*.93,cutoff:7200,pan:.2}),cut('clink',.56,{at:1.52,duration:.46,rate:1.18,cutoff:10200,pan:-.08}),cut('clink',.34,{at:2.16,duration:.42,rate:1.46,cutoff:11200,pan:.16})];
    case 'coupon-reveal': return [cut('wood',.16,{duration:.14,rate:1.08,cutoff:3500,pan:-.08}),cut('clink',.34,{at:.08,duration:.38,rate:1.34,cutoff:9600,pan:.1})];
    default: return [];
  }
}

export function createSampleSound(context, { fetcher = globalThis.fetch, onState = () => {} } = {}) {
  const buffers = new Map(), voices = new Set();
  let state = 'loading', variant = 0, ambient = null;
  const master = context.createGain(), compressor = context.createDynamicsCompressor();
  master.gain.value = .7;
  compressor.threshold.value = -16; compressor.knee.value = 8; compressor.ratio.value = 6;
  compressor.attack.value = .003; compressor.release.value = .12;
  master.connect(compressor).connect(context.destination);
  const ready = Promise.all(Object.entries(SAMPLE_FILES).map(async ([name, url]) => {
    const controller = new AbortController(); let timeout;
    try {
      const work = (async () => {
        const response = await fetcher(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Audio unavailable');
        return context.decodeAudioData(await response.arrayBuffer());
      })();
      const buffer = await Promise.race([work, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Audio timeout')), 5000); })]);
      buffers.set(name, buffer);
    } catch { /* Each failed asset falls back independently, never into game state. */ }
    finally { clearTimeout(timeout); controller.abort(); }
  })).then(() => {
    state = buffers.size === 4 ? 'ready' : buffers.size ? 'partial' : 'fallback'; onState(state); return state;
  });
  function release(voice) {
    for (const node of voice.nodes) node.disconnect();
    voices.delete(voice);
  }
  function play(event, id, count, options) {
    const cue = buildSampleCue(event, id, count, variant++, options);
    if (!cue.length) return 'unknown';
    if (cue.some(c => !buffers.has(c.sample))) return 'missing';
    const now = context.currentTime;
    for (const voice of voices) if (voice.end <= now) release(voice);
    if (voices.size + cue.length > 10) return 'limited';
    for (const c of cue) {
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      const pan = context.createStereoPanner?.(), at = now + c.at, duration = c.duration / c.rate;
      source.buffer = buffers.get(c.sample); source.playbackRate.value = c.rate;
      filter.type = 'lowpass'; filter.frequency.value = c.cutoff;
      gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(c.gain, at + .004);
      const releaseDuration=event==='impact'?Math.min(.04,duration*.35):.04;
      gain.gain.setValueAtTime(c.gain, at + Math.max(.005, duration - releaseDuration));
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      source.connect(filter).connect(gain);
      if (pan) { pan.pan.value = c.pan; gain.connect(pan).connect(master); } else gain.connect(master);
      const voice = { nodes: [source, filter, gain, ...(pan ? [pan] : [])], source, event, end: at + duration + .01 };
      voices.add(voice); source.onended = () => release(voice);
      source.start(at, c.offset, c.duration); source.stop(voice.end);
    }
    return 'played';
  }
  function startAmbience() {
    if (ambient || !buffers.has('wind')) return false;
    const source = context.createBufferSource(), gain = context.createGain(), now = context.currentTime;
    source.buffer = buffers.get('wind'); source.loop = true; source.loopStart = 0; source.loopEnd = 7;
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.045, now + 1.4);
    source.connect(gain).connect(context.destination); source.start(); ambient = { source, gain }; return true;
  }
  function duckAmbient(duration=4.2){if(!ambient)return false;const now=context.currentTime;ambient.gain.gain.cancelScheduledValues?.(now);ambient.gain.gain.setValueAtTime(ambient.gain.gain.value||.045,now);ambient.gain.gain.linearRampToValueAtTime(.012,now+.08);ambient.gain.gain.linearRampToValueAtTime(.045,now+duration);return true;}
  function restoreAmbient(){if(!ambient)return;const now=context.currentTime;ambient.gain.gain.cancelScheduledValues(now);ambient.gain.gain.setValueAtTime(ambient.gain.gain.value,now);ambient.gain.gain.linearRampToValueAtTime(.045,now+.15);}
  function stopEvents(events) {
    for (const voice of voices) if (events.has(voice.event)) { try { voice.source.stop(); } catch { /* Ended. */ } release(voice); }
  }
  function stop() {
    for (const voice of voices) { try { voice.source.stop(); } catch { /* Ended. */ } release(voice); }
    if (ambient) { try { ambient.source.stop(); } catch { /* Ended. */ } ambient.source.disconnect(); ambient.gain.disconnect(); ambient = null; }
  }
  return { ready, play, stop, stopEvents, startAmbience, duckAmbient, restoreAmbient, get voices() { return voices.size; }, get state() { return state; }, get ambient() { return Boolean(ambient); } };
}
