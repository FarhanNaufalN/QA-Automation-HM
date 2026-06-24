import { test, expect } from '../../fixtures/project.fixture';

/**
 * Universal Smoke — Login
 * Reusable across all ERP projects; only env + locators change.
 */
test.describe('Smoke | Login', () => {
  test('should login successfully', async ({ page, login, config }) => {
    await login.gotoLoginPage();
    await login.login();
    await login.expectLoggedIn();
    await expect(page).toHaveURL(new RegExp(config.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  test('should logout successfully', async ({ page, login }) => {
    await login.gotoLoginPage();
    await login.login();
    await login.logout();
    await expect(page.getByRole('button', { name: /login|masuk|sign in/i })).toBeVisible();
  });
});
