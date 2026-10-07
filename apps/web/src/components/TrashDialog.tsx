import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ConfirmDialog } from './ui/confirm-dialog';
import { useTrashedTrees, useRestoreTree, usePurgeTree } from '@/hooks/useTrees';
import type { FamilyTree } from '@wongsorn-labs/atlas-lineage-shared';

export function TrashDialog() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<FamilyTree | null>(null);
  const trashQuery = useTrashedTrees();
  const restoreTree = useRestoreTree();
  const purgeTree = usePurgeTree();

  const trees = trashQuery.data ?? [];

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<button type="button" className="btn-ghost p-1.5" aria-label={t('tree.trashAria')} data-testid="trash-button" />}
      >
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{t('tree.trashTitle')}</DialogTitle>
        </DialogHeader>
        {trees.length === 0 ? (
          <p className="text-sm text-(--text-secondary)" data-testid="trash-empty">{t('tree.trashEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {trees.map((tree) => (
              <li
                key={tree.id}
                className="flex items-center justify-between gap-2 rounded-(--radius-md) border border-(--border) p-2.5"
                data-testid="trash-item"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tree.name}</p>
                  {tree.deletedAt && (
                    <p className="text-xs text-(--text-muted)">
                      {t('tree.trashDeletedAt', { date: new Date(tree.deletedAt).toLocaleDateString(i18n.language) })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    className="btn-ghost p-1.5"
                    aria-label={t('tree.restoreButton')}
                    data-testid="restore-tree-button"
                    disabled={restoreTree.isPending}
                    onClick={() => restoreTree.mutate(tree.id)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost p-1.5 text-(--color-error)"
                    aria-label={t('tree.purgeAria', { name: tree.name })}
                    data-testid="purge-tree-button"
                    onClick={() => setPurgeTarget(tree)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={purgeTarget !== null}
      onOpenChange={(next) => { if (!next) setPurgeTarget(null); }}
      title={purgeTarget ? t('tree.purgeConfirmTitle', { name: purgeTarget.name }) : ''}
      description={t('tree.purgeConfirmWarning')}
      confirmLabel={t('tree.purgeButton')}
      cancelLabel={t('tree.cancel')}
      isLoading={purgeTree.isPending}
      onConfirm={() => { if (purgeTarget) purgeTree.mutate(purgeTarget.id); }}
    />
    </>
  );
}
