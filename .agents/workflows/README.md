---
description: Index of the agent workflows for this repository.
---

# Agent workflows

Step-by-step procedures for recurring tasks. They complement [`AGENTS.md`](../../AGENTS.md), which holds the rules every session follows, and [`documents/`](../../documents/README.md), which explains how the system works. A workflow never restates a rule or a fact that lives there: it links to it.

| Workflow | When to use it |
| --- | --- |
| [start-backend.md](start-backend.md) | Start the stack (Docker, or the services locally) |
| [test-backend.md](test-backend.md) | Verify a change before reporting it or opening a pull request |
| [database-migration-flow.md](database-migration-flow.md) | Change `prisma/schema.prisma`, reset the database, reseed |
| [database-delegation-flow.md](database-delegation-flow.md) | Move aggregations, filters or sorting from TypeScript into PostgreSQL |
| [science-service-flow.md](science-service-flow.md) | Work on `backend-science` or on its contract with the core |
| [multi-tenancy-flow.md](multi-tenancy-flow.md) | Add a model or a query that must respect per-user isolation |

## Keeping workflows current

- A change that makes a workflow stale (a command, a path, a decision) updates the workflow **in the same pull request**.
- Every `Review & consolidation` issue checks that the workflows still match the code and the commands ([roadmap](../../documents/product/roadmap.md#review--consolidation)).
- Skills mentioned here by name are optional helpers installed locally; they are not part of the repository.
