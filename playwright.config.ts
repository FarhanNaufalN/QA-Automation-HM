import { defineConfig, devices } from '@playwright/test';
import { getAuthStoragePath } from './utils/auth';
import { loadProjectEnv, getConfig } from './utils/env';

loadProjectEnv();

const config = getConfig();
const authStorageState = getAuthStoragePath(config.project);

const chromeUse = {
  ...devices['Desktop Chrome'],
  storageState: authStorageState,
};

const firefoxUse = {
  ...devices['Desktop Firefox'],
  storageState: authStorageState,
};

export default defineConfig({
  testDir: './tests',
  timeout: config.timeout,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/test-results/results.json' }],
    ...(process.env.CI
      ? [['junit', { outputFile: 'test-results/results.xml' }] as const]
      : []),
  ],
  use: {
    baseURL: config.baseUrl,
    headless: config.headless,
    trace: 'on-first-retry',
    screenshot: process.env.SCREENSHOT_MODE === 'on' ? 'on' : 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: chromeUse,
      testIgnore: [/tests\/modules\//, /auth\.setup\.ts/, /tests\/smoke\/login\.spec\.ts/],
    },
    {
      name: 'chromium-login',
      testMatch: /tests\/smoke\/login\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      dependencies: ['setup'],
      use: firefoxUse,
      testIgnore: [/tests\/modules\//, /auth\.setup\.ts/, /tests\/smoke\/login\.spec\.ts/],
    },
    // Regression — per ERP module (chromium only)
    {
      name: 'regression-sales',
      dependencies: ['setup'],
      testMatch: /tests\/modules\/sales\/.*/,
      use: chromeUse,
    },
    {
      name: 'regression-inventory',
      dependencies: ['setup'],
      testMatch: /tests\/modules\/inventory\/.*/,
      use: chromeUse,
    },
    {
      name: 'regression-purchasing',
      dependencies: ['setup'],
      testMatch: /tests\/modules\/purchasing\/.*/,
      use: chromeUse,
    },
    {
      name: 'regression-finance',
      dependencies: ['setup'],
      testMatch: /tests\/modules\/finance\/.*/,
      use: chromeUse,
    },
  ],
  outputDir: 'reports/test-results',
});
