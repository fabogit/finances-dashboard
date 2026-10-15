import 'reflect-metadata';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { AnalyticsController } from '../analytics/analytics.controller';
import { GoalsController } from '../goals/goals.controller';

const documentedStatuses = (
  controller: { prototype: object },
  method: string,
): string[] => {
  const handler = Object.getOwnPropertyDescriptor(controller.prototype, method)
    ?.value as object;
  const responses = (Reflect.getMetadata(DECORATORS.API_RESPONSE, handler) ??
    {}) as Record<string, unknown>;
  return Object.keys(responses);
};

describe('ApiScienceErrors (Swagger)', () => {
  it.each([
    ['GET /analytics/forecast', AnalyticsController, 'getForecast'],
    ['GET /goals/:id/projection', GoalsController, 'getProjection'],
  ])(
    '%s documents the science failures 502, 503 and 504',
    (_, controller, method) => {
      expect(documentedStatuses(controller, method)).toEqual(
        expect.arrayContaining(['502', '503', '504']),
      );
    },
  );
});
