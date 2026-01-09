## 2026-01-09 - Information Leakage in Error Responses
**Vulnerability:** Exception messages from the database and internal logic were directly exposed in API responses. This could allow attackers to glean details about the database schema, internal file paths, or logic structure.
**Learning:** Default error handling often prioritizes developer convenience over security. Explicitly defining what errors are safe to expose is crucial.
**Prevention:** Implement a global exception filter that masks unknown or sensitive errors with generic messages (e.g., "Internal server error") while logging the full details internally.
