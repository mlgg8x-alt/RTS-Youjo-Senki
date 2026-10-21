import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });
const errors = [];
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({
  viewport: { width: 915, height: 412 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});
const page = await ctx.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const url = 'http://127.0.0.1:3000/';
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: 'artifacts/01-menu.png' });

// Campaign: map, army panel, assault flow.
await page.click('button:has-text("New campaign")');
await page.waitForTimeout(500);
await page.screenshot({ path: 'artifacts/02-campaign.png' });

await page.locator('.camp-army').first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'artifacts/03-army.png' });

await page.locator('.camp-prov:has-text("Saar Basin")').click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'artifacts/04-assault.png' });
const hasFight = await page.locator('button:has-text("Fight battle")').count();

if (hasFight) {
  await page.click('button:has-text("Fight battle")');
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'artifacts/05-campaign-battle.png' });
  await page.click('.bt-begin');
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'artifacts/06-battle.png' });

  // Zoom in to inspect soldier rendering.
  const box = await page.locator('.battle-canvas').boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.28, box.y + box.height * 0.5);
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(120);
    }
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'artifacts/07-battle-zoom.png' });

  // Concede via field orders, back to the campaign.
  await page.click('.bt-icon:has-text("☰")');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'artifacts/08-orders.png' });
  await page.click('button:has-text("Retreat")');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'artifacts/09-result.png' });
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'artifacts/10-back-to-campaign.png' });
}

// Skirmish: full 20-unit armies.
await page.goto(url, { waitUntil: 'networkidle' });
await page.click('button:has-text("Skirmish battle")');
await page.waitForTimeout(600);
await page.click('.bt-begin');
await page.click('.bt-order:has-text("All")');
await page.waitForTimeout(150);
await page.click('.bt-order:has-text("Move")');
const cbox = await page.locator('.battle-canvas').boundingBox();
if (cbox) await page.mouse.click(cbox.x + cbox.width * 0.55, cbox.y + cbox.height * 0.5);
await page.waitForTimeout(12000);
await page.screenshot({ path: 'artifacts/11-skirmish.png' });

// Let the lines close and fight, then inspect the melee up close.
await page.click('.bt-speed');
await page.waitForTimeout(14000);
await page.screenshot({ path: 'artifacts/12-combat.png' });
if (cbox) {
  await page.mouse.move(cbox.x + cbox.width * 0.5, cbox.y + cbox.height * 0.5);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(120);
  }
}
await page.waitForTimeout(600);
await page.screenshot({ path: 'artifacts/13-combat-zoom.png' });

const state = await page.evaluate(() => ({
  cards: document.querySelectorAll('.bt-card').length,
  canvas: !!document.querySelector('.battle-canvas'),
  hud: !!document.querySelector('.bt-top'),
}));

console.log(JSON.stringify({ state, errors }, null, 2));
await browser.close();
if (errors.length) process.exitCode = 1;
