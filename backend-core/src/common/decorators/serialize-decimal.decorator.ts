import { Transform, TransformFnParams, Type } from 'class-transformer';
import { Prisma } from '@prisma/client';

export interface SerializeDecimalOptions {
  /**
   * Target format for serialization.
   * 'number' (default) for UI components.
   * 'string' for inter-service precision-critical calls.
   */
  to?: 'number' | 'string';
}

/**
 * Decorator to automatically convert Prisma.Decimal to string or number during JSON serialization.
 * Requires ClassSerializerInterceptor to be active.
 */
export function SerializeDecimal(options: SerializeDecimalOptions = {}) {
  const target = options.to || 'number';

  return (targetObject: object, propertyKey: string) => {
    Transform((params: TransformFnParams) => {
      const value = params.value as unknown;

      if (value === null || value === undefined) {
        return value;
      }

      // Check if it's a Decimal-like object (Prisma.Decimal, decimal.js, etc.)
      if (
        typeof value === 'object' &&
        'toNumber' in value &&
        typeof value.toNumber === 'function' &&
        ((value as Record<string, unknown>).constructor?.name === 'Decimal' ||
          Prisma.Decimal.isDecimal(value))
      ) {
        const decimalValue = value as Prisma.Decimal;
        return target === 'number'
          ? decimalValue.toNumber()
          : decimalValue.toString();
      }
      return value;
    })(targetObject, propertyKey);

    Type(() => (target === 'number' ? Number : String))(
      targetObject,
      propertyKey,
    );
  };
}
