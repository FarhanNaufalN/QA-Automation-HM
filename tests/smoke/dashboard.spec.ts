import { test, expect } from '../../fixtures/project.fixture';

/**
 * Universal Smoke — Dashboard
 */
test.describe('Smoke | Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // authenticated via fixture
  });

  test('should load dashboard after login', async ({ dashboard }) => {
    await dashboard.expectDashboardLoaded();
  });
});
