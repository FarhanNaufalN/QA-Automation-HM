import { chromium } from '@playwright/test';
import { loadProjectEnv, getConfig, getLoginPath } from '../utils/env';
import { InteractionHelper } from '../helpers/interaction.helper';

loadProjectEnv();
const config = getConfig();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ baseURL: config.baseUrl });
  const interaction = new InteractionHelper(page);

  await page.goto(getLoginPath(config.database));
  await page.locator('input[name="login"]').first().fill(config.username);
  await page.locator('input[name="password"]').first().fill(config.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/web#/, { timeout: 120_000 });
  console.log('LOGIN:', page.url());

  await page.waitForTimeout(2_000);
  const path = config.directSalesPath;
  console.log('PATH:', path);

  try {
    await interaction.navigateToOdooAction(path);
    console.log('AFTER NAV:', page.url());
    const create = page.locator('[data-uniq="btn_sale.order_create"], .o_list_button_add');
    console.log('CREATE:', await create.isVisible().catch(() => false));
    await page.screenshot({ path: 'reports/debug-nav-action.png', fullPage: true });
  } catch (e) {
    console.log('ERROR:', e);
    console.log('URL:', page.url());
  }

  await browser.close();
})();
