---
description: Per-user data isolation (userId, request context, Prisma extension, raw SQL) — what holds today and what is being built.
---

# Multi-tenancy and data isolation

Every row belongs to a user, and no request may read or change another user's data. The decisions: [ADR-0001](../../documents/adr/0001-userid-on-all-models.md) (`userId` on every model), D-18 (applied in Schema v2), D-48 (isolation enforced before authentication). Overview: [architecture § Multi-tenancy](../../documents/architecture/overview.md#multi-tenancy).

## Today (v1)

What v1 has is described in [architecture § Multi-tenancy](../../documents/architecture/overview.md#multi-tenancy) (the "v1 difference"). The consequence for code: there is no request context and no Prisma extension yet, so do not write code that assumes either exists.

## Being built (M2, D-48)

1. **Every model carries `userId`.** Unique constraints and indexes include it: a name, a hash or a key is unique per user (or per account), never globally.
2. **Request context.** A middleware stores the request's user in `nestjs-cls`. Until authentication exists it is a fixed user from configuration; afterwards a JWT guard sets it (#62, #63), and nothing else changes.
3. **Prisma extension.** It adds `where: { userId }` to every query and sets `userId` on every create. Repositories using the Prisma Client API therefore **do not** add the filter by hand.

```typescript
// The extension scopes this to the current user.
const accounts = await this.prisma.asset.findMany();

// Redundant: duplicates the extension and drifts from it.
const userId = this.cls.get('userId');
const scoped = await this.prisma.asset.findMany({ where: { userId } });
```

4. **Raw SQL is the exception.** Extensions do not see `$queryRaw` or `$executeRaw`. Every raw query reads the user from the context and filters explicitly.

```typescript
const userId = this.cls.get<string>('userId');
const rows = await this.prisma.$queryRaw<Row[]>`
  SELECT "id", "name" FROM "Asset" WHERE "userId" = ${userId}
`;
```

5. **References carry the owner (D-111).** The extension filters reads, not foreign keys: without more, user A could save a transaction with user B's `categoryId`, and B could then no longer delete that category. Every foreign key between models is therefore composite, `(userId, xId) → X(userId, id)`, with `@@unique([userId, id])` on the referenced model ([data model § Conventions](../../documents/domain/data-model.md#conventions)). The database rejects a reference to another user's row from any path: the Prisma Client, raw SQL, the seed, bulk endpoints.

```prisma
model Transaction {
  userId     String
  categoryId String?
  category   Category? @relation(fields: [userId, categoryId], references: [userId, id])
}

model Category {
  id     String @id @default(uuid())
  userId String
  @@unique([userId, id])
}
```

6. **One isolation test per foreign key (#108).** For every reference (category, payee, account, transfer counterpart, import template, goal account), an end-to-end test writes with the id of another user's row and expects a 4xx.

Every `userId` is a foreign key to the `User` table ([data model](../../documents/domain/data-model.md#user), D-58). The seed creates the fixed user, and can create a second one so that tests catch leaks.

## Not decided yet

D-48 fixes the mechanism above, not these details. The issue that builds it (M2) settles them with the maintainer; until then, do not pick one silently.

- **An empty context** (no user): reject the request or query, or run without a user? The pre-v2 version of this workflow let system jobs run without raising.
- **System actions** (seed, bootstrap of a new user's categories): run inside an explicit context for the user they write for (for example `this.cls.runWith({ userId }, …)`), or bypass the extension?
- **Isolation tests beyond the foreign keys:** which tests every model and every raw query must have (for example: with user A in the context, user B's rows are invisible to reads and untouched by updates and deletes). The test per foreign key is decided (D-111, point 6 above).

## After the MVP

Authentication, roles and the demo sandbox (#62–#65) plug into the same context. Open questions about roles and guests are in [open-questions.md](../../documents/product/open-questions.md).
