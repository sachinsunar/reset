import { create } from 'zustand';
import type {
  Achievement,
  Category,
  DailyCheckIn,
  DayLog,
  Goal,
  GoalKind,
  Profile,
  RoutinePhase,
  StreakStats,
  ThemeMode,
} from '@/types';
import { computeDailyProgress, type DailyProgress } from '@/lib/completion';
import { computeStreak } from '@/lib/streak';
import { resolveActivePhase } from '@/lib/phases';
import { todayKey } from '@/lib/date';
import { completionMessage, restDayMessage, thresholdMessage } from '@/lib/motivation';
import { showToast } from '@/lib/toastBus';
import { successFeedback, tapFeedback } from '@/lib/haptics';
import { getDb } from '@/db/database';
import {
  createProfile,
  getPhases,
  getProfile,
  getSetting,
  updateLearningDays,
  updateProfile as persistProfile,
  updateRoutineAnchors,
} from '@/db/repositories/settings';
import {
  addManualGoal,
  completeGoal,
  ensureTrackingHistory,
  getCompletedGoals,
  getGoalsForDate,
  rescheduleGoal as persistReschedule,
  restoreGoal as persistRestore,
  skipGoal as persistSkip,
  uncompleteGoal,
} from '@/db/repositories/goals';
import {
  getDayLog,
  getAllDayInputs,
  recomputeDayLog,
  setDayRest,
} from '@/db/repositories/days';
import { unlockAchievements } from '@/db/repositories/achievements';
import { getCheckIn, saveCheckIn } from '@/db/repositories/journal';
import { canTakeRecovery } from '@/lib/streak';
import { computeXpSummary, emptyXpSummary, missionXp, type XpSummary } from '@/lib/xp';
import { backfillXpAwards, getXpAwards } from '@/db/repositories/xp';

interface Snapshot {
  profile: Profile;
  today: string;
  goals: Goal[];
  dayLog: DayLog | null;
  phases: RoutinePhase[];
  activePhase: RoutinePhase | null;
  progress: DailyProgress;
  streak: StreakStats;
  achievements: Achievement[];
  checkIn: DailyCheckIn | null;
  xp: XpSummary;
}

async function loadSnapshot(profile: Profile): Promise<Snapshot> {
  const today = todayKey(new Date(), profile.timezone);
  const [phases, goals, checkIn, completedGoals] = await Promise.all([
    getPhases(),
    getGoalsForDate(today),
    getCheckIn(today),
    getCompletedGoals(),
  ]);
  const dayLog = await recomputeDayLog(today, today, profile.streakThreshold);
  const days = await getAllDayInputs();
  const streak = computeStreak(days, today, profile.streakThreshold);
  const { all } = await unlockAchievements(today);
  const completedDays = days
    .filter((day) => day.status === 'completed')
    .map((day) => day.date);
  await backfillXpAwards(completedGoals, completedDays);
  const xpAwards = await getXpAwards();
  return {
    profile,
    today,
    goals,
    dayLog: dayLog ?? (await getDayLog(today)),
    phases,
    activePhase: resolveActivePhase(phases, today, profile.activePhaseId),
    progress: computeDailyProgress(goals, profile.streakThreshold),
    streak,
    achievements: all,
    checkIn,
    xp: computeXpSummary(xpAwards, today),
  };
}

export interface OnboardingInput {
  name: string;
  email?: string;
  wakeTime: string;
  bedtime: string;
  learningDays: number[];
  streakThreshold: number;
  restDaysPerWeek: number;
  themeMode: ThemeMode;
}

