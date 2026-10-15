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
├── requirements.txt
└── .envrc                 # direnv: virtual environment and PYTHONPATH
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

The core reaches Python through `SCIENCE_SERVICE_URL`. Today that is the `ScienceService` HTTP proxy; issue #96 replaces it with the `ScienceClient` interface (timeouts, retries, circuit breaker, D-21). Every caller must handle the service being unavailable: degrade the feature, never fail an unrelated operation.

## Dependencies

With the environment active, from `backend-science/`:

```bash
pip install <package>
pip freeze > requirements.txt
```

Check that `requirements.txt` has no platform-specific or path entries.

## Verify

Run the Python rows of [Verification commands](../../documents/development/testing.md#verification-commands), with the environment of [setup.md](../../documents/development/setup.md#python-environment). If the contract changed, run the core's rows too ([test-backend.md](test-backend.md)).

With the stack running, the FastAPI docs are on `http://localhost:8000/docs`.

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `ModuleNotFoundError` | `src` not on `PYTHONPATH` | `direnv allow`, or `env PYTHONPATH=src …`, or `python -m pytest tests/` from `backend-science/` |
| The core cannot reach Python | Container down or wrong URL | `docker ps`; check `SCIENCE_SERVICE_URL` (`http://backend-science:8000` in Compose, `http://localhost:8000` locally) |
| Pydantic validation error from the core | DTOs out of sync | Compare the Pydantic models with the TypeScript DTOs in `src/modules/science/` |
| `pip freeze` lists system packages | Environment not active | Activate it before freezing |
| pandas `SettingWithCopyWarning` | Writing to a slice | Use `.loc[]` or `.copy()` |
