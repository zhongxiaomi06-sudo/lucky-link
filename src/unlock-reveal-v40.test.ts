import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSampleCue } from './sample-sound.js';

const css=readFileSync(new URL('./collection.css',import.meta.url),'utf8');

describe('V40 silent-text reveal and audible unlock score',()=>{
  it('removes all descriptive copy from the visible reward composition',()=>{
    expect(css).toContain('.drag-hint{display:none}');
    expect(css).toContain('.unlock-title{display:none}');
    expect(css).toContain('[data-end-copy]{display:none}');
    expect(css).toContain('.coupon-ticket small,.gravity-dialog[data-game-state=won] .coupon-ticket em{display:none}');
  });
  it('retains a distinct material texture for the reveal score',()=>{
    const theme=buildSampleCue('unlock-theme','ice-module-penguin');
    expect(Math.max(...theme.map(note=>note.gain))).toBeGreaterThanOrEqual(.5);
    expect(new Set(theme.map(note=>note.sample)).size).toBeGreaterThan(1);
  });
});
