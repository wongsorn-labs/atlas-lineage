import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function usePendingPersonLinks() {
  return useQuery({
    queryKey: ['personLinks', 'pending'],
    queryFn: api.personLinks.pending,
  });
}

export function usePersonLink(treeId: number | null, personId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['personLinks', 'forPerson', treeId, personId],
    queryFn: () => api.personLinks.forPerson(treeId!, personId),
    enabled: enabled && treeId != null,
  });
}

export function useRequestPersonLink() {
  return useMutation({
    mutationFn: ({ treeId, personId }: { treeId: number; personId: number }) =>
      api.personLinks.request(treeId, personId),
  });
}

function useInvalidateAfterLinkChange() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['personLinks'] });
    qc.invalidateQueries({ queryKey: ['persons'] });
    qc.invalidateQueries({ queryKey: ['relationships'] });
  };
}

export function useApprovePersonLink() {
  const invalidate = useInvalidateAfterLinkChange();
  return useMutation({
    mutationFn: (id: number) => api.personLinks.approve(id),
    onSuccess: invalidate,
  });
}

export function useRejectPersonLink() {
  const invalidate = useInvalidateAfterLinkChange();
  return useMutation({
    mutationFn: (id: number) => api.personLinks.reject(id),
    onSuccess: invalidate,
  });
}

export function useUnlinkPersonTree() {
  const invalidate = useInvalidateAfterLinkChange();
  return useMutation({
    mutationFn: (id: number) => api.personLinks.unlink(id),
    onSuccess: invalidate,
  });
}
