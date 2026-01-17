## 2026-01-17 - API Landing Page Pattern
**Learning:** For backend-only services, the root URL often returns 404, confusing users. Providing a lightweight, static HTML landing page with direct links to Swagger/OpenAPI documentation significantly improves discoverability and confirms service health without requiring a full frontend build system.
**Action:** Implement a standard "Service Landing Page" pattern using `ServeStaticModule` and a self-contained `index.html` for all API services.
