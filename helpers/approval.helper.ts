import { Page } from '@playwright/test';
import { InteractionHelper } from './interaction.helper';

/**
 * Reusable approval workflow (submit → approve/reject).
 */
export class ApprovalHelper {
  private readonly interaction: InteractionHelper;

  constructor(private readonly page: Page) {
    this.interaction = new InteractionHelper(page);
  }

  async submit(buttonName: string | RegExp = /submit|ajukan/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async approve(buttonName: string | RegExp = /approve|setujui/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async reject(buttonName: string | RegExp = /reject|tolak/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async addRemark(remark: string, label: string | RegExp = /remark|catatan|notes/i): Promise<void> {
    await this.interaction.fillInput(label, remark);
  }

  async expectApprovalStatus(status: string | RegExp): Promise<void> {
    await this.interaction.expectVisibleText(status);
  }
}
