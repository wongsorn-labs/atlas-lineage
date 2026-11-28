import type { KnowledgePeriod } from '@wongsorn-labs/atlas-lineage-shared';

export interface TimelineRange {
  min: number;
  max: number;
}

/**
 * Year range shown on the axis: covers every period, always spans at least
 * ten years so one short period is still readable, and ends no earlier than
 * the current year.
 */
export function timelineRange(periods: KnowledgePeriod[], currentYear: number): TimelineRange {
  if (periods.length === 0) return { min: currentYear - 10, max: currentYear };
  const min = Math.min(...periods.map((p) => p.fromYear));
  const max = Math.max(currentYear, ...periods.map((p) => p.toYear ?? p.fromYear));
  const span = max - min;
  return span >= 10 ? { min, max } : { min, max: min + 10 };
}

/** Left and width as percentages of the axis. Ongoing periods run to the axis end. */
export function periodPosition(period: KnowledgePeriod, range: TimelineRange): { left: number; width: number } {
  const total = Math.max(1, range.max - range.min);
  const end = period.toYear ?? range.max;
  const left = ((period.fromYear - range.min) / total) * 100;
  const width = Math.max(((end - period.fromYear) / total) * 100, 4);
  return { left, width: Math.min(width, 100 - left) };
}

/** Groups periods into lanes by group name, keeping the earliest start first. */
export function groupLanes(periods: KnowledgePeriod[]): Map<string, KnowledgePeriod[]> {
  const lanes = new Map<string, KnowledgePeriod[]>();
  for (const p of periods) lanes.set(p.groupName, [...(lanes.get(p.groupName) ?? []), p]);
  for (const list of lanes.values()) list.sort((a, b) => a.fromYear - b.fromYear);
  return lanes;
}

/** Decade ticks inside the range, e.g. 2540, 2550, ... */
export function decadeTicks(range: TimelineRange): number[] {
  const first = Math.ceil(range.min / 10) * 10;
  const ticks: number[] = [];
  for (let y = first; y <= range.max; y += 10) ticks.push(y);
  return ticks;
}
