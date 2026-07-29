import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Gender, Person } from '@wongsorn-labs/atlas-lineage-shared';

const GENDERS: Gender[] = ['male', 'female', 'unspecified'];

const toNum = (v: unknown) => (v === '' || v == null ? undefined : Number(v));
const toUndefIfEmpty = (v: unknown) => (v === '' || v == null ? undefined : v);

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  gender: z.enum(['male', 'female', 'unspecified']).nullable().optional(),
  birthYear: z.preprocess(toNum, z.number({ required_error: 'Birth year is required' }).int().positive()),
  birthMonth: z.preprocess(toNum, z.number().int().min(1).max(12).nullable().optional()),
  birthDay: z.preprocess(toNum, z.number().int().min(1).max(31).nullable().optional()),
  birthTime: z.preprocess(toUndefIfEmpty, z.string().optional()),
  deathYear: z.preprocess(toNum, z.number().int().positive().nullable().optional()),
  deathMonth: z.preprocess(toNum, z.number().int().min(1).max(12).nullable().optional()),
  deathDay: z.preprocess(toNum, z.number().int().min(1).max(31).nullable().optional()),
  deathTime: z.preprocess(toUndefIfEmpty, z.string().optional()),
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
  const [hasDeathYear, setHasDeathYear] = useState(initial?.deathYear != null);
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          name: initial.name,
          gender: initial.gender ?? 'unspecified',
          birthYear: initial.birthYear ?? undefined,
          birthMonth: initial.birthMonth ?? undefined,
          birthDay: initial.birthDay ?? undefined,
          birthTime: initial.birthTime?.slice(0, 5) ?? '',
          deathYear: initial.deathYear ?? undefined,
          deathMonth: initial.deathMonth ?? undefined,
          deathDay: initial.deathDay ?? undefined,
          deathTime: initial.deathTime?.slice(0, 5) ?? '',
          birthLat: initial.birthLat ?? undefined,
          birthLng: initial.birthLng ?? undefined,
          birthPlace: initial.birthPlace ?? '',
          notes: initial.notes ?? '',
        }
      : { gender: 'unspecified' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <Label htmlFor="name">{t('person.name')} *</Label>
        <Input id="name" data-testid="name-input" {...register('name')} placeholder={t('person.namePlaceholder')} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <Label>{t('person.gender')}</Label>
        <Controller
          name="gender"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value ?? 'unspecified'}>
              <SelectTrigger data-testid="gender-select">
                <SelectValue placeholder={t('person.gender')}>
                  {(value: Gender | null) => t(`person.genders.${value ?? 'unspecified'}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {t(`person.genders.${g}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="birthYear">{t('person.birthYear')} *</Label>
        <div className="grid grid-cols-4 gap-2">
          <Input id="birthYear" data-testid="birth-year-input" type="number" {...register('birthYear')} placeholder="1900" />
          <Input data-testid="birth-month-input" type="number" min={1} max={12} {...register('birthMonth')} placeholder={t('person.month')} />
          <Input data-testid="birth-day-input" type="number" min={1} max={31} {...register('birthDay')} placeholder={t('person.day')} />
          <Input data-testid="birth-time-input" type="time" {...register('birthTime')} />
        </div>
        {errors.birthYear && <p className="text-xs text-red-500 mt-1">{t('person.birthYearRequired')}</p>}
      </div>

      <div>
        <div className="flex h-5 items-center gap-2">
          <Checkbox
            id="hasDeathYear"
            data-testid="has-death-year-checkbox"
            checked={hasDeathYear}
            onCheckedChange={(checked) => {
              const isChecked = checked === true;
              setHasDeathYear(isChecked);
              if (!isChecked) {
                setValue('deathYear', undefined);
                setValue('deathMonth', undefined);
                setValue('deathDay', undefined);
                setValue('deathTime', '');
              }
            }}
          />
          <Label htmlFor="hasDeathYear" className="mb-0 cursor-pointer">{t('person.deathYear')}</Label>
        </div>
        {hasDeathYear && (
          <div className="grid grid-cols-4 gap-2 mt-1.5">
            <Input id="deathYear" data-testid="death-year-input" type="number" {...register('deathYear')} placeholder="1980" />
            <Input data-testid="death-month-input" type="number" min={1} max={12} {...register('deathMonth')} placeholder={t('person.month')} />
            <Input data-testid="death-day-input" type="number" min={1} max={31} {...register('deathDay')} placeholder={t('person.day')} />
            <Input data-testid="death-time-input" type="time" {...register('deathTime')} />
          </div>
        )}
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
