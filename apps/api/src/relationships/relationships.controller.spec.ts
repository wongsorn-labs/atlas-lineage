import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { RelationshipsModule } from './relationships.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';
import { TreeMemberGuard } from '../trees/tree-member.guard';

const mockRel = { id: 1, treeId: 1, personId: 1, relatedPersonId: 2, type: 'spouse', createdAt: '2024-01-01' };
const mockPerson = { id: 1, treeId: 1, name: 'Ada' };

jest.mock('@wongsorn-labs/atlas-lineage-db', () => ({
  findAllRelationships: jest.fn(() => [mockRel]),
  findRelationshipsByPerson: jest.fn((id: number) => (id === 1 ? [mockRel] : [])),
  findPersonById: jest.fn((id: number) => ([1, 2].includes(id) ? { id, treeId: 1, name: 'Person' } : null)),
  createRelationship: jest.fn((dto: unknown) => ({ ...mockRel, ...(dto as object), id: 2 })),
  deleteRelationship: jest.fn((id: number) => id === 1),
}));

describe('RelationshipsController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RelationshipsModule],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TreeMemberGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(AuthService)
      .useValue({})
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

  it('GET /api/relationships?treeId=1 → 200', () =>
    request(app.getHttpServer()).get('/api/relationships?treeId=1').expect(200));

  it('GET /api/relationships missing treeId → 400', () =>
    request(app.getHttpServer()).get('/api/relationships').expect(400));

  it('GET /api/relationships/person/1?treeId=1 → 200', () =>
    request(app.getHttpServer()).get('/api/relationships/person/1?treeId=1').expect(200));

  it('POST /api/relationships valid → 201', () =>
    request(app.getHttpServer())
      .post('/api/relationships')
      .send({ treeId: 1, personId: 1, relatedPersonId: 2, type: 'spouse' })
      .expect(201));

  it('POST /api/relationships missing treeId → 400', () =>
    request(app.getHttpServer())
      .post('/api/relationships')
      .send({ personId: 1, relatedPersonId: 2, type: 'spouse' })
      .expect(400));

  it('POST /api/relationships invalid type → 400', () =>
    request(app.getHttpServer())
      .post('/api/relationships')
      .send({ treeId: 1, personId: 1, relatedPersonId: 2, type: 'enemy' })
      .expect(400));

  it('POST /api/relationships missing fields → 400', () =>
    request(app.getHttpServer()).post('/api/relationships').send({}).expect(400));

  it('POST /api/relationships person outside tree → 404', () =>
    request(app.getHttpServer())
      .post('/api/relationships')
      .send({ treeId: 1, personId: 1, relatedPersonId: 999, type: 'spouse' })
      .expect(404));

  it('DELETE /api/relationships/1?treeId=1 → 204', () =>
    request(app.getHttpServer()).delete('/api/relationships/1?treeId=1').expect(204));

  it('DELETE /api/relationships/999?treeId=1 → 404', () =>
    request(app.getHttpServer()).delete('/api/relationships/999?treeId=1').expect(404));
});
