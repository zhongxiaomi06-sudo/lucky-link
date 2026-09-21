import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(new URL('./collection-ui.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('./collection.css', import.meta.url), 'utf8');

const asset = (name: string) => readFileSync(`${root}/public/assets/${name}`);
const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');

describe('V30 approved photographic runtime layers', () => {
  it('uses a WebP-first base and a separate transparent hardware overlay', () => {
    expect(source).toContain('class="gravity-art-base"');
    expect(source).toContain('/assets/gravity-tray-base-v30.webp');
    expect(source).toContain('/assets/gravity-tray-base-v30.png');
    expect(source).toContain('class="gravity-art-hud"');
    expect(source).toContain('/assets/gravity-tray-hud-v30.webp');
    expect(source).toContain('/assets/gravity-tray-hud-v30.png');
    expect(source.indexOf('gravity-art-base')).toBeLessThan(source.indexOf('<header>'));
    expect(source.indexOf('gravity-art-hud')).toBeLessThan(source.indexOf('<header>'));
  });

  it('keeps the HUD PNG genuinely transparent and binds all four approved deliveries', () => {
    const basePng = asset('gravity-tray-base-v30.png');
    const baseWebp = asset('gravity-tray-base-v30.webp');
    const hudPng = asset('gravity-tray-hud-v30.png');
    const hudWebp = asset('gravity-tray-hud-v30.webp');

    expect(basePng.readUInt32BE(16)).toBe(941);
    expect(basePng.readUInt32BE(20)).toBe(1672);
    expect(hudPng.readUInt32BE(16)).toBe(941);
    expect(hudPng.readUInt32BE(20)).toBe(1672);
    expect(hudPng[25]).toBe(6);
    expect(hudPng.includes(Buffer.from([0, 0, 0, 0]))).toBe(true);
    expect(baseWebp.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(hudWebp.subarray(0, 4).toString('ascii')).toBe('RIFF');

    expect(sha256(basePng)).toBe('2d5084e5a3bf41bdd30629fc73a60a3d5f2e269216371cb82ab8e547094879a3');
    expect(sha256(baseWebp)).toBe('0c8b38945ac2be99dd7311dc4dfc77a415c2109ea1f8de5653d72d374e3343aa');
    expect(sha256(hudPng)).toBe('b6e8815357478b0bbdf55ae495c4262fef1acf0bc16585e83e1ca3101d9d682f');
    expect(sha256(hudWebp)).toBe('7ac75cc05906622cbf679ce80c82e6c8e8f28ec605e11e6b0b7f584bf487cebb');
  });

  it('uses the raster tray for modeling while DOM controls and physics remain independent', () => {
    expect(css).toMatch(/\.gravity-art-base\s*\{[^}]*z-index:0/);
    expect(css).toMatch(/\.gravity-art-hud\s*\{[^}]*z-index:4/);
    expect(css).toMatch(/\.gravity-field\s*\{[^}]*top:15\.7%[^}]*bottom:2\.7%[^}]*background:transparent[^}]*box-shadow:none/);
    expect(css).toContain('.tt-app .match-dialog::before,.tt-app .match-dialog::after { content:none; }');
    expect(css).toContain('.gravity-field::before { content:none; }');
    expect(css).toContain('pointer-events:auto');
    expect(source).toContain('data-match-back');
    expect(source).toContain('data-match-sound');
    expect(source).toContain('data-gravity-field');
    expect(source).toContain('data-gravity-seed-canvas');
  });
});
