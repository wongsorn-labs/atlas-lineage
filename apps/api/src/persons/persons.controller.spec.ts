import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PersonsModule } from './persons.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';
import { TreeMemberGuard } from '../trees/tree-member.guard';

const mockPerson = { id: 1, treeId: 1, name: 'Ada Lovelace', birthYear: null, deathYear: null, birthLat: null, birthLng: null, birthPlace: null, notes: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' };

jest.mock('@wongsorn-labs/atlas-lineage-db', () => ({
  findAllPersons: jest.fn(() => [mockPerson]),
  findPersonById: jest.fn((id: number) => (id === 1 ? mockPerson : null)),
  createPerson: jest.fn((dto: unknown) => ({ ...mockPerson, ...(dto as object), id: 2 })),
  updatePerson: jest.fn((id: number, treeId: number, dto: unknown) => (id === 1 ? { ...mockPerson, ...(dto as object) } : null)),
  deletePerson: jest.fn((id: number) => id === 1),
}));

describe('PersonsController (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PersonsModule],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TreeMemberGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(AuthService)
      .useValue({})
      .compile();

    app = module.createNestApplication<NestExpressApplication>({ bodyParser: false });
    app.useBodyParser('json', { limit: '300kb' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/persons?treeId=1 → 200 + array', () =>
    request(app.getHttpServer()).get('/api/persons?treeId=1').expect(200).expect((res) => {
      expect(res.body[0].name).toBe('Ada Lovelace');
    }));

  it('POST /api/persons {treeId:1, nickname:"Ada", birthYear:1815} → 201', () =>
    request(app.getHttpServer()).post('/api/persons').send({ treeId: 1, nickname: 'Ada', birthYear: 1815 }).expect(201));

  it('POST /api/persons {treeId:1, nickname:"Ada"} without birthYear → 201 (nickname-first)', () =>
    request(app.getHttpServer()).post('/api/persons').send({ treeId: 1, nickname: 'Ada' }).expect(201));

  it('POST /api/persons with a jpeg data URL photo → 201', () =>
    request(app.getHttpServer())
      .post('/api/persons')
      .send({ treeId: 1, nickname: 'Ada', photo: 'data:image/jpeg;base64,/9j/4AAQ' })
      .expect(201));

  it('POST /api/persons with a non-image photo → 400', () =>
    request(app.getHttpServer())
      .post('/api/persons')
      .send({ treeId: 1, nickname: 'Ada', photo: 'data:text/html;base64,PGgxPg==' })
      .expect(400));

  it('POST /api/persons with an oversized photo → 400', () =>
    request(app.getHttpServer())
      .post('/api/persons')
      .send({ treeId: 1, nickname: 'Ada', photo: 'data:image/png;base64,' + 'A'.repeat(200_001) })
      .expect(400));

  it('POST /api/persons missing treeId → 400', () =>
    request(app.getHttpServer()).post('/api/persons').send({ nickname: 'Ada', birthYear: 1815 }).expect(400));

  it('POST /api/persons missing nickname → 400', () =>
    request(app.getHttpServer()).post('/api/persons').send({ treeId: 1, name: 'Ada' }).expect(400));

  it('POST /api/persons {nickname:""} → 400', () =>
    request(app.getHttpServer()).post('/api/persons').send({ treeId: 1, nickname: '', birthYear: 1815 }).expect(400));

  it('POST /api/persons {birthLat:999} → 400', () =>
    request(app.getHttpServer()).post('/api/persons').send({ treeId: 1, nickname: 'X', birthYear: 1815, birthLat: 999 }).expect(400));

  it('POST /api/persons {birthMonth:13} → 400', () =>
    request(app.getHttpServer()).post('/api/persons').send({ treeId: 1, nickname: 'X', birthYear: 1815, birthMonth: 13 }).expect(400));

  it('POST /api/persons {birthTime:"25:99"} → 400', () =>
    request(app.getHttpServer()).post('/api/persons').send({ treeId: 1, nickname: 'X', birthYear: 1815, birthTime: '25:99' }).expect(400));

  it('GET /api/persons/1?treeId=1 → 200', () =>
    request(app.getHttpServer()).get('/api/persons/1?treeId=1').expect(200));

  it('GET /api/persons/999?treeId=1 → 404', () =>
    request(app.getHttpServer()).get('/api/persons/999?treeId=1').expect(404));

  it('PATCH /api/persons/1?treeId=1 → 200', () =>
    request(app.getHttpServer()).patch('/api/persons/1?treeId=1').send({ name: 'Updated' }).expect(200));

  it('PATCH /api/persons/999?treeId=1 → 404', () =>
    request(app.getHttpServer()).patch('/api/persons/999?treeId=1').send({ name: 'X' }).expect(404));

  it('DELETE /api/persons/1?treeId=1 → 204', () =>
    request(app.getHttpServer()).delete('/api/persons/1?treeId=1').expect(204));

  it('DELETE /api/persons/999?treeId=1 → 404', () =>
    request(app.getHttpServer()).delete('/api/persons/999?treeId=1').expect(404));
});
