import { expect, test, type Page } from '@playwright/test';

test.use({ video: 'off', launchOptions: async ({ browserName }, use) => {
  await use({ args: browserName === 'chromium' && process.platform === 'darwin' ? ['--use-angle=metal', '--enable-gpu'] : [] });
}});
let runtimeErrors: string[] = [];
const action = (page: Page, name: string) => page.locator('[data-action="' + name + '"]');
async function add(page: Page, names: string[]) {
  await action(page, 'collection').click();
  for (const name of names) await page.getByRole('button', { name: 'Add ' + name, exact: true }).click();
  await page.getByRole('button', { name: 'Close bead collection' }).click();
}
test.beforeEach(async ({ page }) => {
  runtimeErrors = [];
  page.on('pageerror', (e) => runtimeErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') runtimeErrors.push(m.text()); });
  await page.goto('/3d-lab.html');
  await expect(page.locator('[data-lab-shell]')).toHaveAttribute('data-world', '360');
  await expect(page.locator('[data-lab-shell]')).toHaveAttribute('data-render-ready', 'true');
});
test.afterEach(() => { expect(runtimeErrors).toEqual([]); });

test('cover enters the new 3D minigame', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/3d-lab.html/);
  await expect(page.locator('[data-level-name]')).toHaveText('Ocean wish');
});
test('independent footer and physical bead slots fit the viewport', async ({ page }) => {
  await expect(action(page, 'finish')).toBeInViewport();
  await expect(action(page, 'undo')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('[data-builder]').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('[data-box-slot]:visible')).toHaveCount((page.viewportSize()?.height ?? 844) < 680 ? 4 : 6);
  const slots = await page.locator('[data-box-slot]:visible').evaluateAll((items) => items.map((item) => { const b = item.getBoundingClientRect(); return { w: b.width, h: b.height }; }));
  for (const s of slots) { expect(s.w).toBeGreaterThanOrEqual(44); expect(s.h).toBeGreaterThanOrEqual(44); }
  expect(await page.locator('[data-box-slot]:visible').evaluateAll((items) => items.every((item) => {
    const r = item.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === item;
  }))).toBe(true);
});
test('keyboard pickup, cancel, thread, return, reuse and paired undo', async ({ page }) => {
  const shell = page.locator('[data-lab-shell]'), first = page.locator('[data-box-slot="0"]');
  await first.focus(); await page.keyboard.press('Enter');
  await expect(shell).toHaveAttribute('data-holding', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-count]')).toHaveText('0');
  await first.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-drop-target]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-count]')).toHaveText('1');
  await action(page, 'sequence').click();
  await page.getByRole('button', { name: '1. Blue eye', exact: true }).click();
  await action(page, 'remove').click();
  await expect(shell).toHaveAttribute('data-box-contents', 'blue-eye');
  await action(page, 'box-mode').click();
  await first.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await expect(shell).toHaveAttribute('data-composition', 'blue-eye');
  await expect(shell).toHaveAttribute('data-box-contents', '');
  await action(page, 'undo').click();
  await expect(shell).toHaveAttribute('data-composition', '');
  await expect(shell).toHaveAttribute('data-box-contents', 'blue-eye');
});
test('native drag threads only at the cord and cancels elsewhere', async ({ page }) => {
  const slot = await page.locator('[data-box-slot="0"]').boundingBox();
  if (!slot) throw new Error('Missing box target');
  await page.mouse.move(slot.x + 22, slot.y + 22); await page.mouse.down();
  await expect(page.locator('[data-drop-target]')).toBeVisible();
  await page.waitForTimeout(80);
  const drop = await page.locator('[data-drop-target]').boundingBox();
  if (!drop) throw new Error('Missing cord target');
  await page.mouse.move(drop.x + 22, drop.y + 22, { steps: 10 }); await page.mouse.up();
  await expect(page.locator('[data-count]')).toHaveText('1');
  await page.mouse.move(slot.x + 22, slot.y + 22); await page.mouse.down();
  await page.mouse.move(5, 5, { steps: 8 }); await page.mouse.up();
  await expect(page.locator('[data-count]')).toHaveText('1');
  await expect(page.locator('[data-lab-shell]')).toHaveAttribute('data-holding', 'false');
});
test('failed delivery preserves draft; fitting styles win once and unlock next letter', async ({ page }) => {
  const shell = page.locator('[data-lab-shell]');
  await add(page, ['Cherries', 'Cherries', 'Cherries']);
  await action(page, 'finish').click();
  await expect(shell).toHaveAttribute('data-delivery-passed', 'false');
  await expect(page.locator('[data-reward-reveal]')).toBeHidden();
  await action(page, 'next').click();
  await expect(page.locator('[data-count]')).toHaveText('3');
  await action(page, 'sequence').click(); await action(page, 'clear').click();
  await page.getByRole('button', { name: 'Close threading order' }).click();
  await add(page, ['Blue eye', 'Aqua drop', 'Cloud pearl', 'Pearl shell', 'Clear quartz', 'Cobalt gem']);
  await action(page, 'finish').click();
  await expect(shell).toHaveAttribute('data-delivery-passed', 'true');
  await action(page, 'score').click();
  await expect(page.locator('[data-reward-reveal]')).toContainText('+40 Studio XP');
  await page.getByRole('button', { name: 'Close score and reward' }).click();
  await expect(action(page, 'next')).toBeInViewport();
  await action(page, 'edit').click(); await action(page, 'finish').click();
  await expect(page.locator('[data-reward-reveal]')).toBeHidden();
  await action(page, 'next').click();
  await expect(page.locator('[data-level-name]')).toHaveText('Rose letter');
  await expect(page.locator('[data-count]')).toHaveText('0');
});
test('360 orbit, reset and follow tour never mutate the chain', async ({ page }) => {
  await add(page, ['Blue eye', 'Aqua drop', 'Cloud pearl']);
  const shell = page.locator('[data-lab-shell]'), box = await page.locator('[data-canvas]').boundingBox();
  if (!box) throw new Error('Missing canvas');
  const travel = Number(await shell.getAttribute('data-camera-travel'));
  const orbitY = box.y + box.height * (box.width > box.height ? .45 : .33);
  for (let i = 0; i < 10; i++) {
    await page.mouse.move(box.x + box.width * .2, orbitY); await page.mouse.down();
    await page.mouse.move(box.x + box.width * .85, orbitY, { steps: 8 }); await page.mouse.up();
  }
  await expect.poll(async () => Number(await shell.getAttribute('data-camera-travel')) - travel).toBeGreaterThan(360);
  await expect(page.locator('[data-count]')).toHaveText('3');
  await page.keyboard.press('Escape'); await action(page, 'reset-camera').click();
  await expect.poll(async () => Number(await shell.getAttribute('data-camera-yaw'))).toBeLessThan(4);
  await action(page, 'finish').click(); await action(page, 'view-phone').click(); await action(page, 'tour').click();
  await expect(shell).toHaveAttribute('data-camera-mode', 'tour');
  await page.mouse.move(box.x + box.width * .3, box.y + box.height * .4); await page.mouse.down();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .4, { steps: 6 }); await page.mouse.up();
  await expect(shell).toHaveAttribute('data-camera-mode', 'orbit');
  await expect(page.locator('[data-count]')).toHaveText('3');
});
