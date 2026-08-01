import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Edit2 } from 'lucide-react';
import { updateTreeSchema } from '@wongsorn-labs/atlas-lineage-shared';
import type { z } from 'zod';
import type { FamilyTreeMembership } from '@wongsorn-labs/atlas-lineage-shared';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useUpdateTree } from '@/hooks/useTrees';

type FormValues = z.infer<typeof updateTreeSchema>;

interface EditTreeDialogProps {
  tree: FamilyTreeMembership;
}

export function EditTreeDialog({ tree }: EditTreeDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const updateTree = useUpdateTree();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(updateTreeSchema),
    values: { name: tree.name, description: tree.description ?? undefined },
  });

  if (tree.role !== 'owner') return null;

  const onSubmit = async (values: FormValues) => {
    setResult(null);
    try {
      await updateTree.mutateAsync({ treeId: tree.id, data: values });
      setResult('success');
      setOpen(false);
    } catch {
      setResult('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setResult(null); reset({ name: tree.name, description: tree.description ?? undefined }); } }}>
      <DialogTrigger
        render={<button type="button" className="btn-ghost p-1.5" aria-label={t('tree.editTitle')} data-testid="edit-tree-button" />}
      >
        <Edit2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{t('tree.editTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="edit-tree-name">{t('tree.name')}</Label>
            <Input id="edit-tree-name" data-testid="edit-tree-name-input" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="edit-tree-description">{t('tree.description')}</Label>
            <Textarea id="edit-tree-description" data-testid="edit-tree-description-input" {...register('description')} />
          </div>
          {result === 'error' && (
            <p className="text-xs text-red-500" data-testid="edit-tree-error">{t('tree.editError')}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={updateTree.isPending} className="flex-1">
              {updateTree.isPending ? t('saving') : t('tree.editButton')}
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
