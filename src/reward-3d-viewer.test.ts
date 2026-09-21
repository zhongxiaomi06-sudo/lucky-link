import{describe,expect,it}from'vitest';
import{ICE_BLUE_MODULE_IDS}from'./ice-blue-mainline.js';
import{rewardMotionSample,rewardPresentation}from'./reward-3d-viewer.js';

describe('3D unlock presentation',()=>{
  it('maps every mainline module to an interactive procedural WebGL object',()=>{
    const views=ICE_BLUE_MODULE_IDS.map(rewardPresentation);
    expect(new Set(views.map(view=>view.mode))).toEqual(new Set(['procedural-webgl']));
    expect(new Set(views.map(view=>view.kind)).size).toBe(11);
    views.forEach(view=>{expect(view.interactive).toBe(true);expect(view.materials).toEqual(['crystal','pearl','silver','resin']);});
  });
  it('flies in, orbits, locks and settles around the visible hanger',()=>{
    expect(rewardMotionSample(.1).phase).toBe('awaken');
    expect(rewardMotionSample(.8).phase).toBe('flight');
    expect(rewardMotionSample(1.8).phase).toBe('lock');
    expect(rewardMotionSample(3).phase).toBe('inspect');
    expect(rewardMotionSample(.8).yaw).toBeGreaterThan(rewardMotionSample(.1).yaw);
    expect(Math.abs(rewardMotionSample(1.8).swing)).toBeGreaterThan(0);
    expect(rewardMotionSample(3,true)).toMatchObject({phase:'inspect',scale:.84,swing:0});
  });
});
