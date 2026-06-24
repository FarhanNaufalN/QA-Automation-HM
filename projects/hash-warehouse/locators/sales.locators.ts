import type { SalesQuotationLocators } from '../../../pages';

/**
 * Layer 2 — Hash Warehouse / Learning Time sales selectors.
 */
export const warehouseSalesLocators = {
  quotation: {
    salesModule: /sales/i,
    quotationsMenu: /quotations/i,
    createButton: /create/i,
    customerField: /customer/i,
    orderLinesTab: /order lines/i,
    addProductButton: /add a product/i,
    saveButton: /save/i,
    savedIndicator: /quotations/i,
    requestApprovalButton: /request for approval/i,
    approveButton: /^approve$/i,
    waitingApprovalStatus: /waiting for sale order approval/i,
    approvedStatus: /quotation approved/i,
  } satisfies SalesQuotationLocators,
};
