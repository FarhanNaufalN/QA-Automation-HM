import type { SalesQuotationLocators, SalesBlanketOrderLocators, SalesDirectOrderLocators } from '../../../pages';

/**
 * Layer 2 — Hash Sales selectors.
 */
export const salesLocators = {
  quotation: {
    listPath:
      '/web#action=459&model=sale.order&view_type=list&cids=1,40,82&bids=1&menu_id=320',
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

  directOrder: {
    listPath:
      '/web#action=6033&model=sale.order&view_type=list&cids=1,40,82&bids=1&menu_id=3441',
    salesModule: /sales/i,
    quotationsMenu: /direct sales/i,
    directSalesMenu: /^direct sales$/i,
    createButton: /create/i,
    customerField: /customer/i,
    orderLinesTab: /order lines/i,
    addProductButton: /add a product/i,
    saveButton: /save/i,
    savedIndicator: /direct sales|sales order/i,
    requestApprovalButton: /request for approval/i,
    approveButton: /^approve$/i,
    waitingApprovalStatus: /waiting for sale order approval/i,
    approvedStatus: /sale order/i,
  } satisfies SalesDirectOrderLocators,
};
