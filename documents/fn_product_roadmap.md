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
- [ ] **Local Rule Engine**: Allow the user to define "If description contains X then Category Y" directly from the interface.

### Phase 2: Connectivity and Real-time (Medium Term)

- **Open Banking Integration**: Automatic synchronization via PSD2 (GoCardless/Plaid) to eliminate manual Excel uploads.
- **Transfer Management**: Automatic identification of internal transfers between own assets to avoid "polluting" spending statistics.
- **Subscriptions**: Automatic detection of recurring payments with a calendar view.

### Phase 3: Investments and Wealth (Long Term)

- **Ticker Integration**: Automatic update of stock and crypto prices.
- **Multi-Currency**: Seamless management of assets in different currencies with historical exchange rates.
- **Tax Analysis**: Automatic estimation of capital gains taxes or property taxes (IVAFE/IMU).

---

## 🎯 Strategic Goal

Transform from a "reactive tracking" tool into a **proactive planning platform**, where the user doesn't just see how much they spent but is guided toward optimizing their savings and investments.
