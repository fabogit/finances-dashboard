import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import * as XLSX from 'xlsx';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ScienceService } from '../src/modules/science/science.service.js';
import { createApp } from './create-app.js';

const UPLOAD_URL = '/api/v1/transactions/upload';
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_UPLOAD_BYTES = 1024 * 1024 * 5;

// A bank export as the parser expects it: headers on row 19.
const createExcelBuffer = (rows: Record<string, unknown>[]): Buffer => {
  const worksheet = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_json(worksheet, rows, { origin: 'A19' });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

const ROW = {
  Data: '2025-01-01',
  Importo: -50.5,
  Operazione: 'POS',
  Dettagli: 'Upload E2E Store',
  'Conto o carta': 'Upload E2E Bank',
};

interface UploadResponse {
  batchId: string;
  rowsImported: number;
  science: { status: string };
}

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  error: string;
}

// Pins the upload behaviour across HTTP adapters (#88): Multer parsing,
// ParseFilePipe validation and the global error format.
describe('Transactions upload (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;
  const batchIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Science is not under test: fail fast, so the upload keeps the raw rows.
      .overrideProvider(ScienceService)
      .useValue({
        processTransactions: () =>
          Promise.reject(new Error('Science disabled in upload E2E')),
      })
      .compile();

    app = await createApp(moduleFixture);

    prisma = app.get(PrismaService);
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await prisma.rawTransaction.deleteMany({
      where: { importBatchId: { in: batchIds } },
    });
    await app.close();
  });

  const expectError = (body: ErrorResponse, statusCode: number) => {
    expect(body).toEqual({
      statusCode,
      timestamp: expect.any(String) as string,
      path: UPLOAD_URL,
      message: expect.any(String) as string,
      error: expect.any(String) as string,
    });
  };

  it('Should import a valid .xlsx file and keep its raw rows', async () => {
    const res = await request(server)
      .post(UPLOAD_URL)
      .attach('file', createExcelBuffer([ROW]), {
        filename: 'export.xlsx',
        contentType: XLSX_MIME,
      })
      .expect(201)
      .expect('Content-Type', /json/);

    const body = res.body as UploadResponse;
    batchIds.push(body.batchId);

    expect(body.batchId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(body.rowsImported).toBe(1);
    expect(body.science.status).toBe('failed');

    const saved = await prisma.rawTransaction.findMany({
      where: { importBatchId: body.batchId },
    });
    expect(saved).toHaveLength(1);
    expect(saved[0].details).toBe('Upload E2E Store');
  });

  it('Should answer 422 when no file is sent', async () => {
    const res = await request(server)
      .post(UPLOAD_URL)
      .field('note', 'no file')
      .expect(422);

    expectError(res.body as ErrorResponse, 422);
    expect((res.body as ErrorResponse).message).toMatch(/file is required/i);
  });

  it('Should answer 413 when the file is larger than 5 MiB (D-122)', async () => {
    // A valid workbook padded past the limit: its content still reads as .xlsx,
    // so only the size check fails. Multer stops reading at the limit, before
    // the whole file is in memory.
    const xlsx = createExcelBuffer([ROW]);
    const oversized = Buffer.concat([
      xlsx,
      Buffer.alloc(MAX_UPLOAD_BYTES + 1 - xlsx.length),
    ]);

    const res = await request(server)
      .post(UPLOAD_URL)
      .attach('file', oversized, {
        filename: 'export.xlsx',
        contentType: XLSX_MIME,
      })
      .expect(413);

    expectError(res.body as ErrorResponse, 413);
    expect(res.body).toMatchObject({
      message: 'File too large',
      error: 'Payload Too Large',
    });
  });

  it('Should answer 422 when the content is not an .xlsx file', async () => {
    const res = await request(server)
      .post(UPLOAD_URL)
      .attach('file', Buffer.from('Data;Importo\n2025-01-01;-50.5\n'), {
        filename: 'export.xlsx',
        contentType: XLSX_MIME,
      })
      .expect(422);

    expectError(res.body as ErrorResponse, 422);
    expect((res.body as ErrorResponse).message).toMatch(/file type/i);
  });

  it('Should answer 400 when the file comes in another field', async () => {
    const res = await request(server)
      .post(UPLOAD_URL)
      .attach('document', createExcelBuffer([ROW]), {
        filename: 'export.xlsx',
        contentType: XLSX_MIME,
      })
      .expect(400);

    expectError(res.body as ErrorResponse, 400);
    expect((res.body as ErrorResponse).message).toMatch(
      /unexpected file field/i,
    );
  });
});
