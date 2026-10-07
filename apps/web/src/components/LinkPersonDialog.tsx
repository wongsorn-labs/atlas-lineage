import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useRequestPersonLink } from '@/hooks/usePersonLinks';
import type { FamilyTreeMembership } from '@wongsorn-labs/atlas-lineage-shared';

interface LinkPersonDialogProps {
  tree: FamilyTreeMembership;
}

export function LinkPersonDialog({ tree }: LinkPersonDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [personId, setPersonId] = useState('');
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const requestLink = useRequestPersonLink();

  if (tree.role !== 'owner') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Number(personId);
    if (!Number.isInteger(id) || id <= 0) return;
    setResult(null);
    try {
      await requestLink.mutateAsync({ treeId: tree.id, personId: id });
      setResult('success');
      setPersonId('');
    } catch {
      setResult('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setResult(null); setPersonId(''); } }}>
      <DialogTrigger
        render={<button type="button" className="btn-ghost p-1.5" aria-label={t('tree.linkPersonTitle')} data-testid="link-person-button" />}
      >
        <Share2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{t('tree.linkPersonTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div>
            <Label htmlFor="link-person-id">{t('tree.linkPersonIdLabel')}</Label>
            <Input
              id="link-person-id"
              type="number"
              min={1}
              data-testid="link-person-id-input"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            />
            <p className="text-xs text-(--text-muted) mt-1">{t('tree.linkPersonHelp')}</p>
          </div>
          {result === 'success' && (
            <p className="text-xs text-(--teal)" data-testid="link-person-success">{t('tree.linkPersonSuccess')}</p>
          )}
          {result === 'error' && (
            <p className="text-xs text-red-500" data-testid="link-person-error">{t('tree.linkPersonError')}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={requestLink.isPending} className="flex-1">
              {requestLink.isPending ? t('saving') : t('tree.linkPersonButton')}
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
