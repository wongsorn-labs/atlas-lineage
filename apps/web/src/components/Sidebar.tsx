import { useState, useMemo } from 'react';
import { Search, UserPlus } from 'lucide-react';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';
import { PersonCard } from './PersonCard';
import { PersonForm } from './PersonForm';
import { useCreatePerson } from '@/hooks/usePersons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { useTree } from '../contexts/TreeContext';
import { TreeSwitcher } from './TreeSwitcher';

interface SidebarProps {
  persons: Person[];
  selectedPerson: Person | null;
  onSelectPerson: (person: Person | null) => void;
}

export function Sidebar({ persons, selectedPerson, onSelectPerson }: SidebarProps) {
  const [search, setSearch] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { currentTreeId } = useTree();
  const createPerson = useCreatePerson(currentTreeId);

  const filtered = useMemo(() => {
    return persons.filter((p) => {
      const matchesName = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.birthPlace ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesFrom = !yearFrom || (p.birthYear != null && p.birthYear >= Number(yearFrom));
      const matchesTo = !yearTo || (p.birthYear != null && p.birthYear <= Number(yearTo));
      return matchesName && matchesFrom && matchesTo;
    });
  }, [persons, search, yearFrom, yearTo]);

  return (
    <aside className="flex h-screen w-72 flex-shrink-0 flex-col glass-card rounded-none border-r border-[--border]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[--border] px-4 py-3">
        <h1 className="font-display text-lg font-semibold text-[--gold]">Atlas Lineage</h1>
        <div className="flex items-center gap-1">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <button type="button" className="btn-ghost p-1.5" aria-label="Add person" data-testid="add-person-button">
                <UserPlus className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add person</DialogTitle>
              </DialogHeader>
              <PersonForm
                onSubmit={async (values) => {
                  await createPerson.mutateAsync(values);
                  setAddOpen(false);
                }}
                onCancel={() => setAddOpen(false)}
                isLoading={createPerson.isPending}
              />
            </DialogContent>
          </Dialog>
          <button
            type="button"
            className="btn-ghost p-1.5 text-xs"
            onClick={() => void signOut()}
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Tree switcher */}
      <div className="border-b border-[--border] px-3 py-2">
        <TreeSwitcher />
      </div>

      {/* Search */}
      <div className="border-b border-[--border] px-3 py-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[--text-muted]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people…"
            className="input-glass w-full pl-8 text-xs py-1.5"
            aria-label="Search people"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder="From year"
            className="input-glass w-1/2 text-xs py-1.5"
            aria-label="Filter from birth year"
          />
          <input
            type="number"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            placeholder="To year"
            className="input-glass w-1/2 text-xs py-1.5"
            aria-label="Filter to birth year"
          />
        </div>
      </div>

      {/* Person count */}
      <div className="px-4 py-2 text-xs text-[--text-muted]">
        {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
        {search || yearFrom || yearTo ? ` (filtered from ${persons.length})` : ''}
      </div>

      {/* Person list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-[--text-muted]">No people found</p>
          </div>
        ) : (
          filtered.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              isSelected={selectedPerson?.id === person.id}
              onSelect={onSelectPerson}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[--border] px-4 py-2">
        <p className="text-xs text-[--text-muted] truncate">{user?.email}</p>
      </div>
    </aside>
  );
}
