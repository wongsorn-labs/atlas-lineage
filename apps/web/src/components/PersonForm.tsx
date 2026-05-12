import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';

const toNum = (v: unknown) => (v === '' || v == null ? undefined : Number(v));

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  birthYear: z.preprocess(toNum, z.number().int().positive().nullable().optional()),
  deathYear: z.preprocess(toNum, z.number().int().positive().nullable().optional()),
  birthLat: z.preprocess(toNum, z.number().min(-90).max(90).nullable().optional()),
  birthLng: z.preprocess(toNum, z.number().min(-180).max(180).nullable().optional()),
  birthPlace: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PersonFormProps {
  initial?: Person;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PersonForm({ initial, onSubmit, onCancel, isLoading }: PersonFormProps) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          name: initial.name,
          birthYear: initial.birthYear ?? undefined,
          deathYear: initial.deathYear ?? undefined,
          birthLat: initial.birthLat ?? undefined,
          birthLng: initial.birthLng ?? undefined,
          birthPlace: initial.birthPlace ?? '',
          notes: initial.notes ?? '',
        }
      : {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <Label htmlFor="name">{t('person.name')} *</Label>
        <Input id="name" data-testid="name-input" {...register('name')} placeholder={t('person.namePlaceholder')} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="birthYear">{t('person.birthYear')}</Label>
          <Input id="birthYear" data-testid="birth-year-input" type="number" {...register('birthYear')} placeholder="1900" />
        </div>
        <div>
          <Label htmlFor="deathYear">{t('person.deathYear')}</Label>
          <Input id="deathYear" data-testid="death-year-input" type="number" {...register('deathYear')} placeholder="1980" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="birthLat">{t('person.latitude')}</Label>
          <Input id="birthLat" data-testid="birth-lat-input" type="number" step="any" {...register('birthLat')} placeholder="48.8566" />
          {errors.birthLat && <p className="text-xs text-red-500 mt-1">{errors.birthLat.message}</p>}
        </div>
        <div>
          <Label htmlFor="birthLng">{t('person.longitude')}</Label>
          <Input id="birthLng" data-testid="birth-lng-input" type="number" step="any" {...register('birthLng')} placeholder="2.3522" />
          {errors.birthLng && <p className="text-xs text-red-500 mt-1">{errors.birthLng.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="birthPlace">{t('person.birthPlace')}</Label>
        <Input id="birthPlace" data-testid="birth-place-input" {...register('birthPlace')} placeholder="Paris, France" />
      </div>

      <div>
        <Label htmlFor="notes">{t('person.notes')}</Label>
        <Textarea id="notes" data-testid="notes-input" {...register('notes')} placeholder="Additional details…" rows={3} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? t('saving') : initial ? t('person.updateButton') : t('person.addButton')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('person.cancel')}
        </Button>
      </div>
    </form>
  );
}
