import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useHierarchy(treeId: number | null, rootId: number | null) {
  return useQuery({
    queryKey: ['hierarchy', treeId, rootId],
    queryFn: () => api.relationships.hierarchy(treeId as number, rootId as number),
    enabled: treeId != null && rootId != null,
  });
}
