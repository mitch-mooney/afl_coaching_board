import { describe, it, expect } from 'vitest';
import { getBufferedRanges, calculateBufferedPercent } from '../videoBuffer';

describe('calculateBufferedPercent', () => {
  it('returns 0 when nothing is buffered', () => {
    expect(calculateBufferedPercent([], 100)).toBe(0);
  });

  it('returns 0 when duration is 0', () => {
    expect(calculateBufferedPercent([{ start: 0, end: 50 }], 0)).toBe(0);
  });

  it('computes the buffered fraction of the duration as a percent', () => {
    expect(calculateBufferedPercent([{ start: 0, end: 50 }], 100)).toBe(50);
  });

  it('sums multiple buffered ranges', () => {
    expect(
      calculateBufferedPercent([{ start: 0, end: 25 }, { start: 50, end: 75 }], 100)
    ).toBe(50);
  });

  it('caps at 100', () => {
    expect(calculateBufferedPercent([{ start: 0, end: 200 }], 100)).toBe(100);
  });
});

describe('getBufferedRanges', () => {
  it('reads a video element buffered TimeRanges into {start,end} objects', () => {
    const starts = [0, 60];
    const ends = [30, 90];
    const fakeVideo = {
      buffered: {
        length: 2,
        start: (i: number) => starts[i],
        end: (i: number) => ends[i],
      },
    } as unknown as HTMLVideoElement;
    expect(getBufferedRanges(fakeVideo)).toEqual([
      { start: 0, end: 30 },
      { start: 60, end: 90 },
    ]);
  });
});
