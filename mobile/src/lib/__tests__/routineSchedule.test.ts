import { describe, expect, it } from 'vitest';
import type { Goal, ScheduleBlock } from '@/types';
import { buildScheduleItems } from '@/lib/schedule';
import {
  blockDuration,
  findConflicts,
  recomputeRoutineTimes,
  reorderBlocks,
  selectRoutineFocus,
  withDuration,
} from '@/lib/routineSchedule';

const block = (overrides: Partial<ScheduleBlock>): ScheduleBlock => ({
  id: 'wake',
  phaseId: 'vacation',
  title: 'Wake up',
  description: '',
  category: 'personal',
  startTime: '06:00',
  endTime: '06:10',
  days: [0, 1, 2, 3, 4, 5, 6],
  trackable: true,
  fixed: false,
  kind: 'core',
  estMinutes: 10,
  sortOrder: 0,
  active: true,
  ...overrides,
});

const goal = (overrides: Partial<Goal>): Goal => ({
  id: 'goal-1',
  date: '2026-11-03',
  blockId: 'wake',
  title: 'Wake up',
  description: '',
  category: 'personal',
  estMinutes: 10,
  scheduledTime: '06:00',
  kind: 'core',
  status: 'pending',
  skipReason: null,
  completedAt: null,
  source: 'routine',
  createdAt: '2026-11-03T00:00:00.000Z',
  updatedAt: '2026-11-03T00:00:00.000Z',
  ...overrides,
});

const base = [
  block({ id: 'run', title: 'Running', startTime: '06:00', endTime: '06:40', estMinutes: 40 }),
  block({ id: 'breakfast', title: 'Breakfast', startTime: '06:40', endTime: '07:30', estMinutes: 50 }),
  block({ id: 'os', title: 'Operating System', startTime: '07:30', endTime: '09:00', estMinutes: 90 }),
  block({ id: 'break', title: 'Break', startTime: '09:00', endTime: '09:30', trackable: false, estMinutes: 30 }),
  block({ id: 'numerical', title: 'Numerical Method', startTime: '09:30', endTime: '11:30', estMinutes: 120 }),
];

describe('routine reordering and recalculation', () => {
  it('moves a block and preserves every configured duration', () => {
    const reordered = reorderBlocks(base, 2, 4);
    const result = recomputeRoutineTimes(reordered);
    expect(result.conflicts).toHaveLength(0);
    expect(result.blocks.map((item) => item.id)).toEqual([
      'run',
      'breakfast',
      'break',
      'numerical',
      'os',
    ]);
    expect(result.blocks.map(blockDuration)).toEqual([40, 50, 30, 120, 90]);
    expect(result.blocks.map((item) => item.startTime)).toEqual([
      '06:00',
      '06:40',
      '07:30',
      '08:00',
      '10:00',
    ]);
  });

  it('keeps breaks in sequence and recalculates the blocks after them', () => {
    const result = recomputeRoutineTimes(reorderBlocks(base, 3, 1), 6 * 60);
    expect(result.blocks.map((item) => item.title)).toEqual([
      'Running',
      'Break',
      'Breakfast',
      'Operating System',
      'Numerical Method',
    ]);
    expect(result.blocks[2].startTime).toBe('07:10');
    expect(result.blocks[2].endTime).toBe('08:00');
  });

  it('never silently moves a fixed-time activity', () => {
    const withCollege = [
      block({ id: 'wake', title: 'Wake up', startTime: '05:15', endTime: '05:25' }),
      block({ id: 'ready', title: 'Get ready', startTime: '05:30', endTime: '06:00', estMinutes: 30 }),
      block({
        id: 'college',
        title: 'College',
        startTime: '06:30',
        endTime: '10:00',
        estMinutes: 210,
        fixed: true,
      }),
      block({ id: 'study', title: 'Study', startTime: '10:00', endTime: '12:00', estMinutes: 120 }),
    ];
    const result = recomputeRoutineTimes(withCollege, 5 * 60 + 15);
    expect(result.conflicts).toHaveLength(0);
    const college = result.blocks.find((item) => item.id === 'college')!;
    expect(college.startTime).toBe('06:30');
    expect(college.endTime).toBe('10:00');
    expect(result.blocks.find((item) => item.id === 'study')?.startTime).toBe('10:00');
  });

  it('reports an overlap when a flexible block is dragged across a fixed event', () => {
    const withCollege = [
      block({ id: 'wake', title: 'Wake up', startTime: '05:15', endTime: '05:25' }),
      block({
        id: 'college',
        title: 'College',
        startTime: '06:30',
        endTime: '10:00',
        estMinutes: 210,
        fixed: true,
      }),
      block({ id: 'study', title: 'Deep study', startTime: '10:00', endTime: '12:00', estMinutes: 120 }),
    ];
    const moved = reorderBlocks(withCollege, 2, 1);
    const result = recomputeRoutineTimes(moved, 5 * 60 + 15);
    expect(result.conflicts[0]?.message).toContain('College');
    expect(findConflicts(result.blocks).length).toBeGreaterThan(0);
  });

  it('adjusts duration without changing the start anchor', () => {
    const adjusted = withDuration(base[2], 45);
    expect(blockDuration(adjusted)).toBe(45);
    expect(adjusted.startTime).toBe(base[2].startTime);
    const result = recomputeRoutineTimes([base[0], adjusted, base[3]], 6 * 60);
    expect(result.blocks[1].endTime).toBe('07:25');
    expect(result.blocks[2].startTime).toBe('07:25');
  });
});

