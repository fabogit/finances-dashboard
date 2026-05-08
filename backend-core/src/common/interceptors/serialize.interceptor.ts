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
    context: ExecutionContext,
    handler: CallHandler,
  ): Observable<unknown> {
    return handler.handle().pipe(
      map((data: unknown) => {
        // Applica plainToInstance ai dati restituiti dal Controller
        return plainToInstance(this.dto, data, {
          // Esclude dal JSON finale campi che non hanno il decoratore @Expose() nel DTO
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}
