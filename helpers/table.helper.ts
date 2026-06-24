import { Page, Locator } from '@playwright/test';

/**
 * Reusable ERP data-table operations.
 */
export class TableHelper {
  constructor(private readonly page: Page) {}

  getTable(name?: string | RegExp): Locator {
    return name
      ? this.page.getByRole('table', { name })
      : this.page.getByRole('table').first();
  }

  async search(query: string, placeholder: string | RegExp = /search/i): Promise<void> {
    await this.page.getByPlaceholder(placeholder).fill(query);
    await this.page.keyboard.press('Enter');
  }

  async clickRowAction(rowText: string, actionName: string | RegExp): Promise<void> {
    const row = this.page.getByRole('row').filter({ hasText: rowText });
    await row.getByRole('button', { name: actionName }).click();
  }

  async openRow(rowText: string): Promise<void> {
    await this.page.getByRole('row').filter({ hasText: rowText }).click();
  }

  async expectRowVisible(rowText: string | RegExp): Promise<void> {
    await this.page.getByRole('row').filter({ hasText: rowText }).waitFor({ state: 'visible' });
  }

  async getRowCount(): Promise<number> {
    const rows = this.page.getByRole('row');
    return rows.count();
  }

  async sortByColumn(columnName: string | RegExp): Promise<void> {
    await this.page.getByRole('columnheader', { name: columnName }).click();
  }
}
