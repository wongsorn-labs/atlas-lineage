import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CreateTreeInput, UpdateTreeInput, AddTreeMemberInput } from '@wongsorn-labs/atlas-lineage-shared';

export function useCreateTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTreeInput) => api.trees.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trees'] }),
  });
}

export function useUpdateTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ treeId, data }: { treeId: number; data: UpdateTreeInput }) =>
      api.trees.update(treeId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trees'] }),
  });
}

export function useAddTreeMember() {
  return useMutation({
    mutationFn: ({ treeId, data }: { treeId: number; data: AddTreeMemberInput }) =>
      api.trees.addMember(treeId, data),
  });
}

export function useTrashedTrees() {
  return useQuery({
    queryKey: ['trees', 'trash'],
    queryFn: api.trees.trash,
  });
}

export function useDeleteTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (treeId: number) => api.trees.delete(treeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trees'] });
    },
  });
}

export function useRestoreTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (treeId: number) => api.trees.restore(treeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trees'] });
    },
  });
}

export function usePurgeTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (treeId: number) => api.trees.purge(treeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trees', 'trash'] }),
  });
}