interface AppState {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  profile: Profile | null;
  today: string;
  goals: Goal[];
  dayLog: DayLog | null;
  phases: RoutinePhase[];
  activePhase: RoutinePhase | null;
  progress: DailyProgress;
  streak: StreakStats;
  achievements: Achievement[];
  checkIn: DailyCheckIn | null;
  xp: XpSummary;
  lastSyncedAt: string;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  finishOnboarding: (input: OnboardingInput) => Promise<void>;
  toggleGoal: (goalId: string) => Promise<void>;
  skipGoal: (goalId: string, reason: string) => Promise<void>;
  restoreGoal: (goalId: string) => Promise<void>;
  rescheduleGoal: (goalId: string, date: string, time?: string | null) => Promise<void>;
  addGoal: (input: {
    title: string;
    description?: string;
    category: Category;
    estMinutes?: number;
    kind?: GoalKind;
    scheduledTime?: string | null;
    date?: string;
  }) => Promise<void>;
  markRest: (kind: 'none' | 'rest' | 'recovery') => Promise<void>;
  saveCheckIn: (patch: Partial<Pick<DailyCheckIn, 'sleep' | 'energy' | 'mood'>>) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  setOnline: (online: boolean) => void;
  setLastSyncedAt: (value: string) => void;
  reloadAchievements: () => Promise<void>;
}

const emptyProgress: DailyProgress = {
  completedCore: 0,
  totalCore: 0,
  completedOptional: 0,
  totalOptional: 0,
  completedAll: 0,
  totalAll: 0,
  corePercent: 0,
  allPercent: 0,
  thresholdReached: false,
};

const emptyStreak: StreakStats = {
  current: 0,
  longest: 0,
  totalCompleted: 0,
  weekPercent: 0,
  monthPercent: 0,
  todayStatus: 'none',
};

