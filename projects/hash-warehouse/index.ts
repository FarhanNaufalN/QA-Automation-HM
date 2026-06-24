import { Page } from '@playwright/test';
import { LoginComponent, SalesQuotationComponent, SalesBlanketOrderComponent } from '../../pages';
import type { ProjectFixture } from '../index';
import { warehouseLocators } from './locators';
import { warehouseSalesLocators } from './locators/sales.locators';
import { warehouseLoginFlow } from './flows/login.flow';

export const hashWarehouseFixture: ProjectFixture = {
  name: 'hash-warehouse',
  locators: warehouseLocators.login,
  salesLocators: warehouseSalesLocators.quotation,
  blanketOrderLocators: warehouseSalesLocators.blanketOrder,
  createLogin: (page: Page) => new LoginComponent(page, warehouseLocators.login),
  createSalesQuotation: (page: Page) =>
    new SalesQuotationComponent(page, warehouseSalesLocators.quotation),
  createSalesBlanketOrder: (page: Page) =>
    new SalesBlanketOrderComponent(page, warehouseSalesLocators.blanketOrder),
};

export { warehouseLocators, warehouseSalesLocators, warehouseLoginFlow };
