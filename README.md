# QA Automation Framework

Framework QA automation **independen** berbasis [Playwright](https://playwright.dev/) + TypeScript untuk testing aplikasi ERP (HashMicro / Odoo) lintas banyak client.

Framework ini berdiri sendiri — tidak bergantung pada repo developer. Cukup ganti file **config** dan ENV `PROJECT` untuk pindah client.

---

## Fitur Utama

- **Satu framework, banyak client** — jalankan test per project lewat ENV
- **Konfigurasi berbasis `.env`** — URL, database, kredensial, data tes per client
- **Arsitektur 2 layer** — generic (reusable) + project-specific (override kecil)
- **Role-based locator** — minim hardcode CSS selector
- **Module-based testing** — Sales, Inventory, Purchasing, Finance
- **Odoo-aware helpers** — autocomplete, sidebar, modal, statusbar approval

---

## Struktur Folder

```
QA-Automation-Framework/
├── configs/                    # ENV per client (jangan commit kredensial)
│   └── score22.env
│
├── tests/
│   ├── smoke/                  # Smoke test universal (login, dashboard, CRUD, approval)
│   ├── regression/             # Placeholder regression penuh
│   └── modules/                # Test per modul ERP
│       ├── sales/
│       │   ├── create-quotation.spec.ts   # ✅ aktif
│       │   └── create-order.spec.ts       # skip — belum diaktifkan
│       ├── inventory/
│       ├── purchasing/
│       └── finance/
│
├── pages/                      # Layer 1 — Page Object & komponen
│   ├── base.page.ts
│   └── components/
│       ├── login.component.ts
│       ├── sales-quotation.component.ts
│       └── dashboard.component.ts
│
├── helpers/                    # Layer 1 — Helper ERP reusable
│   ├── interaction.helper.ts   # Button, menu, autocomplete Odoo, dismiss modal
│   ├── crud.helper.ts
│   ├── approval.helper.ts
│   ├── table.helper.ts
│   ├── filter.helper.ts
│   └── export-import.helper.ts
│
├── fixtures/                   # Playwright fixtures
│   ├── base.fixture.ts         # Login otomatis, inject helper
│   └── project.fixture.ts      # Override locator per project
│
├── projects/                   # Layer 2 — Custom per tipe ERP
│   ├── index.ts                # Mapping PROJECT → fixture
│   ├── hash-warehouse/         # Score22, Erabudi, dll.
│   ├── hash-finance/
│   └── hash-retail/
│
├── test-data/                  # Data statis (JSON fallback)
│   └── sales-quotation.json
│
├── utils/                      # Env loader, logger, test-data loader
├── reports/                    # HTML report, screenshot, video gagal
├── playwright.config.ts
└── package.json
```

---

## Arsitektur 2 Layer

| Layer | Lokasi | Tanggung jawab |
|-------|--------|----------------|
| **Layer 1 — Generic** | `helpers/`, `pages/`, `tests/` | Login, CRUD, approval, navigasi modul — dipakai semua client |
| **Layer 2 — Project Specific** | `projects/{nama}/` | Locator unik, flow login custom, override kecil |

### Mapping `PROJECT` → Layer 2

| ENV `PROJECT` | Folder Layer 2 | Keterangan |
|---------------|----------------|------------|
| `score22`, `erabudi`, `projectA` | `hash-warehouse` | ERP warehouse / distribusi |
| `projectB` | `hash-finance` | ERP finance |
| `projectC` | `hash-retail` | ERP retail |

Daftarkan client baru di `projects/index.ts`.

---

## Alur Eksekusi

```
npm run test:modules:sales:score22
        │
        ▼
playwright.config.ts  →  load configs/score22.env
        │
        ▼
fixtures/project.fixture.ts  →  pilih locator hash-warehouse
        │
        ▼
authenticatedPage  →  login otomatis (Odoo)
        │
        ▼
salesQuotation  →  SalesQuotationComponent + locator project
        │
        ▼
create-quotation.spec.ts  →  assert hasil
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm

---

## Instalasi

```bash
cd QA-Automation-Framework

npm install
npx playwright install chromium
```

---

## Konfigurasi Client

Setiap client punya file ENV sendiri di `configs/`. File berisi kredensial **tidak boleh di-commit** (sudah ada di `.gitignore`).

### Contoh `configs/score22.env`

```env
BASE_URL=https://score22.hashmicro.co
DATABASE=master-core
USERNAME=admin
PASSWORD="password-anda"

# Data tes modul Sales
CUSTOMER_SEARCH=INTERGRAL
CUSTOMER_NAME=INTERGRAL DATA PRIMA PT
PRODUCT_SEARCH=PAV
PRODUCT_NAME=PAV-007
PRODUCT_QTY=1
WAREHOUSE_SEARCH=Jakarta
WAREHOUSE_NAME=Jakarta Warehouse

TIMEOUT=180000
HEADLESS=true
```

### Variabel ENV

| Variabel | Wajib | Deskripsi |
|----------|-------|-----------|
| `BASE_URL` | ✅ | URL aplikasi (tanpa `/web/login`) |
| `DATABASE` | ✅ | Nama database Odoo (untuk `?db=`) |
| `USERNAME` | ✅ | Akun login |
| `PASSWORD` | ✅ | Password akun |
| `CUSTOMER_SEARCH` | opsional | Teks pencarian field Customer |
| `CUSTOMER_NAME` | opsional | Nama customer di dropdown |
| `PRODUCT_SEARCH` | opsional | Teks pencarian produk |
| `PRODUCT_NAME` | opsional | Nama produk di dropdown |
| `PRODUCT_QTY` | opsional | Kuantitas order line |
| `WAREHOUSE_SEARCH` | opsional | Teks pencarian warehouse |
| `WAREHOUSE_NAME` | opsional | Nama warehouse di dropdown |
| `TIMEOUT` | opsional | Timeout aksi & navigasi (ms). ERP: gunakan `180000` |
| `HEADLESS` | opsional | `true` / `false` |

Jika variabel data tes kosong, framework memakai fallback dari `test-data/sales-quotation.json`.

> **Penting:** Gunakan akun QA khusus. Jangan commit password production.

### Template client baru

```bash
# Salin template
cp configs/score22.env configs/client-baru.env
# Edit nilai BASE_URL, DATABASE, USERNAME, PASSWORD, data tes
```

Lalu daftarkan di `projects/index.ts` dan tambahkan npm script di `package.json`.

---

## Menjalankan Test

### Semua test

```bash
npm test                          # default PROJECT=projectA
npm run test:projectA
npm run test:projectB
npm run test:projectC
```

### Smoke test

```bash
npm run test:smoke
npm run test:smoke:projectA
```

| File | Cakupan |
|------|---------|
| `tests/smoke/login.spec.ts` | Login & session |
| `tests/smoke/dashboard.spec.ts` | Dashboard load |
| `tests/smoke/crud.spec.ts` | Create, edit, delete |
| `tests/smoke/approval.spec.ts` | Submit & approve |

### Module test — Sales

```bash
# Default (PROJECT=projectA)
npm run test:modules:sales

# Per client
npm run test:modules:sales:score22
npm run test:modules:sales:erabudi

# Browser terlihat (debug)
npm run test:modules:sales:score22 -- --headed

# Satu file saja
npx cross-env PROJECT=score22 npx playwright test tests/modules/sales/create-quotation.spec.ts --project=regression-sales
```

### Module test — modul lain

```bash
npm run test:modules:inventory
npm run test:modules:purchasing
npm run test:modules:finance
npm run test:modules          # semua modul sekaligus
```

### Mode debug

```bash
npm run test:headed    # Browser terlihat
npm run test:ui        # Playwright UI mode
npm run test:debug     # Step-by-step
npm run codegen        # Rekam selector baru
npm run report         # Buka HTML report
```

---

## Test Case — Sales Create Quotation

**File:** `tests/modules/sales/create-quotation.spec.ts`

**Alur:**

1. Login otomatis
2. Navigasi ke **Sales → Quotations**
3. Klik **Create**
4. Isi **Customer** (many2one autocomplete)
5. Isi **Warehouse** (jika dikonfigurasi di ENV)
6. Tambah **product line** + quantity
7. **Save** → verifikasi URL `id=`
8. **Request For Approval** → verifikasi status `Waiting For Sale Order Approval`
9. **Approve** → verifikasi approval selesai

**Komponen utama:** `pages/components/sales-quotation.component.ts`

| Method | Fungsi |
|--------|--------|
| `navigateToQuotations()` | Buka menu Quotations |
| `clickCreate()` | Buka form quotation baru |
| `selectCustomer()` | Pilih customer via autocomplete |
| `selectWarehouse()` | Pilih warehouse (opsional) |
| `addProductLine()` | Tambah baris produk + qty |
| `save()` | Simpan quotation |
| `requestForApproval()` | Ajukan approval |
| `approve()` | Setujui quotation |
| `expectQuotationSaved()` | Assert tersimpan |
| `expectWaitingForApproval()` | Assert status menunggu approval |
| `expectQuotationApproved()` | Assert approval selesai |

---

## Helper ERP (Layer 1)

Helper memakai **role-based locator** (`getByRole`, `getByLabel`) agar stabil di UI Odoo/HashMicro.

```typescript
import { InteractionHelper, CrudHelper, ApprovalHelper } from './helpers';

// Interaksi umum
await interaction.clickButton('Save');
await interaction.openSidebarMenu(/quotations/i);
await interaction.selectOdooAutocompleteOption('INTERGRAL DATA PRIMA PT');
await interaction.dismissBlockingDialogs();

// CRUD
await crud.createNew(/create/i);
await crud.save();

// Approval
await approval.approve(/approve/i);
```

| Helper | File | Fungsi |
|--------|------|--------|
| `InteractionHelper` | `helpers/interaction.helper.ts` | Button, tab, menu, autocomplete Odoo, dismiss modal |
| `TableHelper` | `helpers/table.helper.ts` | Search, sort, row action |
| `FilterHelper` | `helpers/filter.helper.ts` | Filter panel, date range |
| `CrudHelper` | `helpers/crud.helper.ts` | Create, save, edit, delete |
| `ApprovalHelper` | `helpers/approval.helper.ts` | Submit, approve, reject |
| `ExportImportHelper` | `helpers/export-import.helper.ts` | Export, import, upload |

---

## Menulis Test Baru

Gunakan fixture project-aware:

```typescript
import { test } from '../../fixtures/project.fixture';
import { loadTestData } from '../../utils/test-data.loader';

test.describe('Module | Sales — Create Quotation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Login otomatis
  });

  test('should create quotation', async ({ salesQuotation, config }) => {
    await salesQuotation.navigateToQuotations();
    await salesQuotation.clickCreate();
    await salesQuotation.selectCustomer(config.customerSearch, config.customerName);
    await salesQuotation.addProductLine(config.productSearch, config.productName, config.productQty);
    await salesQuotation.save();
    await salesQuotation.expectQuotationSaved();
  });
});
```

### Fixture yang tersedia

| Fixture | Deskripsi |
|---------|-----------|
| `config` | Konfigurasi project dari ENV |
| `login` | Login component (locator per project) |
| `salesQuotation` | Komponen Sales Quotation |
| `dashboard` | Navigasi dashboard |
| `crud` | CRUD helper |
| `approval` | Approval helper |
| `table` | Table helper |
| `filter` | Filter helper |
| `exportImport` | Export/import helper |
| `authenticatedPage` | Auto-login sebelum setiap test |

---

## Menambah Client Baru

### 1. Buat file config

```env
# configs/client-baru.env
BASE_URL=https://client-baru.example.com
DATABASE=nama-db
USERNAME=qa_user
PASSWORD=changeme
CUSTOMER_SEARCH=...
CUSTOMER_NAME=...
PRODUCT_SEARCH=...
PRODUCT_NAME=...
PRODUCT_QTY=1
TIMEOUT=180000
HEADLESS=true
```

### 2. Override locator (jika label UI berbeda)

```typescript
// projects/hash-warehouse/locators/sales.locators.ts
export const warehouseSalesLocators = {
  quotation: {
    requestApprovalButton: /request for approval/i,
    approveButton: /^approve$/i,
    // ...
  },
};
```

### 3. Daftarkan di `projects/index.ts`

```typescript
const PROJECT_MAP: Record<string, ProjectFixture> = {
  // ...
  'client-baru': hashWarehouseFixture,
};
```

### 4. Tambah npm script

```json
"test:modules:sales:client-baru": "cross-env PROJECT=client-baru playwright test tests/modules/sales --project=regression-sales"
```

### 5. Jalankan & perbaiki bertahap

```bash
npm run test:smoke -- --headed
npm run test:modules:sales:client-baru -- --headed
```

---

## Test Data

Data statis di `test-data/` sebagai JSON fallback:

```typescript
import { loadTestData } from '../utils/test-data.loader';

