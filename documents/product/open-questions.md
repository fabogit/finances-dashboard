# Open questions

Questions about post-MVP features, noted so they are not lost and **not decided**. Subscriptions, the forecast split and authentication are designed after the MVP (D-36), with what the MVP teaches; until then these questions block nothing. The IDs (C5, C7, …) are the contradictions found in the v1 documents by the design review.

When one of these features is designed, its question is answered by a decision (an ADR or the feature's flow document) and removed from here.

## C5 · Who suppresses paused subscriptions in the forecast?

**Context.** The proposed forecast split ([science contract](../architecture/science-contract.md#post-mvp-proposal-forecast-split)) has Python suppress the recurrences that match a paused subscription. But the trend endpoint receives monthly totals already aggregated by the core, where individual transactions are no longer visible.

**Possible answers** (not evaluated yet). The core removes the paused subscription's transactions before aggregating; or Python receives the raw history and does both the aggregation and the suppression.

**Issues:** #77 (forecast split), #78 (subscriptions).

## C7 · Which roles exist?

**Context.** Earlier specs listed `ADMIN`, `USER` and `GUEST`; the RBAC issue and the v1 data dictionary only `USER` and `GUEST`. The demo sandbox issue needs an administrative endpoint (resetting the demo), which implies some admin capability.

**Possible answers** (not evaluated yet). Three roles; or two roles plus an admin capability that is not a role (for example a server-side secret).

**Issues:** #64 (RBAC), #65 (demo sandbox).

## C8 · What can a guest do?

**Context.** One plan made guests read-only; the RBAC issue lets them `POST` to "safe" endpoints. The client mockup has a "Reset demo" button, which the demo sandbox issue protects with an admin secret.

**Possible answers** (not evaluated yet). Strictly read-only; or read plus a list of allowed writes on demo data that is reset regularly.

**Issues:** #64, #65.

## C11 · Do subscriptions need authentication first?

**Context.** The subscriptions issue requires a `JwtAuthGuard` on its endpoints, while authentication was planned for later. Both are now after the MVP, but their order is not set. Until authentication exists, requests run as a fixed, configured user (D-48), so a feature does not strictly need authentication to be built.

**Possible answers** (not evaluated yet). Authentication first, then subscriptions; or subscriptions first, protected like every other endpoint and gaining the guard when authentication arrives.

**Issues:** #62 (authentication), #78 (subscriptions).
