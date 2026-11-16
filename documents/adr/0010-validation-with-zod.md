# ADR-0010: Validation with Standard Schema and Zod

- **Status:** Accepted
- **Date:** 2026-11-16
- **Decisions:** D-54, D-120

## Context

The core validates with class-validator and class-transformer: every DTO is a class with one validation decorator and one `@ApiProperty` per field, responses go through `@Serialize()` and `@Expose()`, and the environment is a decorated class (`src/common/env.validation.ts`). Swagger is generated from the `@ApiProperty` decorators, so it says only what they repeat by hand. class-transformer has had no release since 2021.

NestJS 12 validates with [Standard Schema](https://standardschema.dev/): the route decorators take a `schema` option (`@Body({ schema })`, `@Query({ schema })`, `@Param('id', { schema })`) checked by `StandardSchemaValidationPipe`, responses are shaped by `StandardSchemaSerializerInterceptor` with `@SerializeOptions({ schema })`, `ConfigModule` takes a schema as `validationSchema`, and `@nestjs/swagger` documents the schemas. The NestJS documentation recommends Zod for new projects. From step 3 of the roadmap every DTO is rewritten, so the choice is made before (D-54).

**Example.** `PUT /categories/:id/budget` with `{"limitValue": 2147483648}`, one cent above the largest `Int` (D-59). Today the body passes validation and the database rejects it: `500`, `"error": "DB_P2020"`. With `z.int().min(0).max(2147483647)`: `400`, `"message": "limitValue: Too big: expected number to be <=2147483647"`. Today `12.5` and `"1250"` are accepted as amounts; with Zod both are a `400` that names the field.

## Decision

**Zod 4, through Standard Schema, for every input, every response and the environment.** The schema is the single source: it validates at runtime, `z.infer` gives the TypeScript type, and Swagger is generated from it.

- **Inputs:** `@Body({ schema })`, `@Query({ schema })`, `@Param(name, { schema })`, checked by a global `StandardSchemaValidationPipe`.
- **Responses:** `@SerializeOptions({ schema })` with a global `StandardSchemaSerializerInterceptor`; Swagger through `@ApiResponse({ standardSchema })`.
- **Environment:** `ConfigModule.forRoot({ validationSchema })`.
- **Rules** for writing schemas, in [architecture § Validation and DTOs](../architecture/overview.md#validation-and-dtos):
  - an amount is `z.int()` within the bounds of `Int` (D-59);
  - an integer in a query string is parsed strictly: digits with an optional sign, then the range; anything else is a `400`;
  - a field that may be left out is `.optional()`; `null` is accepted only where it means something, such as clearing a value;
  - a request body schema has no `.default()`: defaults live in the Prisma schema (`@default`, as listed in the [data model](../domain/data-model.md)), so an update schema derived with `.partial()` never writes a default over a value the request did not send.
- **Migration** module by module, in the steps that rebuild them (D-37): the two systems run side by side until the last v1 module is gone, then class-validator, class-transformer, the global `ValidationPipe`, `ClassSerializerInterceptor` and `@Serialize()` are removed. The environment moves to Zod in the first step that brings Zod into the core.

### Spike (2026-11-16)

On a throwaway branch, the category routes, the forecast query and the environment were rewritten with Zod 4.6, and one body and one query were written in Zod, Valibot 1.5, ArkType 2.2 and class-validator, on `@nestjs/common` 12.4 and `@nestjs/swagger` 12.1.1. Swagger output (`/docs-json`) and error responses were compared before and after with real requests.

| Question | Result |
| --- | --- |
| Swagger | Zod is converted natively, with no configuration. `.meta({ id })` names the component (`CreateCategory`), `.meta()` carries `description` and `example`; UUIDs get `format: uuid`, integers `type: integer` with `minimum`/`maximum`, nullable fields `nullable: true`. Today `string \| null` response fields are documented as `type: object`. |
| Errors | The global exception filter is unchanged: `{ statusCode, timestamp, path, message, error }`. Each message starts with the path of the field: `name: Invalid input: expected string, received number, parentId: Invalid UUID`. |
| Unknown fields | `z.object()` strips them, as `whitelist: true` does today. |
| Query strings | `z.coerce.number()` accepts `""` as `0`, `"12.00"` as `12`, `"1e3"` as `1000` and `"0x10"` as `16`, exactly as `@Type(() => Number)` does today. The strict parsing above rejects all of them, and Swagger still shows `type: integer` with its bounds. |
| Responses | Fields not in the schema are dropped. A value that does not match the schema is a `500` (`"Serialization failed: …"`) instead of passing silently. |
| Side by side | Both pipes and both interceptors registered globally: unit 126 and end-to-end 51 pass. `ValidationPipe` leaves parameters typed with `z.infer` alone. |
| Environment | `env.validation.spec.ts` passes unchanged against the Zod schema; a startup error is one line per variable (`PORT: Invalid input: expected number, received NaN`). |
| Size | The category DTOs: five files and 232 lines, one file and 100 lines. The environment: 69 lines, 35. |
| Traps found | `.partial()` keeps `.default()`: `PATCH {"icon": "x"}` reset `type` to its default, and no end-to-end test noticed. `.optional()` rejects `null`, which `@IsOptional()` accepts: one category end-to-end test sent `parentId: null`. Both led to the rules above. |

## Alternatives considered

- **Keep class-validator.** Rejected: one validation decorator and one `@ApiProperty` per field that can disagree, Swagger only as good as the hand-written decorators, response shaping that never fails, and class-transformer unmaintained.
- **Valibot.** Rejected: its schemas do not expose a JSON Schema, so Swagger needs a `standardSchemaConverter` (`@valibot/to-json-schema`); without one, generating the document fails at startup (`TypeError` in `@nestjs/swagger` 12.1.1). Query parameters are documented as strings, without their bounds.
- **ArkType.** Rejected: it has no OpenAPI 3.0 target, so Nest skips its schemas with a warning unless a converter is written by hand, and the converted schemas carry `$schema`. Its objects keep unknown fields by default. Its parsing of integers from strings is strict out of the box.
- **`z.coerce.number()` for integers in query strings**, the form of the NestJS documentation. Rejected: it accepts an empty value as `0` and euros written as `12.00` as twelve cents, the mistakes a client makes, without an error.
- **The HTTP `QUERY` method** ([RFC 10008](https://www.rfc-editor.org/rfc/rfc10008.html), June 2026) for searches, with the filters in a JSON body: numbers arrive as numbers and need no parsing. Deferred, not rejected: with OpenAPI 3.0 `@nestjs/swagger` leaves the route out of the document (it appears with OpenAPI 3.2, not checked with Swagger UI); Angular 22.2 has no `HttpClient.query()` (merged for 22.3); the CORS configuration does not allow the method; and a request without `Content-Type` reaches the handler with an empty body, which the RFC says to reject. To be weighed again when the transaction search is designed (#74).
- **Defaults in a base schema without them** (create adds them, update derives from the base), or **in the services.** Rejected: a second or third place for each default next to the Prisma schema, and forgetting the split brings the trap back silently.
- **`nestjs-zod`** and similar wrappers that turn a schema into a class. Not needed: NestJS 12 takes Standard Schemas directly.

## Consequences

- Validation messages change wording (`field: message` instead of `field must be …`); their format in the response does not.
- A response that does not match its schema fails with a `500`: a server bug becomes visible instead of reaching the client.
- A service that needs a default before the insert reads it from a named constant, not from the request.
- Every module tests that its update schema parses `{}` to `{}`, so a default slipping into it fails a test.
- Swagger stays on OpenAPI 3.0. The strict query integers carry a `pattern` next to `type: integer`, which has no effect there.
- Zod becomes a dependency of the core in the first step that uses it; Valibot and ArkType are not used.
