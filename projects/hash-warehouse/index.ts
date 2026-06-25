import { Page } from '@playwright/test';
import { LoginComponent } from '../../pages';
import type { ProjectFixture } from '../index';
import { warehouseLocators } from './locators';
import { warehouseLoginFlow } from './flows/login.flow';

export const hashWarehouseFixture: ProjectFixture = {
  name: 'hash-warehouse',
  locators: warehouseLocators.login,
  createLogin: (page: Page) => new LoginComponent(page, warehouseLocators.login),
};

export { warehouseLocators, warehouseLoginFlow };
