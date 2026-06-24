import { test as base } from '@playwright/test';
import { LoginComponent, DashboardComponent, SalesQuotationComponent } from '../pages';
import {
  CrudHelper,
  ApprovalHelper,
  TableHelper,
  FilterHelper,
  ExportImportHelper,
} from '../helpers';
import { getConfig, type ProjectConfig } from '../utils/env';
import { log } from '../utils/logger';

type FrameworkFixtures = {
  config: ProjectConfig;
  login: LoginComponent;
  dashboard: DashboardComponent;
  salesQuotation: SalesQuotationComponent;
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

  authenticatedPage: async ({ page, login, config }, use) => {
    log('Login', `project=${config.project} db=${config.database || 'default'}`);
    await login.gotoLoginPage();
    await login.login();
    await use();
  },
});

export { expect } from '@playwright/test';
