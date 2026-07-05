import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CreateTreeInput, AddTreeMemberInput } from '@wongsorn-labs/atlas-lineage-shared';

export function useCreateTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTreeInput) => api.trees.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trees'] }),
  });
}

export function useAddTreeMember() {
  return useMutation({
    mutationFn: ({ treeId, data }: { treeId: number; data: AddTreeMemberInput }) =>
      api.trees.addMember(treeId, data),
  });
}
