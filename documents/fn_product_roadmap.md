# Product Roadmap & User Journey

This document outlines the current user experience and the future vision for the Finance Dashboard.

## 👤 User Journey (Current State)

1.  **Initial Setup**: The user defines their Assets (Accounts, Wallets, Properties).
2.  **Budget Setup**: Spending caps are created for macro-categories (Home, Leisure, Transport).
3.  **Data Ingestion**: The user uploads their bank's Excel export. The system automatically categorizes 80-90% of the transactions.
4.  **Review**: The user manually corrects "Unclassified" transactions.
5.  **Monitoring**: Visualization of monthly trends and monitoring of progress toward Savings Goals.

---

## 🗺️ Evolutionary Roadmap

### Phase 1: Automation and Control (Short Term)

- [x] **Category-to-Goal Automation**: Implemented link between Categories, Assets, and Savings Goals for real-time updates.
- [x] **ML Projections**: Integrated Science Service for ETA estimation of goals.
- [ ] **Local Rule Engine & Payees**: Allow the user to define "If description contains X then Category Y" and extract clean Payee entities (e.g. "Amazon" instead of bank text) for autocompletion.
- [ ] **Dynamic CSV Import & Review**: Allow dynamic column mapping for statement uploads, showing a pre-import screen to review, edit, or discard individual transaction lines before saving.

### Phase 2: Connectivity and Real-time (Medium Term)

- **Subscriptions**: Automatic detection of recurring payments with a calendar view.
- **Transfer Management (Strategy C)**: Automatic identification of internal transfers between own assets using date/amount euristics and user confirmation to avoid polluting cash flow statistics.

### Phase 3: Investments and Wealth (Long Term)

- **Ticker Integration**: Automatic update of stock and crypto prices.
- **Multi-Currency**: Seamless management of assets in different currencies with historical exchange rates.
- **Tax Analysis**: Automatic estimation of capital gains taxes or property taxes (IVAFE/IMU).

---

## 🏗️ GitHub Milestone Alignment

### ✅ Completed Milestones

| # | Milestone | Issues | Stato |
|---|-----------|--------|-------|
| 1 | Phase 1: Foundations & Data Ingestion | 8/8 ✅ | 🟢 Closed |
| 2 | Phase 2: Python Science Service & Core Integration | 6/6 ✅ | 🟢 Closed |
| 3 | Phase 3: Data Persistence & Business Logic | 6/6 ✅ | 🟢 Closed |
| 4 | Phase 4: Analytics, CRUD & Dashboard APIs | 8/8 ✅ | 🟢 Closed |
| 5 | Phase 5: Budgeting System & Advanced Category Management | 10/10 ✅ | 🟢 Closed |
| 6 | Phase 6: Quality Assurance & CI/CD Pipeline | 10/10 ✅ | 🟢 Closed |

### 🟡 Open Milestones

| # | Milestone | Open | Closed | Key Features |
|---|-----------|------|--------|-------------|
| 7 | Phase 7: Wealth Management & Goal Setting | 7 | 4 | API Refactoring (#73), Internal Transfers (#74), Asset History (#60), Net Worth (#61), Forecast refactor (#77), QUERY method (#80), ExchangeRate (#81) |
| 8 | Phase 8: Security, Authentication & Multi-tenancy | 4 | 0 | Auth foundation (#62), Multi-tenancy (#63), RBAC (#64), Demo Sandbox (#65) |
| 9 | Phase 9: Advanced Features & Tauri Desktop | 2 | 0 | Subscriptions (#78), Local Rule Engine (#79) |

### Client & Desktop (Future — no GitHub milestone yet)

- **Angular Client**: Full frontend implementation connected to backend APIs.
- **i18n (Multi-Language)**: Client-side translation support using local asset JSONs (Default: EN; supported: IT, FR, ES, DE, PT).
- **Tauri Desktop Compilation**: Compile the Angular client into a lightweight desktop app.
  - **Distribution A (Cloud/Docker-link)**: Native wrapper connecting to a centralized NestJS/Postgres/Python Docker backend.
  - **Distribution B (Local-Offline-First)**: Fully bundled desktop app containing local SQLite database and Python/Node sidecars running locally (packaged size ~1-2GB).

---

## 🎯 Strategic Goal

Transform from a "reactive tracking" tool into a **proactive planning platform**, where the user doesn't just see how much they spent but is guided toward optimizing their savings and investments.
