import { describe, expect, it } from 'vitest';
import type { KnowledgePeriod } from '@wongsorn-labs/atlas-lineage-shared';
import { decadeTicks, groupLanes, periodPosition, timelineRange } from './timeline';

const p = (over: Partial<KnowledgePeriod>): KnowledgePeriod => ({
  id: 1, treeId: 1, personId: 1, groupName: 'เพื่อน', fromYear: 2550, toYear: 2556, createdAt: '', ...over,
});

describe('timelineRange', () => {
  it('falls back to the last ten years when there are no periods', () => {
    expect(timelineRange([], 2026)).toEqual({ min: 2016, max: 2026 });
  });

  it('covers the earliest start and extends to the current year', () => {
    expect(timelineRange([p({ fromYear: 1997, toYear: 2003 })], 2026)).toEqual({ min: 1997, max: 2026 });
  });

  it('keeps at least ten years of axis', () => {
    expect(timelineRange([p({ fromYear: 2000, toYear: 2001 })], 2000)).toEqual({ min: 2000, max: 2010 });
  });
});

describe('periodPosition', () => {
  const range = { min: 2540, max: 2560 };

  it('places a closed period by its years', () => {
    expect(periodPosition(p({ fromYear: 2550, toYear: 2560 }), range)).toEqual({ left: 50, width: 50 });
  });

  it('runs an ongoing period to the end of the axis', () => {
    expect(periodPosition(p({ fromYear: 2550, toYear: null }), range)).toEqual({ left: 50, width: 50 });
  });

  it('never runs past the axis and keeps a visible minimum width', () => {
    const pos = periodPosition(p({ fromYear: 2559, toYear: 2559 }), range);
    expect(pos.width).toBeGreaterThanOrEqual(4);
    expect(pos.left + pos.width).toBeLessThanOrEqual(100);
  });
});

describe('groupLanes', () => {
  it('groups by name and sorts each lane by start year', () => {
    const lanes = groupLanes([
      p({ id: 1, groupName: 'ครู', fromYear: 2555 }),
      p({ id: 2, groupName: 'เพื่อน', fromYear: 2552 }),
      p({ id: 3, groupName: 'เพื่อน', fromYear: 2550 }),
    ]);
    expect([...lanes.keys()]).toEqual(['ครู', 'เพื่อน']);
    expect(lanes.get('เพื่อน')!.map((x) => x.id)).toEqual([3, 2]);
  });
});

describe('decadeTicks', () => {
  it('lists each decade inside the range', () => {
    expect(decadeTicks({ min: 2543, max: 2565 })).toEqual([2550, 2560]);
  });
});
