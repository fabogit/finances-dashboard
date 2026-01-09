# Sentinel Journal

## 2024-05-22 - Information Leakage in Error Handling
**Vulnerability:** The Python service (`backend-science`) was returning raw exception messages in 500 responses (`detail=str(e)`).
**Learning:** This is a common pattern when developers want to debug easily, but it exposes internal details (file paths, library versions) to the caller. Even if the caller is another backend service, logs can propagate this info.
**Prevention:** Always catch generic exceptions at the boundary (controller) and return a sanitized "Internal Server Error" message, while logging the full traceback internally.
