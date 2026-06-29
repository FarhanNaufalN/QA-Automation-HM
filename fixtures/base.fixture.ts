import { test as base } from '@playwright/test';
import { LoginComponent, DashboardComponent, SalesQuotationComponent, SalesBlanketOrderComponent, SalesDirectOrderComponent } from '../pages';
import {
  CrudHelper,
  ApprovalHelper,
  TableHelper,
  FilterHelper,
  ExportImportHelper,
} from '../helpers';
import { getConfig, type ProjectConfig } from '../utils/env';

type FrameworkFixtures = {
  config: ProjectConfig;
  login: LoginComponent;
  dashboard: DashboardComponent;
  salesQuotation: SalesQuotationComponent;
  salesBlanketOrder: SalesBlanketOrderComponent;
  salesDirectOrder: SalesDirectOrderComponent;
  crud: CrudHelper;
  approval: ApprovalHelper;
  table: TableHelper;
  filter: FilterHelper;
  exportImport: ExportImportHelper;
  authenticatedPage: void;
};

export const test = base.extend<FrameworkFixtures>({
  config: async ({}, use) => {
    await use(getConfig());
  },

  login: async ({ page }, use) => {
    await use(new LoginComponent(page));
  },

  dashboard: async ({ page }, use) => {
    await use(new DashboardComponent(page));
  },

  salesQuotation: async ({ page }, use) => {
    await use(new SalesQuotationComponent(page));
  },

  salesBlanketOrder: async ({ page }, use) => {
    await use(new SalesBlanketOrderComponent(page));
  },

  salesDirectOrder: async ({ page }, use) => {
    await use(new SalesDirectOrderComponent(page));
  },

  crud: async ({ page }, use) => {
    await use(new CrudHelper(page));
  },

  approval: async ({ page }, use) => {
    await use(new ApprovalHelper(page));
  },

  table: async ({ page }, use) => {
    await use(new TableHelper(page));
  },

  filter: async ({ page }, use) => {
    await use(new FilterHelper(page));
  },

  exportImport: async ({ page }, use) => {
    await use(new ExportImportHelper(page));
  },

  /** Session comes from playwright project storageState — no per-test login. */
  authenticatedPage: async ({}, use) => {
    await use();
  },
});

export { expect } from '@playwright/test';
