import { Page } from '@playwright/test';
import {
  InteractionHelper,
  TableHelper,
  FilterHelper,
  CrudHelper,
  ApprovalHelper,
  ExportImportHelper,
} from '../helpers';

/**
 * Layer 1 — Base page with all generic ERP helpers.
 */
export class BasePage {
  readonly interaction: InteractionHelper;
  readonly table: TableHelper;
  readonly filter: FilterHelper;
  readonly crud: CrudHelper;
  readonly approval: ApprovalHelper;
  readonly exportImport: ExportImportHelper;

  constructor(protected readonly page: Page) {
    this.interaction = new InteractionHelper(page);
    this.table = new TableHelper(page);
    this.filter = new FilterHelper(page);
    this.crud = new CrudHelper(page);
    this.approval = new ApprovalHelper(page);
    this.exportImport = new ExportImportHelper(page);
  }

  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page
      .locator('.o_loading, .o_blockUI, .o_spinner')
      .first()
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => undefined);
  }
}
