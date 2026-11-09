import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Plus, Settings2, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import { getDayLogs } from '@/db/repositories/days';
import { getGoalsForRange, completeGoal, uncompleteGoal } from '@/db/repositories/goals';
import { setDayRest } from '@/db/repositories/days';
import { addDays, formatDateKey, nowMinutesInTz, relativeDayLabel } from '@/lib/date';
import { PHASE_LABELS } from '@/lib/phases';
import { missionXp } from '@/lib/xp';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GoalCard } from '@/components/GoalCard';
import { DateCarousel } from '@/components/game/DateCarousel';
import { XpPill } from '@/components/game/XpPill';
import { DayTimeline } from '@/features/schedule/DayTimeline';
import { useDayPlan } from '@/features/schedule/useDayPlan';
import { AddGoalSheet } from '@/features/goals/AddGoalSheet';
import { LoadingState, ErrorState } from '@/components/ui/States';
import type { Goal } from '@/types';

export default function PlanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useAppStore((state) => state.today);
  const todayGoals = useAppStore((state) => state.goals);
  const profile = useAppStore((state) => state.profile);
  const toggleGoal = useAppStore((state) => state.toggleGoal);
  const refreshStore = useAppStore((state) => state.refresh);
  const [selectedDate, setSelectedDate] = useState(today);
  const [addOpen, setAddOpen] = useState(false);
  const plan = useDayPlan(selectedDate);
  const isToday = selectedDate === today;

  const stripStart = addDays(today, -3);
  const stripEnd = addDays(today, 11);
  const strip = useQuery({
    queryKey: ['week-summary', today],
    queryFn: async () => {
      const [logs, weekGoals] = await Promise.all([
        getDayLogs(stripStart, stripEnd),
        getGoalsForRange(stripStart, stripEnd),
      ]);
      return { logs, weekGoals };
    },
    staleTime: 30_000,
  });

  const logsByDate = new Map((strip.data?.logs ?? []).map((log) => [log.date, log]));
  const statuses = Object.fromEntries(
    (strip.data?.logs ?? []).map((log) => [log.date, log.status]),
  );
  const selectedGoals = plan.data?.goals ?? (isToday ? todayGoals : []);
  const timelineGoals = selectedGoals;
  const otherGoals = selectedGoals.filter((goal) => !goal.blockId);
  const restDay = Boolean(plan.data?.dayLog?.isRest || plan.data?.dayLog?.isRecovery);
  const phase = plan.data?.phase;
  const completedMissions = selectedGoals.filter((goal) => goal.status === 'completed').length;
  const availableXp = selectedGoals
    .filter((goal) => goal.status === 'pending')
    .reduce((sum, goal) => sum + missionXp(goal), 0);

  const refreshPlan = async () => {
    await plan.refetch();
    await strip.refetch();
    await refreshStore();
  };

  const toggleSelectedGoal = async (goal: Goal) => {
    if (isToday) {
      await toggleGoal(goal.id);
    } else {
      if (goal.status === 'completed') await uncompleteGoal(goal.id);
      else await completeGoal(goal.id);
    }
    await refreshPlan();
  };

  const toggleRest = async () => {
    if (!profile) return;
    if (isToday) {
      await useAppStore.getState().markRest(restDay ? 'none' : 'rest');
    } else {
      await setDayRest(selectedDate, restDay ? 'none' : 'rest', today, profile.streakThreshold);
    }
    await refreshPlan();
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="caps" color={theme.colors.goldDeep}>
            {isToday ? 'DAILY QUEST BOARD' : 'QUEST ARCHIVE'}
          </AppText>
          <AppText variant="display">
            {isToday ? 'Your missions' : relativeDayLabel(selectedDate, today)}
          </AppText>
          <AppText variant="small" color={theme.colors.textMuted}>
            {formatDateKey(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push('/schedule')}
          accessibilityRole="button"
          accessibilityLabel="Open full schedule"
          style={[styles.iconButton, { backgroundColor: theme.colors.surface }]}
        >
          <CalendarDays size={19} color={theme.colors.primary} />
        </Pressable>
      </View>

      <DateCarousel
        selected={selectedDate}
        today={today}
        onChange={setSelectedDate}
        statuses={statuses}
      />

      {phase ? (
        <Card tone="sage" style={styles.phaseCard}>
          <View style={styles.phaseTop}>
            <View style={[styles.chapterBadge, { backgroundColor: theme.colors.primary }]}>
              <Sparkles size={12} color={theme.colors.gold} />
              <AppText variant="caption" color={theme.colors.primaryText}>
                CHAPTER
              </AppText>
            </View>
            <AppText variant="caption" color={theme.colors.textMuted} style={styles.phaseName}>
              {PHASE_LABELS[phase.id] ?? phase.name}
            </AppText>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/routine-edit',
                  params: { phaseId: phase.id, date: selectedDate },
                })
              }
              style={styles.phaseEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit routine"
            >
              <Settings2 size={13} color={theme.colors.primary} />
              <AppText variant="caption" color={theme.colors.primary}>
                Tune
              </AppText>
            </Pressable>
          </View>
          <AppText variant="bodyStrong">{phase.objective}</AppText>
          <View style={styles.phaseMeta}>
            <AppText variant="caption" color={theme.colors.textMuted}>
              {selectedGoals.length} missions
            </AppText>
            <View style={[styles.metaDot, { backgroundColor: theme.colors.textFaint }]} />
            <AppText variant="caption" color={theme.colors.textMuted}>
              {completedMissions} cleared
            </AppText>
            {availableXp > 0 ? (
              <>
                <View style={[styles.metaDot, { backgroundColor: theme.colors.textFaint }]} />
                <AppText variant="caption" color={theme.colors.goldDeep}>
                  {availableXp} XP available
                </AppText>
              </>
            ) : null}
          </View>
        </Card>
      ) : null}

      {plan.isLoading ? (
        <LoadingState label="Preparing your quests…" />
      ) : plan.isError ? (
        <ErrorState message="Your plan could not load." onRetry={() => plan.refetch()} />
      ) : (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <AppText variant="heading">{isToday ? 'Quest line' : 'Mission log'}</AppText>
              <AppText variant="caption" color={theme.colors.textMuted}>
                Tap a node to open details · tap the circle to clear
              </AppText>
            </View>
            <View style={[styles.progressBadge, { backgroundColor: theme.colors.goldSoft }]}>
              <AppText variant="caption" color={theme.colors.goldDeep}>
                {completedMissions}/{selectedGoals.length}
              </AppText>
            </View>
          </View>
          <View style={styles.timelineSurface}>
            <DayTimeline
              blocks={plan.data?.blocks ?? []}
              goals={timelineGoals}
              dayLog={plan.data?.dayLog ?? null}
              nowMinutes={isToday ? nowMinutesInTz(new Date(), profile?.timezone) : null}
              onToggle={(id) => {
                const goal = selectedGoals.find((item) => item.id === id);
                if (goal) void toggleSelectedGoal(goal);
              }}
              onPressGoal={(id) => router.push(`/goal/${id}`)}
              onRest={restDay ? toggleRest : undefined}
            />
          </View>
        </View>
      )}

      {otherGoals.length ? (
        <View style={styles.section}>
          <SectionHeader title="Side quests" caption="Outside the routine, still part of the day" />
          <Card padded={false} style={styles.listCard}>
            {otherGoals.map((goal) => (
              <View key={goal.id} style={styles.goalWrap}>
                <GoalCard
                  goal={goal}
                  onToggle={() => void toggleSelectedGoal(goal)}
                  onPress={() => router.push(`/goal/${goal.id}`)}
                />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Add a side quest"
          icon={<Plus size={16} color={theme.colors.primaryText} />}
          onPress={() => setAddOpen(true)}
          fullWidth
        />
        {!restDay ? (
          <Button
            label={isToday ? 'Take a rest day' : 'Mark this day as rest'}
            variant="ghost"
            onPress={toggleRest}
            fullWidth
          />
        ) : (
          <View style={styles.restNote}>
            <AppText variant="caption" color={theme.colors.amber}>
              Rest is part of the plan. Your streak is protected.
            </AppText>
            <Pressable onPress={toggleRest} hitSlop={8} accessibilityRole="button">
              <AppText variant="caption" color={theme.colors.primary}>
                Undo
              </AppText>
            </Pressable>
          </View>
        )}
        <View style={styles.quote}>
          <Sparkles size={14} color={theme.colors.sage} />
          <AppText variant="caption" color={theme.colors.textMuted} align="center">
            A plan is a direction, not a test.
          </AppText>
        </View>
      </View>

      <AddGoalSheet
        visible={addOpen}
        date={selectedDate}
        onClose={() => setAddOpen(false)}
        onSaved={refreshPlan}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 8,
  },
  headerText: { flex: 1, gap: 3 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseCard: { gap: 8 },
  phaseTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  chapterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  phaseName: { flex: 1 },
  phaseEdit: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  phaseMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  metaDot: { width: 2.5, height: 2.5, borderRadius: 2 },
  section: { gap: 10 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  progressBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  timelineSurface: {
    backgroundColor: 'transparent',
  },
  listCard: { overflow: 'hidden' },
  goalWrap: { paddingHorizontal: 16 },
  actions: { gap: 8, marginTop: 2 },
  restNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  quote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
});
