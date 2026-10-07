import { useState, useMemo } from 'react';
import { LogOut, Search, SlidersHorizontal, UserPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';
import { PersonCard } from './PersonCard';
import { PersonForm } from './PersonForm';
import { useCreatePerson } from '@/hooks/usePersons';
import { Avatar } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { useTree } from '../contexts/TreeContext';
import { TreeSwitcher } from './TreeSwitcher';
import { SettingsDialog } from './SettingsDialog';
import { PendingLinkRequestsDialog } from './PendingLinkRequestsDialog';

interface SidebarProps {
  persons: Person[];
  selectedPerson: Person | null;
  onSelectPerson: (person: Person | null) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ persons, selectedPerson, onSelectPerson, isOpen = true, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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
    <aside
      className={`fixed inset-y-0 left-0 z-(--z-dialog) flex h-dvh w-72 max-w-[85vw] flex-shrink-0 flex-col glass-card rounded-none border-r border-(--border) transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-(--border) px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/icon-192.png" alt="" className="h-8 w-8 flex-shrink-0 rounded-lg" />
          <h1 className="font-display text-lg font-semibold text-(--gold) truncate">Atlas Lineage</h1>
        </div>
        <button
          type="button"
          className="btn-ghost p-1.5 md:hidden"
          onClick={onClose}
          aria-label={t('sidebar.closeMenu')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tree switcher */}
      <div className="border-b border-(--border) px-3 py-2">
        <TreeSwitcher />
      </div>

      {/* Search */}
      <div className="border-b border-(--border) px-3 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-(--text-muted)" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('sidebar.searchPlaceholder')}
              className="input-glass w-full pl-8 text-xs py-1.5"
              aria-label={t('sidebar.searchAria')}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-ghost flex-shrink-0 p-1.5 ${showFilters || yearFrom || yearTo ? 'text-(--gold)' : 'text-(--text-muted)'}`}
            aria-label={t('sidebar.toggleFilters')}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
        {showFilters && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              placeholder={t('sidebar.yearFromPlaceholder')}
              className="input-glass w-1/2 text-xs py-1.5"
              aria-label={t('sidebar.yearFromAria')}
            />
            <input
              type="number"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              placeholder={t('sidebar.yearToPlaceholder')}
              className="input-glass w-1/2 text-xs py-1.5"
              aria-label={t('sidebar.yearToAria')}
            />
          </div>
        )}
      </div>

      {/* Person count */}
      <div className="px-4 py-2 text-xs text-(--text-muted)">
        {t('sidebar.peopleCount', { count: filtered.length })}
        {(search || yearFrom || yearTo) ? t('sidebar.filteredFrom', { count: persons.length }) : ''}
      </div>

      {/* Person list */}
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto px-2 pb-20 pt-0 space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm text-(--text-muted)">{t('sidebar.noResults')}</p>
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

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={
              <button
                type="button"
                className="absolute bottom-4 right-4 z-(--z-dropdown) flex h-12 w-12 items-center justify-center rounded-full bg-(--gold) text-(--text-primary) shadow-(--shadow-gold-glow) transition-transform hover:opacity-90 active:scale-95"
                aria-label={t('sidebar.addPersonAria')}
                data-testid="add-person-button"
              />
            }
          >
            <UserPlus className="h-5 w-5" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('person.addTitle')}</DialogTitle>
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
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-(--border) px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {user?.email && <Avatar name={user.email} className="h-7 w-7 text-[10px]" />}
          <p className="min-w-0 truncate text-xs text-(--text-muted)">{user?.email}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            className="btn-ghost p-1.5"
            onClick={() => void signOut()}
            aria-label={t('sidebar.signOut')}
            title={t('sidebar.signOut')}
          >
            <LogOut className="h-4 w-4" />
          </button>
          <PendingLinkRequestsDialog />
          <SettingsDialog />
        </div>
      </div>
    </aside>
  );
}
