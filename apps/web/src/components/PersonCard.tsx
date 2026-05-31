import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PersonForm } from './PersonForm';
import { RelationshipForm } from './RelationshipForm';
import { useUpdatePerson, useDeletePerson } from '@/hooks/usePersons';
import { useRelationships, useCreateRelationship, useDeleteRelationship } from '@/hooks/useRelationships';
import type { Person, RelationshipType } from '@wongsorn-labs/atlas-lineage-shared';

interface PersonCardProps {
  person: Person;
  allPersons: Person[];
  onDeselect: () => void;
}

export function PersonCard({ person, allPersons, onDeselect }: PersonCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const { t } = useTranslation();

  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const { data: relationships = [] } = useRelationships();
  const createRel = useCreateRelationship();
  const deleteRel = useDeleteRelationship();

  const myRels = relationships.filter(
    (r) => r.personId === person.id || r.relatedPersonId === person.id
  );

  function getRelatedName(rel: (typeof myRels)[0]) {
    const otherId = rel.personId === person.id ? rel.relatedPersonId : rel.personId;
    return allPersons.find((p) => p.id === otherId)?.name ?? `#${otherId}`;
  }

  async function handleDelete() {
    if (!confirm(t('person.deleteConfirm', { name: person.name }))) return;
    await deletePerson.mutateAsync(person.id);
    onDeselect();
  }

  return (
    <>
      <Card className="m-3">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{person.name}</CardTitle>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7" data-testid="edit-person-button" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" data-testid="delete-person-button" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {(person.birthYear || person.deathYear) && (
            <p className="text-xs text-slate-500">
              {person.birthYear ?? '?'} – {person.deathYear ?? 'present'}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-2">
          {person.birthPlace && (
            <p className="text-sm text-slate-600">📍 {person.birthPlace}</p>
          )}
          {person.notes && (
            <p className="text-sm text-slate-600 italic">{person.notes}</p>
          )}

          {myRels.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('relationship.type')}</p>
              {myRels.map((rel) => (
                <div key={rel.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge data-testid="relationship-badge" variant={rel.type as RelationshipType}>{t(`relationship.types.${rel.type}`)}</Badge>
                    <span className="text-sm">{getRelatedName(rel)}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-red-400 hover:text-red-600"
                    onClick={() => deleteRel.mutate(rel.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button size="sm" variant="outline" className="w-full gap-1" data-testid="add-relationship-button" onClick={() => setRelOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> {t('relationship.addButton')}
          </Button>
        </CardFooter>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('person.editTitle', { name: person.name })}</DialogTitle>
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

      {/* Add relationship dialog */}
      <Dialog open={relOpen} onOpenChange={setRelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('relationship.addTitle', { name: person.name })}</DialogTitle>
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
