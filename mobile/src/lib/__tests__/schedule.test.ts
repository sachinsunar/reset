import { describe, expect, it } from 'vitest';
import { buildDateStrip, buildScheduleItems } from '@/lib/schedule';
import type { Goal, ScheduleBlock } from '@/types';

const block = (overrides: Partial<ScheduleBlock>): ScheduleBlock => ({
  id: 'block-1',
  phaseId: 'vacation',
  title: 'Morning study',
  description: 'A calm start',
  category: 'study',
  startTime: '07:00',
  endTime: '08:30',
  days: [0, 1, 2, 3, 4, 5, 6],
  trackable: true,
  fixed: false,
  kind: 'core',
  estMinutes: 90,
  sortOrder: 1,
  active: true,
  ...overrides,
});

const goal = (overrides: Partial<Goal>): Goal => ({
  id: 'goal-1',
  date: '2026-11-02',
  blockId: 'block-1',
  title: 'Deep work',
  description: 'One focused block',
  category: 'study',
  estMinutes: 90,
  scheduledTime: '07:00',
  kind: 'core',
  status: 'pending',
  skipReason: null,
  completedAt: null,
  source: 'routine',
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  ...overrides,
});

describe('buildScheduleItems', () => {
  it('creates exactly one item and one time label per unique block', () => {
    const items = buildScheduleItems(
      [block({}), block({}), block({ id: 'block-2', startTime: '09:00', endTime: '10:00' })],
      [goal({})],
    );
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.id)).toEqual(['block-1', 'block-2']);
    expect(items[0].timeLabel).toBe('7:00 AM');
    expect(items.filter((item) => item.timeLabel === '7:00 AM')).toHaveLength(1);
  });

  it('sorts by time instead of relying on routine insertion order', () => {
    const items = buildScheduleItems(
      [
        block({ id: 'late', startTime: '20:00', endTime: '21:00' }),
        block({ id: 'early', startTime: '06:30', endTime: '07:00' }),
      ],
      [],
    );
    expect(items.map((item) => item.id)).toEqual(['early', 'late']);
  });

  it('maps goal completion and marks the current mission once', () => {
    const items = buildScheduleItems(
      [block({})],
      [goal({ status: 'completed' })],
      7 * 60 + 15,
    );
    expect(items[0]).toMatchObject({
      goalId: 'goal-1',
      title: 'Deep work',
      state: 'completed',
      isNow: true,
      xp: 25,
    });
  });

  it('keeps untracked routines visible without inventing a goal', () => {
    const items = buildScheduleItems(
      [block({ id: 'lunch', title: 'Lunch', trackable: false, category: 'personal' })],
      [],
    );
    expect(items[0]).toMatchObject({
      goalId: null,
      state: 'open',
      trackable: false,
    });
  });
});

describe('buildDateStrip', () => {
  it('builds a stable calendar strip with today marked once', () => {
    const days = buildDateStrip('2026-11-02', '2026-11-02', 2, 3);
    expect(days.map((day) => day.date)).toEqual([
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
    ]);
    expect(days.filter((day) => day.isToday)).toHaveLength(1);
  });
});
