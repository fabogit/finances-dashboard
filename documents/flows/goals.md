# Goals

A savings goal is a target amount whose progress is always computed: in the MVP, the balance of a dedicated account. Reaching the target is computed too; only pausing and archiving are set by hand. The science service estimates when the target will be reached. Models and fields are defined in the [data model](../domain/data-model.md).

**Decisions:** D-26 (progress computed, from a dedicated account in the MVP; withdrawals lower it; "reached" computed; only paused and archived set by hand; no transaction locked; shares of a common account after the MVP), D-11 (balances derived from transactions, [ADR-0003](../adr/0003-derived-balances.md)), D-21 (the science service behind `ScienceClient`, [ADR-0005](../adr/0005-python-science-service-rest.md)), D-48 (every query scoped to the user), D-49 (projection outcomes without a result), D-59 (amounts in cents), D-66 (the current balance stops at today), D-102 (rounding), D-106 (a goal always has an account; an account with a goal cannot be deleted), D-107 (one goal that is not archived per account; names), D-108 (the projection), D-109 (an optional target date).

## Behaviour

### Creating a goal

The user gives a name (`SavingsGoal.name`), a target amount greater than zero (`SavingsGoal.targetAmount`), the account that holds the money (`SavingsGoal.accountId`) and, optionally, a target date (`SavingsGoal.targetDate`). The goal starts as `ACTIVE` (`SavingsGoal.status`).

- **The account is required** in the MVP (D-106). To set a goal before its money has a place, the user opens an account with a balance of 0.00, which can be an on-budget account used only to set money aside: transfers between on-budget accounts never count as income or spending (D-25). The account of a goal can be changed; the progress becomes the new account's balance.
- **One goal per account** among the goals that are not archived, while shares are post-MVP, so the same money never counts for two goals; an archived goal does not stop a new goal on its account (D-107, GOL-9).
- **Names** are unique per user among the goals that are not archived, ignoring case (D-79, D-107): an archived "Holidays" does not stop a new "Holidays".

Setting an archived goal back to `ACTIVE` or `PAUSED` is rejected when it would break one of these two rules.

### Progress

The progress of a goal is the balance of its account at today, with every kind of transaction, computed when it is asked for and never stored (D-11, D-26, D-66). Anything that moves the account's balance moves the progress:

- a transfer into the account, interest, a revaluation: progress goes up;
- a withdrawal or a transfer out: progress goes down (D-26, GOL-2).

A goal created on an account that already holds money starts with that balance as its progress. The progress can go above the target, and below zero if the account is overdrawn. The history of the progress is the history of the account's balance ([balances](balances.md#balance-at-a-date)).

### Reached

A goal is reached while its progress is equal to or greater than its target; it is computed, never set (D-26). A withdrawal that takes the progress below the target makes it not reached again. Reaching a goal locks nothing: the account's transactions can still be created, edited and deleted (D-26, GOL-3).

### Paused and archived

The user sets `PAUSED` or `ARCHIVED` by hand, and can go back to `ACTIVE` (D-26). They are labels (D-108): the progress and the projection are computed in every state. An archived goal leaves the main list of goals.

### Target date

