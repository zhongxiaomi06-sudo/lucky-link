import { describe, expect, it } from 'vitest';
import { impactOptions } from './collection-ui.js';

describe('material contact feedback bridge',()=>{
  it('passes measured family, pair and energy with normalized tray position',()=>{
    expect(impactOptions({intensity:.4,materialFamily:'glass',materialPair:['glass','metal'],x:80,y:400})).toEqual({intensity:.4,materialFamily:'glass',materialPair:['glass','metal'],x:.25});
  });
  it('does not fabricate a loud impact when physics has no event',()=>{
    expect(impactOptions(null)).toEqual({intensity:0,x:.5});
    expect(impactOptions({intensity:4,x:700})).toMatchObject({intensity:1,x:1});
    expect(impactOptions({intensity:-1,x:-4})).toMatchObject({intensity:0,x:0});
  });
});
