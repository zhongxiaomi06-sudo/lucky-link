export const MAX_PIECES = 14;
export const MIN_PIECES = 3;

export function addPiece(pieces, id, limit = MAX_PIECES) {
  return pieces.length >= limit ? pieces : [...pieces, id];
}

export function removePieceAt(pieces, index) {
  return pieces.filter((_, pieceIndex) => pieceIndex !== index);
}

export function undoPiece(pieces) {
  return pieces.slice(0, -1);
}

export function canFinish(pieces, minimum = MIN_PIECES) {
  return pieces.length >= minimum;
}

export function curvePosition(index, total, previewMode = false) {
  const usableTotal = Math.max(total, 8);
  const t = total === 1 ? 0 : index / (usableTotal - 1);
  const angle = Math.PI * (0.12 + t * 1.76);
  return {
    x: 50 - Math.cos(angle) * (previewMode ? 39 : 43),
    y: (previewMode ? 41 : 43) + Math.sin(angle) * (previewMode ? 42 : 39),
    rotation: -52 + t * 104,
  };
}
