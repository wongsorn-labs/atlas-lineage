import { describe, expect, it } from 'vitest';
import { computeCropRect, PHOTO_MAX_ZOOM } from './photo';

describe('computeCropRect', () => {
  it('uses the largest centred square at zoom 1 for a landscape image', () => {
    expect(computeCropRect(400, 200, 1, 200, 100)).toEqual({ x: 100, y: 0, size: 200 });
  });

  it('shrinks the square as zoom increases', () => {
    const r = computeCropRect(400, 400, 2, 200, 200);
    expect(r.size).toBe(200);
    expect(r.x).toBe(100);
    expect(r.y).toBe(100);
  });

  it('clamps zoom to the allowed range', () => {
    expect(computeCropRect(300, 300, 0.2, 150, 150).size).toBe(300);
    expect(computeCropRect(300, 300, 99, 150, 150).size).toBe(300 / PHOTO_MAX_ZOOM);
  });

  it('keeps the crop inside the image when the centre is near an edge', () => {
    const r = computeCropRect(400, 200, 1, 0, 0);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    const far = computeCropRect(400, 200, 1, 9999, 9999);
    expect(far.x + far.size).toBeCloseTo(400);
    expect(far.y + far.size).toBeCloseTo(200);
  });
});
