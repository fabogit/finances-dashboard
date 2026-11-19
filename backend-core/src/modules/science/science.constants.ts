/**
 * Default timeout, in milliseconds, of a whole call to backend-science,
 * retries and their backoff included. Overridden by `SCIENCE_TIMEOUT_MS`.
 *
 * 10 s bounds a user-facing request while leaving room for the slowest normal
 * call: a forecast over 18 months of history, or the cleaning of a large
 * upload, on a freshly started container. A call that reaches it fails with
 * 504, even in the middle of a retry, so a request never waits much longer
 * than this.
 */
export const DEFAULT_SCIENCE_TIMEOUT_MS = 10_000;

/**
 * Largest accepted `SCIENCE_TIMEOUT_MS`: 2^31 − 1 ms (about 24.8 days), the
 * largest delay a Node.js timer holds. Above it Node replaces the delay with
 * 1 ms (`TimeoutOverflowWarning`), so every call to backend-science would
 * time out at once.
 */
export const MAX_SCIENCE_TIMEOUT_MS = 2_147_483_647;

/**
 * Default number of retries after the first attempt, for transient failures
 * only (network errors, 502, 503, 504). Overridden by `SCIENCE_RETRY_COUNT`.
 *
 * 2 retries (3 attempts at most) ride out a container restart or a brief
 * network glitch; more would only delay the error the client gets when
 * backend-science is really down. With the default backoff the retries add
 * about 600 ms (200 + 400), well within the default timeout of the call.
 */
export const DEFAULT_SCIENCE_RETRY_COUNT = 2;

/**
 * Largest accepted `SCIENCE_RETRY_COUNT`. 10 retries already wait about
 * 3.4 minutes of backoff (200 ms doubling: 200 + 400 + … + 102,400 ms), and
 * every retry must fit in the timeout of the call: a larger count could only
 * matter with a timeout of many minutes, which no user-facing request has.
 */
export const MAX_SCIENCE_RETRY_COUNT = 10;

/**
 * Base delay, in milliseconds, of the exponential backoff between retries:
 * the n-th retry waits `SCIENCE_RETRY_BASE_DELAY_MS * 2^(n-1)` (200, 400, …).
 */
export const SCIENCE_RETRY_BASE_DELAY_MS = 200;
