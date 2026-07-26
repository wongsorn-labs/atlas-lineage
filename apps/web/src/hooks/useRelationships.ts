import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type CreateRelationshipRequest } from '../api/client';

const KEY = (treeId: number | null) => ['relationships', treeId] as const;

export function useRelationships(treeId: number | null) {
  return useQuery({
    queryKey: KEY(treeId),
    queryFn: () => api.relationships.list(treeId as number),
    enabled: treeId != null,
  });
}

export function useRelationshipsForPerson(personId: number, treeId: number | null) {
  return useQuery({
    queryKey: [...KEY(treeId), 'person', personId],
    queryFn: () => api.relationships.byPerson(personId, treeId as number),
    enabled: treeId != null,
  });
}

export function useCreateRelationship(treeId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRelationshipRequest) => api.relationships.create(data, treeId as number),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(treeId) }),
  });
}

export function useDeleteRelationship(treeId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.relationships.delete(id, treeId as number),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(treeId) }),
  });
}
