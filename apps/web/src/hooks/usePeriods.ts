import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CreatePeriodInput } from '@wongsorn-labs/atlas-lineage-shared';

const KEY = (treeId: number | null) => ['periods', treeId] as const;

export function usePeriods(treeId: number | null) {
  return useQuery({
    queryKey: KEY(treeId),
    queryFn: () => api.periods.list(treeId as number),
    enabled: treeId != null,
  });
}

export function useCreatePeriod(treeId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CreatePeriodInput, 'treeId'>) => api.periods.create({ ...data, treeId: treeId as number }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(treeId) }),
  });
}

export function useDeletePeriod(treeId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.periods.delete(id, treeId as number),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(treeId) }),
  });
}
