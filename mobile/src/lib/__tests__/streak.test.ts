import { describe, expect, it } from 'vitest';
import { computeStreak, evaluateDayStatus, type DayInput } from '../streak';

const completed = (date: string, isRest = false, isRecovery = false): DayInput => ({
  date,
  status: 'completed',
  completedCore: 4,
  totalCore: 5,
  isRest,
  isRecovery,
});

const missed = (date: string): DayInput => ({
  date,
  status: 'missed',
  completedCore: 0,
  totalCore: 5,
  isRest: false,
  isRecovery: false,
});

const rest = (date: string, recovery = false): DayInput => ({
  date,
  status: recovery ? 'recovery' : 'rest',
  completedCore: 0,
  totalCore: 5,
  isRest: !recovery,
  isRecovery: recovery,
});

const partial = (date: string): DayInput => ({
  date,
  status: 'partial',
  completedCore: 2,
  totalCore: 5,
  isRest: false,
  isRecovery: false,
});

describe('evaluateDayStatus', () => {
  it('meets the configurable threshold', () => {
    const base = {
      date: '2026-11-01',
      today: '2026-11-01',
      isRest: false,
      isRecovery: false,
      threshold: 0.7,
    };
    expect(evaluateDayStatus({ ...base, completedCore: 7, totalCore: 10 })).toBe('completed');
    expect(evaluateDayStatus({ ...base, completedCore: 6, totalCore: 10 })).toBe('partial');
    expect(evaluateDayStatus({ ...base, date: '2026-10-31', completedCore: 6, totalCore: 10 })).toBe(
      'partial',
    );
    expect(evaluateDayStatus({ ...base, date: '2026-10-31', completedCore: 0, totalCore: 10 })).toBe(
      'missed',
    );
  });

  it('preserves rest days without marking them failed', () => {
    const base = {
      date: '2026-10-31',
      today: '2026-11-01',
      completedCore: 0,
      totalCore: 8,
      isRest: true,
      isRecovery: false,
      threshold: 0.7,
    };
    expect(evaluateDayStatus(base)).toBe('rest');
    expect(evaluateDayStatus({ ...base, isRest: false, isRecovery: true })).toBe('recovery');
    expect(evaluateDayStatus({ ...base, completedCore: 6 })).toBe('completed');
  });

  it('marks planned future days as future', () => {
    expect(
      evaluateDayStatus({
        date: '2026-11-02',
        today: '2026-11-01',
        completedCore: 0,
        totalCore: 8,
        isRest: false,
        isRecovery: false,
        threshold: 0.7,
      }),
    ).toBe('future');
  });
});

describe('computeStreak', () => {
  it('counts consecutive completed days including today', () => {
    const result = computeStreak(
      [completed('2026-11-01'), completed('2026-11-02'), completed('2026-11-03')],
      '2026-11-03',
    );
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
    expect(result.totalCompleted).toBe(3);
    expect(result.todayStatus).toBe('completed');
  });

  it('keeps yesterday’s streak visible while today is unfinished', () => {
    const result = computeStreak(
      [completed('2026-11-01'), completed('2026-11-02')],
      '2026-11-03',
    );
    expect(result.current).toBe(2);
  });

  it('resets after a missed day but preserves the longest streak', () => {
    const result = computeStreak(
      [
        completed('2026-10-28'),
        completed('2026-10-29'),
        completed('2026-10-30'),
        missed('2026-10-31'),
        completed('2026-11-01'),
        completed('2026-11-02'),
      ],
      '2026-11-02',
    );
    expect(result.current).toBe(2);
    expect(result.longest).toBe(3);
  });

  it('does not break a streak on rest or recovery days', () => {
    const result = computeStreak(
      [
        completed('2026-10-30'),
        rest('2026-10-31'),
        rest('2026-11-01', true),
        completed('2026-11-02'),
        completed('2026-11-03'),
      ],
      '2026-11-03',
    );
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it('breaks a streak after a past partial day', () => {
    const result = computeStreak(
      [completed('2026-11-01'), partial('2026-11-02'), completed('2026-11-03')],
      '2026-11-03',
    );
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
  });

  it('deduplicates repeated day records', () => {
    const result = computeStreak(
      [completed('2026-11-01'), completed('2026-11-01'), completed('2026-11-02')],
      '2026-11-02',
    );
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
    expect(result.totalCompleted).toBe(2);
  });

  it('handles an empty history', () => {
    const result = computeStreak([], '2026-11-01');
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
    expect(result.weekPercent).toBe(0);
  });

  it('computes weekly consistency excluding rest days', () => {
    const result = computeStreak(
      [
        completed('2026-10-29'),
        rest('2026-10-30'),
        completed('2026-10-31'),
        partial('2026-11-01'),
        completed('2026-11-02'),
      ],
      '2026-11-02',
    );
    expect(result.weekPercent).toBeCloseTo(3 / 4);
  });

  it('is stable at the Nepal midnight boundary', () => {
    const result = computeStreak(
      [completed('2026-10-31'), completed('2026-11-01')],
      '2026-11-01',
    );
    expect(result.current).toBe(2);
    expect(result.todayStatus).toBe('completed');
  });
});