describe('selectRoutineFocus', () => {
  const items = (status: Goal['status'] = 'pending') =>
    buildScheduleItems(
      [
        block({ id: 'run', title: 'Running', startTime: '06:00', endTime: '06:40' }),
        block({ id: 'break', title: 'Break', startTime: '06:40', endTime: '07:00', trackable: false }),
        block({ id: 'study', title: 'Study', startTime: '07:00', endTime: '08:00' }),
      ],
      [
        goal({ id: 'g-run', blockId: 'run', title: 'Running', status }),
        goal({ id: 'g-study', blockId: 'study', title: 'Study' }),
      ],
      6 * 60 + 10,
    );

  it('shows the current activity while it is happening', () => {
    expect(selectRoutineFocus(items(), 6 * 60 + 10)).toMatchObject({
      kind: 'current',
      item: { id: 'run' },
      next: { id: 'study' },
    });
  });

  it('advances after an early completion instead of waiting for the clock', () => {
    expect(selectRoutineFocus(items('completed'), 6 * 60 + 10)).toMatchObject({
      kind: 'upcoming',
      item: { id: 'study' },
    });
  });

  it('shows an active break and the next real activity', () => {
    expect(selectRoutineFocus(items('completed'), 6 * 60 + 45)).toMatchObject({
      kind: 'break',
      item: { id: 'break' },
      next: { id: 'study' },
    });
  });

  it('keeps an overdue activity visible and never auto-completes it', () => {
    const overdue = buildScheduleItems(
      [block({ id: 'run', title: 'Running', startTime: '06:00', endTime: '06:40' })],
      [goal({ blockId: 'run' })],
      9 * 60,
    );
    expect(selectRoutineFocus(overdue, 9 * 60)).toMatchObject({
      kind: 'overdue',
      item: { id: 'run' },
      overdueCount: 1,
    });
  });

  it('shows a friendly done state after everything is complete', () => {
    const done = buildScheduleItems(
      [block({ id: 'run', title: 'Running', startTime: '06:00', endTime: '06:40' })],
      [goal({ blockId: 'run', status: 'completed' })],
      9 * 60,
    );
    expect(selectRoutineFocus(done, 9 * 60).kind).toBe('done');
  });

  it('stays done when a display-only block is still on screen', () => {
    const done = buildScheduleItems(
      [
        block({ id: 'run', title: 'Running', startTime: '06:00', endTime: '06:40' }),
        block({ id: 'break', title: 'Break', startTime: '06:40', endTime: '07:00', trackable: false }),
      ],
      [goal({ blockId: 'run', status: 'completed' })],
      6 * 60 + 45,
    );
    expect(selectRoutineFocus(done, 6 * 60 + 45).kind).toBe('done');
  });
});
