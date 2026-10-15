# Testing

The verification commands, how the end-to-end tests get their database, and what CI runs. Every pull request reports the output of the verification commands ([`AGENTS.md`](../../AGENTS.md#definition-of-done)).

## Verification commands

| What | Command | Where |
| --- | --- | --- |
| Types | `pnpm exec tsc --noEmit -p tsconfig.json` | `backend-core/` |
| Lint | `pnpm run lint` | `backend-core/` |
| Unit tests | `pnpm test` | `backend-core/` |
| End-to-end tests | `pnpm run test:e2e:docker` (needs Docker and `.env.test`) | `backend-core/` |
| Python tests | `python -m pytest tests/` (with the Python environment, see [setup.md](setup.md#python-environment)) | `backend-science/` |
| Python types | `pyright .` (`pip install pyright` in the environment) | `backend-science/` |

`pnpm run lint` runs ESLint with `--fix`: it rewrites files. Check `git status` afterwards and commit or discard the changes deliberately.

Run the Python commands when `backend-science/` or the contract with it changes.

Useful variants, from `backend-core/`:

- one file or pattern: `pnpm test -- transactions`;
- one test by name: `pnpm test -- -t "should calculate balance correctly"`;
- watch mode: `pnpm run test:watch`;
- coverage: `pnpm run test:cov` (report in `coverage/`).

## End-to-end tests

`pnpm run test:e2e:docker` runs four scripts in order:

1. `db:test:up` starts `fn-postgres-test` from `docker-compose.test.yml` on port **5433**, with its data in memory (`tmpfs`);
2. `db:test:push` applies the schema with `prisma db push`, using `.env.test`;
3. `test:e2e` runs Jest with `test/jest-e2e.json`, which loads `.env.test` and runs the `*.e2e-spec.ts` files serially (`--runInBand --detectOpenHandles`);
4. `db:test:down` removes the container.

If a run is interrupted, the container may stay up: `pnpm run db:test:down`.

The tests pass without the science service running, as they do in CI.

## CI

`.github/workflows/ci.yaml` runs on pushes and pull requests to `main` (and to `develop`, a branch name left over from before D-39) that touch `backend-core/`, `backend-science/` or the workflows. A first job detects which side changed; then:

| Job | Side | Steps |
| --- | --- | --- |
| `core-quality` | core | `pnpm install --frozen-lockfile`, `prisma generate`, `pnpm run lint`, `pnpm run format` |
| `core-unit-tests` | core | `pnpm test` |
| `core-e2e-tests` | core | PostgreSQL 17 as a service, `prisma db push`, `pnpm run test:e2e` |
| `science-quality` | science | Python 3.14, `pyright .`, `python -m pytest tests/`, `pip install --dry-run` of the requirements |
| `science-build` | science | Docker build of `backend-science` (no push) |

CI uses Node 24 and pnpm 10. `pnpm run format` rewrites files with Prettier and does not fail on unformatted code.

## Database sync method and CI

Until the MVP the end-to-end script and the `core-e2e-tests` job apply the schema with `prisma db push` (D-19). What a change of method must update is listed in [`AGENTS.md` § Database sync method](../../AGENTS.md#database-sync-method). The leftovers of `migrate` are not used until then ([database-migration-flow.md](../../.agents/workflows/database-migration-flow.md#do-not-use)).

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Port 5433 already in use | A previous test container is still up | `pnpm run db:test:down`, or `docker rm -f fn-postgres-test` |
| End-to-end tests hang | Open handles (database connection, HTTP) | Make sure `afterAll` closes the application and the Prisma client |
| `ECONNREFUSED` in end-to-end tests | Test database not ready, or `.env.test` missing | Run the full `test:e2e:docker` script; check `backend-core/.env.test` |
| `Cannot find module` in Jest | Stale Jest cache | `pnpm test -- --clearCache`, then run again |
| Unit tests fail after a schema change | Repository mocks no longer match | Update the mocks in the `*.spec.ts` files; run `pnpm prisma generate` |
| Python `ModuleNotFoundError` | `src` not on `PYTHONPATH` | Run from `backend-science/` with `python -m pytest tests/`, or use direnv |
