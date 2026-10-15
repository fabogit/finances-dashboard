---
description: Per-user data isolation (userId, request context, Prisma extension, raw SQL) — what holds today and what is being built.
---

# Multi-tenancy and data isolation

Every row belongs to a user, and no request may read or change another user's data. The decisions: [ADR-0001](../../documents/adr/0001-userid-on-all-models.md) (`userId` on every model), D-18 (applied in Schema v2), D-48 (isolation enforced before authentication). Overview: [architecture § Multi-tenancy](../../documents/architecture/overview.md#multi-tenancy).

## Today (v1)

- `userId` exists only on `Asset`, `Category` and `SavingsGoal`, with the default `"demo_user"`.
- **Nothing filters by user.** There is no request context and no Prisma extension yet; do not write code that assumes either exists.

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

Whether `userId` references a `User` table is decided by the v2 data model (#104). The seed can create two users, so that tests catch leaks.

## Not decided yet

D-48 fixes the mechanism above, not these details. The issue that builds it (M2) settles them with the maintainer; until then, do not pick one silently.

- **An empty context** (no user): reject the request or query, or run without a user? The pre-v2 version of this workflow let system jobs run without raising.
- **System actions** (seed, bootstrap of a new user's categories): run inside an explicit context for the user they write for (for example `this.cls.runWith({ userId }, …)`), or bypass the extension?
- **Isolation tests:** which tests every model and every raw query must have (for example: with user A in the context, user B's rows are invisible to reads and untouched by updates and deletes).

## After the MVP

Authentication, roles and the demo sandbox (#62–#65) plug into the same context. Open questions about roles and guests are in [open-questions.md](../../documents/product/open-questions.md).
