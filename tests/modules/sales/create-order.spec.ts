import { test } from '../../../fixtures/project.fixture';

/**
 * Module-based test — Sales
 * Reuse across projects; override locators in projects layer.
 */
test.describe('Module | Sales — Create Order', () => {
  test.beforeEach(async ({ authenticatedPage }) => {});

  test.skip('should create sales order', async ({ dashboard, crud }) => {
    await dashboard.openModule(/sales|penjualan/i);
    await crud.createNew(/order|pesanan/i);
    await crud.fillForm({
      Customer: 'QA Customer',
    });
    await crud.save();
  });
});
