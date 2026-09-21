import { materialById } from './materials.js';

export function safeLink(value) {
  if (typeof value !== 'string' || value.length > 2048 || [...value].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.') ? url.href : '';
  } catch { return ''; }
}
export function normalizeCommerce(value, catalog = materialById) {
  const data = value && typeof value === 'object' ? value : {};
  return {
    version: 1, shopName: typeof data.shopName === 'string' ? data.shopName.slice(0, 80) : '',
    shopUrl: safeLink(data.shopUrl), customUrl: safeLink(data.customUrl),
    materialLinks: Object.fromEntries(Object.entries(data.materialLinks && typeof data.materialLinks === 'object' ? data.materialLinks : {}).filter(([id, url]) => catalog.has(id) && safeLink(url)).map(([id, url]) => [id, safeLink(url)])),
  };
}
export function createOrderText(ids, customization = {}, materialByIdOverride = materialById) {
  const materialById = materialByIdOverride;
  const valid = ids.filter((id) => materialById.has(id));
  const counts = new Map(); valid.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  return [
    'Phone-chain customization request', `Design: ${String(customization.name || 'My phone chain').slice(0, 60)}`,
    `Cord: ${['slate', 'ivory', 'rose'].includes(customization.cord) ? customization.cord : 'slate'}`,
    '', 'Threading order:', ...valid.map((id, index) => `${index + 1}. ${materialById.get(id).name}`),
    '', 'Materials:', ...Array.from(counts, ([id, count]) => `${materialById.get(id).name} × ${count}`),
    '', `Note: ${String(customization.note || '').slice(0, 400)}`, '',
    'Not an order. Confirm dimensions, availability, price and delivery with the maker.',
  ].join('\n');
}
