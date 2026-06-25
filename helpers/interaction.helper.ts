import { Page, Locator } from '@playwright/test';
import { getConfig } from '../utils/env';
import { toLiteralRegExp } from '../utils/regex';

/**
 * Role-based interactions — avoid hardcoded CSS selectors.
 */
export class InteractionHelper {
  constructor(private readonly page: Page) {}

  /** Close Odoo / ERP modals that block clicks (errors, list-view manager, etc.). */
  async dismissBlockingDialogs(): Promise<void> {
    if (this.page.isClosed()) {
      return;
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      if (this.page.isClosed()) {
        return;
      }

      const alert = this.page.locator('.alert, [role="alert"]').filter({ visible: true }).first();
      if ((await alert.count().catch(() => 0)) > 0) {
        const closeAlert = alert.getByRole('button', { name: /^close$/i });
        if ((await closeAlert.count().catch(() => 0)) > 0) {
          await closeAlert.first().click().catch(() => undefined);
        } else {
          await this.page.keyboard.press('Escape').catch(() => undefined);
        }
        await this.page.waitForTimeout(300).catch(() => undefined);
        continue;
      }

      const modal = this.page
        .locator('.modal.show, [role="dialog"][open], .modal.o_technical_modal.show')
        .filter({ visible: true })
        .first();

      if ((await modal.count().catch(() => 0)) === 0) {
        return;
      }

      const discardWarning = modal.getByText(/record has been modified|changes will be discarded/i);
      if ((await discardWarning.count().catch(() => 0)) > 0) {
        const cancel = modal.getByRole('button', { name: /^cancel$/i });
        if ((await cancel.count().catch(() => 0)) > 0) {
          await cancel.first().click().catch(() => undefined);
        } else {
          await this.page.keyboard.press('Escape').catch(() => undefined);
        }
        await modal.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
        continue;
      }

      const ok = modal.getByRole('button', { name: /^ok$/i });
      if ((await ok.count().catch(() => 0)) > 0) {
        await ok.first().click().catch(() => undefined);
      } else {
        const close = modal.getByRole('button', { name: /^close$/i });
        if ((await close.count().catch(() => 0)) > 0) {
          await close.first().click().catch(() => undefined);
        } else {
          await this.page.keyboard.press('Escape').catch(() => undefined);
        }
      }

      await modal.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
      await this.page.waitForTimeout(500).catch(() => undefined);
    }
  }

  async waitForListReady(): Promise<void> {
    await this.page
      .locator('.o_loading, .o_blockUI, .o_spinner')
      .first()
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => undefined);

