---
description: Change the Prisma schema, apply it with db push, reset the database and reseed, keeping CI and scripts aligned.
---

# Schema changes, reset and seed

Until the MVP the schema is applied with **`prisma db push`**, without migration files, and the local database can be reset at any time (D-19). There is no `prisma/migrations/` folder: do not create one.

All commands run from `backend-core/`, from fish or a shell with fnm loaded. They use `backend-core/.env.local` ([Environment files](../../documents/development/setup.md#environment-files)); the database must be up (`fn-postgres`, see [start-backend.md](start-backend.md)).

## Before you start

- **The issue must say it touches the schema.** Only one open session changes `schema.prisma` at a time; if the issue does not declare it, stop and ask ([`AGENTS.md` § Rules](../../AGENTS.md#rules)).
- Read the data model in [`documents/domain/data-model.md`](../../documents/domain/data-model.md): the schema follows the spec, and a deviation updates the spec in the same pull request.

## Procedure

1. **Edit** `prisma/schema.prisma`. From Schema v2 (#89), every model carries `userId` and unique constraints and indexes include it, enforced by the mechanism of D-48 ([ADR-0001](../../documents/adr/0001-userid-on-all-models.md)). In v1 this does not apply: do not add `userId` to v1 models.
2. **Regenerate the client:** `pnpm prisma generate`.
3. **Apply** to the local database: `pnpm run prisma:push`. If the change cannot be applied over the existing data, reset:

   ```bash
   pnpm exec dotenv -e .env.local -- prisma db push --force-reset
   pnpm run prisma:seed
   ```

   This erases the local database. Imports must stay repeatable: the bank files are the source.
4. **Update the seed** (`prisma/seed.ts`, the profile generator after #90) in the same pull request: the seed always matches the current schema (D-31).
5. **Update the spec** (`documents/domain/data-model.md`) if the model changed.
6. **Verify** with [test-backend.md](test-backend.md). The end-to-end script applies the schema to a fresh test database with `db push`, so it catches a schema that does not apply.

## Do not use

`prisma:migrate`, `prisma:reset`, `prisma:deploy` and `db:test:migrate` are leftovers of `prisma migrate`. `prisma:migrate` would create a migrations folder, and `prisma:reset` (`migrate reset`) leaves an empty database when there are no migrations. Issue #89 removes or aligns them.

## Changing the method

When the project moves to `prisma migrate` (a baseline at the end of the MVP) or changes the method in any other way, update everything listed in [`AGENTS.md` § Database sync method](../../AGENTS.md#database-sync-method), in the same pull request.

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `db push` refuses because of data loss | The change drops or narrows a column with data | Reset with `--force-reset` as above (local data only) |
| Seed fails on a foreign key | Parents inserted after children | Insert parent entities first in the seed |
| `prisma generate` cannot find the schema | Wrong directory | Run from `backend-core/` |
| Cannot reach the database | `fn-postgres` down, or `DATABASE_URL` wrong in `.env.local` | `docker ps`; compare `.env.local` with `.env.local_example` |
| Port 5432 already in use | Another PostgreSQL running | `docker ps`, stop the conflicting container |
