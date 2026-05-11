import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Person, RelationshipType } from '@atlas/shared';

const TYPES: RelationshipType[] = ['parent', 'child', 'sibling', 'spouse', 'partner'];

interface RelationshipFormValues {
  relatedPersonId: string;
  type: RelationshipType;
}

interface RelationshipFormProps {
  currentPerson: Person;
  allPersons: Person[];
  onSubmit: (values: RelationshipFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RelationshipForm({
  currentPerson,
  allPersons,
  onSubmit,
  onCancel,
  isLoading,
}: RelationshipFormProps) {
  const { handleSubmit, control, formState: { errors } } = useForm<RelationshipFormValues>();

  const others = allPersons.filter((p) => p.id !== currentPerson.id);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <Label>Related person</Label>
        <Controller
          name="relatedPersonId"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select a person…" />
              </SelectTrigger>
              <SelectContent>
                {others.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.relatedPersonId && <p className="text-xs text-red-500 mt-1">Required</p>}
      </div>

      <div>
        <Label>Relationship type</Label>
        <Controller
          name="type"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && <p className="text-xs text-red-500 mt-1">Required</p>}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving…' : 'Add Relationship'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
