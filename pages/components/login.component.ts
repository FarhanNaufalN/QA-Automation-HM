import { Page } from '@playwright/test';
import { BasePage } from '../base.page';
import { getConfig, getLoginPath } from '../../utils/env';

/**
 * Layer 1 — Universal ERP login flow.
 * Layer 2 — Override selectors via projects/{name}/locators.
 */
export interface LoginLocators {
  usernameLabel: string | RegExp;
  passwordLabel: string | RegExp;
  submitButton: string | RegExp;
}

const DEFAULT_LOCATORS: LoginLocators = {
  usernameLabel: /username|email|user/i,
  passwordLabel: /password|kata sandi/i,
  submitButton: /login|sign in|masuk/i,
};

export class LoginComponent extends BasePage {
  constructor(
    page: Page,
    private readonly locators: LoginLocators = DEFAULT_LOCATORS
  ) {
    super(page);
  }

  async gotoLoginPage(): Promise<void> {
    const config = getConfig();
    await this.page.goto(getLoginPath(config.database));
    await this.selectDatabaseIfNeeded(config.database);
  }

  /** Odoo database selector at /web/database/selector */
  async selectDatabaseIfNeeded(database: string): Promise<void> {
    if (!database) return;

    const dbLink = this.page.getByRole('link', { name: new RegExp(database, 'i') });
    if (await dbLink.count()) {
      await dbLink.first().click();
      await this.waitForPageLoad();
    }
  }

  async login(
    username?: string,
    password?: string
  ): Promise<void> {
    const config = getConfig();
    const user = username ?? config.username;
    const pass = password ?? config.password;

    const odooLogin = this.page.locator('input[name="login"]').first();
    const odooPassword = this.page.locator('input[name="password"]').first();

    if (await odooLogin.count()) {
      await odooLogin.fill(user);
      await odooPassword.fill(pass);
      await this.page.locator('button[type="submit"]').first().click();
    } else {
      await this.interaction.fillInput(this.locators.usernameLabel, user);
      await this.interaction.fillInput(this.locators.passwordLabel, pass);
      await this.interaction.clickButton(this.locators.submitButton);
    }

    await this.waitForPageLoad();
  }

  async logout(buttonName: string | RegExp = /logout|keluar|sign out/i): Promise<void> {
    await this.interaction.clickButton(buttonName);
  }

  async expectLoggedIn(indicator: string | RegExp = /dashboard|beranda/i): Promise<void> {
    const odooNavbar = this.page.locator('.o_main_navbar').first();
    try {
      await odooNavbar.waitFor({ state: 'visible', timeout: 60_000 });
      return;
    } catch {
      await this.page.waitForURL(/\/web#/, { timeout: 60_000 });
      await odooNavbar.waitFor({ state: 'visible' });
    }
  }
}
