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

  console.log('AFTER LOGIN:', page.url());

  const paths = [
    config.directSalesPath ||
      '/web#action=6033&model=sale.order&view_type=list&cids=&bids=&menu_id=3441',
    '/web#action=6033&model=sale.order&view_type=list&cids=1,40,82&bids=1&menu_id=3441',
    '/web#action=6033&model=sale.order&view_type=list&menu_id=3441',
  ];

  for (const path of paths) {
    await page.goto(path);
    await page.waitForTimeout(6000);
    console.log('GOTO', path.slice(0, 80), '=>', page.url());
  }

  const toggle = page.locator('p').filter({ hasText: /^(CRM|Sales|Inventory|Purchasing)$/i }).first();
  console.log('MODULE LABEL:', (await toggle.textContent())?.trim());
  await toggle.click();
  await page.waitForTimeout(1000);

  const allMenuitems = await page.getByRole('menuitem').filter({ visible: true }).allTextContents();
  console.log('VISIBLE MENUITEMS AFTER CRM CLICK:', allMenuitems.map((t) => t.trim()).filter(Boolean).slice(0, 40));

  await page.screenshot({ path: 'reports/direct-nav-crm-dropdown.png' });

  try {
    await interaction.openOdooApp(/sales/i);
    await page.waitForTimeout(4000);
    console.log('AFTER openOdooApp Sales:', page.url());
    await page.screenshot({ path: 'reports/direct-nav-odoo-app.png' });
  } catch (e) {
    console.log('openOdooApp ERROR:', e);
  }

  const path =
    config.directSalesPath ||
    '/web#action=6033&model=sale.order&view_type=list&cids=1,40,82&bids=1&menu_id=3441';

  await page.goto(path);
  await page.waitForTimeout(6000);
  console.log('AFTER GOTO POST APP:', page.url());

  const create2 = page.locator('[data-uniq="btn_sale.order_create"], .o_list_button_add');
  console.log('CREATE VISIBLE AFTER NAV:', await create2.isVisible().catch(() => false));

  // List visible menuitems containing "direct" or "sales"
  const items = await page.getByRole('menuitem').allTextContents();
  const relevant = items.filter((t) => /direct|sales/i.test(t)).slice(0, 30);
  console.log('MENUITEMS:', relevant);

  await browser.close();
})();
