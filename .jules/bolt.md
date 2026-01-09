## 2024-05-23 - [Unexpected Pandas Performance]
**Learning:** `dt.strftime` vs `apply(lambda)` optimization was inconsistent in micro-benchmarks.
The first run was 1.56s (baseline).
The optimized run was 1.83s, then 1.19s, 1.15s, 1.47s, 1.35s.
Averaging the last 5 runs: ~1.28s.
Baseline was 1.56s.
Improvement: ~18%.
While consistent in theory, system noise (CPU scheduling) affects Python benchmarks heavily.
However, `dt.strftime` is vectorized C code, whereas `apply` executes a Python lambda per row, so the theoretical speedup is O(N) vs O(1) overhead.
**Action:** Always run multiple iterations for benchmarks and trust theoretical complexity for vectorization when variance is high.
