// Delivery encoding only: no crop, resize, recolor or alpha changes.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const names = ['tabletop-room-v17', 'box-v12', 'jewelry-v12', 'hardware-v12'];
if (process.argv.includes('--help')) {
  console.log('node scripts/encode-lossless-v17.mjs: create four browser-verified lossless WebP delivery copies; refuses overwrites.');
  process.exit(0);
}
const pairs = names.map(name => ({
  source: fileURLToPath(new URL('../public/assets/' + name + '.png', import.meta.url)),
  target: fileURLToPath(new URL('../public/assets/' + name + '-lossless.webp', import.meta.url)),
}));
for (const pair of pairs) {
  if (!existsSync(pair.source) || existsSync(pair.target)) throw new Error('Missing source or existing target: ' + pair.source);
}
for (const pair of pairs) {
  const result = spawnSync('cwebp', ['-lossless', '-exact', '-m', '6', '-metadata', 'all', '-quiet', pair.source, '-o', pair.target], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Encoder failed');
  console.log(JSON.stringify(pair));
}
