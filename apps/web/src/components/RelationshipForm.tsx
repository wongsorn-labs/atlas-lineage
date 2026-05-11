import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Person, RelationshipType } from '@wongsorn-labs/atlas-lineage-shared';

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
  const { t } = useTranslation();
  const { handleSubmit, control, formState: { errors } } = useForm<RelationshipFormValues>();

  const others = allPersons.filter((p) => p.id !== currentPerson.id);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <Label>{t('relationship.relatedPerson')}</Label>
        <Controller
          name="relatedPersonId"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger data-testid="related-person-select">
                <SelectValue placeholder={t('relationship.selectPerson')} />
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
        <Label>{t('relationship.type')}</Label>
        <Controller
          name="type"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger data-testid="relationship-type-select">
                <SelectValue placeholder={t('relationship.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`relationship.types.${type}`)}
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
          {isLoading ? t('saving') : t('relationship.addButton')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('relationship.cancel')}
        </Button>
      </div>
    </form>
  );
}
