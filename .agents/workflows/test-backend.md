---
description: Run the verification commands (types, lint, unit, end-to-end, Python) and report their real output.
---

# Verify a change

Run this before reporting results or asking for the go-ahead on a pull request. Details and troubleshooting: [`documents/development/testing.md`](../../documents/development/testing.md).

1. **Prerequisites.** `backend-core/.env.test` exists (from `.env.test_example`); Docker is running; port 5433 is free. For Python, the environment from [setup.md](../../documents/development/setup.md#python-environment) is installed.
2. **Run every command** in [Verification commands](../../documents/development/testing.md#verification-commands), in the table's order. The Python rows apply when `backend-science/` or its contract changed.
3. **Report** the real output: the summary lines (`Tests: … passed`, `… passed in …s`) and every failure in full. Never summarise a run as "all green" without the output.
4. **On failure**, see [Troubleshooting](../../documents/development/testing.md#troubleshooting); a test that fails before your change is reported as such, not fixed silently.
