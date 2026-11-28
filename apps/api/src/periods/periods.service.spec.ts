import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { parsePeriodInput } from './periods.service';

const base = { treeId: 1, personId: 2, groupName: 'เพื่อนสมัยประถม', fromYear: 2550 };

describe('parsePeriodInput', () => {
  it('accepts an ongoing period (no toYear)', () => {
    expect(parsePeriodInput(base as any).toYear).toBeUndefined();
  });

  it('accepts a closed period where toYear equals fromYear', () => {
    expect(parsePeriodInput({ ...base, toYear: 2550 } as any).toYear).toBe(2550);
  });

  it('rejects toYear before fromYear', () => {
    expect(() => parsePeriodInput({ ...base, toYear: 2549 } as any)).toThrow(BadRequestException);
  });

  it('rejects an empty group name', () => {
    expect(() => parsePeriodInput({ ...base, groupName: '   ' } as any)).toThrow(BadRequestException);
  });

  it('rejects a year outside the supported range', () => {
    expect(() => parsePeriodInput({ ...base, fromYear: 1500 } as any)).toThrow(BadRequestException);
  });
});
