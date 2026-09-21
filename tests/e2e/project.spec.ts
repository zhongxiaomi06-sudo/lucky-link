import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?view=2d');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('explicit 2D fallback opens the tactile maker', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Lucky Link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build your lucky' })).toBeVisible();
  await page.getByRole('button', { name: 'Build your lucky' }).click();
  await expect(page.getByRole('heading', { name: 'Make it yours' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(24);
  await expect(page.getByRole('button', { name: 'Try it on' })).toBeDisabled();
});

test('filters the expanded material library without losing the composition', async ({ page }) => {
  await page.getByRole('button', { name: 'Build your lucky' }).click();
  await page.getByRole('button', { name: 'Crystal', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(6);
  await page.getByRole('button', { name: 'Add Rose heart' }).click();
  await page.getByRole('button', { name: 'Lucky', exact: true }).click();
  await page.getByRole('button', { name: 'Add Berry cherries' }).click();
  await page.getByRole('button', { name: 'All 24' }).click();
  await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(2);
  await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(24);
});

test('preserves the exact sequence through preview and edit', async ({ page }) => {
  await page.getByRole('button', { name: 'Build your lucky' }).click();
  await page.getByRole('button', { name: 'Add Cobalt bubble' }).click();
  await page.getByRole('button', { name: 'Add Butter bow' }).click();
  await page.getByRole('button', { name: 'Add Lucky cherries' }).click();
  await expect(page.getByRole('button', { name: 'Try it on' })).toBeEnabled();
  await page.getByRole('button', { name: 'Try it on' }).click();
  await expect(page.getByRole('heading', { name: 'Made by you' })).toBeVisible();
  await expect(page.locator('[data-preview-beads] [data-piece-id]')).toHaveCount(3);
  const sequence = await page.locator('[data-preview-beads] [data-piece-id]').evaluateAll((items) => items.map((item) => item.getAttribute('data-piece-id')));
  expect(sequence).toEqual(['cobalt', 'yellow-bow', 'cherry']);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(3);
});

test('undoes, removes and restarts cleanly', async ({ page }) => {
  await page.getByRole('button', { name: 'Build your lucky' }).click();
  await page.getByRole('button', { name: 'Add Aqua heart' }).click();
  await page.getByRole('button', { name: 'Add Moon pearl' }).click();
  await page.getByRole('button', { name: 'Add Cobalt star' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(2);
  await page.getByRole('button', { name: 'Remove Aqua heart' }).click();
  await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(1);
  await page.getByRole('button', { name: 'Add Lucky dice' }).click();
  await page.getByRole('button', { name: 'Add Cobalt star' }).click();
  await page.getByRole('button', { name: 'Try it on' }).click();
  await page.getByRole('button', { name: 'Make another' }).click();
  await expect(page.getByText('0 / 14')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try it on' })).toBeDisabled();
});

test('supports mouse drag to the chain', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Mouse drag is covered in the Chromium desktop project.');
  await page.getByRole('button', { name: 'Build your lucky' }).click();
  const source = page.getByRole('button', { name: 'Add Crystal bubble' });
  const target = page.locator('[data-drop-zone]');
  await source.dragTo(target);
  await expect(page.getByRole('button', { name: 'Remove Crystal bubble' })).toBeVisible();
});

test('persists mute and avoids horizontal overflow', async ({ page }) => {
  const sound = page.getByRole('button', { name: 'Mute soundtrack' });
  await sound.click();
  await expect(page.getByRole('button', { name: 'Turn on soundtrack' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Turn on soundtrack' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
