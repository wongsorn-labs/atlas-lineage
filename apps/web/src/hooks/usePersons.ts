import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type CreatePersonRequest } from '../api/client';
import type { UpdatePersonInput } from '@wongsorn-labs/atlas-lineage-shared';

const KEY = (treeId: number | null) => ['persons', treeId] as const;

export function usePersons(treeId: number | null) {
  return useQuery({
    queryKey: KEY(treeId),
    queryFn: () => api.persons.list(treeId as number),
    enabled: treeId != null,
  });
}

export function useCreatePerson(treeId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePersonRequest) => api.persons.create(data, treeId as number),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(treeId) }),
  });
}

export function useUpdatePerson(treeId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePersonInput }) =>
      api.persons.update(id, data, treeId as number),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(treeId) }),
  });
}

export function useDeletePerson(treeId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.persons.delete(id, treeId as number),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(treeId) }),
  });
}
