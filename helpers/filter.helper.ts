import { Page } from '@playwright/test';
import { InteractionHelper } from './interaction.helper';

/**
 * Reusable ERP list/filter panel operations.
 */
export class FilterHelper {
  private readonly interaction: InteractionHelper;

  constructor(private readonly page: Page) {
    this.interaction = new InteractionHelper(page);
  }

  async openFilterPanel(buttonName: string | RegExp = /filter/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async applyFilter(): Promise<void> {
    await this.interaction.clickButton(/apply|terapkan/i);
  }

  async resetFilter(): Promise<void> {
    await this.interaction.clickButton(/reset|clear|bersihkan/i);
  }

  async setDateRange(fromLabel: string | RegExp, from: string, toLabel: string | RegExp, to: string): Promise<void> {
    await this.interaction.fillInput(fromLabel, from);
    await this.interaction.fillInput(toLabel, to);
  }

  async selectFilterOption(label: string | RegExp, value: string): Promise<void> {
    await this.interaction.selectOption(label, value);
  }
}
