import { useState } from 'react';
import { UserPlus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PersonForm } from './PersonForm';
import { PersonCard } from './PersonCard';
import { useCreatePerson } from '@/hooks/usePersons';
import type { Person } from '@atlas/shared';

interface SidebarProps {
  persons: Person[];
  selectedPerson: Person | null;
  onSelectPerson: (p: Person | null) => void;
}

export function Sidebar({ persons, selectedPerson, onSelectPerson }: SidebarProps) {
  const [addOpen, setAddOpen] = useState(false);
  const createPerson = useCreatePerson();

  return (
    <aside className="w-80 flex flex-col h-full border-r border-slate-200 bg-white shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h1 className="font-semibold text-slate-900 text-sm tracking-wide">Atlas Lineage</h1>
        <Button size="sm" className="gap-1 h-8" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {/* Person list / detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedPerson ? (
          <>
            <button
              className="w-full text-left px-4 py-2 text-xs text-blue-600 hover:underline"
              onClick={() => onSelectPerson(null)}
            >
              ← All people
            </button>
            <PersonCard
              person={selectedPerson}
              allPersons={persons}
              onDeselect={() => onSelectPerson(null)}
            />
          </>
        ) : persons.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 px-6 text-center">
            <MapPin className="h-8 w-8" />
            <p className="text-sm">Add your first family member to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {persons.map((p) => (
              <li key={p.id}>
                <button
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  onClick={() => onSelectPerson(p)}
                >
                  <div className="font-medium text-sm text-slate-900">{p.name}</div>
                  {(p.birthYear || p.birthPlace) && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {[p.birthYear, p.birthPlace].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {!p.birthLat && (
                    <div className="text-xs text-amber-500 mt-0.5">No coordinates</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add person dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
    </aside>
  );
}
