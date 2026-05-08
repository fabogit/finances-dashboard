# 💰 Personal Finance Dashboard

A powerful, automated financial management platform featuring ML-driven projections and intelligent expense categorization.

## 🏗️ Architecture & Stack

The system is built on a modern, modular architecture:

- **[Backend Core](./backend-core)**: NestJS 11 server running on Node 24. Handles business logic via a strict `src/modules/` architecture. Uses Prisma ORM 7.8.0 for PostgreSQL.
- **[Backend Science](./backend-science)**: Python FastAPI service running from `src/`. Handles data cleaning, ML forecasts, and savings projections using Pandas.

## 🚀 Quick Start (Docker)

### 1. Configure Environment

```bash
cp .env.compose.example .env.compose
```

### 2. Launch Services

```bash
pnpm run docker:up
```

_Note: Make sure you have `pnpm` installed, or use `docker-compose --env-file .env.compose up --build`_

---

## 🧪 Testing

- **E2E Tests**: Run `pnpm run test:e2e:docker` in `backend-core`.
- **Unit Tests**: Run `pnpm run test` in `backend-core`.

---

## 📚 Documentation

- [System Architecture](./documents/fn_architecture.md)
- [Product Roadmap](./documents/fn_product_roadmap.md)
- [Science Integration](./documents/fn_science_integration.md)
- [Codebase Analysis](./documents/fn_codebase_analysis.md)
- [Data Dictionary](./documents/fn_data_dictionary.md)
