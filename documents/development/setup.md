# Development setup

How to get the stack running, with Docker or locally. Verification commands are in [testing.md](testing.md).

## Prerequisites

- **Node.js** 24, at the patch pinned in `backend-core/.nvmrc` (also the minimum in `engines` in `backend-core/package.json`; CI and the core image use the same version), managed with [fnm](https://github.com/Schniz/fnm), which picks it up from `.nvmrc`. On the maintainer's machine fnm is configured in the fish shell, so Node tooling (`node`, `pnpm`, `pnpm exec …`) runs from fish or from a shell where fnm is loaded (`eval "$(fnm env --use-on-cd)"`). Other commands work in any shell.
- **pnpm** 12 through corepack (`corepack enable pnpm`); the exact version is `packageManager` in `backend-core/package.json` and `client-preview/package.json`, and CI and the core image read it from there. Packages allowed to run install scripts are listed under `allowBuilds` in each `pnpm-workspace.yaml`. Never install with npm or yarn.
- **Docker** with Compose, for PostgreSQL, the full stack and the end-to-end tests.
- **[uv](https://docs.astral.sh/uv/)** for `backend-science`: it installs Python 3.15 (the version in `backend-science/.python-version`, used by CI and Docker too) and the locked dependencies.

## Environment files

None of these are versioned; each is created from its example.

| File | Created from | Used by |
| --- | --- | --- |
| `.env.compose` (repository root) | `.env.compose_example` | `docker compose`: ports, database credentials, `SCIENCE_SERVICE_URL` |
| `backend-core/.env.local` | `backend-core/.env.local_example` | The core outside Docker (loaded unless `NODE_ENV=production`) and the `prisma:*` scripts |
| `backend-core/.env.test` | `backend-core/.env.test_example` | End-to-end tests (database on port 5433) |

```bash
cp .env.compose_example .env.compose
cp backend-core/.env.local_example backend-core/.env.local
cp backend-core/.env.test_example backend-core/.env.test
```

## Install

```bash
cd backend-core
pnpm install
pnpm prisma generate
```

## Run with Docker

From `backend-core/`:

```bash
pnpm run docker:up      # docker-compose --env-file ../.env.compose up --build
pnpm run docker:down
```

| Container | URL | What it is |
| --- | --- | --- |
| `fn-postgres` | `localhost:5432` | PostgreSQL 17 |
| `fn-core` | `http://localhost:3000/docs` | NestJS, Swagger UI |
| `fn-science` | `http://localhost:8000/docs` | FastAPI docs |

On start `fn-core` runs `prisma generate`, `prisma db push --accept-data-loss`, the seed and `start:dev`, so the database always matches the schema; `fn-science` runs uvicorn with reload. Logs: `docker logs -f fn-core`.

## Run locally

**Core.** Start only the database, then the core with `.env.local`:

```bash
docker compose --env-file .env.compose up -d db-postgres     # from the repository root
cd backend-core
pnpm run prisma:push     # apply the schema (db push)
pnpm run prisma:seed
pnpm run start:dev
```

**Science.** From `backend-science/`, after `uv sync` ([Python environment](#python-environment)):

```bash
uv run uvicorn main:app --app-dir src --reload --port 8000
```

Set `SCIENCE_SERVICE_URL=http://localhost:8000` in `backend-core/.env.local` (the example already does).

## Python environment

`backend-science` is a [uv](https://docs.astral.sh/uv/) project: dependencies in `pyproject.toml` (runtime, and the `dev` group with pytest, pyright and ruff), exact versions in `uv.lock`. From `backend-science/`:

```bash
uv sync
```

It installs Python 3.15 if missing and creates `backend-science/.venv` with every dependency, dev group included. Each worktree gets its own `.venv`; uv's cache makes that fast. Run it again after pulling a change to `uv.lock`; `uv sync --frozen` installs exactly the lockfile, as CI and Docker do.

Then run any tool through uv, with no activation and no extra arguments: `uv run pytest`, `uv run pyright`, `uv run ruff check` ([verification commands](testing.md#verification-commands)). pytest and pyright find `src` and the environment through their settings in `pyproject.toml`.

**With direnv** (optional): `backend-science/.envrc` activates `.venv` and puts `src` on `PYTHONPATH`, so `pytest`, `pyright` and `uvicorn` work without `uv run`. Run `uv sync` first, then `direnv allow` once in `backend-science/`.

To add or update a dependency, see [science-service-flow.md § Dependencies](../../.agents/workflows/science-service-flow.md#dependencies).

## Seed

`pnpm run prisma:seed` (from `backend-core/`, with `.env.local`) runs `prisma/seed.ts`: the bootstrap categories and sample data. The Docker container runs it on every start. The profile-based generator (`empty`, `minimal`, `demo`, `edge`) replaces it in #90 (D-31).

## Schema changes

The schema is applied with `prisma db push`, not migrations, until the MVP (D-19). Before changing `prisma/schema.prisma`, follow [`.agents/workflows/database-migration-flow.md`](../../.agents/workflows/database-migration-flow.md).

## Toolchain

`backend-core` follows what `nest new` generates in NestJS 12 for an ESM project (`@nestjs/schematics` 12.0.13), with oxfmt instead of Prettier (D-53):

- **ESM:** `"type": "module"`, `.js` extensions on relative imports, `import.meta.dirname`, top-level `await bootstrap()`.
- **Build:** `tsconfig.build.json` compiles `src/` only (`rootDir: ./src`) into `dist/`, which `nest build` empties first (`deleteOutDir`); `pnpm build && pnpm start:prod` runs `node dist/main`. `prisma/` and `prisma.config.ts` are not built: the seed runs through `tsx`.
- **Tests:** Vitest, `vitest.config.ts` (unit, `*.spec.ts`) and `vitest.config.e2e.ts` (`*.e2e-spec.ts`), with globals; decorator metadata works without SWC.
- **Lint:** `oxlint --type-aware` (`oxlint-tsgolint`), rules in `.oxlintrc.json`.
- **Format:** oxfmt, options in `.oxfmtrc.json`.
- **TypeScript** stays on 6.0: the Nest CLI depends on `typescript ~6.0` ([roadmap § Open risks](../product/roadmap.md#open-risks)).

`client-preview` keeps the Angular CLI toolchain (`ng test` on Angular's Vitest builder) and uses oxfmt and oxlint with the same rules as the core.

### Divergences from `nest new`

| `nest new` | Here | Why |
| --- | --- | --- |
| Prettier | oxfmt, with the previous Prettier options (`singleQuote`, `trailingComma: all`, `printWidth: 80`) | D-53 |
| `vitest` and `@vitest/coverage-v8` ^4 | ^5.1 | Latest major, the one `client-preview` uses |
| `.oxlintrc.json` turns `no-explicit-any` off and `no-floating-promises` to error | The rules of the former ESLint setup (`@eslint/js` recommended, `typescript-eslint` `recommendedTypeChecked` and its overrides) at the same levels, on top of oxlint's default `correctness` category. oxlint has 88 of the 89; `no-octal` is missing, and octal literals are already a TypeScript error in strict mode | Carry the existing rules over (#109) |
| `lint` and `format` cover `src/` and `test/` | Also `prisma/` | The seed is application code |
| `vitest.config.e2e.ts` | Adds `setupFiles: ['./test/setup-e2e.ts']` (loads `.env.test`) and `fileParallelism: false` | The end-to-end files share one real database |
| `tsconfig.json` | Adds `noUnusedLocals`, `noUnusedParameters`, `forceConsistentCasingInFileNames`, and `multer` in `types` | Checks already in use; `multer` types the file upload |
| `@nestjs/mau` and the `deploy` script | Absent | The project does not deploy to Mau |
| Generated `AGENTS.md` | Not used | The repository has its own |
| Scaffold scripts only | Adds `format:check`, `test:e2e:docker`, `db:*`, `docker:*`, `prisma:*` | Project tasks |

In `client-preview`, `tsconfig.app.json` and `tsconfig.spec.json` set `rootDir: ./src`: `oxlint-tsgolint` is built on TypeScript 7, which requires it. Recorded as D-57.

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Port 3000 or 8000 already in use | Another core or uvicorn process | `lsof -i :3000` (or `:8000`), then stop that process |
| `fn-core` restarts in a loop | Database unreachable or invalid `.env.compose` | `docker logs fn-core`; check `.env.compose` against `.env.compose_example` |
| `fn-science` does not start | Missing Python dependency | `docker logs fn-science`; check that the dependency is in `pyproject.toml` and `uv.lock`, then `docker compose --env-file .env.compose up --build` from the repository root |
| `fn-postgres` never becomes healthy | Port 5432 taken or a corrupted volume | Free the port; `pnpm run docker:down`, then `docker volume rm` the `postgres_data` volume (erases local data) |
| `node` or `pnpm` not found, or the wrong version | Shell without fnm loaded | Run from fish, or `eval "$(fnm env --use-on-cd)"` |
| `fn-core` runs old dependencies after a dependency update | The `backend_core_modules` volume keeps the `node_modules` of the first build: Docker fills a named volume from the image only when it is empty | `pnpm run docker:down`, then `docker volume rm` the `backend_core_modules` and `backend_core_dist` volumes, then `pnpm run docker:up` |
| direnv does not activate the environment | `.envrc` not approved, or no `.venv` yet | `uv sync`, then `direnv allow` in `backend-science/` |
| `uv sync --frozen` fails, or `uv lock --check` fails in CI | `uv.lock` out of date with `pyproject.toml` | `uv lock` in `backend-science/` and commit `uv.lock` |
| `ModuleNotFoundError` in Python | `src` not on the path | pytest and pyright add it through `pyproject.toml`; for uvicorn pass `--app-dir src`, or use direnv |
