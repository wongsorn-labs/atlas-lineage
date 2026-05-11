import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { RelationshipsModule } from './relationships.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

const mockRel = { id: 1, personId: 1, relatedPersonId: 2, type: 'spouse', createdAt: '2024-01-01' };

jest.mock('@wongsorn-labs/atlas-lineage-db', () => ({
  findAllRelationships: jest.fn(() => [mockRel]),
  findRelationshipsByPerson: jest.fn((id: number) => (id === 1 ? [mockRel] : [])),
  createRelationship: jest.fn((dto: unknown) => ({ ...mockRel, ...(dto as object), id: 2 })),
  deleteRelationship: jest.fn((id: number) => id === 1),
}));

describe('RelationshipsController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RelationshipsModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/relationships → 200', () =>
    request(app.getHttpServer()).get('/api/relationships').expect(200));

  it('GET /api/relationships/person/1 → 200', () =>
    request(app.getHttpServer()).get('/api/relationships/person/1').expect(200));

  it('POST /api/relationships valid → 201', () =>
    request(app.getHttpServer())
      .post('/api/relationships')
      .send({ personId: 1, relatedPersonId: 2, type: 'spouse' })
      .expect(201));

  it('POST /api/relationships invalid type → 400', () =>
    request(app.getHttpServer())
      .post('/api/relationships')
      .send({ personId: 1, relatedPersonId: 2, type: 'enemy' })
      .expect(400));

  it('POST /api/relationships missing fields → 400', () =>
    request(app.getHttpServer()).post('/api/relationships').send({}).expect(400));

  it('DELETE /api/relationships/1 → 204', () =>
    request(app.getHttpServer()).delete('/api/relationships/1').expect(204));

  it('DELETE /api/relationships/999 → 404', () =>
    request(app.getHttpServer()).delete('/api/relationships/999').expect(404));
});
