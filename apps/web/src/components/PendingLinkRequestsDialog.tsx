import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { usePendingPersonLinks, useApprovePersonLink, useRejectPersonLink } from '@/hooks/usePersonLinks';

export function PendingLinkRequestsDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pendingQuery = usePendingPersonLinks();
  const approve = useApprovePersonLink();
  const reject = useRejectPersonLink();

  const requests = pendingQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<button type="button" className="btn-ghost p-1.5 relative" aria-label={t('tree.pendingRequestsAria')} data-testid="pending-link-requests-button" />}
      >
        <Inbox className="h-4 w-4" />
        {requests.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-(--coral)"
            aria-hidden="true"
            data-testid="pending-link-requests-badge"
          />
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{t('tree.pendingRequestsTitle')}</DialogTitle>
        </DialogHeader>
        {requests.length === 0 ? (
          <p className="text-sm text-(--text-secondary)" data-testid="pending-link-requests-empty">
            {t('tree.pendingRequestsEmpty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between gap-2 rounded-(--radius-md) border border-(--border) p-2.5"
                data-testid="pending-link-request-item"
              >
                <span className="text-sm text-(--text-primary)">
                  #{req.personId} → {t('tree.name')} #{req.treeId}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    className="btn-secondary text-xs px-2 py-1"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(req.id)}
                    data-testid="approve-link-request-button"
                  >
                    {t('tree.approveButton')}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs px-2 py-1 text-(--color-error)"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate(req.id)}
                    data-testid="reject-link-request-button"
                  >
                    {t('tree.rejectButton')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
