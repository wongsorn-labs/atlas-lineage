import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PersonsModule } from './persons.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

const mockPerson = { id: 1, name: 'Ada Lovelace', birthYear: null, deathYear: null, birthLat: null, birthLng: null, birthPlace: null, notes: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' };

jest.mock('@wongsorn-labs/atlas-lineage-db', () => ({
  findAllPersons: jest.fn(() => [mockPerson]),
  findPersonById: jest.fn((id: number) => (id === 1 ? mockPerson : null)),
  createPerson: jest.fn((dto: unknown) => ({ ...mockPerson, ...(dto as object), id: 2 })),
  updatePerson: jest.fn((id: number, dto: unknown) => (id === 1 ? { ...mockPerson, ...(dto as object) } : null)),
  deletePerson: jest.fn((id: number) => id === 1),
}));

describe('PersonsController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PersonsModule],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/persons → 200 + array', () =>
    request(app.getHttpServer()).get('/api/persons').expect(200).expect((res) => {
      expect(res.body[0].name).toBe('Ada Lovelace');
    }));

  it('POST /api/persons {name:"Ada"} → 201', () =>
    request(app.getHttpServer()).post('/api/persons').send({ name: 'Ada' }).expect(201));

  it('POST /api/persons {name:""} → 400', () =>
    request(app.getHttpServer()).post('/api/persons').send({ name: '' }).expect(400));

  it('POST /api/persons {birthLat:999} → 400', () =>
    request(app.getHttpServer()).post('/api/persons').send({ name: 'X', birthLat: 999 }).expect(400));

  it('GET /api/persons/1 → 200', () =>
    request(app.getHttpServer()).get('/api/persons/1').expect(200));

  it('GET /api/persons/999 → 404', () =>
    request(app.getHttpServer()).get('/api/persons/999').expect(404));

  it('PATCH /api/persons/1 → 200', () =>
    request(app.getHttpServer()).patch('/api/persons/1').send({ name: 'Updated' }).expect(200));

  it('PATCH /api/persons/999 → 404', () =>
    request(app.getHttpServer()).patch('/api/persons/999').send({ name: 'X' }).expect(404));

  it('DELETE /api/persons/1 → 204', () =>
    request(app.getHttpServer()).delete('/api/persons/1').expect(204));

  it('DELETE /api/persons/999 → 404', () =>
    request(app.getHttpServer()).delete('/api/persons/999').expect(404));
});
