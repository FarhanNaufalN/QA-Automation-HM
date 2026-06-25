import { Page, expect, type Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { toLiteralRegExp } from '../../utils/regex';

export interface SalesQuotationLocators {
  listPath?: string;
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
  listPath:
    '/web#action=459&model=sale.order&view_type=list&cids=1,40,82&bids=1&menu_id=320',
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

  protected async fillMany2One(
    field: Locator,
    searchText: string,
    optionName: string | RegExp
  ): Promise<void> {
    const pattern =
      typeof optionName === 'string' ? toLiteralRegExp(optionName) : optionName;

    const productCode =
      typeof optionName === 'string' ? optionName.match(/\[([^\]]+)\]/)?.[1] : undefined;

    const isProductLike =
      Boolean(productCode) ||
      (typeof optionName === 'string' && /\[.+\]/.test(optionName));

    /** Typing search text alone is not a linked many2one record. */
    const isLinkedRecord = (value: string): boolean => {
      const trimmed = value.trim();
      if (!trimmed) {
        return false;
      }

      if (productCode && trimmed.includes(`[${productCode}]`)) {
        return true;
      }

      if (isProductLike) {
        return false;
      }

      if (pattern.test(trimmed) && trimmed.length > searchText.trim().length + 2) {
        return true;
      }

      if (typeof optionName === 'string' && trimmed === optionName.trim()) {
        return true;
      }

      return false;
    };

    await field.waitFor({ state: 'visible', timeout: 30_000 });
    const currentValue = (await field.inputValue({ timeout: 15_000 }).catch(() => '')).trim();

    if (isLinkedRecord(currentValue)) {
      return;
    }

    await field.click();
    await field.fill(searchText);

    await this.page
      .waitForResponse((response) => response.url().includes('call_kw') && response.ok())
      .catch(() => null);

    await this.page
      .locator('.ui-autocomplete-loading')
      .first()
      .waitFor({ state: 'detached', timeout: 15_000 })
      .catch(() => undefined);

    await this.page
      .locator('.ui-autocomplete:visible li')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => undefined);

    try {
      await this.interaction.selectOdooAutocompleteOption(optionName, searchText, field);
    } catch (error) {
      if (!productCode || productCode === searchText.trim()) {
        throw error;
      }

      await field.fill(productCode);
      await this.page
        .waitForResponse((response) => response.url().includes('call_kw') && response.ok())
        .catch(() => null);
      await this.page
        .locator('.ui-autocomplete:visible li')
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 })
        .catch(() => undefined);
      await this.interaction.selectOdooAutocompleteOption(optionName, searchText, field);
    }

    const finalValue = (await field.inputValue({ timeout: 5_000 }).catch(() => '')).trim();
    if (isLinkedRecord(finalValue)) {
      await field.press('Tab').catch(() => undefined);
      return;
    }

    await expect(async () => {
      const value = (await field.inputValue()).trim();
      expect(isLinkedRecord(value)).toBe(true);
    }).toPass({ timeout: 15_000 });
  }

  async openSalesModule(): Promise<void> {
    await this.interaction.openSidebarMenu(this.locators.salesModule);
    await this.waitForPageLoad();
  }

  async openQuotations(): Promise<void> {
    await this.interaction.openSidebarMenu(this.locators.quotationsMenu);
    await this.waitForPageLoad();
  }

  /** Navigate to quotations list — direct Odoo action URL (reliable after CRM login). */
  async navigateToQuotations(listPath?: string): Promise<void> {
    const path = listPath ?? this.locators.listPath;
    if (!path) {
      throw new Error('QUOTATION_PATH is not configured.');
    }

    await this.interaction.dismissBlockingDialogs();
    await this.interaction.navigateToOdooAction(path);

    const createButton = this.page
      .locator('[data-uniq="btn_sale.order_create"], button.o_list_button_add')
      .filter({ hasText: this.locators.createButton })
      .first();

    if (!(await createButton.isVisible().catch(() => false))) {
      await this.interaction.switchTopModule(/sales/i);
      await this.openQuotations();
    }

    await createButton.waitFor({ state: 'visible', timeout: 90_000 });
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

  protected activeForm(): Locator {
    return this.page.locator('.o_action_manager .o_form_view:visible').last();
  }

  private matchesMany2OneValue(current: string, option: string | RegExp): boolean {
    if (!current.trim()) {
      return false;
    }
    const pattern = typeof option === 'string' ? toLiteralRegExp(option) : option;
    return pattern.test(current.trim());
  }

  private async isSalesOrderConfirmed(): Promise<boolean> {
    if (this.page.isClosed()) {
      return false;
    }

    const form = this.activeForm();
    const title =
      ((await form.locator('h1, .oe_title').first().textContent().catch(() => '')) ?? '').trim();

    if (/^new$/i.test(title)) {
      return false;
    }

    const saleOrder = form.getByRole('radio', { name: /^sale order$/i }).first();
    if (await saleOrder.isChecked().catch(() => false)) {
      return true;
    }

    const closed = form.getByRole('radio', { name: /^closed$/i }).first();
    if (await closed.isChecked().catch(() => false)) {
      return true;
    }

    const step = form.locator(
      'button[data-value="closed"][aria-current="step"], button[data-value="sale"][aria-current="step"]'
    );

    return (await step.count().catch(() => 0)) > 0;
  }

  private async isQuotation(): Promise<boolean> {
    if (this.page.isClosed()) {
      return false;
    }

    return this.activeForm()
      .getByRole('radio', { name: /^quotation$/i })
      .isChecked()
      .catch(() => false);
  }

  private customerFieldLocator(): Locator {
    const form = this.activeForm();
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
    if (this.matchesMany2OneValue(currentValue, optionName)) {
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

  private productOptionLocator(bracketCode: string): Locator {
    return this.page
      .locator('.ui-autocomplete li:visible')
      .filter({ hasText: toLiteralRegExp(`[${bracketCode}]`) })
      .filter({ hasNotText: /search more|no search results/i })
      .first();
  }

  private async waitForProductSearchRpc(): Promise<void> {
    await this.page
      .waitForResponse(
        (response) => {
          if (!response.url().includes('call_kw') || !response.ok()) {
            return false;
          }
          const body = response.request().postData() ?? '';
          return (
            body.includes('product') &&
            (body.includes('name_search') || body.includes('web_name_search'))
          );
        },
        { timeout: 12_000 }
      )
      .catch(() => null);
  }

  private async selectProductFromAutocomplete(
    field: Locator,
    productSearch: string,
    bracketCode: string,
    productOption: string | RegExp
  ): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      await field.click();
      await field.fill('');
  
      const searchResponse = this.waitForProductSearchRpc();
  
      if (attempt === 0) {
        await field.fill(productSearch);
      } else {
        await field.pressSequentially(productSearch, { delay: 50 });
      }
  
      await searchResponse;
  
      await this.page
        .locator('.ui-autocomplete-loading')
        .first()
        .waitFor({ state: 'detached', timeout: 10_000 })
        .catch(() => undefined);
  
      try {
        const option = this.productOptionLocator(bracketCode);
  
        if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await option.click();
        } else {
          await this.interaction.selectOdooAutocompleteOption(productOption, productSearch, field);
        }
  
        await expect
          .poll(async () => (await field.inputValue().catch(() => '')).trim(), {
            timeout: 15_000,
          })
          .toContain(`[${bracketCode}]`);
  
        await field.press('Tab').catch(() => undefined);
        return;
      } catch {
        // retry search/selection
      }
    }
  
    throw new Error(`Failed to select product [${bracketCode}] from autocomplete`);
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

    const lineRow = this.page
      .locator('.o_field_one2many tbody tr')
      .filter({ has: this.page.getByRole('button', { name: /delete row/i }) })
      .last();

    const productField = lineRow.locator('input.ui-autocomplete-input').first();

    await productField.waitFor({ state: 'visible', timeout: 30_000 });

    const bracketCode =
      typeof productOption === 'string'
        ? productOption.match(/\[([^\]]+)\]/)?.[1] ?? productSearch.trim()
        : productSearch.trim();
    
    await this.selectProductFromAutocomplete(
      productField,
      productSearch,
      bracketCode,
      productOption
    );

    const qtyField = this.page
      .locator('.o_field_one2many tbody tr')
      .filter({ has: this.page.getByRole('button', { name: /delete row/i }) })
      .locator('[name="product_uom_qty"] input, input[name="product_uom_qty"]')
      .first();

    await qtyField.waitFor({ state: 'visible' });
    await qtyField.click();
    await qtyField.fill(quantity);
    await qtyField.press('Tab').catch(() => undefined);

    const selectedProduct = lineRow
      .locator('[name="product_id"] input, td[name="product_id"] input, input.ui-autocomplete-input')
      .first();

    await expect
      .poll(async () => (await selectedProduct.inputValue().catch(() => '')).trim(), {
        timeout: 15_000,
      })
      .toContain(`[${bracketCode}]`);
  }

  private async commitActiveOrderLine(): Promise<void> {
    await this.activeForm()
      .locator('h1, .oe_title')
      .first()
      .click({ timeout: 5_000 })
      .catch(() => undefined);

    await this.page
      .locator('.o_loading, .o_blockUI')
      .first()
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => undefined);
  }

  async save(): Promise<void> {
    await this.commitActiveOrderLine();
    await this.applyPendingOrderLinesIfNeeded();

    const saveButton = this.page
      .locator('.o_control_panel')
      .getByRole('button', { name: this.locators.saveButton })
      .first();

    await expect(saveButton).toBeVisible({ timeout: 15_000 });
    await expect(saveButton).toBeEnabled({ timeout: 15_000 });

    await Promise.all([
      this.page
        .waitForResponse(
          (response) => response.url().includes('call_kw') && response.request().method() === 'POST',
          { timeout: 60_000 }
        )
        .catch(() => null),
      saveButton.click({ timeout: 15_000 }),
    ]);

    await this.waitForPageLoad();
    await this.applyPendingOrderLinesIfNeeded();
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
    const approveBtn = this.page
      .locator('.o_form_view')
      .first()
      .getByRole('button', { name: this.locators.approveButton });
    await expect(approveBtn).toBeEnabled({ timeout: 30_000 });
    await approveBtn.click();
    await this.waitForPageLoad();
    await this.confirmDialogIfPresent();
  }

  private confirmOrderButton(): Locator {
    const form = this.activeForm();
    return form
      .locator('button[name="action_confirm"]:visible')
      .or(form.getByRole('button', { name: /confirm order|^confirm$/i }))
      .filter({ visible: true })
      .first();
  }

  protected async applyPendingOrderLinesIfNeeded(): Promise<void> {
    const form = this.activeForm();
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const applyButton = form
        .getByRole('button', { name: /^apply$/i })
        .filter({ visible: true })
        .first();

      if (!(await applyButton.isVisible().catch(() => false))) {
        return;
      }
      if (!(await applyButton.isEnabled().catch(() => false))) {
        return;
      }

      await applyButton.click({ timeout: 5_000 });
      await this.page
        .locator('.o_loading, .o_blockUI')
        .first()
        .waitFor({ state: 'hidden', timeout: 30_000 })
        .catch(() => undefined);
      await this.interaction.dismissBlockingDialogs();
    }
  }

  async confirmOrder(): Promise<void> {
    if (await this.isSalesOrderConfirmed()) {
      return;
    }

    await this.applyPendingOrderLinesIfNeeded();
    await this.interaction.dismissBlockingDialogs();

    const confirmButton = this.confirmOrderButton();
    await expect(confirmButton).toBeVisible({ timeout: 30_000 });
    await expect(confirmButton).toBeEnabled({ timeout: 30_000 });

    await Promise.all([
      this.page
        .waitForResponse(
          (response) => {
            const body = response.request().postData() ?? '';
            return (
              response.url().includes('call_kw') &&
              response.request().method() === 'POST' &&
              /action_confirm|confirm/i.test(body)
            );
          },
          { timeout: 90_000 }
        )
        .catch(() => null),
      confirmButton.click({ timeout: 15_000 }),
    ]);

    await this.waitForPageLoad();
    await this.confirmDialogIfPresent();
    await this.interaction.dismissBlockingDialogs();

    const confirmed = await expect
      .poll(() => this.isSalesOrderConfirmed(), { timeout: 60_000 })
      .toBe(true)
      .then(() => true)
      .catch(() => false);

    if (!confirmed) {
      const stillConfirmable = await this.confirmOrderButton().isVisible().catch(() => false);
      const quotation = await this.isQuotation();
      throw new Error(
        `Direct Sales confirm gagal: state tetap Quotation=${quotation}, confirmButtonVisible=${stillConfirmable}`
      );
    }
  }

  async expectSalesOrderConfirmed(): Promise<void> {
    const form = this.activeForm();

    try {
      await expect.poll(() => this.isSalesOrderConfirmed(), { timeout: 30_000 }).toBe(true);
    } catch {
      const confirmStillVisible = await this.confirmOrderButton().isVisible().catch(() => false);
      throw new Error(
        `Direct Sales order is not confirmed. confirmButtonVisible=${confirmStillVisible}`
      );
    }

    await expect(form.locator('h1, .oe_title').first()).not.toHaveText(/^new$/i, {
      timeout: 5_000,
    });
  }

  async expectWaitingForApproval(): Promise<void> {
    const form = this.page.locator('.o_form_view').first();
    await expect
      .poll(
        async () => {
          const waitingRadio = form.getByRole('radio', {
            name: /waiting for sale order approval/i,
          });
          if ((await waitingRadio.count()) && (await waitingRadio.isChecked())) {
            return true;
          }
          const step = form.locator(
            'button[data-value="waiting_for_approval"][aria-current="step"]'
          );
          return (await step.count()) > 0;
        },
        { timeout: 30_000 }
      )
      .toBe(true);
  }

  async expectQuotationApproved(): Promise<void> {
    const form = this.page.locator('.o_form_view').first();

    await expect
      .poll(
        async () => {
          const saleOrder = form.getByRole('radio', { name: /^sale order$/i });
          const quotation = form.getByRole('radio', { name: /^quotation approved$/i });
          if ((await saleOrder.count()) && (await saleOrder.isChecked())) {
            return true;
          }
          if ((await quotation.count()) && (await quotation.isChecked())) {
            return true;
          }
          const step = form
            .locator(
              'button[data-value="sale"][aria-current="step"], button[data-value="approved"][aria-current="step"]'
            )
            .first();
          return (await step.count()) > 0;
        },
        { timeout: 60_000 }
      )
      .toBe(true);
  }
}
