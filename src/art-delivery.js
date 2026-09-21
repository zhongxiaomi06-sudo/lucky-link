// Transparent WebP decoding differs in Chromium; those originals stay PNG.
const names = new Set(['tabletop-room-v17', 'box-v12', 'jewelry-v12', 'hardware-v12']);

/** Same dimensions and RGBA pixels; canonical PNGs remain available for fallback. */
export function deliveryUrl(source) {
  const name = /^\/assets\/([^/]+)\.png$/.exec(source)?.[1];
  return names.has(name) ? '/assets/' + name + '-lossless.webp' : source;
}
