---
description: Start the backend stack (PostgreSQL, NestJS core, Python science service) with Docker Compose or locally.
---

# Start the backend

Details, local runs and troubleshooting: [`documents/development/setup.md`](../../documents/development/setup.md).

Node tooling (`pnpm`, `node`) runs from fish or from a shell with fnm loaded ([`AGENTS.md` § Tooling](../../AGENTS.md#tooling)).

1. **Environment.** `.env.compose` exists at the repository root; if not, create it from `.env.compose_example` ([Environment files](../../documents/development/setup.md#environment-files)).
2. **Start.** From `backend-core/`: `pnpm run docker:up`. The core container generates the Prisma client, applies the schema with `db push`, runs the seed and starts in watch mode.
3. **Check.** `docker ps` shows `fn-postgres` (healthy), `fn-core` and `fn-science`. Swagger answers on `http://localhost:3000/docs`, the FastAPI docs on `http://localhost:8000/docs`.
4. **If something fails.** `docker logs -f fn-core` (or `fn-science`), then the [troubleshooting table](../../documents/development/setup.md#troubleshooting).
5. **Stop.** From `backend-core/`: `pnpm run docker:down`.

To run a service outside Docker, follow [Run locally](../../documents/development/setup.md#run-locally).
