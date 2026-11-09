---
description: Develop and test the Python/FastAPI science service and keep its contract with the NestJS core in sync.
---

# Science service

`backend-science` is a **computation service**: forecasts, goal projections and, later, machine-learning suggestions. It is optional and degradable: the core must keep working when it is down. Parsing, mapping, rules, deduplication and the import preview belong to the core, not here ([ADR-0005](../../documents/adr/0005-python-science-service-rest.md)).

The contract (endpoints, payloads, failure handling) is in [`documents/architecture/science-contract.md`](../../documents/architecture/science-contract.md). It is the single place where endpoints are listed.

## Layout

```text
backend-science/
├── src/
│   ├── main.py            # FastAPI app, Pydantic models, routes
│   └── modules/
│       ├── processor.py   # v1 import cleaning (POST /process), retired in v2
│       ├── forecaster.py  # forecast and goal projection
│       ├── rules.py       # v1 static category dictionary, retired in v2
│       └── util/
├── tests/                 # pytest
├── pyproject.toml         # dependencies and the pytest, pyright and ruff settings
├── uv.lock                # exact versions, committed
├── .python-version        # Python 3.15, read by uv, CI and Docker
└── .envrc                 # direnv: activates .venv and puts src on PYTHONPATH
```

## Change or add an endpoint

1. Pydantic input and output models in `src/main.py` (or a dedicated module).
2. Logic in `src/modules/`.
3. The route in `src/main.py`.
4. Tests in `tests/`, written first.
5. In the same pull request:
   - the TypeScript DTOs and the caller in `backend-core/src/modules/science/`;
   - [`science-contract.md`](../../documents/architecture/science-contract.md).
6. Money stays `Decimal`; remember that it travels as a JSON string ([Types](../../documents/architecture/science-contract.md#types)).

New functionality is computation only. If a change would move domain logic into Python (parsing, categorisation rules, persistence), stop and ask: it contradicts ADR-0005.

## Calling it from the core

The core reaches Python through `SCIENCE_SERVICE_URL`. Today that is the `ScienceService` HTTP proxy, with timeouts, retries and HTTP errors configured from the environment ([failure handling](../../documents/architecture/science-contract.md#failure-handling)); issue #96 replaces it with the `ScienceClient` interface (timeouts, retries, circuit breaker, D-21). Every caller must handle the service being unavailable: degrade the feature, never fail an unrelated operation.

## Dependencies

Dependencies are managed with uv, from `backend-science/`; never edit `uv.lock` by hand, and commit it with `pyproject.toml`.

```bash
uv add <package>                  # runtime dependency
uv add --dev <package>            # dev group: test and quality tools
uv lock --upgrade-package <name>  # update one package within its bounds
uv lock --upgrade                 # update everything
uv tree --outdated                # what has a newer version
```

`pyproject.toml` keeps lower bounds only; `uv.lock` pins the exact versions. A hold is an upper bound with a comment explaining why. After an update, run the verification below and `docker compose --env-file .env.compose up --build` from the repository root: the image installs with `uv sync --frozen --no-dev`.

## Verify

Run the Python rows of [Verification commands](../../documents/development/testing.md#verification-commands), with the environment of [setup.md](../../documents/development/setup.md#python-environment). If the contract changed, run the core's rows too ([test-backend.md](test-backend.md)).

With the stack running, the FastAPI docs are on `http://localhost:8000/docs`.

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `ModuleNotFoundError` | Environment missing or stale, or `src` not on the path | `uv sync`; run tools with `uv run` from `backend-science/`; uvicorn needs `--app-dir src` |
| The core cannot reach Python | Container down or wrong URL | `docker ps`; check `SCIENCE_SERVICE_URL` (`http://backend-science:8000` in Compose, `http://localhost:8000` locally) |
| Pydantic validation error from the core | DTOs out of sync | Compare the Pydantic models with the TypeScript DTOs in `src/modules/science/` |
| `uv lock --check` fails in CI | `pyproject.toml` changed without `uv lock` | `uv lock` and commit `uv.lock` |
| `ruff format --check` fails in CI | Unformatted code | `uv run ruff format`, then commit |
| pandas `SettingWithCopyWarning` | Writing to a slice | Use `.loc[]` or `.copy()` |
