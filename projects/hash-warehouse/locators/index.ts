import type { LoginLocators } from '../../../pages';

/**
 * Layer 2 — Project-specific selector maps.
 * Override only what differs from generic ERP defaults.
 */
export const warehouseLocators = {
  login: {
    usernameLabel: /email|login|username/i,
    passwordLabel: /password|kata sandi/i,
    submitButton: /log in|login|masuk/i,
  } satisfies LoginLocators,

  menu: {
    inventory: /inventory|gudang/i,
    sales: /sales|penjualan/i,
    purchasing: /purchasing|pembelian/i,
  },

  table: {
    searchPlaceholder: /search|cari/i,
    createButton: /create|tambah|new/i,
  },
};
