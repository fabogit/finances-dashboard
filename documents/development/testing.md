# Testing

The verification commands, how the end-to-end tests get their database, and what CI runs. Every pull request reports the output of the verification commands ([`AGENTS.md`](../../AGENTS.md#definition-of-done)).

## Verification commands

| What | Command | Where |
| --- | --- | --- |
| Types | `pnpm exec tsc --noEmit -p tsconfig.json` | `backend-core/` |
| Lint | `pnpm run lint` | `backend-core/` |
| Format | `pnpm run format:check` (`pnpm run format` rewrites the files) | `backend-core/` |
| Unit tests | `pnpm test` | `backend-core/` |
| End-to-end tests | `pnpm run test:e2e:docker` (needs Docker and `.env.test`) | `backend-core/` |
| Client lint | `pnpm run lint` | `client-preview/` |
| Client format | `pnpm run format:check` (`pnpm run format` rewrites the files) | `client-preview/` |
| Client tests | `pnpm test --watch=false` | `client-preview/` |
| Client build | `pnpm build` | `client-preview/` |
| Python environment | `uv sync --frozen` (see [setup.md](setup.md#python-environment)) | `backend-science/` |
| Python lint | `uv run ruff check` | `backend-science/` |
| Python format | `uv run ruff format --check` (`uv run ruff format` rewrites the files) | `backend-science/` |
| Python types | `uv run pyright` | `backend-science/` |
| Python tests | `uv run pytest` | `backend-science/` |

The core runs on the toolchain of `nest new` (ESM, Vitest, `oxlint --type-aware`) with oxfmt for formatting ([setup.md § Toolchain](setup.md#toolchain)). `pnpm run lint` and `pnpm run format:check` only report; neither rewrites files.

Run the Python commands when `backend-science/` or the contract with it changes, and the client commands when `client-preview/` changes.

Useful variants, from `backend-core/`:

- one file or pattern: `pnpm test transactions`;
- one test by name: `pnpm test -t "should calculate balance correctly"`;
- watch mode: `pnpm run test:watch`;
- coverage: `pnpm run test:cov` (V8 coverage, report in `coverage/`);
- debugger: `pnpm run test:debug` (Vitest with `--inspect-brk`, files one at a time).

## End-to-end tests

`pnpm run test:e2e:docker` runs four scripts in order:

1. `db:test:up` starts `fn-postgres-test` from `docker-compose.test.yml` on port **5433**, with its data in memory (`tmpfs`);
2. `db:test:push` applies the schema with `prisma db push`, using `.env.test`;
3. `test:e2e` runs Vitest with `vitest.config.e2e.ts`: `test/setup-e2e.ts` loads `.env.test`, and the `*.e2e-spec.ts` files run one at a time (`fileParallelism: false`), because they share the database;
4. `db:test:down` removes the container.

If a run is interrupted, the container may stay up: `pnpm run db:test:down`.

The tests pass without the science service running, as they do in CI.

## CI

`.github/workflows/ci.yaml` runs on every push and pull request to `main`, with no `paths` filter on the triggers, so the checks required by the `main` ruleset are always reported. A first job, `changes`, detects which side changed (`backend-core/`, `backend-science/`, `client-preview/`, or `ci.yaml` itself, which counts for all three) and the other jobs run only for their side. A job skipped this way counts as passed, so a pull request that touches only the documents, or only the client (whose job is not required), can merge. The jobs:

| Job | Side | Steps |
| --- | --- | --- |
| `core-quality` | core | `pnpm install --frozen-lockfile`, `prisma generate`, `pnpm run lint`, `pnpm run format:check`, `tsc --noEmit` |
| `core-unit-tests` | core | `pnpm test` |
| `core-e2e-tests` | core | PostgreSQL 17 as a service, `prisma db push`, `pnpm run test:e2e` |
| `science-quality` | science | uv and Python 3.15, `uv lock --check`, `uv sync --frozen`, `ruff check`, `ruff format --check`, `pyright`, `pytest` |
| `science-build` | science | Docker build of `backend-science` (no push) |
| `client-quality` | client | `pnpm install --frozen-lockfile`, `pnpm run lint`, `pnpm run format:check`, `pnpm test --watch=false`, `pnpm build`; not a required check |

CI reads the Node version from `backend-core/.nvmrc` and the pnpm version from `packageManager` in `backend-core/package.json`, the same versions as local development and the core image; `client-quality` takes Node from the same file and pnpm from `client-preview/package.json`. `format:check` fails on unformatted code. The required checks of the `main` ruleset are `core-quality`, `core-unit-tests` and `core-e2e-tests`.

## Database sync method and CI

Until the MVP the end-to-end script and the `core-e2e-tests` job apply the schema with `prisma db push` (D-19). What a change of method must update is listed in [`AGENTS.md` § Database sync method](../../AGENTS.md#database-sync-method). The leftovers of `migrate` are not used until then ([database-migration-flow.md](../../.agents/workflows/database-migration-flow.md#do-not-use)).

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Port 5433 already in use | A previous test container is still up | `pnpm run db:test:down`, or `docker rm -f fn-postgres-test` |
| End-to-end tests hang | Open handles (database connection, HTTP) | Make sure `afterAll` closes the application and the Prisma client |
| `ECONNREFUSED` in end-to-end tests | Test database not ready, or `.env.test` missing | Run the full `test:e2e:docker` script; check `backend-core/.env.test` |
| `Cannot find module '.prisma/client/default'` | Prisma client not generated for the installed `@prisma/client` (after `pnpm install` or `pnpm add`) | `pnpm prisma generate`, then run again |
| `format:check` fails | Unformatted code | `pnpm run format`, then commit |
| Unit tests fail after a schema change | Repository mocks no longer match | Update the mocks in the `*.spec.ts` files; run `pnpm prisma generate` |
| Python `ModuleNotFoundError` | Environment missing or not up to date | `uv sync` in `backend-science/`, then `uv run pytest` from there |
