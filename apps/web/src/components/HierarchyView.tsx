import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';
import { useHierarchy } from '../hooks/useHierarchy';

interface HierarchyViewProps {
  treeId: number | null;
  persons: Person[];
}

/** Kinship list centred on one person. Generations run top (oldest) to bottom (youngest). */
export function HierarchyView({ treeId, persons }: HierarchyViewProps) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<number | null>(null);
  const rootId = chosen ?? persons[0]?.id ?? null;
  const { data: nodes = [], isLoading, isError } = useHierarchy(treeId, rootId);

  const sorted = [...nodes].sort((a, b) => a.generation - b.generation);

  return (
    <div className="h-dvh overflow-auto px-4 pt-16 pb-6 bg-(--bg-base)" data-testid="hierarchy-view">
      <div className="mx-auto max-w-md space-y-3">
        <div>
          <label htmlFor="hierarchy-root" className="text-sm text-(--text-secondary)">
            {t('hierarchy.centre', 'เริ่มจากคน')}
          </label>
          <select
            id="hierarchy-root"
            data-testid="hierarchy-root-select"
            className="mt-1 h-8 w-full rounded-lg border border-(--border) bg-transparent px-2 text-sm"
            value={rootId ?? ''}
            onChange={(e) => setChosen(Number(e.target.value))}
          >
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.nickname ?? p.name}</option>
            ))}
          </select>
        </div>

        {persons.length === 0 && <p className="text-sm text-(--text-muted)">{t('hierarchy.empty', 'ยังไม่มีคนในกลุ่ม')}</p>}
        {isLoading && <p className="text-sm text-(--text-muted)">{t('app.loading')}</p>}
        {isError && <p className="text-sm text-red-500">{t('app.errorBody')}</p>}

        <ul className="space-y-1" data-testid="hierarchy-list">
          {sorted.map((n) => (
            <li
              key={n.personId}
              className="flex items-center justify-between rounded-lg border border-(--border) px-3 py-2 text-sm"
              style={{ marginLeft: `${Math.max(0, n.generation + 2) * 12}px` }}
            >
              <span className="font-medium">{n.label}</span>
              <span className="flex items-center gap-2 text-(--text-secondary)">
                {n.photo ? (
                  <img src={n.photo} alt="" className="h-7 w-7 rounded-full object-cover" style={{ maxWidth: 150, maxHeight: 150 }} />
                ) : null}
                {n.nickname ?? n.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
