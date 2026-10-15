/**
 * Default per-attempt timeout, in milliseconds, for calls to backend-science.
 * Overridden by `SCIENCE_TIMEOUT_MS`.
 *
 * 10 s bounds a user-facing request while leaving room for the slowest normal
 * call: a forecast over 18 months of history, or the cleaning of a large
 * upload, on a freshly started container. A call that exceeds it fails with
 * 504 and is not retried, so a request never waits much longer than this.
 */
export const DEFAULT_SCIENCE_TIMEOUT_MS = 10_000;

/**
 * Default number of retries after the first attempt, for transient failures
 * only (network errors, 502, 503, 504). Overridden by `SCIENCE_RETRY_COUNT`.
 *
 * 2 retries (3 attempts at most) ride out a container restart or a brief
 * network glitch; more would only delay the error the client gets when
 * backend-science is really down. With the default backoff the retries add
 * about 600 ms (200 + 400) before giving up.
 */
export const DEFAULT_SCIENCE_RETRY_COUNT = 2;

/**
 * Base delay, in milliseconds, of the exponential backoff between retries:
 * the n-th retry waits `SCIENCE_RETRY_BASE_DELAY_MS * 2^(n-1)` (200, 400, …).
 */
export const SCIENCE_RETRY_BASE_DELAY_MS = 200;
