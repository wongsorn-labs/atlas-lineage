import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { createTreeSchema } from '@wongsorn-labs/atlas-lineage-shared';
import type { z } from 'zod';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useCreateTree } from '@/hooks/useTrees';
import { useTree } from '../contexts/TreeContext';

type FormValues = z.infer<typeof createTreeSchema>;

export function CreateTreeDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const createTree = useCreateTree();
  const { setCurrentTreeId } = useTree();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(createTreeSchema),
  });

  const onSubmit = async (values: FormValues) => {
    const tree = await createTree.mutateAsync(values);
    setCurrentTreeId(tree.id);
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="btn-ghost p-1.5"
          aria-label={t('tree.createTitle')}
          data-testid="create-tree-button"
        >
          <Plus className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{t('tree.createTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="tree-name">{t('tree.name')}</Label>
            <Input id="tree-name" data-testid="tree-name-input" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="tree-description">{t('tree.description')}</Label>
            <Textarea id="tree-description" data-testid="tree-description-input" {...register('description')} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={createTree.isPending} className="flex-1">
              {createTree.isPending ? t('saving') : t('tree.createButton')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('tree.cancel')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
