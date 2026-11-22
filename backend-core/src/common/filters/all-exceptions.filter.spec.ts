import type { ArgumentsHost } from '@nestjs/common';
import {
  HttpException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  const PATH = '/api/v1/transactions';
  const request = {};
  const response = {};

  let reply: ReturnType<typeof vi.fn>;
  let filter: AllExceptionsFilter;
  let host: ArgumentsHost;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    reply = vi.fn();
    const adapterHost = {
      httpAdapter: { getRequestUrl: () => PATH, reply },
    } as unknown as HttpAdapterHost;
    filter = new AllExceptionsFilter(adapterHost);
    host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** The body and status passed to the adapter's reply. */
  const replied = () => {
    expect(reply).toHaveBeenCalledTimes(1);
    const [res, body, status] = reply.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
      number,
    ];
    expect(res).toBe(response);
    return { body, status };
  };

  describe('an HttpException built from a bare message', () => {
    it('should use the reason phrase of the status as the error code', () => {
      // As the Node adapter builds it for a JSON body over the limit
      filter.catch(new HttpException('request entity too large', 413), host);

      const { body, status } = replied();
      expect(status).toBe(413);
      expect(body).toEqual({
        statusCode: 413,
        timestamp: expect.any(String) as string,
        path: PATH,
        message: 'request entity too large',
        error: 'Payload Too Large',
      });
    });

    it('should fall back to INTERNAL_ERROR for a status with no reason phrase', () => {
      filter.catch(new HttpException('unknown status', 599), host);

      const { body, status } = replied();
      expect(status).toBe(599);
      expect(body).toMatchObject({
        statusCode: 599,
        message: 'unknown status',
        error: 'INTERNAL_ERROR',
      });
    });
  });

  it('should keep the error code of a built-in exception', () => {
    filter.catch(new PayloadTooLargeException('File too large'), host);

    const { body } = replied();
    expect(body).toMatchObject({
      statusCode: 413,
      message: 'File too large',
      error: 'Payload Too Large',
    });
  });
});
