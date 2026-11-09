import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Moon, Plus, Settings2, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import { completeGoal, uncompleteGoal } from '@/db/repositories/goals';
import { setDayRest } from '@/db/repositories/days';
import { todayKey, isValidDateKey, nowMinutesInTz, formatDateKey, relativeDayLabel } from '@/lib/date';
import { PHASE_LABELS } from '@/lib/phases';
import { missionXp } from '@/lib/xp';
import type { Goal } from '@/types';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GoalCard } from '@/components/GoalCard';
import { DateCarousel } from '@/components/game/DateCarousel';
import { DayTimeline } from '@/features/schedule/DayTimeline';
import { useDayPlan } from '@/features/schedule/useDayPlan';
import { AddGoalSheet } from '@/features/goals/AddGoalSheet';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { AppText } from '@/components/ui/AppText';

export default function ScheduleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const today = useAppStore((state) => state.today);
  const profile = useAppStore((state) => state.profile);
  const refreshStore = useAppStore((state) => state.refresh);
  const [date, setDate] = useState(() =>
    params.date && isValidDateKey(params.date) ? params.date : today,
  );
  const [addOpen, setAddOpen] = useState(false);
  const plan = useDayPlan(date);
  const goals = plan.data?.goals ?? [];
  const timelineGoals = goals.filter((goal) => goal.blockId);
  const otherGoals = goals.filter((goal) => !goal.blockId);
  const phase = plan.data?.phase;
  const dayLog = plan.data?.dayLog ?? null;
  const isRest = Boolean(dayLog?.isRest || dayLog?.isRecovery);
  const completed = goals.filter((goal) => goal.status === 'completed').length;
  const availableXp = goals
    .filter((goal) => goal.status === 'pending')
    .reduce((sum, goal) => sum + missionXp(goal), 0);

  useEffect(() => {
    if (params.date && isValidDateKey(params.date)) setDate(params.date);
  }, [params.date]);

  const toggle = async (goal: Goal) => {
    if (goal.status === 'completed') await uncompleteGoal(goal.id);
    else await completeGoal(goal.id);
    await plan.refetch();
    await refreshStore();
  };

  const toggleRest = async () => {
    if (!profile) return;
    await setDayRest(date, isRest ? 'none' : 'rest', todayKey(), profile.streakThreshold);
    await plan.refetch();
    await refreshStore();
  };

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header
        title="Quest map"
        subtitle={phase ? PHASE_LABELS[phase.id] ?? phase.name : undefined}
      />

      <DateCarousel selected={date} today={today} onChange={setDate} past={7} future={14} />

      <View style={styles.dateSummary}>
        <View style={styles.dateSummaryText}>
          <AppText variant="caps" color={theme.colors.goldDeep}>
            {formatDateKey(date, { weekday: 'long' })}
          </AppText>
          <AppText variant="title">{relativeDayLabel(date, today)}</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            {formatDateKey(date, { month: 'long', day: 'numeric', year: 'numeric' })}
          </AppText>
        </View>
        <View style={[styles.scoreCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.scoreTop}>
            <Sparkles size={13} color={theme.colors.goldDeep} />
            <AppText variant="caption" color={theme.colors.textMuted}>
              QUEST SCORE
            </AppText>
          </View>
          <AppText variant="heading">
            {completed}/{goals.length}
          </AppText>
          <AppText variant="caption" color={theme.colors.goldDeep}>
            {availableXp} XP open
          </AppText>
        </View>
      </View>

      <View style={styles.chips}>
        <Chip
          label={isRest ? 'Rest day' : 'Regular day'}
          selected={isRest}
          onPress={toggleRest}
          icon={<Moon size={12} color={isRest ? theme.colors.primary : theme.colors.textMuted} />}
        />
        {date !== today ? <Chip label="Back to today" onPress={() => setDate(today)} /> : null}
      </View>

      {plan.isLoading ? (
        <LoadingState label="Preparing this day…" />
      ) : plan.isError ? (
        <ErrorState message="This day could not load." onRetry={() => plan.refetch()} />
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View>
                <AppText variant="heading">Mission path</AppText>
                <AppText variant="caption" color={theme.colors.textMuted}>
                  Follow the thread from morning to night
                </AppText>
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/routine-edit',
                    params: { phaseId: phase?.id ?? '', date },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Edit this routine"
                style={[styles.mapIcon, { backgroundColor: theme.colors.primarySoft }]}
              >
                <Settings2 size={16} color={theme.colors.primary} />
              </Pressable>
            </View>
            <View style={styles.timelineSurface}>
              <DayTimeline
                blocks={plan.data?.blocks ?? []}
                goals={timelineGoals}
                dayLog={dayLog}
                nowMinutes={date === today ? nowMinutesInTz(new Date(), profile?.timezone) : null}
                onToggle={(id) => {
                  const goal = goals.find((item) => item.id === id);
                  if (goal) void toggle(goal);
                }}
                onPressGoal={(id) => router.push(`/goal/${id}`)}
                onRest={isRest ? toggleRest : undefined}
              />
            </View>
          </View>

          {otherGoals.length ? (
            <View style={styles.section}>
              <SectionHeader title="Side quests" caption="Outside the routine" />
              <View style={styles.sideList}>
                {otherGoals.map((goal) => (
                  <View key={goal.id} style={[styles.sideRow, { backgroundColor: theme.colors.surface }]}>
                    <GoalCard
                      goal={goal}
                      onToggle={() => void toggle(goal)}
                      onPress={() => router.push(`/goal/${goal.id}`)}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}

      <View style={styles.actions}>
        <Button
          label="Add a goal to this day"
          variant="secondary"
          icon={<Plus size={16} color={theme.colors.text} />}
          onPress={() => setAddOpen(true)}
          fullWidth
        />
        {!isRest ? (
          <Button
            label={date === today ? 'Mark today as rest' : 'Mark this day as rest'}
            variant="ghost"
            icon={<Moon size={15} color={theme.colors.textMuted} />}
            onPress={toggleRest}
            fullWidth
          />
        ) : null}
        <AppText variant="caption" color={theme.colors.textFaint} align="center">
          Changes to a routine apply to future days. Past quests stay as they were.
        </AppText>
      </View>

      <AddGoalSheet
        visible={addOpen}
        date={date}
        onClose={() => setAddOpen(false)}
        onSaved={() => plan.refetch()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  dateSummary: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  dateSummaryText: { flex: 1, gap: 2 },
  scoreCard: {
    width: 112,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 11,
    gap: 2,
  },
  scoreTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { gap: 10 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mapIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineSurface: { backgroundColor: 'transparent' },
  sideList: { gap: 8 },
  sideRow: {
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  actions: { gap: 6, marginTop: 4 },
});
