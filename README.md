# 💰 Personal Finance Dashboard

A powerful, automated financial management platform featuring ML-driven projections and intelligent expense categorization.

## 🏗️ Architecture
The system consists of two main services:
- **[Backend Core](./backend-core)**: NestJS server handling business logic, database (Prisma), and user flows.
- **[Backend Science](./backend-science)**: Python FastAPI service for data cleaning, ML forecasts, and savings projections.

## 🚀 Quick Start (Docker)

### 1. Configure Environment
```bash
cp .env.compose.example .env.compose
```

### 2. Launch Services
```bash
pnpm run docker:up
```
*Note: Make sure you have `pnpm` installed, or use `docker-compose --env-file .env.compose up --build`*

---

## 🧪 Testing
- **E2E Tests**: Run `pnpm run test:e2e:docker` in `backend-core`.
- **Unit Tests**: Run `pnpm run test` in `backend-core`.

---

## 📚 Documentation
- [System Architecture](./fn_architecture.md)
- [Product Roadmap](./fn_product_roadmap.md)
- [Science Integration](./fn_science_integration.md)
- [Codebase Analysis](./fn_codebase_analysis.md)