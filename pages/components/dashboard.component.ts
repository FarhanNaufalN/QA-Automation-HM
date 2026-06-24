import { Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Layer 1 — Universal dashboard navigation.
 */
export class DashboardComponent extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openModule(moduleName: string | RegExp): Promise<void> {
    await this.interaction.clickLink(moduleName);
    await this.waitForPageLoad();
  }

  async expectDashboardLoaded(title: string | RegExp = /dashboard|beranda|home/i): Promise<void> {
    await this.interaction.expectVisibleText(title);
  }
}
