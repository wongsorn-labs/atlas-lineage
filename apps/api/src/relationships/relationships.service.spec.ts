import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';

const mockRel = { id: 1, treeId: 1, personId: 1, relatedPersonId: 2, type: 'spouse', createdAt: '2024-01-01' };
const mockPersons: Record<number, unknown> = {
  1: { id: 1, treeId: 1, name: 'Ada' },
  2: { id: 2, treeId: 1, name: 'Grace' },
  3: { id: 3, treeId: 1, name: 'Alan' },
};

jest.mock('@wongsorn-labs/atlas-lineage-db', () => ({
  findAllRelationships: jest.fn(() => [mockRel]),
  findRelationshipsByPerson: jest.fn((id: number) => (id === 1 ? [mockRel] : [])),
  findPersonById: jest.fn((id: number) => mockPersons[id] ?? null),
  createRelationship: jest.fn((dto: unknown) => ({ ...mockRel, ...(dto as object), id: 2 })),
  deleteRelationship: jest.fn((id: number) => id === 1),
}));

describe('RelationshipsService', () => {
  let service: RelationshipsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RelationshipsService],
    }).compile();
    service = module.get<RelationshipsService>(RelationshipsService);
  });

  it('findAll returns array', () => {
    expect(service.findAll(1)).toEqual([mockRel]);
  });

  it('findByPerson returns filtered array', () => {
    expect(service.findByPerson(1, 1)).toEqual([mockRel]);
    expect(service.findByPerson(99, 1)).toEqual([]);
  });

  it('create returns new relationship when both persons exist in the tree', async () => {
    const dto = { treeId: 1, personId: 1, relatedPersonId: 3, type: 'sibling' };
    const result = await service.create(dto as never);
    expect(result.personId).toBe(1);
  });

  it('create throws NotFoundException when a person is not in the tree', async () => {
    const dto = { treeId: 1, personId: 1, relatedPersonId: 999, type: 'sibling' };
    await expect(service.create(dto as never)).rejects.toThrow(NotFoundException);
  });

  it('remove returns deleted:true', async () => {
    await expect(service.remove(1, 1)).resolves.toEqual({ deleted: true });
  });

  it('remove throws NotFoundException when not found', async () => {
    await expect(service.remove(99, 1)).rejects.toThrow(NotFoundException);
  });
});
