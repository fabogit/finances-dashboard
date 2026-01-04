import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';

interface ErrorResponseObject {
  statusCode: number;
  message: string | string[];
  error: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let httpStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    // --- 1. Standard HTTP Error Handling ---
    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const responseObj = response as ErrorResponseObject;

        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
        } else if (typeof responseObj.message === 'string') {
          message = responseObj.message;
        }

        if (typeof responseObj.error === 'string') {
          errorCode = responseObj.error;
        }
      }
    }

    // --- 2. Prisma Error Handling ---
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const code = exception.code;

      // P2002: Unique constraint failed
      if (code === 'P2002') {
        httpStatus = HttpStatus.CONFLICT;

        const target = exception.meta?.target;
        const targetString = Array.isArray(target)
          ? target.join(', ')
          : JSON.stringify(target);

        message = `Duplicate entry for field: ${targetString}`;
        errorCode = 'DB_CONFLICT';
      }

      // P2025: Record not found
      else if (code === 'P2025') {
        httpStatus = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        errorCode = 'DB_NOT_FOUND';
      } else {
        message = `Database Error: ${exception.message}`;
        errorCode = `DB_${code}`;
      }
    }

    // --- 3. Generic Error Handling ---
    else if (exception instanceof Error) {
      message = exception.message;
    }

    // Logging
    if (httpStatus >= 500) {
      this.logger.error(`Exception: ${message}`, (exception as Error).stack);
    } else {
      this.logger.warn(`Exception: ${message}`);
    }

    const requestUrl = httpAdapter.getRequestUrl(ctx.getRequest()) as string;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: requestUrl,
      message: message,
      error: errorCode,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
