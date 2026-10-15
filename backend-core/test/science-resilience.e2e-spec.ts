import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createServer, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/app-setup';

type AppModuleExports = typeof import('../src/app.module');

const API_PREFIX = '/api/v1';
const SCIENCE_TIMEOUT_MS = 300;

type StubMode = 'hang' | 'error-500' | 'unavailable-503' | 'ok-forecast';

interface ErrorBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  error: string;
}

/**
 * Runs the whole app against a stub HTTP server standing in for
 * backend-science, so failures of the science service can be simulated
 * without Python running.
 */
describe('Science service resilience (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;
  let scienceStub: Server;
  let stubMode: StubMode = 'ok-forecast';
  let stubRequests = 0;
  let goalId: string;
  let stubOpen = false;

  /** Idempotent: the "down" scenario closes the stub before afterAll does. */
  const closeStub = async () => {
    if (!stubOpen) return;
    stubOpen = false;
    scienceStub.closeAllConnections();
    await new Promise<void>((resolve) => scienceStub.close(() => resolve()));
  };

  const respond = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  beforeAll(async () => {
    scienceStub = createServer((req, res) => {
      stubRequests += 1;
      req.resume();
      req.on('end', () => {
        switch (stubMode) {
          case 'hang':
            return;
          case 'error-500':
            return respond(res, 500, { detail: 'Python script crashed' });
          case 'unavailable-503':
            return respond(res, 503, { detail: 'Overloaded' });
          case 'ok-forecast':
            return respond(res, 200, []);
        }
      });
    });
    await new Promise<void>((resolve) =>
      scienceStub.listen(0, '127.0.0.1', resolve),
    );
    stubOpen = true;
    const { port } = scienceStub.address() as AddressInfo;

    // ConfigModule reads the environment when AppModule is first loaded,
    // so the variables must be set before AppModule is required below.
    process.env.SCIENCE_SERVICE_URL = `http://127.0.0.1:${port}`;
    process.env.SCIENCE_TIMEOUT_MS = String(SCIENCE_TIMEOUT_MS);
    process.env.SCIENCE_RETRY_COUNT = '1';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require('../src/app.module') as AppModuleExports;

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    server = app.getHttpServer() as Server;

    // Forecast only calls science when there is history to send
    await prisma.enrichedTransaction.create({
      data: {
        importBatchId: 'TEST_SCIENCE_RESILIENCE',
        originalLine: 1,
        date: new Date(),
        amount: -42.0,
        details: 'Science resilience fixture',
      },
    });
    const goal = await prisma.savingsGoal.create({
      data: { name: 'Science resilience goal', targetAmount: 1000 },
    });
    goalId = goal.id;
  });

  afterAll(async () => {
    await prisma.enrichedTransaction.deleteMany({
      where: { importBatchId: 'TEST_SCIENCE_RESILIENCE' },
    });
    await prisma.savingsGoal.deleteMany({ where: { id: goalId } });
    await app.close();
    await closeStub();
  });

  beforeEach(() => {
    stubRequests = 0;
  });

  const expectFilterFormat = (
    body: ErrorBody,
    status: number,
    path: string,
  ) => {
    expect(body).toEqual({
      statusCode: status,
      timestamp: expect.any(String) as string,
      path,
      message: expect.any(String) as string,
      error: expect.any(String) as string,
    });
  };

  it('GET /analytics/forecast - should answer 200 with the science result when it succeeds', async () => {
    stubMode = 'ok-forecast';

    await request(server).get(`${API_PREFIX}/analytics/forecast`).expect(200);
  });

  it('GET /analytics/forecast - should answer 504 when science exceeds the timeout', async () => {
    stubMode = 'hang';
    const path = `${API_PREFIX}/analytics/forecast`;

    const res = await request(server).get(path).expect(504);
    const body = res.body as ErrorBody;

    expectFilterFormat(body, 504, path);
    expect(body.error).toBe('SCIENCE_TIMEOUT');
    expect(stubRequests).toBe(1);
  });

  it('GET /goals/:id/projection - should answer 502 when science answers with an error', async () => {
    stubMode = 'error-500';
    const path = `${API_PREFIX}/goals/${goalId}/projection`;

    const res = await request(server).get(path).expect(502);
    const body = res.body as ErrorBody;

    expectFilterFormat(body, 502, path);
    expect(body.error).toBe('SCIENCE_BAD_RESPONSE');
    expect(body.message).toContain('HTTP 500');
    expect(stubRequests).toBe(1);
  });

  it('GET /analytics/forecast - should retry a 503 and then answer 502', async () => {
    stubMode = 'unavailable-503';

    const res = await request(server)
      .get(`${API_PREFIX}/analytics/forecast`)
      .expect(502);

    expect((res.body as ErrorBody).error).toBe('SCIENCE_BAD_RESPONSE');
    expect(stubRequests).toBe(2);
  });

  describe('with the science service down', () => {
    // Stop the stub: its port now refuses connections, like a stopped container
    beforeAll(closeStub);

    it('GET /analytics/forecast - should answer 503, never 200 {error}', async () => {
      const path = `${API_PREFIX}/analytics/forecast`;

      const res = await request(server).get(path).expect(503);
      const body = res.body as ErrorBody;

      expectFilterFormat(body, 503, path);
      expect(body.error).toBe('SCIENCE_UNAVAILABLE');
    });

    it('GET /goals/:id/projection - should answer 503, never 200 {error}', async () => {
      const path = `${API_PREFIX}/goals/${goalId}/projection`;

      const res = await request(server).get(path).expect(503);
      const body = res.body as ErrorBody;

      expectFilterFormat(body, 503, path);
      expect(body.error).toBe('SCIENCE_UNAVAILABLE');
    });
  });
});