    await this.page
      .locator('.o_list_view, .o_list_table, .o_kanban_view')
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 })
      .catch(() => undefined);
  }

  async clickButton(name: string | RegExp): Promise<void> {
    await this.dismissBlockingDialogs();
    await this.page.getByRole('button', { name }).click();
  }

  async clickLink(name: string | RegExp): Promise<void> {
    await this.page.getByRole('link', { name }).click();
  }

  async fillInput(label: string | RegExp, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  async fillPlaceholder(placeholder: string | RegExp, value: string): Promise<void> {
    await this.page.getByPlaceholder(placeholder).fill(value);
  }

  async selectOption(label: string | RegExp, value: string): Promise<void> {
    await this.page.getByLabel(label).selectOption(value);
  }

  async checkCheckbox(name: string | RegExp): Promise<void> {
    await this.page.getByRole('checkbox', { name }).check();
  }

  async clickMenuItem(name: string | RegExp): Promise<void> {
    await this.page.getByRole('menuitem', { name }).click();
  }

  async clickTab(name: string | RegExp): Promise<void> {
    await this.page.getByRole('tab', { name }).click();
  }

  /**
   * ERP sidebar / app menu — prefer visible menuitem/link, avoid dashboard widgets.
   */
  async clickMenu(name: string | RegExp): Promise<void> {
    const visibleMenuitem = this.page.getByRole('menuitem', { name }).filter({ visible: true });
    if (await visibleMenuitem.count()) {
      await visibleMenuitem.first().click();
      return;
    }

    const visibleLink = this.page.getByRole('link', { name }).filter({ visible: true });
    if (await visibleLink.count()) {
      await visibleLink.first().click();
      return;
    }

    await this.openOdooApp(name);
  }

  /** Odoo app switcher / home menu → pick app by name. */
  async openOdooApp(name: string | RegExp): Promise<void> {
    await this.dismissBlockingDialogs();

    const toggle = this.page
      .locator('.o_menu_toggle, .o_menu_apps .dropdown-toggle, .o_navbar_apps_menu button')
      .first();
    if (await toggle.isVisible()) {
      await toggle.click();
    }

    const app = this.page
      .locator('.o_app, a.o_app')
      .filter({ hasText: name })
      .filter({ visible: true })
      .first();

    if (await app.count()) {
      await app.click({ timeout: 15_000 });
      return;
    }

    await this.switchTopModule(name);
  }

  /** HashMicro top navbar module switcher (CRM → Sales, etc.). */
  async switchTopModule(moduleName: string | RegExp): Promise<void> {
    const pattern =
      typeof moduleName === 'string'
        ? new RegExp(`^${moduleName}$`, 'i')
        : new RegExp(
            `^${moduleName.source.replace(/^\^|\$/g, '')}$`,
            moduleName.flags.replace(/g/g, '')
          );

    const toggle = this.page
      .locator('p')
      .filter({ hasText: /^(CRM|Sales|Inventory|Purchasing)$/i })
      .first();

    if (!(await toggle.count())) {
      return;
    }

    const current = ((await toggle.textContent()) ?? '').trim();
    if (pattern.test(current)) {
      return;
    }

    await toggle.click();
    await this.page.waitForTimeout(500);

    const item = this.page
      .getByRole('menuitem', { name: pattern })
      .filter({ visible: true })
      .first();
    await item.click({ timeout: 15_000 });
    await this.page.waitForTimeout(2_000);
  }

  private menuPatternToSearchLabel(name: string | RegExp): string {
    if (typeof name === 'string') {
      return name;
    }
    return (
      name.source
        .replace(/^\^|\$$/g, '')
        .replace(/\\(.)/g, '$1')
        .split('|')[0]
        .trim() || 'Sales'
    );
  }

  /** Fill missing or empty cids/bids from the current Odoo session URL. */
  resolveOdooSessionPath(relativePath: string): string {
    const currentUrl = this.page.url();
    const sessionCids = decodeURIComponent(currentUrl.match(/cids=([^&]+)/)?.[1] ?? '');
    const sessionBids = currentUrl.match(/bids=([^&]+)/)?.[1] ?? '';
    let path = relativePath;

    const needsCids =
      sessionCids &&
      (!path.includes('cids=') || /cids=(?:&|$)/.test(path));
    if (needsCids) {
      path = path.includes('cids=')
        ? path.replace(/cids=[^&]*/, `cids=${sessionCids}`)
        : path.replace('#', `#cids=${sessionCids}&`);
    }

    const needsBids =
      sessionBids &&
      (!path.includes('bids=') || /bids=(?:&|$)/.test(path));
    if (needsBids) {
      path = path.includes('bids=')
        ? path.replace(/bids=[^&]*/, `bids=${sessionBids}`)
        : path.replace('#', `#bids=${sessionBids}&`);
    }

    return path;
  }

  /** Navigate to an Odoo action URL (hash routing) reliably. */
  async navigateToOdooAction(relativePath: string): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);

    const path = this.resolveOdooSessionPath(relativePath);
    const { baseUrl } = getConfig();
    const hash = path.includes('#') ? path.slice(path.indexOf('#') + 1) : path;
    const url = `${baseUrl}/web#${hash}`;

    const actionId = path.match(/action=(\d+)/)?.[1];
    const model = decodeURIComponent(path.match(/model=([^&]+)/)?.[1] ?? '');
    const targetPattern =
      actionId && model
        ? new RegExp(`action=${actionId}.*model=${model.replace('.', '\\.')}`)
        : actionId
          ? new RegExp(`action=${actionId}`)
          : /\/web#/;

    for (let attempt = 0; attempt < 5; attempt++) {
      // Teazzitea often ignores the first hash navigation right after login.
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(1_500);
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });

      try {
        await this.page.waitForURL(targetPattern, { timeout: 25_000 });
        await this.page.waitForTimeout(1_500);

        const currentUrl = this.page.url();
        const bouncedToHome =
          /mail\.activity|action=5525|view_type=calendar/i.test(currentUrl) ||
          (actionId !== undefined && !currentUrl.includes(`action=${actionId}`));

        if (!bouncedToHome) {
          break;
        }
      } catch {
        // Retry with another double-goto cycle.
      }

      if (attempt === 4) {
        throw new Error(`Failed to open Odoo action. Expected ${path}, got ${this.page.url()}`);
      }

      await this.page.waitForTimeout(1_500);
    }

    await this.page
      .locator('.o_loading, .o_blockUI, .o_spinner')
      .first()
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => undefined);

    await this.dismissBlockingDialogs();
  }

  /** Expand Odoo left sidebar if collapsed. */
  async ensureSidebarOpen(): Promise<void> {
    const toggle = this.page.locator('.o_menu_toggle').first();
    if (await toggle.isVisible()) {
      await toggle.click();
      await this.page
        .locator('.o_menu_sections')
        .waitFor({ state: 'visible', timeout: 5_000 })
        .catch(() => undefined);
    }
  }

  /** Search & click item in Odoo sidebar menu. */
  async openSidebarMenu(name: string | RegExp): Promise<void> {
    await this.ensureSidebarOpen();

    const label = this.menuPatternToSearchLabel(name);

    const search = this.page.locator('input[placeholder*="Search" i]').filter({ visible: true }).first();
    if (await search.count()) {
      await search.click();
      await search.fill(label);
      const result = this.page.getByRole('menuitem', { name }).filter({ visible: true }).first();
      await result.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
      if (await result.count()) {
        await result.click();
        return;
      }
    }

    const menuitem = this.page.getByRole('menuitem', { name }).filter({ visible: true });
    if (await menuitem.count()) {
      await menuitem.first().click();
      return;
    }

    const isSalesNav =
      (typeof name === 'string' && /sales/i.test(name)) ||
      (name instanceof RegExp && /sales/i.test(name.source));

    if (isSalesNav) {
      await this.switchTopModule(/sales/i);
      const salesItem = this.page.getByRole('menuitem', { name }).filter({ visible: true });
      if (await salesItem.count()) {
        await salesItem.first().click();
        return;
      }
    }

    await this.openOdooApp(name);
  }

  /**
   * Many2one / autocomplete (Odoo-style): type search text, pick option.
   */
  async selectAutocomplete(
    fieldLabel: string | RegExp,
    searchText: string,
    optionName: string | RegExp
  ): Promise<void> {
    const field = this.page.getByLabel(fieldLabel);
    await field.click();
    await field.fill(searchText);
    await this.page.getByRole('option', { name: optionName }).click();
  }

  /**
   * Odoo many2one / ui-autocomplete dropdown item.
   */
  async selectOdooAutocompleteOption(
    optionName: string | RegExp,
    searchText?: string,
    field?: Locator
  ): Promise<void> {
    const patterns: RegExp[] = [];

    if (typeof optionName === 'string') {
      patterns.push(toLiteralRegExp(optionName));

      const bracketFromName = optionName.match(/\[([^\]]+)\]/)?.[1];
      const code = bracketFromName ?? optionName.trim();
      if (code) {
        patterns.push(toLiteralRegExp(`[${code}]`));
      }

      if (searchText?.trim()) {
        patterns.push(toLiteralRegExp(`[${searchText.trim()}]`));
      }
    } else {
      patterns.push(optionName);
    }

    await this.page
      .locator('.ui-autocomplete-loading')
      .first()
      .waitFor({ state: 'detached', timeout: 15_000 })
      .catch(() => undefined);

    for (const pattern of patterns) {
      const item = this.page
        .locator('.ui-autocomplete li a, .ui-autocomplete li')
        .filter({ hasText: pattern })
        .filter({ visible: true })
        .first();

      if (await item.isVisible().catch(() => false)) {
        await item.click();
        return;
      }
    }

    const firstItem = this.page
      .locator('.ui-autocomplete:visible li')
      .filter({ hasNotText: /search more/i })
      .first();

    if (await firstItem.isVisible().catch(() => false)) {
      await firstItem.click();
      return;
    }

    const targetField =
      field ??
      this.page.locator('input.ui-autocomplete-input:focus').first();

    if (await targetField.count()) {
      await targetField.click();
      await targetField.press('ArrowDown');
      await this.page
        .locator('.ui-autocomplete:visible li')
        .first()
        .waitFor({ state: 'visible', timeout: 5_000 })
        .catch(() => undefined);

      for (const pattern of patterns) {
        const item = this.page
          .locator('.ui-autocomplete li a, .ui-autocomplete li')
          .filter({ hasText: pattern })
          .filter({ visible: true })
          .first();

        if (await item.isVisible().catch(() => false)) {
          await item.click();
          return;
        }
      }

      await targetField.press('Enter');
      return;
    }

    throw new Error(`No Odoo autocomplete option found for ${String(optionName)}`);
  }

  /** Pick the first visible Odoo autocomplete / many2many tag option. */
  async selectFirstOdooAutocompleteOption(): Promise<void> {
    const item = this.page
      .locator('.ui-autocomplete li:visible a, .ui-autocomplete li:visible')
      .or(
        this.page
          .getByRole('listitem')
          .filter({ hasNotText: /search more|start typing/i })
      )
      .filter({ visible: true })
      .first();

    await item.waitFor({ state: 'visible', timeout: 15_000 });
    await item.click();
  }

  async expectVisibleText(text: string | RegExp): Promise<void> {
    await this.page.getByText(text).first().waitFor({ state: 'visible' });
  }

  locatorByRole(
    role: Parameters<Page['getByRole']>[0],
    options?: Parameters<Page['getByRole']>[1]
  ): Locator {
    return this.page.getByRole(role, options);
  }
}
