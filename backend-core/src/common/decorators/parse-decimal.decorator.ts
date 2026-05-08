import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDecimal } from 'class-validator';

/**
 * Custom decorator to handle financial decimal inputs.
 * It converts incoming numeric values to strings safely,
 * and validates that they match a decimal format (by default 0 to 2 decimal places).
 */
export function ParseDecimal(options?: { decimal_digits?: string }) {
  return applyDecorators(
    Transform(({ value }: { value: number | string | null | undefined }) =>
      value?.toString(),
    ),
    IsDecimal({ decimal_digits: options?.decimal_digits || '0,2' }),
  );
}
