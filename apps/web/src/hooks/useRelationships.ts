import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CreateRelationshipInput } from '@wongsorn-labs/atlas-lineage-shared';

const KEY = ['relationships'] as const;

export function useRelationships() {
  return useQuery({ queryKey: KEY, queryFn: api.relationships.list });
}

export function useCreateRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRelationshipInput) => api.relationships.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.relationships.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
