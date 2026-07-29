import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cake, Edit2, Flower2, Trash2, GitBranch, MapPin } from 'lucide-react';
import type { Person, RelationshipType } from '@wongsorn-labs/atlas-lineage-shared';
import { PersonForm } from './PersonForm';
import { RelationshipForm } from './RelationshipForm';
import { Avatar } from './ui/avatar';
import { Badge } from './ui/badge';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useDeletePerson, useUpdatePerson, usePersons } from '../hooks/usePersons';
import { useCreateRelationship, useDeleteRelationship, useRelationshipsForPerson } from '../hooks/useRelationships';
import { useTree } from '../contexts/TreeContext';
import { formatPartialDate } from '../lib/formatPartialDate';

const INVERSE_TYPE: Record<RelationshipType, RelationshipType> = {
  parent: 'child',
  child: 'parent',
  sibling: 'sibling',
  spouse: 'spouse',
  partner: 'partner',
};

interface PersonCardProps {
  person: Person;
  isSelected: boolean;
  onSelect: (person: Person | null) => void;
}

export function PersonCard({ person, isSelected, onSelect }: PersonCardProps) {
  const { t, i18n } = useTranslation();
  const buddhistEra = i18n.language === 'th';
  const [editOpen, setEditOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [relToDelete, setRelToDelete] = useState<{ id: number; name: string } | null>(null);
  const { currentTreeId } = useTree();
  const deletePerson = useDeletePerson(currentTreeId);
  const updatePerson = useUpdatePerson(currentTreeId);
  const createRel = useCreateRelationship(currentTreeId);
  const deleteRel = useDeleteRelationship(currentTreeId);
  const { data: allPersons = [] } = usePersons(currentTreeId);
  const { data: relationships = [] } = useRelationshipsForPerson(person.id, currentTreeId);

  const handleDelete = () => {
    deletePerson.mutate(person.id);
    if (isSelected) onSelect(null);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        data-testid="person-card"
        onClick={() => onSelect(isSelected ? null : person)}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(isSelected ? null : person)}
        className={[
          'group relative cursor-pointer overflow-hidden rounded-xl border bg-gradient-to-br from-(--bg-card) to-(--bg-surface) pl-5 pr-3 py-3.5 shadow-(--shadow-sm) transition-all duration-150',
          isSelected
            ? 'border-(--border-gold) shadow-(--shadow-gold-glow)'
            : 'border-(--border) hover:border-(--border-gold) hover:shadow-md hover:-translate-y-0.5',
        ].join(' ')}
      >
        <span
          className={[
            'absolute inset-y-0 left-0 w-1.5 transition-colors duration-150',
            isSelected ? 'bg-(--gold)' : 'bg-(--border) group-hover:bg-(--border-gold)',
          ].join(' ')}
          aria-hidden="true"
        />

        <div className="flex items-start gap-3.5">
          <Avatar name={person.name} className="h-11 w-11 text-sm ring-2 ring-(--bg-card) ring-offset-1 ring-offset-(--border)" />

          <div className="min-w-0 flex-1">
            {/* Name */}
            <p className="flex items-center gap-1 font-display text-[15px] font-semibold leading-snug text-(--text-primary)">
              <span className="truncate">{person.name}</span>
              {person.gender === 'male' && (
                <span className="flex-shrink-0 text-sm leading-none text-blue-400" aria-label={t('person.genders.male')}>♂</span>
              )}
              {person.gender === 'female' && (
                <span className="flex-shrink-0 text-sm leading-none text-rose-400" aria-label={t('person.genders.female')}>♀</span>
              )}
            </p>

            {/* Lifespan */}
            {(person.birthYear || person.deathYear) && (
              <div className="mt-0.5 flex items-center gap-3 text-xs text-(--text-muted)">
                {person.birthYear && (
                  <span className="inline-flex items-center gap-1">
                    <Cake className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    {formatPartialDate({ year: person.birthYear, month: person.birthMonth, day: person.birthDay, time: person.birthTime, buddhistEra })}
                  </span>
                )}
                {person.deathYear && (
                  <span className="inline-flex items-center gap-1">
                    <Flower2 className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    {formatPartialDate({ year: person.deathYear, month: person.deathMonth, day: person.deathDay, time: person.deathTime, buddhistEra })}
                  </span>
                )}
              </div>
            )}

            {/* Birth place */}
            {person.birthPlace && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-(--text-secondary)">
                <MapPin className="h-3 w-3 flex-shrink-0 text-(--gold)" aria-hidden="true" />
                <span className="truncate">{person.birthPlace}</span>
              </div>
            )}
          </div>
        </div>

        {/* Existing relationships — shown only for the selected person, since
            each side of a relationship otherwise renders its own matching
            badge and duplicates test-id lookups across cards */}
        {isSelected && relationships.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[58px]">
            {relationships.map((rel) => {
              const otherId = rel.personId === person.id ? rel.relatedPersonId : rel.personId;
              const other = allPersons.find((p) => p.id === otherId);
              const displayType = rel.personId === person.id ? INVERSE_TYPE[rel.type] : rel.type;
              return (
                <span key={rel.id} className="inline-flex items-center gap-0.5">
                  <Badge variant={displayType} data-testid="relationship-badge">
                    {t(`relationship.types.${displayType}`)}
                    {other ? `: ${other.name}` : ''}
                  </Badge>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setRelToDelete({ id: rel.id, name: other?.name ?? '' }); }}
                    className="text-red-400 hover:text-red-500 p-0.5"
                    aria-label={other ? t('relationship.deleteAria', { name: other.name }) : t('relationship.deleteAriaUnknown')}
                    data-testid="delete-relationship-button"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Actions — always in the DOM so hovering a card reveals them
            without first having to select it, but collapsed to zero
            height (grid-rows trick, animates unlike display:none) until
            hover/focus/selection, so unselected cards stay short instead
            of every card reserving space for a row it isn't showing.
            Every card renders the same test ids, so anything targeting
            these must scope through the "person-card" testid first (see
            e2e tests). */}
        <div
          className={[
            'grid transition-[grid-template-rows] duration-200 ease-out',
            isSelected ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] group-hover:grid-rows-[1fr] focus-within:grid-rows-[1fr]',
          ].join(' ')}
        >
          <div className="overflow-hidden">
            <div
              className={[
                'flex items-center gap-1 pl-[58px] pt-2 transition-opacity duration-150',
                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
                className="btn-ghost p-1 text-(--text-muted) hover:text-(--gold)"
                aria-label={t('person.editAria', { name: person.name })}
                data-testid="edit-person-button"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setRelOpen(true); }}
                className="btn-ghost p-1 text-(--text-muted) hover:text-(--gold)"
                aria-label={t('relationship.manageAria', { name: person.name })}
                data-testid="add-relationship-button"
              >
                <GitBranch className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                className="btn-ghost p-1 text-(--text-muted) hover:text-red-400 ml-auto"
                aria-label={t('person.deleteAria', { name: person.name })}
                data-testid="delete-person-button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{t('person.editTitle', { name: person.name })}</DialogTitle>
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
            <DialogTitle className="font-display">{t('relationship.addTitle', { name: person.name })}</DialogTitle>
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

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('person.deleteConfirm', { name: person.name })}
        description={t('person.deleteWarning')}
        confirmLabel={t('person.deleteButton')}
        cancelLabel={t('person.cancel')}
        onConfirm={handleDelete}
        isLoading={deletePerson.isPending}
      />

      <ConfirmDialog
        open={relToDelete !== null}
        onOpenChange={(open) => { if (!open) setRelToDelete(null); }}
        title={t('relationship.deleteConfirmTitle')}
        description={relToDelete?.name ? t('relationship.deleteAria', { name: relToDelete.name }) : undefined}
        confirmLabel={t('relationship.deleteButton')}
        cancelLabel={t('relationship.cancel')}
        onConfirm={() => { if (relToDelete) deleteRel.mutate(relToDelete.id); }}
        isLoading={deleteRel.isPending}
      />
    </>
  );
}
