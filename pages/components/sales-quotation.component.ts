import { Page, expect, type Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export interface SalesQuotationLocators {
  salesModule: string | RegExp;
  quotationsMenu: string | RegExp;
  createButton: string | RegExp;
  customerField: string | RegExp;
  orderLinesTab: string | RegExp;
  addProductButton: string | RegExp;
  saveButton: string | RegExp;
  savedIndicator: string | RegExp;
  requestApprovalButton: string | RegExp;
  approveButton: string | RegExp;
  waitingApprovalStatus: string | RegExp;
  approvedStatus: string | RegExp;
}

const DEFAULT_LOCATORS: SalesQuotationLocators = {
  salesModule: /sales/i,
  quotationsMenu: /quotations/i,
  createButton: /create/i,
  customerField: /customer/i,
  orderLinesTab: /order lines/i,
  addProductButton: /add a product/i,
  saveButton: /save/i,
  savedIndicator: /quotation|quotations/i,
  requestApprovalButton: /request for approval/i,
  approveButton: /^approve$/i,
  waitingApprovalStatus: /waiting for sale order approval/i,
  approvedStatus: /quotation approved/i,
};

/**
 * Layer 1 — Sales module: create quotation with order lines.
 */
export class SalesQuotationComponent extends BasePage {
  constructor(
    page: Page,
    private readonly locators: SalesQuotationLocators = DEFAULT_LOCATORS
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

  async openSalesModule(): Promise<void> {
    await this.interaction.openSidebarMenu(this.locators.salesModule);
    await this.waitForPageLoad();
  }

  async openQuotations(): Promise<void> {
    await this.interaction.openSidebarMenu(this.locators.quotationsMenu);
    await this.waitForPageLoad();
  }

  /** Navigate to quotations list — tries direct menu first, then via Sales module. */
  async navigateToQuotations(): Promise<void> {
    try {
      await this.openQuotations();
    } catch {
      await this.openSalesModule();
      await this.openQuotations();
    }

    await this.interaction.waitForListReady();
    await this.interaction.dismissBlockingDialogs();
  }

  async clickCreate(): Promise<void> {
    await this.interaction.waitForListReady();
    await this.interaction.dismissBlockingDialogs();

    // Search box often keeps focus and can swallow / block the Create action.
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.locator('.o_action_manager').click({ position: { x: 5, y: 5 } }).catch(() => undefined);

    const createButton = this.page
      .locator('[data-uniq="btn_sale.order_create"], button.o_list_button_add')
      .filter({ hasText: this.locators.createButton })
      .first();

    await createButton.waitFor({ state: 'visible', timeout: 30_000 });

    const customerInput = this.customerFieldLocator();

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.interaction.dismissBlockingDialogs();

      try {
        await createButton.click({ timeout: 15_000 });
      } catch {
        await createButton.click({ force: true, timeout: 15_000 });
      }

      try {
        await customerInput.waitFor({ state: 'visible', timeout: 20_000 });
        break;
      } catch {
        if (attempt === 2) {
          throw new Error(
            'Create did not open the quotation form (Customer field not visible). Check list filters or permissions.'
          );
        }
        await this.page.waitForTimeout(1_500);
      }
    }

    await this.waitForPageLoad();
    await this.waitForQuotationForm();
  }

  private customerFieldLocator(): Locator {
    const form = this.page.locator('.o_form_view').first();
    return form
      .getByRole('textbox', { name: this.locators.customerField, exact: true })
      .or(form.locator('[name="partner_id"] input, [name="partner_id"] textarea'))
      .first();
  }

  /** After Create, list view can still be visible until the form loads. */
  private async waitForQuotationForm(): Promise<void> {
    await this.interaction.dismissBlockingDialogs();
    await this.page
      .locator('.o_loading, .o_blockUI')
      .first()
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => undefined);
    await this.customerFieldLocator().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async selectCustomer(searchText: string, optionName: string | RegExp): Promise<void> {
    await this.waitForQuotationForm();
    await this.fillMany2One(this.customerFieldLocator(), searchText, optionName);
  }

  async selectWarehouse(searchText: string, optionName: string | RegExp): Promise<void> {
    if (!searchText?.trim() || !optionName || (typeof optionName === 'string' && !optionName.trim())) {
      return;
    }

    const field = this.page.getByRole('textbox', { name: 'Warehouse', exact: true }).first();
    if (!(await field.count())) {
      return;
    }

    const currentValue = (await field.inputValue()).trim();
    if (currentValue.length > 8) {
      return;
    }

    try {
      await this.fillMany2One(field, searchText, optionName);
      return;
    } catch {
      const searchMore = this.page.locator('[name="warehouse_id"] .o_external_button').first();
      if (await searchMore.count()) {
        await searchMore.click();
        await this.page.locator('.modal-dialog .o_list_table tbody tr').first().click();
        await this.page.getByRole('button', { name: /select|choose|confirm/i }).click().catch(() => undefined);
      }
    }
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

    const addButton = this.page.getByRole('button', { name: this.locators.addProductButton });
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();

    const productField = this.page
      .locator('.o_field_one2many tbody tr')
      .filter({ has: this.page.getByRole('button', { name: /delete row/i }) })
      .locator('input.ui-autocomplete-input')
      .first();

    await productField.waitFor({ state: 'visible', timeout: 30_000 });
    await this.fillMany2One(productField, productSearch, productOption);

    const qtyField = this.page
      .locator('.o_field_one2many tbody tr')
      .filter({ has: this.page.getByRole('button', { name: /delete row/i }) })
      .locator('[name="product_uom_qty"] input, input[name="product_uom_qty"]')
      .first();

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

    await this.page.getByRole('button', { name: this.locators.saveButton }).first().click();
    await this.waitForPageLoad();
  }

  async expectQuotationSaved(): Promise<void> {
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
  }

  async approve(): Promise<void> {
    await this.page.getByRole('button', { name: this.locators.approveButton }).first().click();
    await this.waitForPageLoad();
    await this.confirmDialogIfPresent();
  }

  async expectWaitingForApproval(): Promise<void> {
    // Odoo statusbar uses `role="radio"` steps that can be visibility:hidden while still active.
    const step = this.page
      .locator('.o_form_view button[data-value="waiting_for_approval"][aria-current="step"]')
      .first();
    await expect(step).toBeAttached({ timeout: 60_000 });
  }

  async expectQuotationApproved(): Promise<void> {
    // After Approve, HashMicro often advances past "Quotation Approved" to "Sale Order";
    // the active `aria-current` step is no longer `waiting_for_approval`.
    const form = this.page.locator('.o_form_view');
    await expect(form.locator('button[data-value="waiting_for_approval"][aria-current="step"]')).toHaveCount(
      0,
      { timeout: 60_000 }
    );
  }
}
