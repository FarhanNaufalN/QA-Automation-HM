import { Page } from '@playwright/test';
import {
  LoginComponent,
  SalesQuotationComponent,
  SalesBlanketOrderComponent,
  SalesDirectOrderComponent,
} from '../../pages';
import type { ProjectFixture } from '../index';
import { warehouseLocators } from '../hash-warehouse/locators';
import { salesLocators } from './locators';

export const hashSalesFixture: ProjectFixture = {
  name: 'hash-sales',
  locators: warehouseLocators.login,
  salesLocators: salesLocators.quotation,
  blanketOrderLocators: salesLocators.blanketOrder,
  directOrderLocators: salesLocators.directOrder,
  createLogin: (page: Page) => new LoginComponent(page, warehouseLocators.login),
  createSalesQuotation: (page: Page) =>
    new SalesQuotationComponent(page, salesLocators.quotation),
  createSalesBlanketOrder: (page: Page) =>
    new SalesBlanketOrderComponent(page, salesLocators.blanketOrder),
  createSalesDirectOrder: (page: Page) =>
    new SalesDirectOrderComponent(page, salesLocators.directOrder),
};

export { salesLocators };
