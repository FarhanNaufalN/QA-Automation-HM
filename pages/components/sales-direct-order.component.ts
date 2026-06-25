import { Page } from '@playwright/test';
import {
  SalesQuotationComponent,
  type SalesQuotationLocators,
} from './sales-quotation.component';

export interface SalesDirectOrderLocators extends SalesQuotationLocators {
  directSalesMenu: string | RegExp;
  listPath?: string;
}

const DEFAULT_LOCATORS: SalesDirectOrderLocators = {
  listPath: '/web#action=6033&model=sale.order&view_type=list&cids=1,40,82&bids=1&menu_id=3441',
  salesModule: /sales/i,
  quotationsMenu: /direct sales/i,
  directSalesMenu: /^direct sales$/i,
  createButton: /create/i,
  customerField: /customer/i,
  orderLinesTab: /order lines/i,
  addProductButton: /add a product/i,
  saveButton: /save/i,
  savedIndicator: /direct sales|sales order/i,
  requestApprovalButton: /request for approval/i,
  approveButton: /^approve$/i,
  waitingApprovalStatus: /waiting for sale order approval/i,
  approvedStatus: /sale order/i,
};

/**
 * Layer 1 — Direct Sales (sale.order) on Teazzitea.
 */
export class SalesDirectOrderComponent extends SalesQuotationComponent {
  constructor(
    page: Page,
    private readonly directLocators: SalesDirectOrderLocators = DEFAULT_LOCATORS
  ) {
    super(page, directLocators);
  }

  private createButtonLocator() {
    return this.page
      .locator('.o_control_panel .o_list_button_add, [data-uniq="btn_sale.order_create"]')
      .or(this.page.getByRole('button', { name: this.directLocators.createButton }))
      .filter({ visible: true })
      .first();
  }

  async navigateToDirectSales(listPath?: string): Promise<void> {
    const path = listPath ?? this.directLocators.listPath;
    if (!path) {
      throw new Error('DIRECT_SALES_PATH is not configured.');
    }

    await this.interaction.dismissBlockingDialogs();
    await this.page.waitForTimeout(2_000);
    await this.interaction.navigateToOdooAction(path);

    const createButton = this.createButtonLocator();
    await createButton.waitFor({ state: 'visible', timeout: 90_000 });
    await this.interaction.waitForListReady();
  }

  async clickCreate(): Promise<void> {
    await this.interaction.waitForListReady();
    await this.interaction.dismissBlockingDialogs();

    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.locator('.o_action_manager').click({ position: { x: 5, y: 5 } }).catch(() => undefined);

    const createButton = this.page
      .locator('[data-uniq="btn_sale.order_create"], button.o_list_button_add')
      .or(this.page.getByRole('button', { name: this.directLocators.createButton }))
      .first();

    await createButton.waitFor({ state: 'visible', timeout: 60_000 });

    const customerInput = this.page.getByRole('textbox', { name: /^customer$/i }).first();

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.interaction.dismissBlockingDialogs();

      try {
        await createButton.click({ timeout: 15_000 });
      } catch {
        await createButton.click({ force: true, timeout: 15_000 });
      }

      try {
        await customerInput.waitFor({ state: 'visible', timeout: 20_000 });
        return;
      } catch {
        if (attempt === 2) {
          throw new Error('Create did not open the Direct Sales form.');
        }
        await this.page.waitForTimeout(1_500);
      }
    }
  }

  async selectJournal(searchText: string, optionName: string | RegExp): Promise<void> {
    if (!searchText?.trim() || !optionName || (typeof optionName === 'string' && !optionName.trim())) {
      return;
    }

    const field = this.page
      .getByRole('textbox', { name: /^journal$/i })
      .or(this.page.locator('[name="journal_id"] input, [name="journal_id"] textarea'))
      .first();

    if (!(await field.count())) {
      return;
    }

    await this.fillMany2One(field, searchText, optionName);
    await field.press('Tab').catch(() => undefined);
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  async expectDirectOrderSaved(): Promise<void> {
    await this.expectQuotationSaved();
  }
}
