# Development setup

How to get the stack running, with Docker or locally. Verification commands are in [testing.md](testing.md).

## Prerequisites

- **Node.js** ≥ 24.12 (`engines` in `backend-core/package.json`), managed with [fnm](https://github.com/Schniz/fnm). On the maintainer's machine fnm is configured in the fish shell, so Node tooling (`node`, `pnpm`, `pnpm exec …`) runs from fish or from a shell where fnm is loaded (`eval "$(fnm env --use-on-cd)"`). Other commands work in any shell.
- **pnpm** 10 through corepack (`corepack enable pnpm`); the exact version is `packageManager` in `backend-core/package.json`. Never install with npm or yarn.
- **Docker** with Compose, for PostgreSQL, the full stack and the end-to-end tests.
- **Python** 3.14, the version CI uses, for `backend-science`.

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

**Science.** From `backend-science/`, with the Python environment active:

```bash
env PYTHONPATH=src uvicorn src.main:app --reload --port 8000
```

Set `SCIENCE_SERVICE_URL=http://localhost:8000` in `backend-core/.env.local` (the example already does).

## Python environment

Any virtual environment with `backend-science/requirements.txt` installed works. Two ways:

- **With direnv:** `backend-science/.envrc` creates and activates a virtual environment (`layout python`, kept in the ignored `.direnv/`) and adds `src` to `PYTHONPATH`. Run `direnv allow` once in `backend-science/`, then `pip install -r requirements.txt`.
- **Without direnv** (CI, agents, worktrees): one environment outside the repository, shared by every worktree.

  ```bash
  python3 -m venv ~/.venvs/finances-science
  ~/.venvs/finances-science/bin/pip install -r backend-science/requirements.txt
  ```

  Recreate it when `requirements.txt` changes.

In either environment, install **pyright** for the type check, as CI does: it is not in `requirements.txt`.

```bash
pip install pyright
```

pyright resolves imports through the active Python interpreter. With direnv the environment is already active; with the external environment, activate it or point pyright at it, otherwise every third-party import is reported as missing:

```bash
~/.venvs/finances-science/bin/pyright --pythonpath ~/.venvs/finances-science/bin/python .
```

## Seed

`pnpm run prisma:seed` (from `backend-core/`, with `.env.local`) runs `prisma/seed.ts`: the bootstrap categories and sample data. The Docker container runs it on every start. The profile-based generator (`empty`, `minimal`, `demo`, `edge`) replaces it in #90 (D-31).

## Schema changes

The schema is applied with `prisma db push`, not migrations, until the MVP (D-19). Before changing `prisma/schema.prisma`, follow [`.agents/workflows/database-migration-flow.md`](../../.agents/workflows/database-migration-flow.md).

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Port 3000 or 8000 already in use | Another core or uvicorn process | `lsof -i :3000` (or `:8000`), then stop that process |
| `fn-core` restarts in a loop | Database unreachable or invalid `.env.compose` | `docker logs fn-core`; check `.env.compose` against `.env.compose_example` |
| `fn-science` does not start | Missing Python dependency | `docker logs fn-science`; check `requirements.txt` |
| `fn-postgres` never becomes healthy | Port 5432 taken or a corrupted volume | Free the port; `pnpm run docker:down`, then `docker volume rm` the `postgres_data` volume (erases local data) |
| `node` or `pnpm` not found, or the wrong version | Shell without fnm loaded | Run from fish, or `eval "$(fnm env --use-on-cd)"` |
| direnv does not activate the environment | `.envrc` not approved | `direnv allow` in `backend-science/` |
| `ModuleNotFoundError` in Python | `src` not on `PYTHONPATH` | Use direnv, or prefix the command with `env PYTHONPATH=src` |
