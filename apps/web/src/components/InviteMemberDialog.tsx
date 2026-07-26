import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import { addTreeMemberSchema } from '@wongsorn-labs/atlas-lineage-shared';
import type { z } from 'zod';
import type { FamilyTreeMembership, TreeRole } from '@wongsorn-labs/atlas-lineage-shared';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useAddTreeMember } from '@/hooks/useTrees';

const ROLES: TreeRole[] = ['owner', 'editor', 'viewer'];

type FormValues = z.infer<typeof addTreeMemberSchema>;

interface InviteMemberDialogProps {
  tree: FamilyTreeMembership;
}

export function InviteMemberDialog({ tree }: InviteMemberDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const addMember = useAddTreeMember();
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(addTreeMemberSchema),
    defaultValues: { userId: '', role: 'viewer' },
  });

  if (tree.role !== 'owner') return null;

  const onSubmit = async (values: FormValues) => {
    setResult(null);
    try {
      await addMember.mutateAsync({ treeId: tree.id, data: values });
      setResult('success');
      reset({ userId: '', role: 'viewer' });
    } catch {
      setResult('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setResult(null); }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="btn-ghost p-1.5"
          aria-label={t('tree.inviteTitle')}
          data-testid="invite-member-button"
        >
          <UserPlus className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{t('tree.inviteTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="invite-user-id">{t('tree.inviteUserId')}</Label>
            <Input
              id="invite-user-id"
              data-testid="invite-user-id-input"
              {...register('userId')}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
            <p className="text-xs text-[--text-muted] mt-1">{t('tree.inviteUserIdHelp')}</p>
            {errors.userId && <p className="text-xs text-red-500 mt-1">{t('tree.inviteUserIdInvalid')}</p>}
          </div>
          <div>
            <Label>{t('tree.role')}</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger data-testid="invite-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`tree.roles.${role}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {result === 'success' && (
            <p className="text-xs text-green-600" data-testid="invite-success">{t('tree.inviteSuccess')}</p>
          )}
          {result === 'error' && (
            <p className="text-xs text-red-500" data-testid="invite-error">{t('tree.inviteError')}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={addMember.isPending} className="flex-1">
              {addMember.isPending ? t('saving') : t('tree.inviteButton')}
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
