import { test } from '../../../fixtures/project.fixture';
import { loadTestData } from '../../../utils/test-data.loader';

interface SalesDirectOrderTestData {
  customer: { search: string; option: string };
  product: { search: string; option: string };
  quantity: string;
  journal: { search: string; option: string };
  warehouse?: { search: string; option: string };
}

const defaults = loadTestData<SalesDirectOrderTestData>('sales-direct-order.json');

/**
 * Sales regression — Direct Sales (Teazzitea)
 * Flow: login → Direct Sales → Create → fill → Save → Confirm
 */
test.describe('Module | Sales — Create Direct Sales Order', () => {
  test.setTimeout(300_000);

  test.beforeEach(async ({ authenticatedPage }) => {});

  test('should create direct sales order, save, and confirm', async ({
    salesDirectOrder,
    config,
  }) => {
    const customerSearch = config.customerSearch || defaults.customer.search;
    const customerName = config.customerName || defaults.customer.option;
    const productSearch = config.productSearch || defaults.product.search;
    const productName = config.productName || defaults.product.option;
    const quantity = config.productQty || defaults.quantity;
    const warehouseSearch =
      config.directSalesWarehouseSearch || defaults.warehouse?.search || 'Warehouse Consignment';
    const warehouseName =
      config.directSalesWarehouseName || defaults.warehouse?.option || 'Warehouse Consignment';
    const journalSearch = config.journalSearch || defaults.journal.search;
    const journalName = config.journalName || defaults.journal.option;
    const listPath = config.directSalesPath || undefined;

    await salesDirectOrder.navigateToDirectSales(listPath);
    await salesDirectOrder.clickCreate();

    await salesDirectOrder.selectCustomer(customerSearch, customerName);
    await salesDirectOrder.selectWarehouse(warehouseSearch, warehouseName);

    await salesDirectOrder.selectJournal(journalSearch, journalName);

    await salesDirectOrder.addProductLine(productSearch, productName, quantity);

    await salesDirectOrder.save();
    await salesDirectOrder.expectDirectOrderSaved();

    await salesDirectOrder.confirmOrder();
    await salesDirectOrder.expectSalesOrderConfirmed();
  });
});
