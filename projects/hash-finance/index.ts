import { Page } from '@playwright/test';
import { LoginComponent } from '../../pages';
import type { ProjectFixture } from '../index';
import { financeLocators } from './locators';

export const hashFinanceFixture: ProjectFixture = {
  name: 'hash-finance',
  locators: financeLocators.login,
  createLogin: (page: Page) => new LoginComponent(page, financeLocators.login),
};

export { financeLocators };
