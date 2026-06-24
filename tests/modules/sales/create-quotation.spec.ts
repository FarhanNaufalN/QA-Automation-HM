import { test } from '../../../fixtures/project.fixture';
import { loadTestData } from '../../../utils/test-data.loader';

interface SalesQuotationTestData {
  customer: { search: string; option: string };
  product: { search: string; option: string };
  quantity: string;
}

const defaults = loadTestData<SalesQuotationTestData>('sales-quotation.json');

/**
 * Sales regression — Create Quotation
 * Flow: login → Quotations → Create → fill → Save → Request Approval → Approve
 */
test.describe('Module | Sales — Create Quotation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {});

  test('should create quotation, save, request approval, and approve', async ({
    salesQuotation,
    config,
  }) => {
    const customerSearch = config.customerSearch || defaults.customer.search;
    const customerName = config.customerName || defaults.customer.option;
    const productSearch = config.productSearch || defaults.product.search;
    const productName = config.productName || defaults.product.option;
    const quantity = config.productQty || defaults.quantity;
    const warehouseSearch = config.warehouseSearch;
    const warehouseName = config.warehouseName;

    await salesQuotation.navigateToQuotations();
    await salesQuotation.clickCreate();

    await salesQuotation.selectCustomer(customerSearch, customerName);

    if (warehouseSearch?.trim() && warehouseName?.trim()) {
      await salesQuotation.selectWarehouse(warehouseSearch, warehouseName);
    }

    await salesQuotation.addProductLine(productSearch, productName, quantity);

    await salesQuotation.save();
    await salesQuotation.expectQuotationSaved();

    await salesQuotation.requestForApproval();
    await salesQuotation.expectWaitingForApproval();

    await salesQuotation.approve();
    await salesQuotation.expectQuotationApproved();
  });
});
