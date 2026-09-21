import { describe, expect, it } from 'vitest';
import { elapsedSeconds } from './camera-360.js';

describe('camera frame clock', () => {
  it('clamps a queued frame timestamp older than the input event', () => {
    expect(elapsedSeconds(984, 1000)).toBe(0);
    expect(elapsedSeconds(1000, 1000)).toBe(0);
  });
  it('keeps tour sampling within the curve for every cycle boundary', () => {
    for (const now of [984, 1000, 1016, 32999, 33000, 33001, 65000]) {
      const phase = (elapsedSeconds(now, 1000) % 32) / 32;
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
    expect(elapsedSeconds(2000, 1000)).toBe(1);
  });
});
