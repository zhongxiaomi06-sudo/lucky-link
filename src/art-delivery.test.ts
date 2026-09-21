import { describe, it, expect } from 'vitest';
import { deliveryUrl } from './art-delivery.js';

describe('lossless V17 delivery', () => {
  it('maps only four copies verified pixel-identical in both browsers', () => {
    const names=['tabletop-room-v17','box-v12','jewelry-v12','hardware-v12'];
    for(const name of names) expect(deliveryUrl('/assets/'+name+'.png')).toBe('/assets/'+name+'-lossless.webp');
  });
  it('keeps old 3D, unknown assets, and already encoded URLs intact', () => {
    for(const url of ['/assets/tabletop-room-v11.png','/assets/tabletop-phone-v17.png',
      ...['jelly','pearl','sea','chrome','gems','bloom'].map(f=>'/assets/collections-'+f+'-v17.png'),
      '/assets/unknown.png','https://example.com/a.png','/assets/box-v12-lossless.webp']) {
      expect(deliveryUrl(url)).toBe(url);
    }
  });
});
