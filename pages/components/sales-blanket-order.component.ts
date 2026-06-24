import { Page, expect, type Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { getConfig } from '../../utils/env';

export interface SalesBlanketOrderLocators {
  listPath: string;
  createButton: string | RegExp;
  customerField: string | RegExp;
  orderLinesTab: string | RegExp;
  addLineButton: string | RegExp;
  saveButton: string | RegExp;
  requestApprovalButton: string | RegExp;
  approveButton: string | RegExp;
}

const DEFAULT_LOCATORS: SalesBlanketOrderLocators = {
  listPath:
    '/web#action=1573&model=saleblanket.saleblanket&view_type=list&menu_id=1159',
  createButton: /create/i,
  customerField: /customer/i,
  orderLinesTab: /order line/i,
  addLineButton: /^add a line$/i,
  saveButton: /save/i,
  requestApprovalButton: /request for approval/i,
  approveButton: /^approve$/i,
};

/**
 * Layer 1 — Sales module: create blanket order with order lines.
 */
export class SalesBlanketOrderComponent extends BasePage {
  constructor(
    page: Page,
    private readonly locators: SalesBlanketOrderLocators = DEFAULT_LOCATORS
  ) {
    super(page);
  }

  private async fillMany2One(
    field: Locator,
    searchText: string,
    optionName: string | RegExp
  ): Promise<void> {
    const pattern =
      typeof optionName === 'string' ? new RegExp(optionName, 'i') : optionName;

    await field.waitFor({ state: 'visible', timeout: 30_000 });
    const currentValue = (await field.inputValue({ timeout: 15_000 }).catch(() => '')).trim();

    if (pattern.test(currentValue)) {
      return;
    }

    await field.click();
    await field.fill(searchText);

    await this.page
      .waitForResponse((response) => response.url().includes('call_kw') && response.ok())
      .catch(() => null);

    await this.interaction.selectOdooAutocompleteOption(optionName);
    await expect(field).toHaveValue(pattern, { timeout: 15_000 });
  }

  async navigateToBlanketOrders(listPath?: string): Promise<void> {
    const path = listPath ?? this.locators.listPath;
    const { baseUrl } = getConfig();
    const target = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    await this.page.goto(target, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2_000);

    if (!this.page.url().includes('saleblanket.saleblanket')) {
      try {
        await this.interaction.openSidebarMenu(/blanket orders/i);
      } catch {
        await this.page.goto(target, { waitUntil: 'networkidle' }).catch(() => undefined);
      }
    }

    await this.page.waitForURL(/saleblanket\.saleblanket/, { timeout: 90_000 });
    await this.interaction.waitForListReady();
    await this.interaction.dismissBlockingDialogs();

    await this.createButtonLocator().waitFor({ state: 'visible', timeout: 60_000 });
  }

  private createButtonLocator(): Locator {
    return this.page
      .locator('[data-uniq="btn_saleblanket.saleblanket_create"], button.o_list_button_add')
      .first();
  }

  async clickCreate(): Promise<void> {
    await this.interaction.waitForListReady();
    await this.interaction.dismissBlockingDialogs();

    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.locator('.o_action_manager').click({ position: { x: 5, y: 5 } }).catch(() => undefined);

    const createButton = this.createButtonLocator();
    await createButton.waitFor({ state: 'visible', timeout: 60_000 });

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.interaction.dismissBlockingDialogs();

      try {
        await createButton.click({ timeout: 15_000 });
      } catch {
        await createButton.click({ force: true, timeout: 15_000 });
      }

      try {
        await this.customerFieldLocator().waitFor({ state: 'visible', timeout: 20_000 });
        break;
      } catch {
        if (attempt === 2) {
          throw new Error('Create did not open the blanket order form.');
        }
        await this.page.waitForTimeout(1_500);
      }
    }

    await this.waitForForm();
  }

  private customerFieldLocator(): Locator {
    const form = this.page.locator('.o_form_view').first();
    return form
      .getByRole('textbox', { name: this.locators.customerField, exact: true })
      .or(form.locator('[name="partner_id"] input, [name="partner_id"] textarea'))
      .first();
  }

  private async waitForForm(): Promise<void> {
    await this.interaction.dismissBlockingDialogs();
    await this.page
      .locator('.o_loading, .o_blockUI')
      .first()
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => undefined);
    await this.customerFieldLocator().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async selectCustomer(searchText: string, optionName: string | RegExp): Promise<void> {
    await this.waitForForm();
    await this.fillMany2One(this.customerFieldLocator(), searchText, optionName);
  }

  async openOrderLinesTab(): Promise<void> {
    await this.interaction.clickTab(this.locators.orderLinesTab);
  }

  async addProductLine(
    productSearch: string,
    productOption: string | RegExp,
    quantity: string
  ): Promise<void> {
    await this.openOrderLinesTab();

    const addButton = this.page.getByRole('button', { name: this.locators.addLineButton });
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();

    const row = this.page.locator('.o_field_one2many tbody tr').last();
    const productField = row.locator('input.ui-autocomplete-input').first();

    await productField.waitFor({ state: 'visible', timeout: 30_000 });
    await this.fillMany2One(productField, productSearch, productOption);

    const qtyField = row.locator('[name="quantity"] input, input[name="quantity"]').first();
    await qtyField.waitFor({ state: 'visible' });
    await qtyField.click();
    await qtyField.fill(quantity);
  }

  async save(): Promise<void> {
    await this.page
      .waitForResponse(
        (response) => response.url().includes('call_kw') && response.request().method() === 'POST'
      )
      .catch(() => null);

    const saveButton = this.page
      .locator('[data-uniq="btn_saleblanket.saleblanket_save"]')
      .or(this.page.getByRole('button', { name: this.locators.saveButton }))
      .first();

    await saveButton.click();
    await this.waitForPageLoad();
    await this.interaction.dismissBlockingDialogs();
  }

  async expectBlanketOrderSaved(): Promise<void> {
    await expect(this.page.getByText('Invalid fields:')).not.toBeVisible();
    await expect(this.page).toHaveURL(/id=\d+/, { timeout: 60_000 });
  }

  private async confirmDialogIfPresent(): Promise<void> {
    const confirm = this.page.getByRole('button', { name: /confirm|yes|ok|ya/i });
    if (await confirm.count()) {
      await confirm.first().click().catch(() => undefined);
    }
  }

  async requestForApproval(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.locators.requestApprovalButton })
      .first()
      .click();
    await this.waitForPageLoad();
    await this.confirmDialogIfPresent();
    await this.interaction.dismissBlockingDialogs();
  }

  async approve(): Promise<void> {
    await this.page.getByRole('button', { name: this.locators.approveButton }).first().click();
    await this.waitForPageLoad();
    await this.confirmDialogIfPresent();
    await this.interaction.dismissBlockingDialogs();
  }

  async expectWaitingForApproval(): Promise<void> {
    const step = this.page
      .locator('.o_form_view button[data-value="waiting_for_approval"][aria-current="step"]')
      .first();
    await expect(step).toBeAttached({ timeout: 60_000 });
  }

  async expectBlanketOrderApproved(): Promise<void> {
    const form = this.page.locator('.o_form_view');
    await expect(form.locator('button[data-value="waiting_for_approval"][aria-current="step"]')).toHaveCount(
      0,
      { timeout: 60_000 }
    );
  }
}
