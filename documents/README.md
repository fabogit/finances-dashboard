# Finance Dashboard documentation

How the system works and why it works that way. Agents start from [`AGENTS.md`](../AGENTS.md), which holds the working rules; this folder holds the knowledge those rules point to.

## How the documents are used

Each kind of information has exactly one home (D-03):

- **Work status lives on GitHub**: issues, [milestones](https://github.com/fabogit/finances-dashboard/milestones) and the project "Finance Dashboard Roadmap". A document never says what is done, in progress or missing; if it seems to, GitHub wins.
- **How the system works, and why, lives here**: architecture, domain model, flows, decisions (ADRs), product scope and roadmap.
- **Session material is never a reference**: plans, handoffs and session reports are working notes. They are not versioned and nothing in this repository depends on them.

Documentation is versioned in this folder, split by topic (D-04). A folder exists only once it has a document.

## Decisions and ADRs

The v2 redesign was decided in a design review held between 2026-10-08 and 2026-10-15. Its decisions carry IDs `D-01`, `D-02`, … The register is kept by the maintainer; versioned documents cite the IDs and summarise each decision where they rely on it, so they can be read on their own.

A decision becomes an **ADR** in [`adr/`](#adrs) when it is hard to reverse, surprising, and comes with a real trade-off. Each ADR records the context, the decision, the alternatives considered and the consequences. Process decisions are not ADRs: they are listed below.

A new decision is recorded before it is implemented: as an ADR when it meets the criterion above, otherwise in the flow document it belongs to. An issue session never settles an uncovered case on its own: it stops and asks the maintainer.

## Process decisions

- **D-01 · Design before code.** No new features while flows are not validated; only bug fixes without ambiguity go in before the design is closed.
- **D-03 · Sources of truth by role.** GitHub for status, `documents/` for how and why, session material never a reference (see above).
- **D-04 · Versioned documentation in `documents/`**, with `adr/` and topic folders, restructured in a single pass at the end of the design (issue #86).
- **D-39 · GitHub flow and pull request process.** One branch per issue from `main`; tests run and results reported with real output; the maintainer gives an explicit go-ahead for that pull request; the pull request is opened and assigned to the maintainer, who reviews and merges; a post-merge check follows. Details in [`AGENTS.md`](../AGENTS.md#commits-and-pull-requests).

## Specs

The v2 behaviour is specified before it is built (D-46): `domain/data-model.md` for the model and one `flows/<area>.md` per MVP area (`balances`, `transfers`, `categories`, `import`, `rules-payees`, `budget`, `goals`, `analytics`), written in issue #104. Conventions (D-47):

- Examples are written as **Given / When / Then** and carry a per-area ID: `DM-`, `BAL-`, `TRF-`, `CAT-`, `IMP-`, `RUL-`, `BUD-`, `GOL-`, `ANL-` followed by a number. Tests cite the ID (D-38).
- An ID is never renumbered or reused; a deleted example leaves a gap.
- Every undecided point is marked `[NEEDS CLARIFICATION: <question>]`. The maintainer resolves the markers in batches, each resolution recorded as a decision; a spec with open markers does not unblock the issues that depend on it. Writing the specs is treated as a design session, not as implementation.
- Every pull request that changes behaviour updates the spec in the same pull request.

API contracts and UX details are not specified up front: they are written at the step that builds them.

## Index

### Domain

- [CONTEXT.md](CONTEXT.md): glossary of domain terms, with the Actual Budget term where it matches and the v1 code name.
- [domain/data-model.md](domain/data-model.md): the **v1** data model as implemented at `v1.0.0`; replaced by the v2 model in #104.

### ADRs

- [ADR-0001](adr/0001-userid-on-all-models.md): `userId` on all models.
- [ADR-0002](adr/0002-actual-budget-reference-model.md): Actual Budget as the reference model.
- [ADR-0003](adr/0003-derived-balances.md): balances derived from transactions.
- [ADR-0004](adr/0004-stateless-import-staging.md): stateless import preview.
- [ADR-0005](adr/0005-python-science-service-rest.md): Python as a computation service, REST behind `ScienceClient`.
- [ADR-0006](adr/0006-monthly-tracking-budget.md): monthly tracking budget per category.
- [ADR-0007](adr/0007-layered-deduplication.md): layered deduplication.
- [ADR-0008](adr/0008-transaction-kind.md): transaction `kind`.

### Architecture

- [architecture/overview.md](architecture/overview.md): services, boundaries, local deployment, consistency and multi-tenancy.
- [architecture/science-contract.md](architecture/science-contract.md): the HTTP contract between the core and the science service.

### Product

- [product/vision.md](product/vision.md): purpose, reference model, MVP scope, user journey and ideas beyond the MVP.
- [product/roadmap.md](product/roadmap.md): milestones, steps, versioning, the Review & consolidation process and open risks.
- [product/open-questions.md](product/open-questions.md): post-MVP questions noted but not decided.

### Development

- [development/setup.md](development/setup.md): prerequisites, environment files, running the stack, Python environment, seed.
- [development/testing.md](development/testing.md): verification commands, end-to-end tests, CI.

Agent procedures live in [`.agents/workflows/`](../.agents/workflows/README.md).
