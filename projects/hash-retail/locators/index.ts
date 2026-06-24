import type { LoginLocators } from '../../../pages';

export const retailLocators = {
  login: {
    usernameLabel: /email|username/i,
    passwordLabel: /password/i,
    submitButton: /log in/i,
  } satisfies LoginLocators,

  menu: {
    pos: /pos|kasir/i,
    products: /products|produk/i,
    orders: /orders|pesanan/i,
  },
};
