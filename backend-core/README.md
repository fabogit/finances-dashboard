# 💰 Finance Dashboard - Backend Core

Backend Core engine for the Finance Dashboard project. Built with **NestJS**, **Prisma ORM**, and **PostgreSQL**.

## 🚀 Features

- **Transaction Engine**: Multi-stage import (CSV/XLSX -> Science Enrichment -> DB).
- **Automated Savings**: Linking categories to Assets and Savings Goals for real-time balance updates.
- **ML Projections**: Integration with Python Science Service for goal completion ETAs.
- **ACID Transactions**: Financial consistency guaranteed via database-level transactions.
- **Swagger Documentation**: Interactive API testing available at `/docs`.

---

## 🛠️ Prerequisites

- **Node.js**: >= 24.12.0
- **pnpm**: >= 10.25.0
- **Docker**: For PostgreSQL and Science Service containers.

---

## 📦 Installation

```bash
# Clone the repository and navigate to backend-core
cd backend-core

# Install dependencies
pnpm install
```

---

## 🎬 Running the Project

### 1. Environment Setup

Copy the example environment files:

```bash
# In backend-core
cp .env.local_example .env.local
cp .env.test_example .env.test

# In the project root
cp ../.env.compose_example ../.env.compose
```

### 2. Infrastructure (Docker)

Start the database and science service:

```bash
# From the project root or backend-core
pnpm run docker:up
```

### 3. Application Startup

```bash
# Development (watch mode)
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

---

## 🗄️ Database Management (Prisma)

Until the MVP the schema is applied with `prisma db push`, without migrations. See [`.agents/workflows/database-migration-flow.md`](../.agents/workflows/database-migration-flow.md) before changing the schema.

```bash
# Apply the schema to the local database
pnpm run prisma:push

# Seed the local database
pnpm run prisma:seed

# Open Prisma Studio (UI for database)
pnpm run prisma:studio

# Generate Prisma Client
pnpm run prisma:generate
```

---

## 🧪 Testing

### Unit Tests

Comprehensive unit tests for services and repositories (90%+ coverage).

```bash
# Run all unit tests
pnpm run test

# Run with coverage report
pnpm run test:cov
```

### E2E Tests (Integration)

Requires a running test database.

```bash
# 1-step command (Docker up -> db push -> Test -> Docker down)
pnpm run test:e2e:docker

# Manual run (if test DB is already up)
pnpm run test:e2e
```

---

## CI/CD 🤖

The core module is part of the global GitHub Actions workflow. Every push to `backend-core/**` triggers:

1. **Quality Check**: Linting and formatting verification.
2. **Security**: Prisma Client generation and dependency audit.
3. **Unit Testing**: Full Jest suite execution.
4. **Integration**: E2E tests run against a live Postgres service container.

**Intelligent CI**: The pipeline is optimized with path-filtering, meaning `core` jobs only run when relevant files are modified.

---

## 📚 API Documentation

Once the server is running, visit:
**[http://localhost:3000/docs](http://localhost:3000/docs)** (default)

---

## 🏗️ Architecture

For architecture, decisions and the roadmap, start from the [project documentation](../documents/README.md); agent rules are in [`AGENTS.md`](../AGENTS.md).