export const useAppStore = create<AppState>()((set, get) => {
  const applySnapshot = (snapshot: Snapshot) => {
    set({
      profile: snapshot.profile,
      today: snapshot.today,
      goals: snapshot.goals,
      dayLog: snapshot.dayLog,
      phases: snapshot.phases,
      activePhase: snapshot.activePhase,
      progress: snapshot.progress,
      streak: snapshot.streak,
      achievements: snapshot.achievements,
      checkIn: snapshot.checkIn,
      xp: snapshot.xp,
      error: null,
    });
  };

  const reload = async (backfill = false) => {
    const profile = await getProfile();
    if (!profile) return;
    if (backfill) {
      await ensureTrackingHistory(profile);
    }
    const snapshot = await loadSnapshot(profile);
    applySnapshot(snapshot);
  };

  return {
    hydrated: false,
    loading: false,
    error: null,
    isOnline: true,
    profile: null,
    today: todayKey(),
    goals: [],
    dayLog: null,
    phases: [],
    activePhase: null,
    progress: emptyProgress,
    streak: emptyStreak,
    achievements: [],
    checkIn: null,
    xp: emptyXpSummary,
    lastSyncedAt: '',

    init: async () => {
      if (get().loading) return;
      set({ loading: true, error: null });
      try {
        await getDb();
        const profile = await getProfile();
        if (!profile) {
          set({ hydrated: true, loading: false });
          return;
        }
        await ensureTrackingHistory(profile);
        const snapshot = await loadSnapshot(profile);
        const lastSyncedAt = await getSetting('lastSyncAt');
        applySnapshot(snapshot);
        set({ hydrated: true, loading: false, lastSyncedAt });
      } catch (error) {
        set({
          loading: false,
          hydrated: true,
          error: error instanceof Error ? error.message : 'Could not load your data.',
        });
      }
    },

    refresh: async () => {
      try {
        await reload(false);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Could not refresh.' });
      }
    },

    finishOnboarding: async (input) => {
      set({ loading: true, error: null });
      try {
        await updateRoutineAnchors(input.wakeTime, input.bedtime);
        await updateLearningDays(input.learningDays);
        const profile = await createProfile({
          name: input.name,
          email: input.email,
          timezone: 'Asia/Kathmandu',
          wakeTime: input.wakeTime,
          bedtime: input.bedtime,
          trackingSince: todayKey(),
          streakThreshold: input.streakThreshold,
          restDaysPerWeek: input.restDaysPerWeek,
          themeMode: input.themeMode,
        });
        await ensureTrackingHistory(profile);
        const snapshot = await loadSnapshot(profile);
        applySnapshot(snapshot);
        set({ hydrated: true, loading: false });
        showToast('Your reset is ready. Start with one small thing.', 'success');
      } catch (error) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : 'Could not finish setup.',
        });
        throw error;
      }
    },

    toggleGoal: async (goalId) => {
      const before = get();
      const goal = before.goals.find((g) => g.id === goalId);
      if (!goal) return;
      try {
        if (goal.status === 'completed') {
          await uncompleteGoal(goalId);
          await reload(false);
          return;
        }
        await tapFeedback();
        await completeGoal(goalId);
        const previousStatus = before.dayLog?.status;
        await reload(false);
        const after = get();
        if (goal.kind === 'core') {
          showToast(
            `${completionMessage(after.today, after.progress.completedCore)} +${missionXp(goal)} XP.`,
            'success',
          );
        } else {
          showToast(`Optional win, +${missionXp(goal)} XP.`, 'success');
        }
        if (previousStatus !== 'completed' && after.dayLog?.status === 'completed') {
          await successFeedback();
          showToast(thresholdMessage(after.streak.current), 'success');
        }
        if (after.xp.level > before.xp.level) {
          await successFeedback();
          showToast(`Level ${after.xp.level} — ${after.xp.title}`, 'success');
        }
        const beforeKeys = new Set(before.achievements.filter((a) => a.unlockedAt).map((a) => a.key));
        for (const achievement of after.achievements) {
          if (achievement.unlockedAt && !beforeKeys.has(achievement.key)) {
            showToast(`Milestone: ${achievement.title}`, 'success');
          }
        }
      } catch (error) {
        showToast('That did not save. Please try again.', 'warning');
        set({ error: error instanceof Error ? error.message : 'Goal update failed.' });
      }
    },

    skipGoal: async (goalId, reason) => {
      try {
        await persistSkip(goalId, reason);
        await reload(false);
        showToast('Skipped with a reason. Your day is still valid.', 'info');
      } catch {
        showToast('Could not skip that goal.', 'warning');
      }
    },

    restoreGoal: async (goalId) => {
      try {
        await persistRestore(goalId);
        await reload(false);
      } catch {
        showToast('Could not restore that goal.', 'warning');
      }
    },

    rescheduleGoal: async (goalId, date, time) => {
      try {
        await persistReschedule(goalId, date, time);
        await reload(false);
        showToast('Moved. Plans can change.', 'info');
      } catch {
        showToast('Could not reschedule that goal.', 'warning');
      }
    },

    addGoal: async (input) => {
      try {
        const today = get().today;
        await addManualGoal({
          date: input.date ?? today,
          title: input.title,
          description: input.description,
          category: input.category,
          estMinutes: input.estMinutes,
          scheduledTime: input.scheduledTime,
          kind: input.kind,
        });
        await reload(false);
        showToast('Added to your day.', 'success');
      } catch {
        showToast('Could not add that goal.', 'warning');
      }
    },

    markRest: async (kind) => {
      const { profile, today } = get();
      if (!profile) return;
      try {
        if (kind !== 'none') {
          const days = await getAllDayInputs();
          const allowance = canTakeRecovery(days, today, profile.restDaysPerWeek);
          if (!allowance.allowed) {
            showToast('Recovery day already used this week. Marked anyway — health first.', 'info');
          }
        }
        await setDayRest(today, kind, today, profile.streakThreshold);
        await reload(false);
        const days = await getAllDayInputs();
        const allowance = canTakeRecovery(days, today, profile.restDaysPerWeek);
        if (kind === 'none') showToast('Back to your regular plan.', 'info');
        else showToast(restDayMessage(allowance.used, allowance.limit), 'info');
      } catch {
        showToast('Could not update today.', 'warning');
      }
    },

    saveCheckIn: async (patch) => {
      const { today } = get();
      try {
        const checkIn = await saveCheckIn(today, patch);
        set({ checkIn });
        showToast('Thanks for checking in.', 'success');
      } catch {
        showToast('Could not save your check-in.', 'warning');
      }
    },

    updateProfile: async (patch) => {
      try {
        const next = await persistProfile(patch);
        set({ profile: next });
        if (patch.themeMode) showToast('Appearance updated.', 'info');
      } catch {
        showToast('Could not update your profile.', 'warning');
      }
    },

    setOnline: (online) => set({ isOnline: online }),
    setLastSyncedAt: (value) => set({ lastSyncedAt: value }),

    reloadAchievements: async () => {
      const { today } = get();
      const { all } = await unlockAchievements(today);
      set({ achievements: all });
    },
  };
});
