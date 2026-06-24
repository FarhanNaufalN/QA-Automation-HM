import { Page } from '@playwright/test';
import { LoginComponent } from '../../pages';
import type { ProjectFixture } from '../index';
import { retailLocators } from './locators';

export const hashRetailFixture: ProjectFixture = {
  name: 'hash-retail',
  locators: retailLocators.login,
  createLogin: (page: Page) => new LoginComponent(page, retailLocators.login),
};

export { retailLocators };
