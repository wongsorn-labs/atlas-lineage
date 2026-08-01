import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TreesService } from './trees.service';

const mockTree = {
  id: 1, name: 'Family Tree', description: null, ownerId: 'user-1',
  createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
};

jest.mock('@wongsorn-labs/atlas-lineage-db', () => ({
  findTreesByUser: jest.fn(() => []),
  findTreeById: jest.fn((id: number) => (id === 1 ? mockTree : null)),
  createTree: jest.fn((input: unknown) => ({ ...mockTree, ...(input as object) })),
  updateTree: jest.fn((id: number, input: unknown) => (id === 1 ? { ...mockTree, ...(input as object) } : null)),
  addTreeMember: jest.fn(),
  findMemberRole: jest.fn(),
}));

describe('TreesService', () => {
  let service: TreesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TreesService],
    }).compile();
    service = module.get<TreesService>(TreesService);
  });

  it('updateTree returns updated tree', async () => {
    const input = { name: 'Renamed Tree' };
    await expect(service.updateTree(1, input)).resolves.toMatchObject({ id: 1, name: 'Renamed Tree' });
  });

  it('updateTree throws NotFoundException when not found', async () => {
    await expect(service.updateTree(99, { name: 'X' })).rejects.toThrow(NotFoundException);
  });
});
