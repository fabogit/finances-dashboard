# Finance Science Service

The computation service of the finance dashboard: forecasts and goal projections with pandas and scikit-learn, behind a FastAPI app. What it does and how the core calls it: [science contract](../documents/architecture/science-contract.md); how to change it: [science-service-flow.md](../.agents/workflows/science-service-flow.md).

## Environment

A [uv](https://docs.astral.sh/uv/) project: dependencies in `pyproject.toml`, exact versions in `uv.lock`, Python 3.15 from `.python-version`. From this directory:

```bash
uv sync                                                    # create .venv with every dependency
uv run uvicorn main:app --app-dir src --reload --port 8000 # run the service
```

Details, including direnv: [setup.md § Python environment](../documents/development/setup.md#python-environment).

**IDE:** select `backend-science/.venv/bin/python` as the interpreter. pyright reads its settings from `[tool.pyright]` in `pyproject.toml`.

## Layout

- `src/main.py`: FastAPI app, Pydantic models, routes.
- `src/modules/forecaster.py`: forecast and goal projection.
- `src/modules/processor.py`, `src/modules/rules.py`: v1 import cleaning and static categories, retired in v2.
- `tests/`: pytest.

With the service running, the Swagger UI is at <http://localhost:8000/docs>.

## Verify

```bash
uv run ruff check
uv run ruff format --check
uv run pyright
uv run pytest
```

The same commands run in CI (`science-quality` job), followed by a Docker build: [testing.md](../documents/development/testing.md).
