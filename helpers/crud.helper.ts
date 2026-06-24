import { Page } from '@playwright/test';
import { InteractionHelper } from './interaction.helper';

/**
 * Generic CRUD flow helpers for ERP forms.
 */
export class CrudHelper {
  private readonly interaction: InteractionHelper;

  constructor(private readonly page: Page) {
    this.interaction = new InteractionHelper(page);
  }

  async createNew(buttonName: string | RegExp = /create|add|new|buat|tambah/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async save(buttonName: string | RegExp = /save|simpan/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async edit(buttonName: string | RegExp = /edit|ubah/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async delete(buttonName: string | RegExp = /delete|hapus/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async confirm(buttonName: string | RegExp = /confirm|yes|ya|ok/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async cancel(buttonName: string | RegExp = /cancel|batal/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async fillForm(fields: Record<string, string>): Promise<void> {
    for (const [label, value] of Object.entries(fields)) {
      await this.interaction.fillInput(label, value);
    }
  }
}
