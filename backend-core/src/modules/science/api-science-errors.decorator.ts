import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * Documents the errors of an endpoint that calls backend-science.
 * Bodies follow the global exception filter format; `error` carries the code.
 */
export function ApiScienceErrors() {
  return applyDecorators(
    ApiResponse({
      status: 502,
      description:
        'Science service answered with an error (`error: SCIENCE_BAD_RESPONSE`)',
    }),
    ApiResponse({
      status: 503,
      description:
        'Science service unreachable after retries (`error: SCIENCE_UNAVAILABLE`)',
    }),
    ApiResponse({
      status: 504,
      description:
        'Science service did not answer within SCIENCE_TIMEOUT_MS (`error: SCIENCE_TIMEOUT`)',
    }),
  );
}
