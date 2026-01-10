## 2026-01-10 - [Pandas Vectorization]
**Learning:** Using `df.apply(lambda x: ...)` for date formatting is significantly slower than vectorized `dt.strftime()`. In this case, switching reduced processing time from ~1.05s to ~0.12s (8x faster).
**Action:** Always prefer vectorized string operations (`.str.` or `.dt.`) over `.apply()` in Pandas.
