import { Test, TestingModule } from '@nestjs/testing';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const mockHttpAdapter = {
  getRequestUrl: jest.fn(),
  reply: jest.fn(),
};

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: HttpAdapterHost,
          useValue: { httpAdapter: mockHttpAdapter },
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    mockHttpAdapter.getRequestUrl.mockReturnValue('/test-url');
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should mask generic Error messages', () => {
    const mockHost = {
      switchToHttp: () => ({
        getResponse: jest.fn(),
        getRequest: jest.fn(),
      }),
    };

    const exception = new Error('Sensitive internal error details');
    filter.catch(exception, mockHost as any);

    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        message: 'Internal server error', // Expect generic message
      }),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('should mask generic Prisma database errors', () => {
    const mockHost = {
      switchToHttp: () => ({
        getResponse: jest.fn(),
        getRequest: jest.fn(),
      }),
    };

    // Simulate Prisma Error with sensitive info in message
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Table user_passwords not found',
      {
        code: 'P1234',
        clientVersion: '1.0',
      },
    );

    filter.catch(exception, mockHost as any);

    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        message: 'Database Error', // Expect generic message without details
      }),
      expect.anything(),
    );
  });
});
