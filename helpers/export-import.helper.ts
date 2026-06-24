import { Page } from '@playwright/test';
import { InteractionHelper } from './interaction.helper';

/**
 * Reusable export/import flows for ERP modules.
 */
export class ExportImportHelper {
  private readonly interaction: InteractionHelper;

  constructor(private readonly page: Page) {
    this.interaction = new InteractionHelper(page);
  }

  async exportData(buttonName: string | RegExp = /export|ekspor/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async importData(buttonName: string | RegExp = /import/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async uploadFile(filePath: string, inputLabel?: string | RegExp): Promise<void> {
    const fileInput = inputLabel
      ? this.page.getByLabel(inputLabel)
      : this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  async confirmUpload(buttonName: string | RegExp = /upload|unggah|import/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }
}
