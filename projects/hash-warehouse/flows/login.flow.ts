import { Page } from '@playwright/test';
import { LoginComponent } from '../../../pages';
import { warehouseLocators } from '../locators';

/**
 * Layer 2 — Custom login flow for Hash Warehouse (if needed).
 */
export async function warehouseLoginFlow(page: Page): Promise<LoginComponent> {
  const login = new LoginComponent(page, warehouseLocators.login);
  await page.goto('/');
  await login.login();
  return login;
}
