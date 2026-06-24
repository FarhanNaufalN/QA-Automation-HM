import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { log } from './logger';

export interface ProjectConfig {
  project: string;
  baseUrl: string;
  database: string;
  username: string;
  password: string;
  customerSearch: string;
  customerName: string;
  productSearch: string;
  productName: string;
  productQty: string;
  warehouseSearch: string;
  warehouseName: string;
  timeout: number;
  headless: boolean;
}

/** Odoo / Hashmicro login URL with optional database. */
export function getLoginPath(database?: string): string {
  const db = database ?? process.env.DATABASE;
  if (db) {
    return `/web/login?db=${encodeURIComponent(db)}`;
  }
  return process.env.LOGIN_PATH ?? '/web/login';
}

const DEFAULT_PROJECT = 'projectA';

export function loadProjectEnv(): void {
  const project = process.env.PROJECT ?? DEFAULT_PROJECT;
  const envPath = path.resolve(__dirname, '..', 'configs', `${project}.env`);

  if (!fs.existsSync(envPath)) {
    throw new Error(
      `Config not found: ${envPath}. Create configs/${project}.env or set PROJECT env.`
    );
  }

  dotenv.config({ path: envPath, override: true });
  process.env.PROJECT = project;

  const loaded = getConfig();
  log('Config', `project=${project} url=${loaded.baseUrl} db=${loaded.database}`);
}

export function getConfig(): ProjectConfig {
  const rawBaseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
  const baseUrl = normalizeBaseUrl(rawBaseUrl);

  return {
    project: process.env.PROJECT ?? DEFAULT_PROJECT,
    baseUrl,
    database: process.env.DATABASE ?? '',
    username: process.env.USERNAME ?? '',
    password: process.env.PASSWORD ?? '',
    customerSearch: process.env.CUSTOMER_SEARCH ?? '',
    customerName: process.env.CUSTOMER_NAME ?? '',
    productSearch: process.env.PRODUCT_SEARCH ?? '',
    productName: process.env.PRODUCT_NAME ?? '',
    productQty: process.env.PRODUCT_QTY ?? '',
    warehouseSearch: process.env.WAREHOUSE_SEARCH ?? '',
    warehouseName: process.env.WAREHOUSE_NAME ?? '',
    timeout: Number(process.env.TIMEOUT ?? 30000),
    headless: process.env.HEADLESS !== 'false',
  };
}

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/web\/login\/?$/, '');
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, '');
}
