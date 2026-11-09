import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateKeyInTz,
  diffDays,
  formatTime12h,
  isTimeWithinQuietHours,
  startOfWeekKey,
  timeToMinutes,
  todayKey,
  weekdayOfKey,
} from '../date';

describe('Nepal timezone date keys', () => {
  it('rolls over to the next local day before UTC does', () => {
    const instant = new Date('2026-10-31T18:20:00.000Z');
    expect(instant.toISOString().slice(0, 10)).toBe('2026-10-31');
    expect(dateKeyInTz(instant)).toBe('2026-11-01');
  });

  it('keeps the same local day late in the Nepal evening', () => {
    const instant = new Date('2026-11-01T18:14:00.000Z');
    expect(todayKey(instant)).toBe('2026-11-01');
    const afterMidnight = new Date('2026-11-01T18:16:00.000Z');
    expect(todayKey(afterMidnight)).toBe('2026-11-02');
  });
});

describe('date key helpers', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(diffDays('2026-11-01', '2026-11-25')).toBe(24);
  });

  it('computes weekday and week start', () => {
    expect(weekdayOfKey('2026-11-01')).toBe(0);
    expect(weekdayOfKey('2026-11-02')).toBe(1);
    expect(startOfWeekKey('2026-11-05')).toBe('2026-11-02');
    expect(startOfWeekKey('2026-11-01')).toBe('2026-10-26');
  });

  it('formats times and quiet hours', () => {
    expect(formatTime12h('05:45')).toBe('5:45 AM');
    expect(formatTime12h('21:30')).toBe('9:30 PM');
    expect(formatTime12h('00:10')).toBe('12:10 AM');
    expect(timeToMinutes('05:45')).toBe(345);
    expect(isTimeWithinQuietHours('23:00', '22:00', '05:30')).toBe(true);
    expect(isTimeWithinQuietHours('03:00', '22:00', '05:30')).toBe(true);
    expect(isTimeWithinQuietHours('07:00', '22:00', '05:30')).toBe(false);
  });
});
