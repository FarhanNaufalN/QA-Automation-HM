import { Page } from '@playwright/test';
import { LoginComponent, SalesQuotationComponent } from '../../pages';
import type { ProjectFixture } from '../index';
import { warehouseLocators } from './locators';
import { warehouseSalesLocators } from './locators/sales.locators';
import { warehouseLoginFlow } from './flows/login.flow';

export const hashWarehouseFixture: ProjectFixture = {
  name: 'hash-warehouse',
  locators: warehouseLocators.login,
  salesLocators: warehouseSalesLocators.quotation,
  createLogin: (page: Page) => new LoginComponent(page, warehouseLocators.login),
  createSalesQuotation: (page: Page) =>
    new SalesQuotationComponent(page, warehouseSalesLocators.quotation),
};

export { warehouseLocators, warehouseSalesLocators, warehouseLoginFlow };
