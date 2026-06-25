import { Page, expect, type Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { toLiteralRegExp } from '../../utils/regex';

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
  private lastProductSearch = '';

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
      typeof optionName === 'string' ? toLiteralRegExp(optionName) : optionName;

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

    await this.interaction.dismissBlockingDialogs();
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(6_000);
    await this.interaction.dismissBlockingDialogs();

    if (!(await this.createButtonLocator().isVisible().catch(() => false))) {
      await this.interaction.switchTopModule(/sales/i);
      await this.page.waitForTimeout(2_000);
      await this.page.goto(path, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(6_000);
    }

    if (!(await this.createButtonLocator().isVisible().catch(() => false))) {
      try {
        await this.interaction.openSidebarMenu(/blanket orders/i);
        await this.page.waitForTimeout(4_000);
      } catch {
        // no-op — final wait below will surface a clear error
      }
    }

    await this.createButtonLocator().waitFor({ state: 'visible', timeout: 90_000 });
    await this.interaction.waitForListReady();
  }

  private createButtonLocator(): Locator {
    return this.page
      .locator('[data-uniq="btn_saleblanket.saleblanket_create"], button.o_list_button_add')
      .first();
  }

  private activeForm(): Locator {
    return this.page.locator('.o_action_manager .o_form_view').first();
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

  private orderLineRowLocator(): Locator {
    return this.page
      .locator('[name="order_line_ids"] .o_field_one2many tbody tr, .o_field_one2many tbody tr')
      .filter({ has: this.page.getByRole('button', { name: /delete row/i }) })
      .last();
  }

  private async orderLineAnalyticGroupField(): Promise<Locator> {
    const lineRow = this.orderLineRowLocator();
    const taggedField = lineRow.locator(
      '[data-uniq="input_field_orderline.orderline_analytic_tag_ids"], [name="analytic_tag_ids"] input'
    );
    if (await taggedField.count()) {
      return taggedField.first();
    }

    const namedField = lineRow.locator('[name="analytic_group_id"] input, [name*="analytic"] input').first();
    if (await namedField.count()) {
      return namedField;
    }

    const table = this.page.locator('[name="order_line_ids"] table, .o_field_one2many table').first();
    const headers = table.locator('thead th');
    const headerCount = await headers.count();

    for (let i = 0; i < headerCount; i++) {
      const text = ((await headers.nth(i).innerText().catch(() => '')) ?? '').trim();
      if (/analytic group/i.test(text)) {
        return lineRow.locator('td').nth(i).locator('input, textarea').first();
      }
    }

    return lineRow.locator('input, textarea').last();
  }

  private analyticGroupCell(field: Locator): Locator {
    return field.locator('xpath=ancestor::td[1]');
  }

  private async hasAnalyticGroupSelected(field: Locator): Promise<boolean> {
    const cell = this.analyticGroupCell(field);
    if (await cell.locator('.o_tag, .badge, .o_badge').count()) {
      return true;
    }

    const text = ((await cell.innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
    return text.length > 0 && !/^analytic group$/i.test(text);
  }

  private async cancelDiscardWarningIfPresent(): Promise<void> {
    const modal = this.page.locator('.modal.show').filter({
      hasText: /record has been modified|changes will be discarded/i,
    });

    if (await modal.isVisible().catch(() => false)) {
      await modal.getByRole('button', { name: /^cancel$/i }).first().click();
      await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
    }
  }

  private async selectAnalyticTagOption(
    field: Locator,
    searchText = 'Bali',
    optionName: string | RegExp = /Bali Branch/i
  ): Promise<boolean> {
    await this.cancelDiscardWarningIfPresent();

    if (!(await field.isEnabled().catch(() => false))) {
      return false;
    }

    await field.scrollIntoViewIfNeeded();
    await field.click();
    await field.fill(searchText);

    await this.page
      .waitForResponse((r) => r.url().includes('call_kw') && r.ok(), { timeout: 10_000 })
      .catch(() => null);

    await this.page
      .locator('.ui-autocomplete-loading')
      .first()
      .waitFor({ state: 'detached', timeout: 10_000 })
      .catch(() => undefined);

    const option = this.page
      .locator('.ui-autocomplete li:visible, .ui-autocomplete li a:visible')
      .filter({ hasText: optionName })
      .filter({ hasNotText: /search more|start typing|no results/i })
      .first();

    if (!(await option.isVisible({ timeout: 10_000 }).catch(() => false))) {
      return false;
    }

    await option.click();
    return true;
  }

  private async fillHeaderAnalyticGroup(): Promise<void> {
    const form = this.page.locator('.o_form_view').first();
    const field = form.getByRole('textbox', { name: /^analytic group$/i }).first();
    if (!(await field.count())) {
      return;
    }
    if (await this.hasAnalyticGroupSelected(field)) {
      return;
    }

    const filled = await this.selectAnalyticTagOption(field);
    if (!filled) {
      return;
    }

    await expect.poll(() => this.hasAnalyticGroupSelected(field), { timeout: 15_000 }).toBe(true);
    await field.press('Tab').catch(() => undefined);
  }

  private async fillAnalyticGroupOnLine(): Promise<void> {
    const lineRow = this.orderLineRowLocator();
    await lineRow.scrollIntoViewIfNeeded();

    const analyticField = await this.orderLineAnalyticGroupField();
    await analyticField.waitFor({ state: 'visible', timeout: 30_000 });

    if (await this.hasAnalyticGroupSelected(analyticField)) {
      return;
    }

    if (await analyticField.isEnabled().catch(() => false)) {
      const filled = await this.selectAnalyticTagOption(analyticField);
      if (filled) {
        await expect.poll(() => this.hasAnalyticGroupSelected(analyticField), { timeout: 15_000 }).toBe(true);
        await analyticField.press('Tab').catch(() => undefined);
        return;
      }
    }

    await this.fillHeaderAnalyticGroup();
    await this.interaction.dismissBlockingDialogs();
  }

  private async selectOdooAutocompleteByIndex(searchText: string, index: number): Promise<void> {
    const options = this.page.locator('.ui-autocomplete li:visible a, .ui-autocomplete li:visible');
    await options.first().waitFor({ state: 'visible', timeout: 15_000 });
    const count = await options.count();
    await options.nth(Math.min(index, count - 1)).click();
  }

  private async changeProductLineAlternative(productSearch: string, attempt: number): Promise<void> {
    await this.openOrderLinesTab();
    const lineRow = this.orderLineRowLocator();
    const productField = lineRow.locator('input.ui-autocomplete-input, [name="product_id"] input').first();

    await productField.click();
    await productField.fill('');
    await productField.fill(productSearch);

    await this.page
      .waitForResponse((response) => response.url().includes('call_kw') && response.ok())
      .catch(() => null);

    await this.selectOdooAutocompleteByIndex(productSearch, attempt);
    await this.fillAnalyticGroupOnLine();
  }

  async addProductLine(
    productSearch: string,
    productOption: string | RegExp,
    quantity: string
  ): Promise<void> {
    this.lastProductSearch = productSearch;
    await this.openOrderLinesTab();

    const addButton = this.page.getByRole('button', { name: this.locators.addLineButton });
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();
    await this.page.waitForTimeout(1_000);

    const lineRow = this.orderLineRowLocator();
    const productField = lineRow
      .locator('input.ui-autocomplete-input, [name="product_id"] input')
      .first();

    await productField.waitFor({ state: 'visible', timeout: 30_000 });
    await this.fillMany2One(productField, productSearch, productOption);

    // Fill analytic while the line row is still editable (Tab on qty locks the row).
    await this.fillAnalyticGroupOnLine();

    const qtyField = lineRow.locator('input[name="quantity"]').first();
    if (await qtyField.count()) {
      const currentQty = (await qtyField.inputValue()).trim();
      if (!currentQty || currentQty === '0' || currentQty === '0.00') {
        await qtyField.click();
        await qtyField.fill(quantity);
      }
      await qtyField.press('Tab').catch(() => undefined);
    }

    await this.interaction.dismissBlockingDialogs();
  }

  private formatUsDate(date: Date): string {
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  }

  private async isNewBlanketOrder(): Promise<boolean> {
    if (/id=&|id=false/i.test(this.page.url())) {
      return true;
    }
    return this.page.getByRole('heading', { name: /^new$/i }).isVisible().catch(() => false);
  }

  private generateUniqueDates(attempt = 0): { startDate: string; endDate: string } {
    // Hindari duplikat BO: offset besar + jitter ms + attempt agar unik tiap run/retry
    const offsetDays = 120 + ((Date.now() % 1_000_000) + attempt * 17_371) % 2_400;
    const start = new Date();
    start.setDate(start.getDate() + offsetDays);
    const end = new Date(start);
    end.setDate(end.getDate() + 31 + (attempt % 7));

    return { startDate: this.formatUsDate(start), endDate: this.formatUsDate(end) };
  }

  /** Set Start/End Date unik — panggil setelah selectCustomer, sebelum save. */
  async applyUniqueDates(attempt = 0): Promise<void> {
    const { startDate, endDate } = this.generateUniqueDates(attempt);
    await this.setStartDate(startDate, endDate);
  }

  private async fillUniqueDateRange(attempt = 0): Promise<void> {
    const { startDate, endDate } = this.generateUniqueDates(attempt);
    await this.setStartDate(startDate, endDate);
  }

  private async ensureMandatoryFields(): Promise<void> {
    const startDate = this.page.getByRole('textbox', { name: /^start date$/i }).first();
    const val = (await startDate.inputValue().catch(() => '')).trim();
    if (!val) {
      await this.fillUniqueDateRange();
    }
  }

  private saveButton(): Locator {
    return this.page
      .locator('.o_control_panel [data-uniq="btn_saleblanket.saleblanket_save"]')
      .or(this.page.locator('.o_control_panel').getByRole('button', { name: this.locators.saveButton }))
      .filter({ visible: true })
      .first();
  }

  private async dismissOpenOverlays(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page
      .locator('.o_action_manager')
      .click({ position: { x: 8, y: 8 }, force: true })
      .catch(() => undefined);
    await this.interaction.dismissBlockingDialogs();
  }

  private async editAndRefreshForDuplicate(attempt = 1): Promise<void> {
    await this.dismissOpenOverlays();

    const saveButton = this.saveButton();
    const inEditMode = await saveButton.isVisible().catch(() => false);

    if (!inEditMode) {
      await this.activeForm()
        .getByRole('button', { name: /^edit$/i })
        .filter({ visible: true })
        .first()
        .click();
      await this.waitForForm();
    }

    await this.fillUniqueDateRange(attempt);

    if (this.lastProductSearch) {
      await this.changeProductLineAlternative(this.lastProductSearch, attempt);
    }

    await this.save();
    await this.expectBlanketOrderSaved();
  }

  async save(): Promise<void> {
    await this.ensureMandatoryFields();
    await this.dismissOpenOverlays();
    await this.page
      .locator('.blockUI.blockOverlay')
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => undefined);

    const saveButton = this.saveButton();
    await expect(saveButton).toBeVisible({ timeout: 15_000 });
    await expect(saveButton).toBeEnabled({ timeout: 15_000 });

    const saveResponse = this.page
      .waitForResponse(
        (response) =>
          response.url().includes('call_kw') &&
          response.request().method() === 'POST' &&
          (response.request().postData() ?? '').includes('web_save'),
        { timeout: 60_000 }
      )
      .catch(() => null);

    await saveButton.click();
    await saveResponse;
    await this.interaction.dismissBlockingDialogs();
  }

  async expectBlanketOrderSaved(): Promise<void> {
    await expect(this.page.getByText('Invalid fields:')).not.toBeVisible();

    await expect
      .poll(async () => {
        if (/id=\d+/.test(this.page.url())) return true;
        const heading = ((await this.page.locator('h1').first().textContent()) ?? '').trim();
        return heading.length > 0 && !/^new$/i.test(heading);
      }, { timeout: 60_000 })
      .toBe(true);
  }

  private async confirmDialogIfPresent(): Promise<void> {
    const modal = this.page.locator('.modal.show').filter({ visible: true }).first();
    if (!(await modal.isVisible().catch(() => false))) {
      return;
    }

    const confirm = modal.getByRole('button', { name: /confirm|yes|ok|ya/i });
    if (await confirm.count()) {
      await confirm.first().click().catch(() => undefined);
      await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
    }
  }

  private async isWaitingForApproval(): Promise<boolean> {
    const form = this.activeForm();

    if (
      await form
        .getByRole('button', { name: this.locators.approveButton })
        .filter({ visible: true })
        .count()
    ) {
      return true;
    }

    const activeStatus = form.locator('[role="radio"][aria-checked="true"]').first();
    if (await activeStatus.count()) {
      const label =
        (await activeStatus.getAttribute('aria-label')) ??
        (await activeStatus.textContent()) ??
        '';
      if (/waiting for approval/i.test(label.trim())) {
        return true;
      }
    }

    const waiting = form.getByRole('radio', { name: /waiting for approval/i }).first();
    if (await waiting.isChecked().catch(() => false)) {
      return true;
    }

    return (await form.locator('[data-value="to_approve"][aria-current="step"]').count()) > 0;
  }

  private async dismissDuplicateBlanketModal(): Promise<boolean> {
    const validationModal = this.page.locator('.modal.show').filter({
      hasText: /validation error|matches existing blanket order/i,
    });

    if (!(await validationModal.isVisible().catch(() => false))) {
      return false;
    }

    await validationModal.getByRole('button', { name: /^ok$/i }).first().click();
    await validationModal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
    return true;
  }

  private requestApprovalButton(): Locator {
    return this.activeForm()
      .locator('[data-uniq="btn_header_saleblanket.saleblanket_action_request_for_approval_bo"]')
      .or(this.activeForm().getByRole('button', { name: this.locators.requestApprovalButton }))
      .filter({ visible: true })
      .first();
  }

  async requestForApproval(): Promise<void> {
    if (await this.isWaitingForApproval()) {
      return;
    }

    if (await this.dismissDuplicateBlanketModal()) {
      await this.editAndRefreshForDuplicate(1);
    }

    await this.dismissOpenOverlays();

    const requestBtn = this.requestApprovalButton();
    await expect(requestBtn).toBeVisible({ timeout: 15_000 });
    await expect(requestBtn).toBeEnabled({ timeout: 15_000 });

    await Promise.all([
      this.page
        .waitForResponse(
          (response) => {
            if (!response.url().includes('call_kw') || response.request().method() !== 'POST') {
              return false;
            }
            const body = response.request().postData() ?? '';
            return /request_for_approval|action_request/i.test(body);
          },
          { timeout: 90_000 }
        )
        .catch(() => null),
      requestBtn.click({ timeout: 15_000 }),
    ]);

    await this.confirmDialogIfPresent();
    await this.dismissOpenOverlays();

    if (await this.dismissDuplicateBlanketModal()) {
      throw new Error(
        'Request For Approval gagal: data duplikat (Customer + Start Date + End Date + Product). ' +
          'Ubah tanggal/produk atau hapus BO lama di server.'
      );
    }

    await expect.poll(() => this.isWaitingForApproval(), { timeout: 60_000 }).toBe(true);
  }

  async approve(): Promise<void> {
    const approveBtn = this.activeForm()
      .getByRole('button', { name: this.locators.approveButton })
      .filter({ visible: true })
      .first();
    await approveBtn.waitFor({ state: 'visible', timeout: 60_000 });

    const saveResponse = this.page
      .waitForResponse(
        (response) => response.url().includes('call_kw') && response.request().method() === 'POST',
        { timeout: 90_000 }
      )
      .catch(() => null);

    await approveBtn.click();
    await saveResponse;
    await this.waitForPageLoad();
    await this.confirmDialogIfPresent();
    await this.interaction.dismissBlockingDialogs();
  }

  async expectWaitingForApproval(): Promise<void> {
    await expect.poll(() => this.isWaitingForApproval(), { timeout: 60_000 }).toBe(true);
  }

  async expectBlanketOrderApproved(): Promise<void> {
    const form = this.activeForm();

    await expect
      .poll(
        async () => {
          const activeStatus = form.locator('[role="radio"][aria-checked="true"]').first();
          if (await activeStatus.count()) {
            const label =
              (await activeStatus.getAttribute('aria-label')) ??
              (await activeStatus.textContent()) ??
              '';
            if (/^(running|confirmed)$/i.test(label.trim())) {
              return label.trim().toLowerCase();
            }
          }

          const running = form.getByRole('radio', { name: /^running$/i }).first();
          if (await running.isChecked().catch(() => false)) {
            return 'running';
          }

          const confirmed = form.getByRole('radio', { name: /^confirmed$/i }).first();
          if (await confirmed.isChecked().catch(() => false)) {
            return 'confirmed';
          }

          return '';
        },
        { timeout: 120_000 }
      )
      .not.toBe('');
  }

  async setStartDate(date: string, endDate?: string): Promise<void> {
    const startField = this.page.getByRole('textbox', { name: /^start date$/i }).first();
    await startField.waitFor({ state: 'visible', timeout: 30_000 });
    await startField.scrollIntoViewIfNeeded();
    await startField.click();
    await startField.fill(date);
    await startField.press('Tab').catch(() => undefined);

    if (endDate) {
      const endField = this.page.getByRole('textbox', { name: /^end date$/i }).first();
      await endField.click();
      await endField.fill(endDate);
      await endField.press('Tab').catch(() => undefined);
    }

    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.interaction.dismissBlockingDialogs();
  }

  /** @deprecated Use setStartDate — blanket order has Start/End Date, not validity_date */
  async setOrderDate(date: string): Promise<void> {
    await this.setStartDate(date);
  }
  
  async expectDuplicateValidationModal(): Promise<void> {
    const modal = this.page.locator('.modal.show').filter({
      hasText: /matches existing blanket order|validation error/i,
    });
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(this.page).not.toHaveURL(/id=\d+/);   // record TIDAK tersimpan
  }
  
}
