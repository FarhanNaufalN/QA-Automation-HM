import { Page } from '@playwright/test';
import {
  LoginComponent,
  SalesQuotationComponent,
  type LoginLocators,
  type SalesQuotationLocators,
} from '../pages';
import { hashWarehouseFixture } from './hash-warehouse';
import { hashFinanceFixture } from './hash-finance';
import { hashRetailFixture } from './hash-retail';

export interface ProjectFixture {
  name: string;
  createLogin: (page: Page) => LoginComponent;
  createSalesQuotation?: (page: Page) => SalesQuotationComponent;
  locators: LoginLocators;
  salesLocators?: SalesQuotationLocators;
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
