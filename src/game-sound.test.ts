import { describe, expect, it } from 'vitest';
import { buildCue, buildAmbientPhrase, soundFamily, createVoiceBudget } from './game-sound.js';

describe('material-aware game sounds', () => {
  it('maps physics contact intensity to bounded louder, brighter, longer material cues', () => {
    for(const materialFamily of ['glass','pearl','resin','metal']) {
      const light=buildCue('impact','pearl',0,{intensity:.15,materialFamily,x:.1,materialPair:[materialFamily,'glass']});
      const heavy=buildCue('impact','pearl',0,{intensity:.9,materialFamily,x:.9,materialPair:[materialFamily,'glass']});
      expect(Math.max(...heavy.map(note=>note.gain))).toBeGreaterThan(Math.max(...light.map(note=>note.gain)));
      expect(Math.max(...heavy.map(note=>note.cutoff))).toBeGreaterThan(Math.max(...light.map(note=>note.cutoff)));
      expect(Math.max(...heavy.map(note=>note.duration))).toBeGreaterThan(Math.max(...light.map(note=>note.duration)));
      expect(heavy.every(note=>note.pan>0&&note.gain<=.09&&note.duration<.5)).toBe(true);
      expect(light.every(note=>note.pan<0)).toBe(true);
      expect(buildCue('impact','pearl',0,{intensity:0,materialFamily})).toEqual([]);
    }
  });
  it('uses distinct contact spectra and softens contact against the fabric floor', () => {
    const spectra=['glass','pearl','resin','metal'].map(materialFamily=>buildCue('impact','pearl',0,{materialFamily,intensity:.7}).map(note=>[note.frequency,note.type]));
    expect(new Set(spectra.map(value=>JSON.stringify(value))).size).toBe(4);
    const floor=buildCue('impact','pearl',0,{materialFamily:'glass',intensity:.7,materialPair:['glass','floor']});
    const metal=buildCue('impact','pearl',0,{materialFamily:'glass',intensity:.7,materialPair:['glass','metal']});
    expect(floor[0].cutoff).toBeLessThan(metal[0].cutoff);
    expect(floor[0].duration).toBeLessThan(metal[0].duration);
  });
  it('keeps legacy impact calls audible and clamps invalid physics input',()=>{
    expect(buildCue('impact','pearl').length).toBeGreaterThan(0);
    for(const intensity of [NaN,Infinity,-1,0])expect(buildCue('impact','pearl',0,{intensity})).toEqual([]);
    const cue=buildCue('impact','unknown',0,{intensity:100,x:-100,materialFamily:'unknown'});
    expect(cue.every(note=>Number.isFinite(note.gain)&&note.gain<=.09&&note.pan===-.6&&note.cutoff<12000)).toBe(true);
  });
  it('distinguishes glass, pearl, resin and metal', () => {
    expect(['clear-quartz','pearl','pink-dice','tiny-bell'].map(soundFamily)).toEqual(['glass','pearl','resin','metal']);
    expect(new Set(['clear-quartz','pearl','pink-dice','tiny-bell'].map(id=>JSON.stringify(buildCue('pickup',id)))).size).toBe(4);
  });
  it('uses different scores for each committed action and outcome', () => {
    const events=['pickup','impact','thread','return','cancel','undo','reorder','replace','retry','complete','reward','unlock-theme','coupon-reveal'];
    expect(new Set(events.map(e=>JSON.stringify(buildCue(e,'pearl',6)))).size).toBe(events.length);
    expect(buildCue('unknown')).toEqual([]);
    expect(buildCue('reward').length).toBeGreaterThan(buildCue('complete').length);
  });
  it('stages the cinematic reveal as one continuous rising theme and coda',()=>{
    const theme=buildCue('unlock-theme','ice-module-star-drop'),coupon=buildCue('coupon-reveal','ice-module-star-drop');
    expect(theme).not.toEqual(coupon);expect(theme.length).toBeGreaterThanOrEqual(8);
    expect(Math.max(...theme.map(note=>note.at+note.duration))).toBeGreaterThan(3);
    expect(Math.max(...theme.map(note=>note.at+note.duration))).toBeLessThan(4);
    expect(theme.filter(note=>note.frequency>1000).length).toBeLessThanOrEqual(2);
    expect(coupon.at(-1)?.frequency).toBeGreaterThan(coupon[0].frequency);
  });
  it('builds rising clears and a three-layer seven-second ambient breath',()=>{
    const first=buildCue('match','clear-quartz',1),fourth=buildCue('match','clear-quartz',4);
    expect(first.length).toBeGreaterThanOrEqual(3);expect(fourth[0].frequency).toBeGreaterThan(first[0].frequency);
    const phrase=buildAmbientPhrase(0),next=buildAmbientPhrase(1);
    expect(new Set(phrase.map(note=>note.role))).toEqual(new Set(['pad','pulse','shimmer']));
    expect(Math.max(...phrase.map(note=>note.at+note.duration))).toBeLessThanOrEqual(7.2);
    expect(phrase).not.toEqual(next);
    phrase.forEach(note=>{expect(note.gain).toBeLessThanOrEqual(.05);expect(note.frequency).toBeGreaterThan(50);});
  });
  it('keeps every cue short, finite and bounded even with bad counts', () => {
    for(const count of [0,14,100000,NaN,Infinity]) for(const n of buildCue('thread','clear-quartz',count)) {
      expect(Number.isFinite(n.frequency)).toBe(true); expect(n.frequency).toBeLessThan(10000);
      expect(n.gain).toBeLessThanOrEqual(.09); expect(n.at+n.duration).toBeLessThan(2);
    }
  });
  it('caps bursts and releases the budget once voices have ended', () => {
    const b=createVoiceBudget(24);
    for(let i=0;i<100;i++) b.reserve(0,[.5,.6,.7]);
    expect(b.size).toBe(24); expect(b.reserve(.1,[.4])).toBe(false);
    expect(b.reserve(1,[.2])).toBe(true); expect(b.size).toBe(1);
    b.clear(); expect(b.size).toBe(0);
  });
});
