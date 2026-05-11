import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Person } from '@atlas/shared';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  birthYear: z.coerce.number().int().positive().nullable().optional(),
  deathYear: z.coerce.number().int().positive().nullable().optional(),
  birthLat: z.coerce.number().min(-90).max(90).nullable().optional(),
  birthLng: z.coerce.number().min(-180).max(180).nullable().optional(),
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
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register('name')} placeholder="Full name" />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="birthYear">Birth year</Label>
          <Input id="birthYear" type="number" {...register('birthYear')} placeholder="1900" />
        </div>
        <div>
          <Label htmlFor="deathYear">Death year</Label>
          <Input id="deathYear" type="number" {...register('deathYear')} placeholder="1980" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="birthLat">Latitude</Label>
          <Input id="birthLat" type="number" step="any" {...register('birthLat')} placeholder="48.8566" />
          {errors.birthLat && <p className="text-xs text-red-500 mt-1">{errors.birthLat.message}</p>}
        </div>
        <div>
          <Label htmlFor="birthLng">Longitude</Label>
          <Input id="birthLng" type="number" step="any" {...register('birthLng')} placeholder="2.3522" />
          {errors.birthLng && <p className="text-xs text-red-500 mt-1">{errors.birthLng.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="birthPlace">Birth place</Label>
        <Input id="birthPlace" {...register('birthPlace')} placeholder="Paris, France" />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} placeholder="Additional details…" rows={3} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving…' : initial ? 'Update' : 'Add Person'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
