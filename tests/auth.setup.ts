import { test as setup } from '@playwright/test';
import { getProjectFixture } from '../projects';
import {
  ensureAuthDir,
  getAuthStoragePath,
  hasStoredSession,
  isOdooSessionActive,
} from '../utils/auth';
import { getConfig } from '../utils/env';
import { log } from '../utils/logger';

setup('authenticate', async ({ browser }) => {
  const config = getConfig();
  const storagePath = getAuthStoragePath(config.project);
  ensureAuthDir();

  if (hasStoredSession(config.project) && process.env.FORCE_AUTH_SETUP !== 'true') {
    const reuseContext = await browser.newContext({
      storageState: storagePath,
      baseURL: config.baseUrl,
    });
    const reusePage = await reuseContext.newPage();

    try {
      await reusePage.goto('/web#', { waitUntil: 'domcontentloaded' });
      if (await isOdooSessionActive(reusePage)) {
        log('Auth setup', `reuse session — project=${config.project}`);
        return;
      }
      log('Auth setup', `stored session expired — project=${config.project}`);
    } finally {
      await reuseContext.close().catch(() => undefined);
    }
  }

  const context = await browser.newContext({ baseURL: config.baseUrl });
  const page = await context.newPage();
  const login = getProjectFixture(config.project).createLogin(page);

  log('Auth setup', `login — project=${config.project} db=${config.database || 'default'}`);
  await login.gotoLoginPage();
  await login.login();
  await login.expectLoggedIn();

  await context.storageState({ path: storagePath });
  await context.close();
});
