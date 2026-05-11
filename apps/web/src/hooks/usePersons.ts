import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CreatePersonInput, UpdatePersonInput } from '@atlas/shared';

const KEY = ['persons'] as const;

export function usePersons() {
  return useQuery({ queryKey: KEY, queryFn: api.persons.list });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePersonInput) => api.persons.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePersonInput }) =>
      api.persons.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.persons.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
