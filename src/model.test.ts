import { describe, expect, it } from 'vitest';
import { addPiece, canFinish, curvePosition, MAX_PIECES, removePieceAt, undoPiece } from './model.js';

describe('Lucky Link composition model', () => {
  it('preserves insertion order and caps the chain', () => {
    let pieces: string[] = [];
    for (let index = 0; index < MAX_PIECES + 2; index += 1) pieces = addPiece(pieces, `piece-${index}`);
    expect(pieces).toHaveLength(MAX_PIECES);
    expect(pieces[0]).toBe('piece-0');
    expect(pieces.at(-1)).toBe('piece-13');
  });

  it('unlocks completion at three pieces', () => {
    expect(canFinish(['a', 'b'])).toBe(false);
    expect(canFinish(['a', 'b', 'c'])).toBe(true);
  });

  it('removes a selected piece and undoes the latest piece', () => {
    expect(removePieceAt(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
    expect(undoPiece(['a', 'b', 'c'])).toEqual(['a', 'b']);
  });

  it('produces finite ordered curve positions', () => {
    const points = Array.from({ length: 8 }, (_, index) => curvePosition(index, 8));
    expect(points.every(({ x, y, rotation }) => [x, y, rotation].every(Number.isFinite))).toBe(true);
    expect(points[0].x).toBeLessThan(points.at(-1)!.x);
  });
});
