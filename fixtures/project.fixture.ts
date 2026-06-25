import { test as baseTest } from './base.fixture';
import { getProjectFixture } from '../projects';
import { SalesQuotationComponent, SalesBlanketOrderComponent, SalesDirectOrderComponent } from '../pages';

/**
 * Extends base fixture with project-specific locators & flows (Layer 2).
 */
export const test = baseTest.extend({
  login: async ({ page }, use) => {
    const project = process.env.PROJECT ?? 'projectA';
    const projectFixture = getProjectFixture(project);
    const login = projectFixture.createLogin(page);
    await use(login);
  },

  salesQuotation: async ({ page }, use) => {
    const project = process.env.PROJECT ?? 'projectA';
    const projectFixture = getProjectFixture(project);
    const quotation =
      projectFixture.createSalesQuotation?.(page) ?? new SalesQuotationComponent(page);
    await use(quotation);
  },

  salesBlanketOrder: async ({ page }, use) => {
    const project = process.env.PROJECT ?? 'projectA';
    const projectFixture = getProjectFixture(project);
    const blanketOrder =
      projectFixture.createSalesBlanketOrder?.(page) ?? new SalesBlanketOrderComponent(page);
    await use(blanketOrder);
  },

  salesDirectOrder: async ({ page }, use) => {
    const project = process.env.PROJECT ?? 'projectA';
    const projectFixture = getProjectFixture(project);
    const directOrder =
      projectFixture.createSalesDirectOrder?.(page) ?? new SalesDirectOrderComponent(page);
    await use(directOrder);
  },
});

export { expect } from '@playwright/test';
