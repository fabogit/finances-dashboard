import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { configureApp } from '../src/app-setup.js';

const API_PREFIX = '/api/v1';

/**
 * Bodies the science service sends for `POST /goals/projection`: it always
 * includes `error` (null on success) and serializes Decimals as strings.
 */
const SCIENCE_PROJECTIONS = {
  success: {
    estimated_date: '2027-08-15',
    monthly_avg: '450.75',
    months_remaining: '9',
    confidence: 'HIGH',
    error: null,
  },
  error: {
    estimated_date: null,
    monthly_avg: null,
    months_remaining: null,
    confidence: null,
    error: 'No data for projection',
  },
};

interface ProjectionBody {
  goalName: string;
  targetAmount: unknown;
  currentProgress: unknown;
  monthly_avg: unknown;
  error: unknown;
}

/**
 * Runs the whole app against a stub HTTP server standing in for
 * backend-science, so the projection can be checked without Python running.
 */
describe('Goal projection serialization (E2E, #117)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;
  let scienceStub: Server;
  let scienceBody: unknown = SCIENCE_PROJECTIONS.success;
  let goalId: string;

  beforeAll(async () => {
    scienceStub = createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(scienceBody));
      });
    });
    await new Promise<void>((resolve) =>
      scienceStub.listen(0, '127.0.0.1', resolve),
    );
    const { port } = scienceStub.address() as AddressInfo;

    // ConfigModule reads the environment when AppModule is first loaded,
    // so the variable must be set before AppModule is imported below.
    process.env.SCIENCE_SERVICE_URL = `http://127.0.0.1:${port}`;

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    server = app.getHttpServer() as Server;

    const goal = await prisma.savingsGoal.create({
      data: {
        name: 'Projection serialization goal',
        targetAmount: 5000,
        currentAmount: 1000.5,
      },
    });
    goalId = goal.id;
  });

  afterAll(async () => {
    await prisma.savingsGoal.deleteMany({ where: { id: goalId } });
    await app.close();
    scienceStub.closeAllConnections();
    await new Promise<void>((resolve) => scienceStub.close(() => resolve()));
  });

  const getProjection = async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/goals/${goalId}/projection`)
      .expect(200);
    return res.body as ProjectionBody;
  };

  it('GET /goals/:id/projection - should serialize the amounts when science succeeds (error: null)', async () => {
    scienceBody = SCIENCE_PROJECTIONS.success;

    const body = await getProjection();

    expect(body.goalName).toBe('Projection serialization goal');
    expect(body.targetAmount).toBe(5000);
    expect(body.currentProgress).toBe(1000.5);
    expect(body.monthly_avg).toBe('450.75');
    expect(body.error).toBeNull();
  });

  it('GET /goals/:id/projection - should serialize the amounts when science reports an error', async () => {
    scienceBody = SCIENCE_PROJECTIONS.error;

    const body = await getProjection();

    expect(body.targetAmount).toBe(5000);
    expect(body.currentProgress).toBe(1000.5);
    expect(body.error).toBe('No data for projection');
  });
});
