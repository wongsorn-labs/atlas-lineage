import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PersonsService } from './persons.service';

const mockPerson = { id: 1, name: 'Ada Lovelace', birthYear: 1815, deathYear: 1852, birthLat: null, birthLng: null, birthPlace: null, notes: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' };

jest.mock('@wongsorn-labs/atlas-lineage-db', () => ({
  findAllPersons: jest.fn(() => [mockPerson]),
  findPersonById: jest.fn((id: number) => (id === 1 ? mockPerson : null)),
  createPerson: jest.fn((dto: unknown) => ({ ...mockPerson, ...(dto as object) })),
  updatePerson: jest.fn((id: number, dto: unknown) => (id === 1 ? { ...mockPerson, ...(dto as object) } : null)),
  deletePerson: jest.fn((id: number) => id === 1),
}));

describe('PersonsService', () => {
  let service: PersonsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonsService],
    }).compile();
    service = module.get<PersonsService>(PersonsService);
  });

  it('findAll returns array', () => {
    expect(service.findAll()).toEqual([mockPerson]);
  });

  it('findOne returns person when found', async () => {
    await expect(service.findOne(1)).resolves.toEqual(mockPerson);
  });

  it('findOne throws NotFoundException when not found', async () => {
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('create calls createPerson with dto', async () => {
    const dto = { name: 'Grace Hopper' };
    const result = await service.create(dto as never);
    expect(result.name).toBe('Grace Hopper');
  });

  it('update returns updated person', async () => {
    const dto = { name: 'Ada Updated' };
    await expect(service.update(1, dto as never)).resolves.toMatchObject({ id: 1, name: 'Ada Updated' });
  });

  it('update throws NotFoundException when not found', async () => {
    await expect(service.update(99, { name: 'X' } as never)).rejects.toThrow(NotFoundException);
  });

  it('remove returns deleted:true', async () => {
    await expect(service.remove(1)).resolves.toEqual({ deleted: true });
  });

  it('remove throws NotFoundException when not found', async () => {
    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });
});
