import { Page } from '@playwright/test';
import {
  LoginComponent,
  SalesQuotationComponent,
  SalesBlanketOrderComponent,
  type LoginLocators,
  type SalesQuotationLocators,
  type SalesBlanketOrderLocators,
} from '../pages';
import { hashWarehouseFixture } from './hash-warehouse';
import { hashFinanceFixture } from './hash-finance';
import { hashRetailFixture } from './hash-retail';

export interface ProjectFixture {
  name: string;
  createLogin: (page: Page) => LoginComponent;
  createSalesQuotation?: (page: Page) => SalesQuotationComponent;
  createSalesBlanketOrder?: (page: Page) => SalesBlanketOrderComponent;
  locators: LoginLocators;
  salesLocators?: SalesQuotationLocators;
  blanketOrderLocators?: SalesBlanketOrderLocators;
}

const PROJECT_MAP: Record<string, ProjectFixture> = {
  score22: hashWarehouseFixture,
  teazie: hashWarehouseFixture,
  'hash-warehouse': hashWarehouseFixture,
  'hash-finance': hashFinanceFixture,
  'hash-retail': hashRetailFixture,
};

export function getProjectFixture(project: string): ProjectFixture {
  const fixture = PROJECT_MAP[project];
  if (!fixture) {
    return hashWarehouseFixture;
  }
  return fixture;
}
