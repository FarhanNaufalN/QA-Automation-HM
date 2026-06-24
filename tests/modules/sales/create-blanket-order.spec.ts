import { test } from '../../../fixtures/project.fixture';
import { loadTestData } from '../../../utils/test-data.loader';

interface SalesBlanketOrderTestData {
  customer: { search: string; option: string };
  product: { search: string; option: string };
  quantity: string;
}

const defaults = loadTestData<SalesBlanketOrderTestData>('sales-blanket-order.json');

/**
 * Sales regression — Create Blanket Order (Teazzitea)
 * Flow: login → Blanket Orders → Create → fill → Save → Request Approval → Approve
 */
test.describe('Module | Sales — Create Blanket Order', () => {
  test.setTimeout(300_000);

  test.beforeEach(async ({ authenticatedPage }) => {});

  test('should create blanket order, save, request approval, and approve', async ({
    salesBlanketOrder,
    config,
  }) => {
    const customerSearch = config.customerSearch || defaults.customer.search;
    const customerName = config.customerName || defaults.customer.option;
    const productSearch = config.productSearch || defaults.product.search;
    const productName = config.productName || defaults.product.option;
    const quantity = config.productQty || defaults.quantity;
    const listPath = config.blanketOrderPath || undefined;

    await salesBlanketOrder.navigateToBlanketOrders(listPath);
    await salesBlanketOrder.clickCreate();

    await salesBlanketOrder.selectCustomer(customerSearch, customerName);
    await salesBlanketOrder.addProductLine(productSearch, productName, quantity);

    await salesBlanketOrder.save();
    await salesBlanketOrder.expectBlanketOrderSaved();

    await salesBlanketOrder.requestForApproval();
    await salesBlanketOrder.expectWaitingForApproval();

    await salesBlanketOrder.approve();
    await salesBlanketOrder.expectBlanketOrderApproved();
  });
});
