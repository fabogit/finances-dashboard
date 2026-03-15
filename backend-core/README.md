# 💰 Finance Dashboard - Backend Core

Backend Core engine for the Finance Dashboard project. Built with **NestJS**, **Prisma ORM**, and **PostgreSQL**.

## 🚀 Features

- **Transaction Engine**: Multi-stage import (CSV/XLSX -> Science Enrichment -> DB).
- **Automated Savings**: Linking categories to Assets and Savings Goals for real-time balance updates.
- **ML Projections**: Integration with Python Science Service for goal completion ETAs.
- **ACID Transactions**: Financial consistency guaranteed via database-level transactions.
- **Swagger Documentation**: Interactive API testing available at `/api`.

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
cp .env.example .env.local
cp .env.test.example .env.test

# In the project root
cp ../.env.compose.example ../.env.compose
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

```bash
# Run migrations (dev)
pnpm run prisma:migrate

# Reset database (Deletes all data)
pnpm run prisma:reset

# Open Prisma Studio (UI for database)
pnpm run prisma:studio

# Generate Prisma Client
pnpm run prisma:generate
```

---

## 🧪 Testing

### Unit Tests

```bash
pnpm run test
```

### E2E Tests (Integration)

Requires a running test database.

```bash
# 1-step command (Docker up -> Migrate -> Test -> Docker down)
pnpm run test:e2e:docker

# Manual run (if test DB is already up)
pnpm run test:e2e
```

---

## 📚 API Documentation

Once the server is running, visit:
**[http://localhost:3000/docs](http://localhost:3000/docs)** (default)

---

## 🏗️ Architecture

For deep architectural details, refer to the root documentation:

- [System Architecture](../fn_architecture.md)
- [Science Integration](../fn_science_integration.md)
- [Product Roadmap](../fn_product_roadmap.md)
