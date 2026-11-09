import { useQuery } from '@tanstack/react-query';
import { getProfile, getPhases, getBlocks } from '@/db/repositories/settings';
import { ensureGoalsForDate } from '@/db/repositories/goals';
import { recomputeDayLog } from '@/db/repositories/days';
import { blocksForDate, resolveActivePhase } from '@/lib/phases';
import { todayKey } from '@/lib/date';

export function useDayPlan(date: string) {
  return useQuery({
    queryKey: ['day-plan', date],
    queryFn: async () => {
      const profile = await getProfile();
      if (!profile) {
        return { profile: null, goals: [], phase: null, blocks: [], dayLog: null };
      }
      const today = todayKey(new Date(), profile.timezone);
      const goals = await ensureGoalsForDate(date, profile);
      const phases = await getPhases();
      const phase = resolveActivePhase(
        phases,
        date,
        date >= today ? profile.activePhaseId : null,
      );
      const allBlocks = phase ? await getBlocks(phase.id) : [];
      const blocks = blocksForDate(allBlocks, date);
      const dayLog = await recomputeDayLog(date, today, profile.streakThreshold);
      return { profile, goals, phase, blocks, dayLog };
    },
    staleTime: 15_000,
  });
}
