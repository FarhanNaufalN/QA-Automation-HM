import { defineConfig, devices } from '@playwright/test';
import { loadProjectEnv, getConfig } from './utils/env';

loadProjectEnv();

const config = getConfig();

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
  ],
  use: {
    baseURL: config.baseUrl,
    headless: config.headless,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: config.timeout,
    navigationTimeout: config.timeout,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/tests\/modules\//],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: [/tests\/modules\//],
    },
    // Regression — per ERP module (chromium only)
    {
      name: 'regression-sales',
      testMatch: /tests\/modules\/sales\/.*/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'regression-inventory',
      testMatch: /tests\/modules\/inventory\/.*/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'regression-purchasing',
      testMatch: /tests\/modules\/purchasing\/.*/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'regression-finance',
      testMatch: /tests\/modules\/finance\/.*/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'reports/test-results',
});
