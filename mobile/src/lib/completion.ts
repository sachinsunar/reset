import type { Goal } from '@/types';

export interface DailyProgress {
  completedCore: number;
  totalCore: number;
  completedOptional: number;
  totalOptional: number;
  completedAll: number;
  totalAll: number;
  corePercent: number;
  allPercent: number;
  thresholdReached: boolean;
}

export function computeDailyProgress(goals: Goal[], threshold = 0.7): DailyProgress {
  const coreGoals = goals.filter((g) => g.kind === 'core' && g.status !== 'skipped');
  const optionalGoals = goals.filter((g) => g.kind === 'optional' && g.status !== 'skipped');
  const completedCore = coreGoals.filter((g) => g.status === 'completed').length;
  const completedOptional = optionalGoals.filter((g) => g.status === 'completed').length;
  const totalCore = coreGoals.length;
  const totalOptional = optionalGoals.length;
  const completedAll = completedCore + completedOptional;
  const totalAll = totalCore + totalOptional;
  return {
    completedCore,
    totalCore,
    completedOptional,
    totalOptional,
    completedAll,
    totalAll,
    corePercent: totalCore === 0 ? 0 : completedCore / totalCore,
    allPercent: totalAll === 0 ? 0 : completedAll / totalAll,
    thresholdReached: totalCore > 0 && completedCore / totalCore >= threshold,
  };
}

export function nextGoal(goals: Goal[]): Goal | null {
  return (
    goals.find((g) => g.status === 'pending' && g.kind === 'core') ??
    goals.find((g) => g.status === 'pending') ??
    null
  );
}

export const SKIP_REASONS = [
  'Low energy',
  'Not feeling well',
  'Travel or family',
  'Prior commitment',
  'Chose rest',
] as const;
