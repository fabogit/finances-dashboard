# Sentinel's Journal

## 2025-02-18 - Generic Exception Filter Leakage
**Vulnerability:** The global `AllExceptionsFilter` in `backend-core` was configured to return `exception.message` for all instances of `Error` directly to the client API response.
**Learning:** Default or naive exception filters often prioritize debugging convenience over security, leaking internal state or error details (like database connection strings or logic failures) to potential attackers.
**Prevention:** Always sanitize error messages in production. Use a generic "Internal Server Error" message for 500-level errors and log the specific details server-side only.
