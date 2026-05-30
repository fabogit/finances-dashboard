import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToInstance } from 'class-transformer';

interface ClassConstructor {
  new (...args: unknown[]): object;
}

/**
 * Custom decorator to automatically apply the SerializeInterceptor
 * and format the response according to the provided DTO.
 */
export function Serialize(dto: ClassConstructor) {
  return UseInterceptors(new SerializeInterceptor(dto));
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(private dto: ClassConstructor) {}

  intercept(
    _context: ExecutionContext,
    handler: CallHandler,
  ): Observable<unknown> {
    return handler.handle().pipe(
      map((data: unknown) => {
        // Bypass serialization if the response contains an error key (union error responses)
        if (data && typeof data === 'object' && 'error' in data) {
          return data;
        }
        // Apply plainToInstance to the data returned by the controller
        return plainToInstance(this.dto, data, {
          // Exclude fields from the final JSON that do not have the @Expose() decorator in the DTO
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}
