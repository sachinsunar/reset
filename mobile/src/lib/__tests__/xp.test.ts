import { describe, expect, it } from 'vitest';
import {
  MISSION_XP,
  computeXpSummary,
  levelForXp,
  missionXp,
  type XpAward,
  type XpMission,
} from '@/lib/xp';

const mission = (overrides: Partial<XpMission>): XpMission => ({
  id: 'goal-1',
  date: '2026-11-02',
  title: 'Study calculus',
  category: 'study',
  kind: 'core',
  ...overrides,
});

describe('mission XP', () => {
  it('rewards the configured mission types', () => {
    expect(missionXp(mission({ title: 'Wake up and hydrate', category: 'personal' }))).toBe(
      MISSION_XP.wake,
    );
    expect(missionXp(mission({ title: 'Evening revision', category: 'study' }))).toBe(
      MISSION_XP.revision,
    );
    expect(missionXp(mission({ title: 'Strength workout', category: 'fitness' }))).toBe(
      MISSION_XP.fitness,
    );
    expect(missionXp(mission({ title: 'Morning movement', category: 'fitness' }))).toBe(
      MISSION_XP.fitness,
    );
    expect(missionXp(mission({ title: 'Read project docs', category: 'career' }))).toBe(
      MISSION_XP.career,
    );
  });

  it('keeps optional missions valuable but smaller', () => {
    expect(missionXp(mission({ title: 'Tidy desk', category: 'personal', kind: 'optional' }))).toBe(
      MISSION_XP.optional,
    );
  });
});

describe('levels', () => {
  it('maps total XP to a named level and progress', () => {
    const level = levelForXp(420);
    expect(level.level).toBe(4);
    expect(level.title).toBe('Consistency Builder');
    expect(level.nextLevelXp).toBe(600);
    expect(level.xpToNext).toBe(180);
    expect(level.progress).toBeCloseTo(70 / 250);
  });

  it('caps progress at the final level', () => {
    const level = levelForXp(5000);
    expect(level.level).toBe(7);
    expect(level.title).toBe('Growth Mode');
    expect(level.progress).toBe(1);
    expect(level.nextLevelXp).toBeNull();
  });
});

const award = (overrides: Partial<XpAward>): XpAward => ({
  id: 'mission:a',
  sourceType: 'mission',
  sourceId: 'a',
  date: '2026-11-02',
  amount: 25,
  awardedAt: '2026-11-02T00:00:00.000Z',
  ...overrides,
});

describe('XP summary', () => {
  it('counts each persistent award once, including the daily plan bonus', () => {
    const summary = computeXpSummary(
      [
        award({}),
        award({}),
        award({ id: 'mission:b', sourceId: 'b', amount: 30 }),
        award({
          id: 'mission:c',
          sourceId: 'c',
          date: '2026-11-01',
          amount: 20,
        }),
        award({
          id: 'daily_plan:2026-11-02',
          sourceType: 'daily_plan',
          sourceId: '2026-11-02',
          amount: 50,
        }),
        award({
          id: 'daily_plan:2026-11-01',
          sourceType: 'daily_plan',
          sourceId: '2026-11-01',
          date: '2026-11-01',
          amount: 50,
        }),
      ],
      '2026-11-02',
    );

    expect(summary.completedMissions).toBe(3);
    expect(summary.todayCompletedMissions).toBe(2);
    expect(summary.missionXp).toBe(25 + 30 + 20);
    expect(summary.planBonusXp).toBe(100);
    expect(summary.todayXp).toBe(25 + 30 + 50);
    expect(summary.totalXp).toBe(175);
  });

  it('does not award plan XP twice when an award is duplicated', () => {
    const summary = computeXpSummary(
      [
        award({
          id: 'daily_plan:2026-11-02',
          sourceType: 'daily_plan',
          sourceId: '2026-11-02',
          amount: 50,
        }),
        award({
          id: 'daily_plan:2026-11-02',
          sourceType: 'daily_plan',
          sourceId: '2026-11-02',
          amount: 50,
        }),
      ],
      '2026-11-02',
    );
    expect(summary.planBonusXp).toBe(MISSION_XP.dailyPlan);
    expect(summary.todayPlanXp).toBe(MISSION_XP.dailyPlan);
  });
});
