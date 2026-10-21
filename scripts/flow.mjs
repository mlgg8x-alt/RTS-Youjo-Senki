import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
const url = 'http://127.0.0.1:3000/';
const log = (...a) => console.log(...a);

await page.goto(url, { waitUntil: 'networkidle' });
await page.click('button:has-text("New campaign")');
await page.waitForTimeout(400);

// Save exists -> reload -> Continue restores the campaign.
await page.reload({ waitUntil: 'networkidle' });
const continueEnabled = await page.locator('button:has-text("Continue campaign")').isEnabled();
await page.click('button:has-text("Continue campaign")');
await page.waitForTimeout(400);
const restored = await page.locator('.camp-top').count();
log('continue enabled:', continueEnabled, 'campaign restored:', restored === 1);

// Auto-resolve an assault on the neutral Saar Basin.
await page.locator('.camp-army').first().click();
await page.locator('.camp-prov:has-text("Saar Basin")').click();
await page.waitForTimeout(250);
await page.click('button:has-text("Auto-resolve")');
await page.waitForTimeout(600);
await page.screenshot({ path: 'artifacts/14-autoresolve.png' });
const saarOwner = await page.evaluate(() => {
  const node = [...document.querySelectorAll('.camp-prov')].find((n) => n.textContent?.includes('Saar Basin'));
  return node ? node.className : 'missing';
});
log('saar class:', saarOwner);

// End two turns; AI acts and the treasury is updated.
for (let i = 0; i < 2; i++) {
  await page.click('button:has-text("End turn")');
  await page.waitForTimeout(900);
}
const stats = await page.evaluate(() => document.querySelector('.camp-stats')?.textContent);
log('stats after turns:', stats?.replace(/\s+/g, ' ').trim());
await page.screenshot({ path: 'artifacts/15-turns.png' });

// Reload again: the campaign should survive with its turn count.
await page.reload({ waitUntil: 'networkidle' });
await page.click('button:has-text("Continue campaign")');
await page.waitForTimeout(400);
const stats2 = await page.evaluate(() => document.querySelector('.camp-stats')?.textContent);
log('stats after reload:', stats2?.replace(/\s+/g, ' ').trim());

log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length) process.exitCode = 1;
