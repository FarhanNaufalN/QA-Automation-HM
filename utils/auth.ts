import * as fs from 'fs';
import * as path from 'path';
import type { Page } from '@playwright/test';

const AUTH_DIR = path.resolve(__dirname, '..', 'playwright', '.auth');

export function getAuthStoragePath(project?: string): string {
  const name = project ?? process.env.PROJECT ?? 'projectA';
  return path.join(AUTH_DIR, `${name}.json`);
}

export function ensureAuthDir(): void {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

export function hasStoredSession(project?: string): boolean {
  return fs.existsSync(getAuthStoragePath(project));
}

/** True when Odoo backend navbar is visible (session active). */
export async function isOdooSessionActive(page: Page): Promise<boolean> {
  if (page.isClosed()) {
    return false;
  }

  if (page.url().includes('/web/login')) {
    return false;
  }

  return page
    .locator('.o_main_navbar')
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
}
