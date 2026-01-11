## 2026-01-11 - [Transactions Pagination]
**Learning:** Returning all database rows by default is a major bottleneck, but strictly enforcing pagination is a breaking change for existing clients.
**Action:** Implement "opt-in" pagination: preserve the default behavior (return all) if no params are passed, but enable optimized pagination when `page` or `limit` are provided. This respects both performance goals and backward compatibility constraints.
