import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { KnowledgePeriod, Person } from '@wongsorn-labs/atlas-lineage-shared';
import { usePeriods, useCreatePeriod, useDeletePeriod } from '../hooks/usePeriods';
import { useTree } from '../contexts/TreeContext';
import { decadeTicks, groupLanes, periodPosition, timelineRange } from '@/lib/timeline';
import { toBuddhistYear, toGregorianYear } from '@/lib/formatPartialDate';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

const ROW_HEIGHT = 64;

interface TimelineViewProps {
  persons: Person[];
  onSelectPerson: (person: Person | null) => void;
}

/** Place cards in the first row where they do not overlap, so nothing is drawn on top of anything else. */
function assignRows(periods: KnowledgePeriod[]): { period: KnowledgePeriod; row: number }[] {
  const rowEnds: number[] = [];
  return periods.map((period) => {
    const end = period.toYear ?? Number.POSITIVE_INFINITY;
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= period.fromYear);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(end);
    } else {
      rowEnds[row] = end;
    }
    return { period, row };
  });
}

export function TimelineView({ persons, onSelectPerson }: TimelineViewProps) {
  const { t, i18n } = useTranslation();
  const buddhistEra = i18n.language === 'th';
  const { currentTreeId, currentTree } = useTree();
  const canEdit = currentTree?.role === 'owner' || currentTree?.role === 'editor';
  const { data: periods = [], isLoading, isError, refetch } = usePeriods(currentTreeId);
  const [addOpen, setAddOpen] = useState(false);

  const personById = useMemo(() => new Map(persons.map((p) => [p.id, p])), [persons]);
  const range = useMemo(() => timelineRange(periods, new Date().getFullYear()), [periods]);
  const lanes = useMemo(() => groupLanes(periods), [periods]);
  const year = (y: number) => (buddhistEra ? toBuddhistYear(y) : y);
  const yearsLabel = (p: KnowledgePeriod) =>
    p.toYear == null ? `${year(p.fromYear)} – ${t('timeline.ongoing', { defaultValue: 'ปัจจุบัน' })}` : `${year(p.fromYear)} – ${year(p.toYear)}`;

  const axisWidth = 720;

  return (
    <div className="h-full overflow-auto bg-(--bg-base) px-4 pt-16 pb-24" data-testid="timeline-view">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-(--text-primary)">{t('timeline.title', { defaultValue: 'ไทม์ไลน์ความรู้จัก' })}</h2>
            <p className="text-xs text-(--text-muted)">{t('timeline.hint', { defaultValue: 'แต่ละแถวคือกลุ่ม การ์ดคือช่วงปีที่รู้จักกัน' })}</p>
          </div>
          {canEdit && (
            <AddPeriodDialog
              open={addOpen}
              onOpenChange={setAddOpen}
              persons={persons}
              existingGroups={[...lanes.keys()]}
              yearInput={(raw) => (buddhistEra ? toGregorianYear(raw) : raw)}
              buddhistEra={buddhistEra}
            />
          )}
        </div>

        {isLoading && <p role="status" className="text-sm text-(--text-muted)">{t('app.loading')}</p>}
        {isError && (
          <div className="space-y-2">
            <p className="text-sm text-red-500">{t('app.errorBody')}</p>
            <Button type="button" variant="outline" onClick={() => void refetch()}>{t('app.retryPeople')}</Button>
          </div>
        )}
        {!isLoading && !isError && periods.length === 0 && (
          <p className="text-sm text-(--text-muted)">
            {t('timeline.empty', { defaultValue: 'ยังไม่มีช่วงเวลา เพิ่มช่วงแรกจากปุ่มด้านบนได้เลย' })}
          </p>
        )}

        {periods.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-(--border) bg-(--bg-card) p-3">
            <div className="relative" style={{ minWidth: axisWidth }}>
              {/* Year axis */}
              <div className="relative h-6 border-b border-dashed border-(--border) text-[11px] text-(--text-muted)">
                {decadeTicks(range).map((y) => (
                  <span key={y} className="absolute top-0 -translate-x-1/2" style={{ left: `${((y - range.min) / (range.max - range.min)) * 100}%` }}>
                    {year(y)}
                  </span>
                ))}
              </div>

              {[...lanes.entries()].map(([groupName, groupPeriods]) => {
                const placed = assignRows(groupPeriods);
                const rows = Math.max(...placed.map((x) => x.row)) + 1;
                return (
                  <section key={groupName} aria-label={groupName} className="border-b border-(--border) py-2">
                    <h3 className="mb-1 text-xs font-semibold text-(--text-primary)">
                      {groupName} <span className="font-normal text-(--text-muted)">· {groupPeriods.length}</span>
                    </h3>
                    <div className="relative" style={{ height: rows * ROW_HEIGHT }}>
                      {placed.map(({ period, row }) => {
                        const person = personById.get(period.personId);
                        if (!person) return null;
                        const pos = periodPosition(period, range);
                        return (
                          <button
                            key={period.id}
                            type="button"
                            onClick={() => onSelectPerson(person)}
                            className="absolute flex h-14 flex-col justify-center overflow-hidden rounded-lg border border-l-4 border-(--border) border-l-(--gold) bg-(--bg-card) px-2 text-left shadow-sm hover:bg-(--muted) focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                            style={{ left: `${pos.left}%`, width: `${pos.width}%`, top: row * ROW_HEIGHT }}
                            aria-label={`${person.nickname ?? person.name}, ${yearsLabel(period)}`}
                          >
                            <span className="truncate text-xs font-semibold text-(--text-primary)">{person.nickname ?? person.name}</span>
                            <span className="truncate text-[11px] text-(--text-muted)">{yearsLabel(period)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddPeriodDialog({
  open,
  onOpenChange,
  persons,
  existingGroups,
  yearInput,
  buddhistEra,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persons: Person[];
  existingGroups: string[];
  yearInput: (raw: number) => number;
  buddhistEra: boolean;
}) {
  const { t } = useTranslation();
  const { currentTreeId } = useTree();
  const { data: periods = [] } = usePeriods(currentTreeId);
  const create = useCreatePeriod(currentTreeId);
  const remove = useDeletePeriod(currentTreeId);
  const [personId, setPersonId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [fromYear, setFromYear] = useState('');
  const [ongoing, setOngoing] = useState(true);
  const [toYear, setToYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nameOf = (id: number) => {
    const p = persons.find((x) => x.id === id);
    return p ? (p.nickname ?? p.name) : `#${id}`;
  };

  const submit = async () => {
    setError(null);
    if (!personId || !groupName.trim() || !fromYear) {
      setError(t('timeline.required', { defaultValue: 'เลือกคน ใส่ชื่อกลุ่ม และปีเริ่ม' }));
      return;
    }
    try {
      await create.mutateAsync({
        personId: Number(personId),
        groupName: groupName.trim(),
        fromYear: yearInput(Number(fromYear)),
        toYear: ongoing || !toYear ? null : yearInput(Number(toYear)),
      });
      setFromYear('');
      setToYear('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button type="button" size="sm">{t('timeline.add', { defaultValue: 'เพิ่มช่วงเวลา' })}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('timeline.addTitle', { defaultValue: 'เพิ่มช่วงเวลาที่รู้จัก' })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <Label htmlFor="period-person">{t('timeline.person', { defaultValue: 'คน' })}</Label>
            <select
              id="period-person"
              data-testid="period-person"
              className="h-10 w-full rounded-lg border border-(--border) bg-(--bg-card) px-3 text-sm"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            >
              <option value="">{t('timeline.choosePerson', { defaultValue: 'เลือกคน' })}</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>{p.nickname ?? p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="period-group">{t('timeline.group', { defaultValue: 'กลุ่ม' })}</Label>
            <Input
              id="period-group"
              data-testid="period-group"
              list="period-groups"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('timeline.groupPlaceholder', { defaultValue: 'เช่น เพื่อนสมัยประถม' })}
            />
            <datalist id="period-groups">
              {existingGroups.map((g) => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="period-from">
                {t('timeline.from', { defaultValue: 'ปีเริ่ม' })} {buddhistEra && '(พ.ศ.)'}
              </Label>
              <Input id="period-from" data-testid="period-from" type="number" value={fromYear} onChange={(e) => setFromYear(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="period-to">
                {t('timeline.to', { defaultValue: 'ปีสิ้นสุด' })} {buddhistEra && '(พ.ศ.)'}
              </Label>
              <Input id="period-to" data-testid="period-to" type="number" value={toYear} disabled={ongoing} onChange={(e) => setToYear(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-(--text-secondary)">
            <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} />
            {t('timeline.stillKnows', { defaultValue: 'ยังรู้จักกันอยู่' })}
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="button" onClick={() => void submit()} disabled={create.isPending} className="w-full">
            {t('timeline.save', { defaultValue: 'บันทึกช่วงเวลา' })}
          </Button>

          {periods.length > 0 && (
            <div className="space-y-1 border-t border-(--border) pt-3">
              <p className="text-xs font-semibold text-(--text-muted)">{t('timeline.existing', { defaultValue: 'ช่วงเวลาที่มีอยู่' })}</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {periods.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded border border-(--border) px-2 py-1 text-xs">
                    <span className="truncate">{nameOf(p.personId)} · {p.groupName}</span>
                    <button type="button" className="text-red-500" onClick={() => remove.mutate(p.id)}>
                      {t('timeline.delete', { defaultValue: 'ลบ' })}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
