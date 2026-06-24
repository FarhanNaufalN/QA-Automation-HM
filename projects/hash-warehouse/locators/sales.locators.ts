import type { SalesQuotationLocators, SalesBlanketOrderLocators } from '../../../pages';

/**
 * Layer 2 — Hash Warehouse sales selectors.
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

  blanketOrder: {
    listPath:
      '/web#action=1573&model=saleblanket.saleblanket&view_type=list&menu_id=1159',
    createButton: /create/i,
    customerField: /customer/i,
    orderLinesTab: /order line/i,
    addLineButton: /^add a line$/i,
    saveButton: /save/i,
    requestApprovalButton: /request for approval/i,
    approveButton: /^approve$/i,
  } satisfies SalesBlanketOrderLocators,
};