const defaults = loadTestData('sales-quotation.json');
// { customer: { search, option }, product: { search, option }, quantity }
```

Prioritas data: **ENV config** → **JSON fallback**.

---

## Report

| Tipe | Lokasi |
|------|--------|
| HTML | `reports/html/` |
| JSON | `reports/test-results/results.json` |
| Screenshot / video gagal | `reports/test-results/` |

```bash
npm run report
```

---

## Playwright Projects

| Project | Test match |
|---------|------------|
| `chromium` | Semua kecuali `tests/modules/` |
| `firefox` | Semua kecuali `tests/modules/` |
| `regression-sales` | `tests/modules/sales/**` |
| `regression-inventory` | `tests/modules/inventory/**` |
| `regression-purchasing` | `tests/modules/purchasing/**` |
| `regression-finance` | `tests/modules/finance/**` |

---

## Strategi Testing

### Lakukan

- Smoke test dulu: login → navigasi → CRUD → approval
- Simpan logic UI di **component/helper**, bukan di `.spec.ts`
- Override locator di Layer 2, jangan di helper generic
- Set `TIMEOUT=180000` untuk ERP yang lambat

### Hindari

- Hardcode CSS selector — gunakan `getByRole`, `getByLabel`
- Commit file `.env` berisi password
- Duplikasi flow yang sudah ada di helper

### Saat pindah client

1. Copy & edit `configs/{client}.env`
2. Sesuaikan data tes (customer, produk, warehouse)
3. Jalankan `--headed` untuk debug visual
4. Override locator di `projects/` hanya jika label UI berbeda

---

## Troubleshooting

### Config not found

```
Error: Config not found: configs/projectX.env
```

→ Buat file `configs/projectX.env` atau periksa nilai `PROJECT` di npm script.

### Timeout (90s exceeded)

→ Naikkan `TIMEOUT` di file `.env` client. ERP HashMicro biasanya butuh **180000 ms (3 menit)**.

### Modal "Oops / Something is updating" memblokir klik

→ Framework sudah punya `dismissBlockingDialogs()`. Jika masih muncul, tunggu server selesai update lalu jalankan ulang.

### Tombol Create tidak membuka form

→ Pastikan search box tidak aktif. Framework menekan `Escape` dan mengklik area form sebelum Create.

### Customer field tidak ketemu

→ Gunakan locator `getByRole('textbox', { name: 'Customer' })` di dalam `.o_form_view`, bukan hanya `[name="partner_id"]`.

### Selector tidak ketemu setelah pindah client

→ Update locator di `projects/{nama}/locators/`, bukan di helper generic.

### Browser belum terinstall

```bash
npx playwright install chromium
```

---

## Tech Stack

| Tool | Versi |
|------|-------|
| Playwright | ^1.52 |
| TypeScript | ^5.8 |
| dotenv | ^16.5 |
| cross-env | ^7.0.3 |

---

## Lisensi

Private — internal Hashmicro QA team.
