import { describe, expect, it } from 'vitest';
import {
  ICE_BLUE_CHARMS,
  ICE_BLUE_DROP_IDS,
  ICE_BLUE_ROUND,
  createIceBlueRound,
  scoreForClear,
} from './gravity-game.js';

describe('Ice Blue Lucky Drop', () => {
  it('defines one sixty-second, fifteen-hundred-point round', () => {
    expect(ICE_BLUE_ROUND).toEqual({ durationMs: 60_000, targetScore: 1_500, seedCount: 60 });
    const round = createIceBlueRound(() => 0.31);
    expect(round.pieces).toHaveLength(60);
    expect(round.palette).toEqual(ICE_BLUE_DROP_IDS);
    expect(round.targetScore).toBe(1_500);
    expect(round.durationMs).toBe(60_000);
    expect(round.status).toBe('playing');
  });

  it('uses four distinct identities inside one ice-blue product family', () => {
    expect(ICE_BLUE_CHARMS.map((item) => item.id)).toEqual([
      'ice-star',
      'moon-pearl',
      'ice-drop',
      'ice-cube',
    ]);
    expect(new Set(ICE_BLUE_CHARMS.map((item) => item.shape))).toHaveLength(4);
    expect(new Set(ICE_BLUE_CHARMS.map((item) => item.palette))).toEqual(new Set(['ice-blue']));
  });

  it('keeps the approved trio, quartet, and cascade scoring', () => {
    expect(scoreForClear(3, 1)).toBe(300);
    expect(scoreForClear(4, 1)).toBe(500);
    expect(scoreForClear(3, 2)).toBe(360);
    expect(scoreForClear(3, 3)).toBe(420);
    expect(scoreForClear(3, 4)).toBe(480);
  });

  it('starts the ice-blue pile around three quarters of the playfield', () => {
    const round = createIceBlueRound(() => 0.31);
    const top = Math.min(...round.pieces.map((piece) => piece.y - piece.radius));
    const bottom = Math.max(...round.pieces.map((piece) => piece.y + piece.radius));
    expect((bottom - top) / 500).toBeGreaterThanOrEqual(0.65);
    expect((bottom - top) / 500).toBeLessThanOrEqual(0.76);
  });
});
