# ADR-0011: Native Node HTTP adapter

- **Status:** Accepted
- **Date:** 2026-11-19
- **Decisions:** D-52, D-121

## Context

The core ran on Express, the adapter Nest uses when `NestFactory.create()` gets none and the one `nest new` still scaffolds. NestJS 12.3 added `@nestjs/platform-node`: its `NodeAdapter` runs Nest directly on `node:http`, with request and response objects that carry the Express-style helpers, so most Express middleware works unchanged. The NestJS documentation recommends it from 12.3, measures it about 50% faster than Express on lightweight routes, and plans it as the default in v13. Its first release is from 2026-10-27; D-52 placed the switch in M1, after three weeks of releases.

The adapter differs from Express on purpose in a few places, listed in [nestjs/nest#18063](https://github.com/nestjs/nest/pull/18063) and in the [HTTP adapters](https://docs.nestjs.com/http/performance#express-compatibility) page of the documentation. Each one had to be checked against this codebase before the switch.

**Example.** `POST /api/v1/categories` with `{"name": "P", "type": "NEEDS", "__proto__": {"isSystem": true}}`. On Express the body is accepted (`201`, the unknown key dropped by the `ValidationPipe`). On the Node adapter: `400`, `"message": "Object contains forbidden prototype property"`, before any pipe runs.

## Decision

**The core runs on `NodeAdapter` from `@nestjs/platform-node`, with no options** (D-121).

- `main.ts` passes `new NodeAdapter()` to `NestFactory.create<NestNodeApplication>()`; every end-to-end test builds its application through `test/create-app.ts`, which passes one to `createNestApplication()`, so the tests run on the same adapter. `test/static-assets.e2e-spec.ts` builds the full application with `NestFactory.create()` and a `NodeAdapter`, as `main.ts` does.
- `trustProxy` and `querystringParser` are not set: the core reads no `req.ip`, has no `@Req()` or `@Res()`, and its query strings are flat. They are added when one is needed.
- The JSON body parser keeps its defaults, `limit` 100 kb and `onProtoPoisoning`/`onConstructorPoisoning` set to `'error'`: a body with a `__proto__` or `constructor.prototype` key is a `400`.
- The uploaded file is typed by a local `MulterFile` interface (`src/modules/transactions/interfaces/`), with the fields the upload reads. `@nestjs/platform-express`, `@types/express` and `@types/multer` are removed, and `multer` leaves `types` in `tsconfig.json`.
- `@nestjs/common`, `@nestjs/core`, `@nestjs/testing` and `@nestjs/platform-node` are on the same version, 12.5.1: Nest releases them together, and 12.5.0 changed core and adapter together (middleware mounting, empty route parameters).

Before the switch, end-to-end tests pinned the behaviour on Express: the upload (a valid file, no file, a file over 5 MiB, a file that is not `.xlsx`, a file in another field), the helmet headers on an API response, a static file and the single-page fallback, the CORS preflight, a JSON body over 100 kb and malformed JSON. The same tests pass on the Node adapter.

### Express-specific pieces

| Piece | On the Node adapter |
| --- | --- |
| `helmet` (`app-setup.ts`) | Same headers on API responses, static files and the fallback (end-to-end). |
| CORS (`enableCors`) | Same preflight response, `204` with the allowed methods (end-to-end). |
| Upload (`FileInterceptor`) | Imported from `@nestjs/platform-node`, the same Multer 2.5.0 as under Express; same `201`, `422` and `400` responses (end-to-end). |
| `ServeStaticModule` (`@nestjs/serve-static` 12.1.1) | Serves through `useStaticAssets()`, with no `express` package; the fallback to `index.html` works (end-to-end). |
| Swagger (`/docs`, `/docs-json`) | Served through `useStaticAssets()`, unchanged; checked with requests on the running application and in the `fn-core` image. |
| `ValidationPipe`, and `StandardSchemaValidationPipe` from step 3 (ADR-0010) | Unchanged: both read the parsed body and query, which the adapter fills as Express did. Prototype keys are rejected before either pipe. |

### Deliberate differences, checked one by one

Each request was sent to the built application on Express and then on the Node adapter.

| Difference | Request | Express | Node adapter | Outcome |
| --- | --- | --- | --- | --- |
| Routes match by specificity, not by declaration order | The whole end-to-end suite; `GET /transactions/raw` next to `PATCH`/`DELETE /transactions/:id`, `:id` next to `:id/projection` and `:id/balance` | Pass | Pass | No route depends on declaration order. |
| Paths match case-sensitively, also in `exclude()` | `GET /api/v1/Categories` | `200`, the route | `404`, global error format | Accepted: clients use lowercase paths. |
| | `GET /API/v1/categories`, `GET /Api` | `200`, the route; `404`, global error format | `404`, `text/plain`, `Cannot GET …` | Accepted. `ServeStaticModule` matches `exclude` without case, so the fallback skips these paths; Nest's not-found handler is mounted under the case-sensitive `/api` prefix, so the router's default `404` answers, outside the global error format. |
| A string returned by a handler is `text/plain` | No handler returns a string | — | — | No effect. `Content-Type` of JSON responses, static files and Swagger is the same, `charset=utf-8` included. |
| `res.set()`/`res.type()` add no `; charset=utf-8` | The core calls neither | — | — | No effect. |
| `req.path` is the decoded path | No middleware of the core reads it | — | — | No effect. |
| No `ETag`, no `304` on API responses | `GET /api/v1/categories`, then with `If-None-Match` | Weak `ETag`, then `304` | No `ETag`, then `200` with the body | Accepted: the client makes no conditional requests. Static files and Swagger assets keep `ETag`. |
| Route parameter over 100 characters | `PATCH /api/v1/transactions/<101 characters>` | `400`, invalid UUID | `414`, global error format | Accepted: identifiers are 36-character UUIDs. 100 characters: `400` on both. |
| Prototype keys in a JSON body | `POST /api/v1/categories` with `__proto__` or `constructor.prototype` | `201` | `400` | Kept (D-121), pinned by an end-to-end test. |
| Built-in body parsers | JSON over 100 kb; malformed JSON | `413`; `400` | `413`; `400` | Same (end-to-end). |
| Unmatched path outside `/api` with another method | `POST /some/page` | `404`, `text/html`, `<pre>Cannot POST /some/page</pre>` | `404`, `text/plain`, `Cannot POST /some/page` | Accepted: the router's default `404` on both, outside the global error format. |
| Query strings | `?categories=a&categories=b`, `?a[b]=1` | `200` | `200` | Same: both parse flat keys. |
| Other | Trailing slash, double slash, `HEAD`, malformed percent-encoding | — | Same status and `Content-Type` | No effect. |
| Server timeouts | — | `keepAliveTimeout` 5 s | 5 s | Same: both keep the defaults of `http.Server`. |

### Measurements (2026-11-19)

The built application (`node dist/main`, `NODE_ENV=production`) on the end-to-end database, on the same machine with other work running (load average 5 to 8). Express was measured before the switch, the Node adapter after it, then Express again from a saved build.

**Startup**, from spawning the process to the first `200` of `GET /api/v1/categories`, median of 10 runs: Express 1139 ms and 1164 ms, Node adapter 1149 ms. No difference.

**Throughput**, autocannon 8.0.0, 100 connections, 3 s of warm-up, 10 s per round, median of 3 rounds, requests per second:

| Route | Express | Node adapter | Express, again |
| --- | --- | --- | --- |
| `GET /api/nonexistent` (`404`) | 6294 | 8730 | 6524 |
| `POST /api/v1/categories`, invalid body (`400`) | 3838 | 4615 | 4206 |
| `GET /index.html` (static) | 11234 | 12392 | 11166 |
| `GET /api/v1/categories` (database) | 1087 | 1147 | 1024 |

About a third faster on the route that only crosses the framework, 10 to 20% faster with body parsing and validation, about 10% on static files. The route that reads the database is bound by the database: the difference stays within the noise.

## Alternatives considered

- **Stay on Express until v13.** Rejected: the switch costs the same later, and until then the core carries the slower adapter and Express's dependencies.
- **Fastify.** Rejected: its own request and response API and plugin model, `@fastify/static` and `@fastify/multipart` in place of the packages above, and no gain over the Node adapter in Nest's benchmarks.
- **`onProtoPoisoning: 'ignore'`**, to accept prototype keys as Express did. Rejected: no client sends them, and rejecting them closes a class of bugs before any pipe runs.
- **Keep `@types/multer` and `Express.Multer.File`**, as the File upload page of the documentation shows. Rejected: it keeps `@types/express` as a transitive dependency and the `Express` namespace in an application without Express, for two fields the upload reads.

## Consequences

- When NestJS 13 makes the Node adapter the default, `main.ts` and `test/create-app.ts` stay as they are.
- An end-to-end test builds its application with `createApp()` from `test/create-app.ts`; one built without an adapter runs on Express, which is no longer installed.
- Paths are case-sensitive, and a mis-cased `/API/…` path gets the router's plain-text `404`.
- A new Express middleware is checked against the [Express compatibility](https://docs.nestjs.com/http/performance#express-compatibility) list first: `res.render()`, `res.download()`, `req.accepts()` and Express settings, among others, do not exist on the Node adapter.
- API responses carry no `ETag`; a cache that needs one sets it explicitly.
- `nest new` still scaffolds Express: the adapter is a divergence from the scaffold ([setup § Divergences from `nest new`](../development/setup.md#divergences-from-nest-new)).
