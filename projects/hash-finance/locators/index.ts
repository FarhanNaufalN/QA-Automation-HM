import type { LoginLocators } from '../../../pages';

export const financeLocators = {
  login: {
    usernameLabel: /user id|username/i,
    passwordLabel: /password/i,
    submitButton: /sign in/i,
  } satisfies LoginLocators,

  menu: {
    generalLedger: /general ledger|buku besar/i,
    accountsPayable: /accounts payable|hutang/i,
    accountsReceivable: /accounts receivable|piutang/i,
  },
};
