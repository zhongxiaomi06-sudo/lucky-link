import { describe, expect, it } from 'vitest';
import { buildSampleCue, createSampleSound, SAMPLE_FILES } from './sample-sound.js';

function audioContext() {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const sources: any[] = [];
  const node = () => ({ connect() { return this; }, disconnect() {}, gain: param(), frequency: param(), pan: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
  return { currentTime: 0, state: 'running', destination: {}, sources,
    createGain: node, createDynamicsCompressor: node, createBiquadFilter: node, createStereoPanner: node,
    decodeAudioData: async () => ({ duration: 7 }),
    createBufferSource() { const s = { ...node(), playbackRate: param(), buffer: null, loop: false, onended: null, started: false, stopped: false, start() { this.started = true; }, stop(at?: number) { if(at === undefined || at <= 0)this.stopped = true; } }; sources.push(s); return s; }
  };
}
const fetchOK = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });

describe('recorded tabletop cues', () => {
  it('uses distinct contact source banks and carries intensity, material and position', () => {
    const signatures=[];
    for(const materialFamily of ['glass','pearl','resin','metal']) {
      const light=buildSampleCue('impact','pearl',0,0,{materialFamily,intensity:.15,x:0});
      const heavy=buildSampleCue('impact','pearl',0,0,{materialFamily,intensity:.9,x:1});
      signatures.push(JSON.stringify(heavy.map(cue=>[cue.sample,cue.rate,cue.cutoff])));
      expect(heavy[0].gain).toBeGreaterThan(light[0].gain);
      expect(heavy[0].cutoff).toBeGreaterThan(light[0].cutoff);
      expect(heavy[0].duration).toBeGreaterThan(light[0].duration);
      expect(light[0].pan).toBeLessThan(0);expect(heavy[0].pan).toBeGreaterThan(0);
      expect(heavy[0].gain).toBeLessThanOrEqual(.45);
    }
    expect(new Set(signatures).size).toBe(4);
    expect(new Set(['glass','pearl','resin','metal'].map(materialFamily=>buildSampleCue('impact','pearl',0,0,{materialFamily})[0].sample)).size).toBeGreaterThanOrEqual(3);
    expect(buildSampleCue('impact','pearl',0,0,{intensity:0})).toEqual([]);
  });
  it('distinguishes glass pairs from metal and fabric contacts without new assets',()=>{
    const banks=['glass','metal','floor'].map(partner=>buildSampleCue('impact','clear-quartz',0,0,{intensity:.6,materialFamily:'glass',materialPair:['glass',partner]}));
    expect(new Set(banks.map(cue=>cue.map(part=>part.sample).join('+'))).size).toBe(3);
    expect(banks.flat().every(cue=>Object.hasOwn(SAMPLE_FILES,cue.sample))).toBe(true);
  });
  it('rotates short cuts, bounds bad counts and distinguishes material filters', () => {
    expect(new Set([0,1,2].map(n=>JSON.stringify(buildSampleCue('thread','pearl',0,n)))).size).toBe(3);
    expect(new Set(['pearl','clear-quartz','pink-dice','tiny-bell'].map(id=>JSON.stringify(buildSampleCue('thread',id)))).size).toBe(4);
    for (const count of [NaN,Infinity,-3,1e6]) for (const c of buildSampleCue('match','clear-quartz',count)) {
      expect(Number.isFinite(c.rate)).toBe(true); expect(c.at+c.duration/c.rate).toBeLessThan(1.5);
      expect(c.gain).toBeLessThanOrEqual(1); expect(c.offset+c.duration).toBeLessThanOrEqual(1.95);
    }
  });
  it('keeps ordinary contact separate from success and unknown events silent', () => {
    expect(buildSampleCue('impact','pearl')).not.toEqual(buildSampleCue('pickup','pearl'));
    expect(buildSampleCue('thread','pearl')).not.toEqual(buildSampleCue('match','pearl'));
    expect(buildSampleCue('cancel','pearl').some(c=>c.sample==='clink')).toBe(false);
    expect(buildSampleCue('match','pearl',4).length).toBeGreaterThanOrEqual(3);
    expect(buildSampleCue('reward','pearl').length).toBeGreaterThan(buildSampleCue('thread','pearl').length);
    expect(buildSampleCue('reward','pearl').some(c=>c.sample==='wind')).toBe(true);
    const theme=buildSampleCue('unlock-theme','pearl');
    expect(theme.some(c=>c.sample==='wind')).toBe(true);
    expect(theme.some(c=>c.sample==='beads')).toBe(true);
    expect(theme.filter(c=>c.sample==='clink').length).toBe(2);
    expect(theme.filter(c=>c.sample==='beads').length).toBe(2);
    expect(Math.max(...theme.map(c=>c.gain))).toBeGreaterThanOrEqual(.5);
    expect(Math.max(...theme.map(c=>c.at+c.duration/c.rate))).toBeGreaterThan(2.5);
    expect(buildSampleCue('coupon-reveal','pearl')).not.toEqual(theme);
    expect(buildSampleCue('unknown')).toEqual([]);
    expect(Object.values(SAMPLE_FILES).every(p=>p.startsWith('/assets/audio/'))).toBe(true);
  });
  it('does not play before decoded; loading itself never starts audio', async () => {
    const ctx=audioContext(), fx=createSampleSound(ctx,{fetcher:fetchOK});
    expect(fx.play('thread','pearl')).toBe('missing');
    await fx.ready; expect(ctx.sources).toHaveLength(0);
    expect(fx.play('thread','pearl')).toBe('played'); expect(ctx.sources.length).toBeGreaterThan(0);
  });
  it('releases ended impact sample nodes without throwing or retaining their voice slots', async () => {
    const ctx=audioContext(),fx=createSampleSound(ctx,{fetcher:fetchOK});await fx.ready;
    expect(fx.play('impact','pearl',0,{intensity:.7,materialFamily:'pearl'})).toBe('played');
    expect(fx.voices).toBe(1);
    expect(()=>ctx.sources[0].onended()).not.toThrow();
    expect(fx.voices).toBe(0);
  });
  it('caps fast bursts without requesting the louder fallback and stops all sources', async () => {
    const ctx=audioContext(), fx=createSampleSound(ctx,{fetcher:fetchOK}); await fx.ready;
    for(let i=0;i<100;i++)fx.play('thread','pearl');
    expect(fx.voices).toBeLessThanOrEqual(10); expect(fx.play('thread','pearl')).toBe('limited');
    fx.startAmbience(); fx.startAmbience();
    expect(ctx.sources.filter(s=>s.loop)).toHaveLength(1);
    fx.stop(); expect(fx.voices).toBe(0); expect(ctx.sources.every(s=>s.stopped)).toBe(true);
  });
  it('isolates fetch/decode failures and never throws into gameplay', async () => {
    const ctx=audioContext();
    const fx=createSampleSound(ctx,{fetcher:async(url:string)=>url.includes('beads')?{ok:false}:fetchOK()});
    await fx.ready; expect(fx.state).toBe('partial'); expect(fx.play('thread','pearl')).toBe('missing');
    expect(fx.play('return','pearl')).toBe('played');
    const fail=createSampleSound(ctx,{fetcher:async()=>{throw Error('offline');}});
    await fail.ready; expect(fail.state).toBe('fallback'); expect(fail.play('reward')).toBe('missing');
  });
  it('cancels reveal samples without stopping ordinary contact or ambience', async () => {
    const ctx=audioContext(),fx=createSampleSound(ctx,{fetcher:fetchOK});await fx.ready;
    fx.startAmbience();fx.play('thread','pearl');fx.play('unlock-theme','pearl');
    fx.stopEvents(new Set(['unlock-theme','coupon-reveal']));
    expect(fx.voices).toBe(1);expect(fx.ambient).toBe(true);
    expect(ctx.sources.filter(source=>source.stopped)).toHaveLength(6);
    expect(ctx.sources[0].stopped).toBe(false);expect(ctx.sources[1].stopped).toBe(false);
  });
});
