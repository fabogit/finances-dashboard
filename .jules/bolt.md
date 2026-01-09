## 2026-01-09 - [Optimizing Excel Parsing Range]
**Learning:** `xlsx` library parser was being forced to read 5000 rows (`maxRangeOverride.e.r = 5000`) regardless of file size, causing O(N) overhead for small files and potential truncation for large ones. Relying on `xlsx`'s auto-detected range (`!ref`) is safer and more performant.
**Action:** Always verify if hardcoded limits/ranges in file parsers are necessary. If using `xlsx`, trust the `!ref` property unless there's a specific reason to override it.
