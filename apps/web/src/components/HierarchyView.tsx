import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';
import { useHierarchy } from '../hooks/useHierarchy';
import { Avatar } from './ui/avatar';

interface HierarchyViewProps {
  treeId: number | null;
  persons: Person[];
  onSelectPerson?: (person: Person | null) => void;
}

/** Generations are relative to the centre person: negative = older, positive = younger. */
function generationTitle(generation: number, t: (key: string, fallback: string) => string): string {
  switch (generation) {
    case -2: return t('hierarchy.genGrand', 'ปู่ย่าตายาย');
    case -1: return t('hierarchy.genParents', 'พ่อแม่');
    case 0: return t('hierarchy.genSame', 'รุ่นเดียวกัน');
    case 1: return t('hierarchy.genChildren', 'ลูก');
    case 2: return t('hierarchy.genGrandchildren', 'หลาน');
    default: return generation < 0 ? t('hierarchy.genOlder', 'รุ่นก่อน') : t('hierarchy.genYounger', 'รุ่นหลัง');
  }
}

/**
 * Family list centred on one person. Each generation is its own section,
 * oldest first. Tapping a card makes that person the new centre.
 */
export function HierarchyView({ treeId, persons, onSelectPerson }: HierarchyViewProps) {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, fallback);
  const [chosen, setChosen] = useState<number | null>(null);
  const rootId = chosen ?? persons[0]?.id ?? null;
  const { data: nodes = [], isLoading, isError, refetch } = useHierarchy(treeId, rootId);

  const groups = new Map<number, typeof nodes>();
  for (const n of nodes) groups.set(n.generation, [...(groups.get(n.generation) ?? []), n]);
  const orderedGenerations = [...groups.keys()].sort((a, b) => a - b);

  return (
    <div className="h-full overflow-auto bg-(--bg-base) px-4 pt-16 pb-24" data-testid="hierarchy-view">
      <div className="mx-auto max-w-lg space-y-5">
        <header className="space-y-2">
          <label htmlFor="hierarchy-root" className="block text-sm font-medium text-(--text-primary)">
            {tr('hierarchy.centre', 'ศูนย์กลางของผัง')}
          </label>
          <select
            id="hierarchy-root"
            data-testid="hierarchy-root-select"
            className="h-10 w-full rounded-lg border border-(--border) bg-(--bg-card) px-3 text-sm text-(--text-primary) focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
            value={rootId ?? ''}
            onChange={(e) => setChosen(Number(e.target.value))}
          >
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.nickname ?? p.name}</option>
            ))}
          </select>
          <p className="text-xs text-(--text-muted)">
            {tr('hierarchy.hint', 'แตะที่คนใดก็ได้เพื่อดูผังจากคนนั้น')}
          </p>
        </header>

        {persons.length === 0 && (
          <p className="text-sm text-(--text-muted)">{tr('hierarchy.empty', 'ยังไม่มีคนในกลุ่ม เพิ่มคนแรกจากปุ่ม + ได้เลย')}</p>
        )}

        {isLoading && <p role="status" className="text-sm text-(--text-muted)">{t('app.loading')}</p>}

        {isError && (
          <div className="space-y-2">
            <p className="text-sm text-red-500">{t('app.errorBody')}</p>
            <button type="button" className="h-10 rounded-lg border border-(--border) px-3 text-sm" onClick={() => void refetch()}>
              {t('app.retryPeople')}
            </button>
          </div>
        )}

        {orderedGenerations.map((g) => (
          <section key={g} aria-labelledby={`gen-${g}`} className="space-y-2">
            <h2 id={`gen-${g}`} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
              {generationTitle(g, tr)}
              <span className="h-px flex-1 border-t border-dashed border-(--border)" aria-hidden="true" />
            </h2>
            <ul className="space-y-2">
              {groups.get(g)!.map((n) => {
                const isCentre = n.personId === rootId;
                const shown = n.nickname ?? n.name;
                return (
                  <li key={n.personId}>
                    <button
                      type="button"
                      onClick={() => {
                        setChosen(n.personId);
                        onSelectPerson?.(persons.find((p) => p.id === n.personId) ?? null);
                      }}
                      aria-current={isCentre ? 'true' : undefined}
                      aria-label={`${n.label}: ${shown}`}
                      className={`flex min-h-12 w-full items-center gap-3 rounded-xl border bg-(--bg-card) px-3 py-2 text-left transition-colors hover:bg-(--muted) focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none ${
                        isCentre ? 'border-(--gold) ring-2 ring-(--gold)/40' : 'border-(--border)'
                      }`}
                    >
                      <Avatar name={n.name} photo={n.photo} className="h-11 w-11 text-sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-(--text-primary)">{shown}</span>
                        {n.name !== shown && (
                          <span className="block truncate text-xs text-(--text-muted)">{n.name}</span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-full bg-(--muted) px-2.5 py-1 text-xs font-medium text-(--text-secondary)">
                        {n.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
