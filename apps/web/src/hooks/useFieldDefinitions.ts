import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type CreateFieldDefinitionRequest } from '../api/client';

const KEY = (treeId: number | null) => ['field-definitions', treeId] as const;

export function useFieldDefinitions(treeId: number | null) {
  return useQuery({
    queryKey: KEY(treeId),
    queryFn: () => api.fieldDefinitions.list(treeId as number),
    enabled: treeId != null,
  });
}

export function useCreateFieldDefinition(treeId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFieldDefinitionRequest) => api.fieldDefinitions.create(treeId as number, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(treeId) }),
  });
}

export function useDeleteFieldDefinition(treeId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.fieldDefinitions.delete(id, treeId as number),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(treeId) }),
  });
}
