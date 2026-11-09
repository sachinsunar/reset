import { describe, expect, it } from 'vitest';
import type { Goal } from '@/types';
import { computeDailyProgress } from '../completion';

const goal = (id: string, kind: 'core' | 'optional', status: Goal['status']): Goal => ({
  id,
  date: '2026-11-01',
  blockId: id,
  title: id,
  description: '',
  category: 'study',
  estMinutes: 30,
  scheduledTime: null,
  kind,
  status,
  skipReason: null,
  completedAt: null,
  source: 'routine',
  createdAt: '',
  updatedAt: '',
});

describe('computeDailyProgress', () => {
  it('counts optional goals separately from the core threshold', () => {
    const result = computeDailyProgress([
      goal('a', 'core', 'completed'),
      goal('b', 'core', 'pending'),
      goal('c', 'core', 'completed'),
      goal('d', 'core', 'pending'),
      goal('e', 'core', 'pending'),
      goal('f', 'optional', 'pending'),
      goal('g', 'optional', 'completed'),
    ]);
    expect(result.completedCore).toBe(2);
    expect(result.totalCore).toBe(5);
    expect(result.corePercent).toBe(0.4);
    expect(result.completedOptional).toBe(1);
    expect(result.thresholdReached).toBe(false);
  });

  it('reaches the 70 percent threshold', () => {
    const goals = Array.from({ length: 10 }, (_, index) =>
      goal(String(index), 'core', index < 7 ? 'completed' : 'pending'),
    );
    const result = computeDailyProgress(goals);
    expect(result.thresholdReached).toBe(true);
    expect(result.corePercent).toBe(0.7);
  });

  it('does not let skipped goals reduce the percentage', () => {
    const result = computeDailyProgress([
      goal('a', 'core', 'completed'),
      goal('b', 'core', 'completed'),
      goal('c', 'core', 'skipped'),
    ]);
    expect(result.completedCore).toBe(2);
    expect(result.totalCore).toBe(2);
    expect(result.thresholdReached).toBe(true);
  });

  it('never reports more than 100 percent', () => {
    const result = computeDailyProgress([goal('a', 'core', 'completed')]);
    expect(result.corePercent).toBe(1);
    expect(result.allPercent).toBe(1);
  });
});
