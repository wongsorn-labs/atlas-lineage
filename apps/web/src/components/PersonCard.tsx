import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Trash2, GitBranch, MapPin } from 'lucide-react';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';
import { PersonForm } from './PersonForm';
import { RelationshipForm } from './RelationshipForm';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useDeletePerson, useUpdatePerson, usePersons } from '../hooks/usePersons';
import { useCreateRelationship, useDeleteRelationship, useRelationshipsForPerson } from '../hooks/useRelationships';
import { useTree } from '../contexts/TreeContext';

interface PersonCardProps {
  person: Person;
  isSelected: boolean;
  onSelect: (person: Person | null) => void;
}

export function PersonCard({ person, isSelected, onSelect }: PersonCardProps) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const { currentTreeId } = useTree();
  const deletePerson = useDeletePerson(currentTreeId);
  const updatePerson = useUpdatePerson(currentTreeId);
  const createRel = useCreateRelationship(currentTreeId);
  const deleteRel = useDeleteRelationship(currentTreeId);
  const { data: allPersons = [] } = usePersons(currentTreeId);
  const { data: relationships = [] } = useRelationshipsForPerson(person.id, currentTreeId);

  const lifespan = [
    person.birthYear ? `b. ${person.birthYear}` : null,
    person.deathYear ? `d. ${person.deathYear}` : null,
  ]
    .filter(Boolean)
    .join('  ');

  const handleDelete = () => {
    if (confirm(`Remove ${person.name}?`)) {
      deletePerson.mutate(person.id);
      if (isSelected) onSelect(null);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(isSelected ? null : person)}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(isSelected ? null : person)}
        className={[
          'group glass-card cursor-pointer px-3 py-2.5 transition-all duration-150',
          isSelected
            ? 'glass-card-gold ring-1 ring-[--border-gold]'
            : 'hover:border-[--border-gold]',
        ].join(' ')}
      >
        {/* Name */}
        <p className="font-display text-sm font-semibold leading-snug text-[--text-primary] truncate">
          {person.name}
        </p>

        {/* Lifespan */}
        {lifespan && (
          <p className="mt-0.5 text-xs text-[--text-muted]">{lifespan}</p>
        )}

        {/* Birth place */}
        {person.birthPlace && (
          <div className="mt-1 flex items-center gap-1 text-xs text-[--text-secondary]">
            <MapPin className="h-3 w-3 flex-shrink-0 text-[--gold]" aria-hidden="true" />
            <span className="truncate">{person.birthPlace}</span>
          </div>
        )}

        {/* Existing relationships — shown only for the selected person, since
            each side of a relationship otherwise renders its own matching
            badge and duplicates test-id lookups across cards */}
        {isSelected && relationships.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {relationships.map((rel) => {
              const otherId = rel.personId === person.id ? rel.relatedPersonId : rel.personId;
              const other = allPersons.find((p) => p.id === otherId);
              return (
                <span key={rel.id} className="inline-flex items-center gap-0.5">
                  <Badge variant={rel.type} data-testid="relationship-badge">
                    {t(`relationship.types.${rel.type}`)}
                    {other ? `: ${other.name}` : ''}
                  </Badge>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteRel.mutate(rel.id); }}
                    className="text-red-400 hover:text-red-500 p-0.5"
                    aria-label={`Delete relationship with ${other?.name ?? 'person'}`}
                    data-testid="delete-relationship-button"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Actions — visible only for the selected person, to keep action
            test ids unambiguous when multiple people are in the sidebar */}
        {isSelected && (
          <div className="mt-2 flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
              className="btn-ghost p-1 text-[--text-muted] hover:text-[--gold]"
              aria-label={`Edit ${person.name}`}
              data-testid="edit-person-button"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRelOpen(true); }}
              className="btn-ghost p-1 text-[--text-muted] hover:text-[--gold]"
              aria-label={`Manage relationships for ${person.name}`}
              data-testid="add-relationship-button"
            >
              <GitBranch className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="btn-ghost p-1 text-[--text-muted] hover:text-red-400 ml-auto"
              aria-label={`Delete ${person.name}`}
              data-testid="delete-person-button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit Person</DialogTitle>
          </DialogHeader>
          <PersonForm
            initial={person}
            onSubmit={async (values) => {
              await updatePerson.mutateAsync({ id: person.id, data: values });
              setEditOpen(false);
            }}
            onCancel={() => setEditOpen(false)}
            isLoading={updatePerson.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={relOpen} onOpenChange={setRelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Relationships — {person.name}</DialogTitle>
          </DialogHeader>
          <RelationshipForm
            currentPerson={person}
            allPersons={allPersons}
            onSubmit={async (values) => {
              await createRel.mutateAsync({
                personId: person.id,
                relatedPersonId: Number(values.relatedPersonId),
                type: values.type,
              });
              setRelOpen(false);
            }}
            onCancel={() => setRelOpen(false)}
            isLoading={createRel.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
