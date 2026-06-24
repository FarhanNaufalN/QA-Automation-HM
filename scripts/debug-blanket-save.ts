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

  const path = '/web#action=1573&model=saleblanket.saleblanket&view_type=list&menu_id=1159';
  await page.goto(path);
  await page.waitForTimeout(6000);
  await page.locator('[data-uniq="btn_saleblanket.saleblanket_create"]').click();
  await page.waitForTimeout(4000);

  const customer = page.getByRole('textbox', { name: 'Customer', exact: true }).first();
  await customer.fill(config.customerSearch);
  await page.locator('.ui-autocomplete li:visible').filter({ hasText: config.customerName }).first().click();
  await page.waitForTimeout(2000);

  const startDate = page.getByRole('textbox', { name: /^start date$/i }).first();
  const startVal = (await startDate.inputValue()).trim();
  console.log('START DATE BEFORE:', startVal);
  if (!startVal) {
    const d = new Date();
    const formatted = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    await startDate.click();
    await startDate.fill(formatted);
    await startDate.press('Tab');
    await page.waitForTimeout(300);
  }
  console.log('START DATE AFTER:', await startDate.inputValue());

  await page.getByRole('tab', { name: /order line/i }).click();
  await page.getByRole('button', { name: /^add a line$/i }).click();
  await page.waitForTimeout(1000);

  const productField = page
    .locator('.o_field_one2many tbody tr')
    .filter({ has: page.getByRole('button', { name: /delete row/i }) })
    .locator('input.ui-autocomplete-input')
    .first();
  await productField.fill(config.productSearch);
  await page.locator('.ui-autocomplete li:visible').filter({ hasText: config.productName }).first().click();
  await page.waitForTimeout(1500);

  const lineRow = page
    .locator('.o_field_one2many tbody tr')
    .filter({ has: page.getByRole('button', { name: /delete row/i }) })
    .first();

  const inputs = await lineRow.locator('input, textarea').evaluateAll((els) =>
    els.map((el, i) => ({
      i,
      tag: el.tagName,
      name: el.getAttribute('name'),
      disabled: (el as HTMLInputElement).disabled,
      value: (el as HTMLInputElement).value,
    }))
  );
  console.log('LINE INPUTS:', JSON.stringify(inputs, null, 2));

  const qtyField = lineRow.locator('input[name="quantity"]').first();
  await qtyField.click();
  await qtyField.fill(config.productQty);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');

  const dismissModals = async () => {
    for (let i = 0; i < 5; i++) {
      const modal = page.locator('.modal.show, [role="dialog"][open]').first();
      if (!(await modal.count())) break;
      const text = ((await modal.innerText().catch(() => '')) ?? '').slice(0, 500);
      console.log(`MODAL ${i}:`, text);
      const discardWarning = modal.getByText(/record has been modified|changes will be discarded/i);
      if (await discardWarning.count()) {
        await modal.getByRole('button', { name: /^cancel$/i }).first().click();
      } else {
        const ok = modal.getByRole('button', { name: /^ok$/i });
        const close = modal.getByRole('button', { name: /^close$/i });
        if (await ok.count()) await ok.first().click();
        else if (await close.count()) await close.first().click();
        else await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    }
    await page.locator('.blockUI.blockOverlay').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
  };

  await dismissModals();

  page.on('response', async (res) => {
    if (res.url().includes('call_kw') && res.request().method() === 'POST') {
      const body = res.request().postData() ?? '';
      if (body.includes('web_save') || body.includes('create') || body.includes('write')) {
        const status = res.status();
        let preview = '';
        try {
          preview = (await res.text()).slice(0, 500);
        } catch {
          preview = '(no body)';
        }
        console.log('RPC', status, body.slice(0, 200), '=>', preview);
      }
    }
  });

  await dismissModals();

  const saveBtn = page.locator('[data-uniq="btn_saleblanket.saleblanket_save"]');
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(8000);

  const invalid = await page.getByText('Invalid fields:').count();
  console.log('INVALID COUNT:', invalid);
  if (invalid) {
    console.log('INVALID TEXT:', await page.getByText('Invalid fields:').locator('..').textContent());
  }
  const alerts = await page.locator('.o_notification, .alert, .text-danger').allTextContents();
  console.log('ALERTS:', alerts.filter(Boolean).join(' | '));
  console.log('URL:', page.url());
  console.log('HEADING:', await page.locator('h1, .oe_title').first().textContent());
  await page.screenshot({ path: 'reports/blanket-save-debug.png', fullPage: true });
  await browser.close();
})();
