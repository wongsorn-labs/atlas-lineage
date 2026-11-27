import { useState, useMemo } from 'react';
import { LogOut, Search, UserPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';
import { PersonForm } from './PersonForm';
import { useCreatePerson } from '@/hooks/usePersons';
import { useFieldDefinitions } from '@/hooks/useFieldDefinitions';
import { FieldDefinitionsDialog } from './FieldDefinitionsDialog';
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
  const [addOpen, setAddOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { currentTreeId, currentTree } = useTree();
  const { data: fieldDefinitions = [] } = useFieldDefinitions(currentTreeId);
  const createPerson = useCreatePerson(currentTreeId);

  // Search is a jump-to-person lookup, not a list: at most a few matches shown while typing.
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return persons
      .filter((p) => [p.nickname, p.name, p.birthPlace].some((v) => (v ?? '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [persons, search]);

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
          <X className="size-4" />
        </button>
      </div>

      {/* Tree switcher */}
      <div className="border-b border-(--border) px-3 py-2">
        <TreeSwitcher />
      </div>

      {/* Find a person: results appear only while typing, then jump the view to them */}
      <div className="relative border-b border-(--border) px-3 py-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4.5 text-(--text-muted)" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('sidebar.searchPlaceholder')}
            className="input-glass w-full pl-8 text-xs py-1.5"
            aria-label={t('sidebar.searchAria')}
            data-testid="person-search"
          />
        </div>
        {search.trim() && (
          <ul className="absolute inset-x-3 top-full z-(--z-dropdown) mt-1 max-h-72 overflow-y-auto rounded-xl border border-(--border) bg-(--bg-card) p-1 shadow-md" data-testid="person-search-results">
            {matches.length === 0 && (
              <li className="px-3 py-2 text-xs text-(--text-muted)">{t('sidebar.noResults')}</li>
            )}
            {matches.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-(--muted) focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  onClick={() => {
                    onSelectPerson(person);
                    setSearch('');
                  }}
                >
                  <Avatar name={person.name} photo={person.photo} className="h-7 w-7 text-[10px]" />
                  <span className="min-w-0 truncate">{person.nickname ?? person.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between text-xs text-(--text-muted)">
          <span>{t('sidebar.peopleCount', { count: persons.length })}</span>
          <FieldDefinitionsDialog treeId={currentTreeId} canEdit={currentTree?.role === 'owner'} />
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
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
            <UserPlus className="size-4" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('person.addTitle')}</DialogTitle>
            </DialogHeader>
            <PersonForm
              fieldDefinitions={fieldDefinitions}
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
            <LogOut className="size-4" />
          </button>
          <PendingLinkRequestsDialog />
          <SettingsDialog />
        </div>
      </div>
    </aside>
  );
}
