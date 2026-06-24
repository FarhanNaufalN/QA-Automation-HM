import { Page, Locator } from '@playwright/test';

/**
 * Role-based interactions — avoid hardcoded CSS selectors.
 */
export class InteractionHelper {
  constructor(private readonly page: Page) {}

  /** Close Odoo / ERP modals that block clicks (errors, list-view manager, etc.). */
  async dismissBlockingDialogs(): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const modal = this.page
        .locator('.modal.show, [role="dialog"][open], .modal.o_technical_modal.show')
        .filter({ visible: true })
        .first();

      if (!(await modal.count())) {
        return;
      }

      const discardWarning = modal.getByText(/record has been modified|changes will be discarded/i);
      if (await discardWarning.count()) {
        const cancel = modal.getByRole('button', { name: /^cancel$/i });
        if (await cancel.count()) {
          await cancel.first().click();
        } else {
          await this.page.keyboard.press('Escape');
        }
        await modal.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
        continue;
      }

      const ok = modal.getByRole('button', { name: /^ok$/i });
      if (await ok.count()) {
        await ok.first().click();
      } else {
        const close = modal.getByRole('button', { name: /^close$/i });
        if (await close.count()) {
          await close.first().click();
        } else {
          await this.page.keyboard.press('Escape');
        }
      }

      await modal.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
      await this.page.waitForTimeout(500);
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
    await app.click({ timeout: 15_000 });
  }

  /** HashMicro top navbar module switcher (CRM → Sales, etc.). */
  async switchTopModule(moduleName: string | RegExp): Promise<void> {
    const pattern =
      typeof moduleName === 'string' ? new RegExp(`^${moduleName}$`, 'i') : moduleName;
    const toggle = this.page.locator('p').filter({ hasText: /^(CRM|Sales|Inventory|Purchasing)$/i }).first();

    if (await toggle.count()) {
      const current = ((await toggle.textContent()) ?? '').trim();
      if (pattern.test(current)) {
        return;
      }
      await toggle.click();
      await this.page.getByRole('menuitem', { name: pattern }).first().click();
      await this.page.waitForTimeout(2_000);
    }
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

    const label = typeof name === 'string' ? name : 'Sales';

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
  async selectOdooAutocompleteOption(optionName: string | RegExp): Promise<void> {
    const item = this.page
      .locator('.ui-autocomplete li a, .ui-autocomplete li')
      .filter({ hasText: optionName })
      .filter({ visible: true })
      .first();

    await item.waitFor({ state: 'visible', timeout: 15_000 });
    await item.click();
  }

  /** Pick the first visible Odoo autocomplete / dropdown option. */
  async selectFirstOdooAutocompleteOption(): Promise<void> {
    const item = this.page
      .locator('.ui-autocomplete li:visible a, .ui-autocomplete li:visible')
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