With a target date, the goal shows the amount to set aside each month to reach it: what is missing (target minus progress) divided by the months left, from the current month to the month of the target date, both included, rounded to the cent as in the [budget flow](budget.md#rounding) (D-102, D-109). With a projection, it also shows whether the estimated month falls on or before the target date's month (GOL-12). A goal already reached needs 0.00 a month.

Once the target date has passed without the target being reached, the goal is **overdue**: computed like "reached", never set by hand and not a `GoalStatus`. It shows the missing amount and no monthly amount, and invites the user to move the date or archive the goal (D-109, GOL-13).

### Projection

The science service estimates when the target will be reached, from the pace at which the account's balance has grown ([science contract](../architecture/science-contract.md#post-goalsprojection)). Its input is every transaction of the account except the `STARTING_BALANCE`, of every other kind, dated in the 12 months before today, or since the account opened if that is more recent; the current progress is the balance at today (D-108, GOL-10). A starting balance is not a pace of saving: counted, it would make the first month look like a large deposit.

Outcomes (D-49):

- **Already reached:** `200` with `status: "REACHED"`, without calling the science service (D-108, GOL-11).
- **An estimate:** `200` with the estimated month, the monthly pace, the months remaining and a confidence level.
- **The target cannot be reached at the current pace** (the pace is zero or negative, or the target is more than 1,200 months away, D-108): `200` with `status: "UNREACHABLE_AT_CURRENT_PACE"` and the projection fields `null`; it is information for the user, not an error.
- **History too short:** `422` with `error: "INSUFFICIENT_DATA"`.
- **The science service unavailable, timing out or failing:** `503`, `504` or `502`, as in the [science contract](../architecture/science-contract.md#failure-handling). The goal and its progress are still shown: they never depend on the science service.

### When the account closes

Closing the account moves its balance to another account (D-63, [balances](balances.md#closing-and-deleting-an-account)), so the progress drops to what is left, usually zero. The goal stays as it is; the user can move it to the other account or archive it.

An account with a goal, archived or not, cannot be deleted, with or without force: the user first moves the goal to another account or deletes it (D-106, GOL-8). Nothing about a goal is ever lost as a side effect of deleting an account.

### Shared accounts later

Two goals on one account, each with its own share, are post-MVP (D-26). The model keeps them possible: a share would be added to the goal, not a new way of computing the progress. A goal without an account, which D-26 allows, comes with them: making the account optional then changes no existing goal (D-106).

## Invariants

- The progress is the balance of the goal's account at today; it is never stored (GOL-1, GOL-2).
- "Reached" is computed from the progress and the target, and never locks a transaction (GOL-3).
- Only `ACTIVE`, `PAUSED` and `ARCHIVED` are set by hand, and they change neither the progress nor the projection (GOL-4).
- Every goal has an account, and at most one goal that is not archived uses an account (GOL-8, GOL-9).
- A projection without a result is an explicit outcome, never `200` with an `error` field (GOL-5, GOL-6).

## Edge cases

- **The target reached and then lost:** reached while the progress is at or above the target, not reached again after a withdrawal (GOL-3).
- **A goal created on an account that already holds the target:** reached from the start.
- **The account overdrawn:** the progress is negative.
- **The science service down:** the projection fails with `503`; the goal and its progress are shown (GOL-7).
- **The goal's account closed:** the goal stays, with the progress left on the account (D-63).
- **The target date passed:** the goal is overdue until it is reached, its date is moved, or it is archived (GOL-13).

## Divergences from Actual Budget

1. **Goals are their own model.** Actual Budget has no savings goal: goals are templates on a category's monthly budget (`#goal`, `#template … by …`). Here a goal is a target followed by an account's balance (D-26). The monthly amount needed for a target date plays the part of the `by` template (D-109).

## Examples

### GOL-1 · Progress is the balance of the goal's account

- **Given** account "Deposit" with a balance of 6,000.00
- **When** the user creates goal "Emergency fund" with a target of 10,000.00 on "Deposit"
- **Then** its progress is 6,000.00, 60% of the target
- **And** it is not reached

### GOL-2 · A withdrawal lowers the progress

- **Given** goal "Emergency fund", target 10,000.00, on "Deposit" with a balance of 6,000.00
- **When** 1,000.00 is transferred from "Deposit" to "Checking"
- **Then** the progress is 5,000.00

### GOL-3 · Reached is computed and locks nothing

- **Given** goal "Emergency fund", target 10,000.00, on "Deposit" with a balance of 9,800.00
- **When** 400.00 is transferred into "Deposit"
- **Then** the goal is reached, with a progress of 10,200.00
- **When** the user edits that transfer to 100.00
- **Then** the edit is saved, the progress is 9,900.00 and the goal is no longer reached

### GOL-4 · Paused and archived are set by hand

- **Given** goal "New car", `ACTIVE`, on "Car fund" with a balance of 2,000.00
- **When** the user sets it to `PAUSED`
- **Then** its status is `PAUSED` and its progress is still 2,000.00
- **When** the user sets it to `ARCHIVED`, and later back to `ACTIVE`
- **Then** each change is saved, and the progress is 2,000.00 throughout

### GOL-5 · A goal out of reach at the current pace

- **Given** goal "Emergency fund", not reached, whose account has lost money every month of its history
- **When** the projection is asked for
- **Then** the answer is `200` with `status: "UNREACHABLE_AT_CURRENT_PACE"` and the estimated month, the monthly pace and the months remaining `null`

### GOL-6 · A projection without enough history

- **Given** goal "Emergency fund", not reached, whose account has no history the science service can use
- **When** the projection is asked for
- **Then** the answer is `422` with `error: "INSUFFICIENT_DATA"`

### GOL-7 · The science service down

- **Given** the science service is stopped
- **When** goal "Emergency fund" and its projection are asked for
- **Then** the goal is returned with its progress
- **And** the projection answers `503` with `error: "SCIENCE_UNAVAILABLE"`

### GOL-8 · An account with a goal cannot be deleted

- **Given** account "Holidays" with a balance of 0.00 and no other transaction, and goal "Holidays 2027" on it
- **When** the user deletes "Holidays"
- **Then** the deletion is rejected, naming the goal "Holidays 2027"
- **When** the user moves "Holidays 2027" to "Deposit" and deletes "Holidays" again
- **Then** "Holidays" is deleted and the goal's progress is the balance of "Deposit"

### GOL-9 · One goal per account, unique names

- **Given** goal "Emergency fund", `ACTIVE`, on "Deposit", and goal "Holidays", `ARCHIVED`, on "Holiday fund"
- **When** the user creates goal "New car" on "Deposit"
- **Then** it is rejected
- **When** the user creates goal "holidays" on "Holiday fund"
- **Then** it is created
- **When** the user sets the archived "Holidays" back to `ACTIVE`
- **Then** it is rejected

### GOL-10 · The projection input

- **Given** account "Deposit" opened on 2026-01-01 with a starting balance of 5,000.00, transfers of +300.00 into it every month, a withdrawal of −1,000.00 in June and interest of +10.00 every quarter
- **And** goal "Emergency fund", target 10,000.00, on "Deposit"
- **When** the projection is asked for on 2026-11-12
- **Then** the science service receives the transfers, the withdrawal and the interest, but not the starting balance
- **And** the current progress it receives is the balance of "Deposit" at 2026-11-12

### GOL-11 · A reached goal

- **Given** goal "Emergency fund", target 10,000.00, on "Deposit" with a balance of 10,200.00
- **When** the projection is asked for
- **Then** the answer is `200` with `status: "REACHED"`
- **And** the science service is not called

### GOL-12 · A target date

- **Given** today is 2026-11-12
- **And** goal "Holidays 2027", target 3,000.00, target date 2027-06-30, on "Holiday fund" with a balance of 1,200.00
- **When** the goal is read
- **Then** it needs 225.00 a month: 1,800.00 over the eight months from November 2026 to June 2027
- **When** the projection estimates August 2027
- **Then** the goal is shown as not on track for its target date

### GOL-13 · A target date passed

- **Given** today is 2027-07-10
- **And** goal "Holidays 2027", target 3,000.00, target date 2027-06-30, on "Holiday fund" with a balance of 2,400.00
- **When** the goal is read
- **Then** it is overdue, with 600.00 missing and no monthly amount
- **When** the user moves the target date to 2027-12-31
- **Then** it is no longer overdue and needs 100.00 a month: 600.00 over the six months from July to December 2027
