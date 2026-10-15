---
description: Run the verification commands (types, lint, unit, end-to-end, Python) and report their real output.
---

# Verify a change

Run this before reporting results or asking for the go-ahead on a pull request. Details and troubleshooting: [`documents/development/testing.md`](../../documents/development/testing.md).

1. **Prerequisites.** `backend-core/.env.test` exists (from `.env.test_example`); Docker is running; port 5433 is free. For Python, the environment from [setup.md](../../documents/development/setup.md#python-environment) is installed.
2. **Run the commands** of [Verification commands](../../documents/development/testing.md#verification-commands), in this order, from `backend-core/`:
   1. `pnpm exec tsc --noEmit -p tsconfig.json`
   2. `pnpm run lint`, then `git status`: lint fixes files in place
   3. `pnpm test`
   4. `pnpm run test:e2e:docker`
3. **Python**, when `backend-science/` or its contract changed, from `backend-science/`: `python -m pytest tests/` and `pyright .`.
4. **Report** the real output: the summary lines (`Tests: … passed`, `… passed in …s`) and every failure in full. Never summarise a run as "all green" without the output.
5. **On failure**, see [Troubleshooting](../../documents/development/testing.md#troubleshooting); a test that fails before your change is reported as such, not fixed silently.
