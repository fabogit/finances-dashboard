## 2026-01-10 - [Pagination on Large Fetch]
**Learning:** The `findAll` endpoint for transactions was fetching all records without limits. This is a classic N+1 equivalent in terms of data volume and can crash the server or database with large datasets.
**Action:** Implemented offset-based pagination (`skip`/`take`) using a reusable `PaginationQueryDto`. Always verify if an endpoint returns "all" records and enforce a default limit.
