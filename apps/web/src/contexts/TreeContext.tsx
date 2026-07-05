import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import type { FamilyTreeMembership } from '@wongsorn-labs/atlas-lineage-shared';

const STORAGE_KEY = 'currentTreeId';

interface TreeContextValue {
  trees: FamilyTreeMembership[];
  currentTree: FamilyTreeMembership | null;
  currentTreeId: number | null;
  isLoading: boolean;
  setCurrentTreeId: (id: number) => void;
}

const TreeContext = createContext<TreeContextValue | null>(null);

export function TreeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentTreeId, setCurrentTreeIdState] = useState<number | null>(null);

  const treesQuery = useQuery({
    queryKey: ['trees', user?.id],
    queryFn: api.trees.list,
    enabled: !!user,
  });

  const trees = treesQuery.data ?? [];

  useEffect(() => {
    if (trees.length === 0) return;
    if (currentTreeId != null && trees.some((tree) => tree.id === currentTreeId)) return;
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    const remembered = trees.find((tree) => tree.id === stored);
    setCurrentTreeIdState(remembered ? remembered.id : trees[0].id);
  }, [trees, currentTreeId]);

  const setCurrentTreeId = (id: number) => {
    setCurrentTreeIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  };

  const currentTree = trees.find((tree) => tree.id === currentTreeId) ?? null;

  return (
    <TreeContext.Provider
      value={{ trees, currentTree, currentTreeId, isLoading: treesQuery.isLoading, setCurrentTreeId }}
    >
      {children}
    </TreeContext.Provider>
  );
}

export function useTree() {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error('useTree must be used within TreeProvider');
  return ctx;
}
