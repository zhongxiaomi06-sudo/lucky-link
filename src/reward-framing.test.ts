import { describe, expect, it } from 'vitest';
import { rewardFraming } from './reward-framing.js';

describe('full-stage reward camera preserves the approved model frame',()=>{
  it('retains the original 26 degree field of view when frame equals viewport',()=>{
    const pose=rewardFraming({left:0,top:0,width:320,height:320},{left:0,top:0,width:320,height:320},7.7);
    expect(pose.fov).toBeCloseTo(26);expect(pose.x).toBe(0);expect(pose.y).toBeCloseTo(.05);
  });
  it('keeps pixel scale and the portrait centre when rendering the whole screen',()=>{
    const viewport={left:0,top:0,width:390,height:844},frame={left:35.1,top:223.6,width:319.8,height:319.8};
    const pose=rewardFraming(viewport,frame,7.7);
    const originalScale=frame.height/(2*7.7*Math.tan(13*Math.PI/180));
    const fullScale=viewport.height/(2*7.7*Math.tan(pose.fov*Math.PI/360));
    expect(fullScale).toBeCloseTo(originalScale);expect(pose.x).toBeCloseTo(0);
    expect(viewport.height/2+(pose.y-.05)*fullScale).toBeCloseTo(frame.top+frame.height/2);
  });
  it('keeps the shifted landscape subject beside the reward actions',()=>{
    const pose=rewardFraming({left:12,top:20,width:844,height:390},{left:208,top:90,width:292,height:292},7.7);
    const scale=292/(2*7.7*Math.tan(13*Math.PI/180));
    expect(844/2-pose.x*scale).toBeCloseTo(342);
    expect(390/2+(pose.y-.05)*scale).toBeCloseTo(216);
  });
  it('falls back to a finite camera during hidden or zero-sized transitions',()=>{
    const pose=rewardFraming({left:0,top:0,width:0,height:0},null,0);
    expect(Object.values(pose).every(Number.isFinite)).toBe(true);
  });
});
