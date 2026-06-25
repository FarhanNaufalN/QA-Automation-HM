import { chromium } from '@playwright/test';
import { loadProjectEnv, getConfig, getLoginPath } from '../utils/env';

loadProjectEnv();
const config = getConfig();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ baseURL: config.baseUrl });
  await page.goto(getLoginPath(config.database));
  await page.locator('input[name="login"]').first().fill(config.username);
  await page.locator('input[name="password"]').first().fill(config.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/web#/, { timeout: 120_000 });
  console.log('LOGIN:', page.url());

  await page.goto(config.blanketOrderPath);
  await page.waitForTimeout(6000);
  console.log('BLANKET GOTO:', page.url());
  console.log(
    'BLANKET CREATE:',
    await page.locator('[data-uniq="btn_saleblanket.saleblanket_create"]').isVisible()
  );

  await browser.close();
})();
