import { useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';
import { Avatar } from './ui/avatar';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PersonForm } from './PersonForm';
import { TreeSwitcher } from './TreeSwitcher';
import { FieldDefinitionsDialog } from './FieldDefinitionsDialog';
import { PendingLinkRequestsDialog } from './PendingLinkRequestsDialog';
import { SettingsDialog } from './SettingsDialog';
import { useAuth } from '../contexts/AuthContext';
import { useTree } from '../contexts/TreeContext';
import { useCreatePerson } from '@/hooks/usePersons';
import { useFieldDefinitions } from '@/hooks/useFieldDefinitions';

interface TopBarProps {
  persons: Person[];
  onSelectPerson: (person: Person | null) => void;
}

/**
 * Single top bar for every screen size: group name, person search, and a
 * user menu. Group management, settings and sign-out live in the menu, so the
 * views get the full screen. Adding a person is a floating button.
 */
export function TopBar({ persons, onSelectPerson }: TopBarProps) {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const { trees, currentTree, currentTreeId, setCurrentTreeId } = useTree();
  const [search, setSearch] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { data: fieldDefinitions = [] } = useFieldDefinitions(currentTreeId);
  const createPerson = useCreatePerson(currentTreeId);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return persons
      .filter((p) => [p.nickname, p.name, p.birthPlace].some((v) => (v ?? '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [persons, search]);

  const pick = (person: Person) => {
    onSelectPerson(person);
    setSearch('');
    setMobileSearchOpen(false);
  };

  const searchField = (
    <div className="relative w-full">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-(--text-muted)" aria-hidden="true" />
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('sidebar.searchPlaceholder')}
        aria-label={t('sidebar.searchAria')}
        data-testid="person-search"
        className="input-glass h-10 w-full pl-8 text-sm md:h-8 md:text-xs"
      />
      {search.trim() && (
        <ul
          data-testid="person-search-results"
          className="absolute inset-x-0 top-full z-(--z-dropdown) mt-1 max-h-72 overflow-y-auto rounded-xl border border-(--border) bg-(--bg-card) p-1 shadow-md"
        >
          {matches.length === 0 && <li className="px-3 py-2 text-xs text-(--text-muted)">{t('sidebar.noResults')}</li>}
          {matches.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-(--muted) focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                onClick={() => pick(person)}
              >
                <Avatar name={person.name} photo={person.photo} className="h-7 w-7 text-[10px]" />
                <span className="min-w-0 truncate">{person.nickname ?? person.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <header
        data-testid="top-bar"
        className="absolute inset-x-0 top-0 z-(--z-popover) flex h-14 items-center gap-2 border-b border-(--border) bg-(--bg-card) px-3"
      >
        <img src="/icon-192.png" alt="" className="hidden h-8 w-8 flex-shrink-0 rounded-lg sm:block" />
        <Select
          value={currentTreeId != null ? String(currentTreeId) : undefined}
          onValueChange={(value) => setCurrentTreeId(Number(value))}
        >
          <SelectTrigger data-testid="tree-select" aria-label={t('tree.selectLabel')} className="h-9 w-36 text-xs md:w-52">
            <SelectValue placeholder={t('tree.selectLabel')}>
              {(value: string | null) => trees.find((tree) => String(tree.id) === value)?.name ?? t('tree.selectLabel')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {trees.map((tree) => (
              <SelectItem key={tree.id} value={String(tree.id)}>
                {tree.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden w-72 md:block">{searchField}</div>
          <button
            type="button"
            className="btn-ghost flex size-10 items-center justify-center md:hidden"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label={t('sidebar.searchAria')}
            aria-expanded={mobileSearchOpen}
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full"
            onClick={() => setMenuOpen(true)}
            aria-label={t('sidebar.menu', { defaultValue: 'เมนู' })}
            data-testid="user-menu-button"
          >
            <Avatar name={user?.email ?? '?'} className="size-9 text-[11px]" />
          </button>
        </div>
      </header>

      {mobileSearchOpen && (
        <div className="absolute inset-x-0 top-14 z-(--z-popover) border-b border-(--border) bg-(--bg-card) p-3 md:hidden">
          {searchField}
        </div>
      )}

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label={t('sidebar.addPersonAria')}
        data-testid="add-person-button"
        className="absolute bottom-4 right-4 z-(--z-dropdown) flex size-14 items-center justify-center rounded-full bg-(--gold) text-(--text-primary) shadow-(--shadow-gold-glow) transition-transform hover:opacity-90 active:scale-95"
      >
        <UserPlus className="size-5" />
      </button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
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

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sidebar.menu', { defaultValue: 'เมนู' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
                {t('sidebar.groupSection', { defaultValue: 'กลุ่ม' })}
              </h3>
              <p className="text-(--text-secondary)">{currentTree?.name}</p>
              <TreeSwitcher />
            </section>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
                {t('sidebar.accountSection', { defaultValue: 'บัญชี' })}
              </h3>
              <FieldDefinitionsDialog treeId={currentTreeId} canEdit={currentTree?.role === 'owner'} />
              <PendingLinkRequestsDialog />
              <SettingsDialog />
              <p className="truncate pt-2 text-xs text-(--text-muted)">{user?.email}</p>
              <Button type="button" variant="outline" onClick={() => void signOut()} className="w-full">
                {t('sidebar.signOut')}
              </Button>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
