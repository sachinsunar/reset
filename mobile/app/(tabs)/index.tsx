import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Flame,
  ListChecks,
  Moon,
  NotebookPen,
  Sparkles,
  Timer,
  type LucideIcon,
} from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GoalCard } from '@/components/GoalCard';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/States';
import { GameProgressBar } from '@/components/game/GameProgressBar';
import { CategoryIcon, CATEGORY_META } from '@/components/CategoryIcon';
import { ResetMascot, type MascotMood } from '@/components/mascot/ResetMascot';
import { CurrentFocusCard } from '@/components/home/CurrentFocusCard';
import { DayTimeline } from '@/features/schedule/DayTimeline';
import { useDayPlan } from '@/features/schedule/useDayPlan';
import {
  formatDateKey,
  formatDuration,
  formatTime12h,
  greetingFor,
  nowMinutesInTz,
} from '@/lib/date';
import { dailyMessage } from '@/lib/motivation';
import { PHASE_LABELS } from '@/lib/phases';
import { buildScheduleItems, type ScheduleItem } from '@/lib/schedule';
import { findConflicts, selectRoutineFocus } from '@/lib/routineSchedule';
import { selectionFeedback } from '@/lib/haptics';
import type { EnergyLevel, MoodLevel, SleepQuality } from '@/types';

const ENERGY: { label: string; value: EnergyLevel }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Okay', value: 'okay' },
  { label: 'Good', value: 'good' },
  { label: 'Great', value: 'excellent' },
];
const MOOD: { label: string; value: MoodLevel }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Good', value: 'good' },
  { label: 'Great', value: 'great' },
];
const SLEEP: { label: string; value: SleepQuality }[] = [
  { label: 'Poor', value: 'poor' },
  { label: 'Okay', value: 'okay' },
  { label: 'Good', value: 'good' },
];

const QUICK_ACTIONS: { label: string; Icon: LucideIcon; route: Href; color: string }[] = [
  { label: 'Focus', Icon: Timer, route: '/focus', color: '#7A28A8' },
  { label: 'Workout', Icon: Dumbbell, route: '/fitness', color: '#007F7D' },
  {
    label: 'Note',
    Icon: NotebookPen,
    route: { pathname: '/(tabs)/journal', params: { mode: 'note' } },
    color: '#7A6500',
  },
  { label: 'Plan', Icon: CalendarDays, route: '/schedule', color: '#7A28A8' },
];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const profile = useAppStore((state) => state.profile);
  const today = useAppStore((state) => state.today);
  const storeGoals = useAppStore((state) => state.goals);
  const storeDayLog = useAppStore((state) => state.dayLog);
  const progress = useAppStore((state) => state.progress);
  const streak = useAppStore((state) => state.streak);
  const activePhase = useAppStore((state) => state.activePhase);
  const xp = useAppStore((state) => state.xp);
  const checkIn = useAppStore((state) => state.checkIn);
  const toggleGoal = useAppStore((state) => state.toggleGoal);
  const markRest = useAppStore((state) => state.markRest);
  const saveCheckIn = useAppStore((state) => state.saveCheckIn);

  const plan = useDayPlan(today);
  const [now, setNow] = useState(() => nowMinutesInTz(new Date(), profile?.timezone));
  const [reaction, setReaction] = useState<MascotMood | null>('newday');
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNow(nowMinutesInTz(new Date(), profile?.timezone));
    const timer = setInterval(() => {
      setNow(nowMinutesInTz(new Date(), profile?.timezone));
    }, 30_000);
    return () => clearInterval(timer);
  }, [profile?.timezone]);

  useEffect(() => {
    reactAfterMoment('newday');
    return () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reactAfterMoment(mood: MascotMood) {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setReaction(mood);
    reactionTimer.current = setTimeout(() => setReaction(null), 2600);
  }

  const goals = plan.data?.goals ?? storeGoals;
  const blocks = plan.data?.blocks ?? [];
  const dayLog = plan.data?.dayLog ?? storeDayLog;
  const isRest = Boolean(dayLog?.isRest || dayLog?.isRecovery);
  const isExam = activePhase?.id === 'exam';
  const firstName = profile?.name?.split(' ')[0] || 'Friend';
  const message = dailyMessage({
    dateKey: today,
    percent: progress.corePercent,
    streak: streak.current,
    isRest,
    isExamPhase: isExam,
  });
  const phaseLabel = activePhase ? PHASE_LABELS[activePhase.id] ?? activePhase.name : 'Plan not active';
  const showCheckIn = !checkIn || !checkIn.mood || !checkIn.energy || !checkIn.sleep;

  const timelineGoals = goals.filter((goal) => goal.blockId);
  const otherGoals = goals.filter((goal) => !goal.blockId);
  const items = useMemo(
    () => buildScheduleItems(blocks, timelineGoals, now),
    [blocks, timelineGoals, now],
  );
  const focus = useMemo(
    () => selectRoutineFocus(items, now, isRest),
    [items, now, isRest],
  );
  const blockConflicts = useMemo(() => findConflicts(blocks), [blocks]);
  const trackableItems = items.filter((item) => item.trackable);
  const allDone =
    !isRest &&
    trackableItems.length > 0 &&
    trackableItems.every((item) => item.state === 'completed' || item.state === 'skipped');
  const mascotMood: MascotMood =
    reaction ?? (allDone ? 'celebrate' : focus.kind === 'overdue' ? 'support' : 'idle');
  const mascotSize = width < 370 ? 82 : 96;
  const nextLevelLabel = xp.nextLevelXp ? `${xp.totalXp} / ${xp.nextLevelXp} XP` : `${xp.totalXp} XP`;

  const handleToggle = async (goalId: string) => {
    const goal = goals.find((item) => item.id === goalId);
    await toggleGoal(goalId);
    await plan.refetch();
    if (goal?.status !== 'completed') reactAfterMoment('celebrate');
  };

  const handleRest = async () => {
    await markRest(isRest ? 'none' : 'rest');
    await plan.refetch();
  };

  const startFocus = (item: ScheduleItem) => {
    selectionFeedback();
    router.push({
      pathname: '/focus',
      params: {
        label: item.title,
        subject: item.category === 'study' ? 'auto' : '',
      },
    });
  };

  const openGoal = (goalId: string) => router.push(`/goal/${goalId}`);
  const openTimeline = () => router.push('/schedule');
  const editRoutine = () => {
    selectionFeedback();
    router.push({
      pathname: '/routine-edit',
      params: { phaseId: plan.data?.phase?.id ?? activePhase?.id ?? '', date: today },
    });
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <View style={styles.datePill}>
          <View style={[styles.dateDot, { backgroundColor: theme.colors.purple }]} />
          <AppText variant="caps" color={theme.colors.purpleDeep}>
            {formatDateKey(today, { weekday: 'long', month: 'long', day: 'numeric' })}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/(tabs)/profile')}
          style={[styles.avatar, { backgroundColor: theme.colors.yellow, borderColor: theme.colors.text }]}
        >
          <AppText variant="smallStrong" style={styles.avatarText}>
            {firstName.slice(0, 1).toUpperCase()}
          </AppText>
          <View style={[styles.avatarSpark, { backgroundColor: theme.colors.purple }]} />
        </Pressable>
      </View>

      <View style={styles.greetingRow}>
        <View style={styles.greetingText}>
          <AppText variant="display">
            {greetingFor(new Date(), profile?.timezone)}, {firstName}.
          </AppText>
          <AppText variant="small" color={theme.colors.textMuted}>
            {message}
          </AppText>
          <View style={styles.chipRow}>
            <View style={[styles.phaseChip, { backgroundColor: theme.colors.lavender }]}>
              <View style={[styles.phaseDot, { backgroundColor: activePhase?.color ?? theme.colors.turquoise }]} />
              <AppText variant="caption" color={theme.colors.purpleDeep} numberOfLines={1}>
                {phaseLabel}
              </AppText>
            </View>
            {streak.current > 0 ? (
              <View style={[styles.phaseChip, { backgroundColor: theme.colors.yellowSoft }]}>
                <Flame size={12} color={theme.colors.yellowDeep} />
                <AppText variant="caption" color={theme.colors.yellowDeep}>
                  {streak.current} day streak
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.mascotWrap}>
          <ResetMascot size={mascotSize} mood={mascotMood} />
          <View style={[styles.mascotNote, { backgroundColor: theme.colors.surface }]}>
            <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
              {focus.kind === 'overdue'
                ? 'No rush. Pick one small step.'
                : allDone
                  ? 'We did it!'
                  : 'One block at a time.'}
            </AppText>
          </View>
        </View>
      </View>

      <OfflineBanner />

      <View
        style={[
          styles.progressCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.progressTop}>
          <View style={styles.progressText}>
            <AppText variant="caps" color={theme.colors.purpleDeep}>
              YOUR MOMENTUM
            </AppText>
            <AppText variant="heading">
              {progress.completedAll} of {progress.totalAll} wins today
            </AppText>
          </View>
          <View style={[styles.levelPill, { backgroundColor: theme.colors.yellow }]}>
            <Sparkles size={13} color={theme.colors.purpleDeep} />
            <AppText variant="smallStrong" color={theme.colors.text}>
              LVL {xp.level}
            </AppText>
          </View>
        </View>
        <GameProgressBar
          progress={progress.allPercent}
          color={theme.colors.purple}
          trackColor={theme.colors.yellowSoft}
          height={11}
        />
        <View style={styles.progressStats}>
          <MiniStat label="Today" value={`+${xp.todayXp} XP`} />
          <View style={[styles.progressDivider, { backgroundColor: theme.colors.border }]} />
          <MiniStat label="Next level" value={nextLevelLabel} />
          <View style={[styles.progressDivider, { backgroundColor: theme.colors.border }]} />
          <MiniStat label="Streak" value={`${streak.current}d`} />
        </View>
      </View>

      {blockConflicts.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fix overlapping routine blocks"
          onPress={editRoutine}
          style={[styles.conflictBanner, { backgroundColor: theme.colors.errorSoft }]}
        >
          <AlertTriangle size={17} color={theme.colors.error} />
          <View style={styles.conflictText}>
            <AppText variant="smallStrong" color={theme.colors.error}>
              Schedule needs a small fix
            </AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              {blockConflicts.length === 1
                ? 'Two blocks overlap. Open the editor to rearrange them.'
                : `${blockConflicts.length} block overlaps need a quick rearrange.`}
            </AppText>
          </View>
          <ChevronRight size={17} color={theme.colors.error} />
        </Pressable>
      ) : null}

      {plan.isLoading && !plan.data ? (
        <LoadingState label="Setting the stage for today…" />
      ) : (
        <CurrentFocusCard
          focus={focus}
          onStart={startFocus}
          onComplete={(goalId) => void handleToggle(goalId)}
          onOpen={openGoal}
          onTimeline={openTimeline}
        />
      )}

      {focus.next ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Up next: ${focus.next.title}`}
          disabled={!focus.next.goalId}
          onPress={() => focus.next?.goalId && openGoal(focus.next.goalId)}
          style={({ pressed }) => [
            styles.upNext,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: pressed && focus.next?.goalId ? 0.75 : 1,
            },
          ]}
        >
          <View style={[styles.upNextIcon, { backgroundColor: theme.colors.turquoiseSoft }]}>
            <CategoryIcon category={focus.next.category} size={18} boxSize={38} />
          </View>
          <View style={styles.upNextText}>
            <AppText variant="caps" color={theme.colors.sage}>
              UP NEXT
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {focus.next.title}
            </AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              {focus.next.timeLabel} · {formatDuration(Math.max(0, focus.next.endMinutes - focus.next.startMinutes))}
              {' · '}
              {CATEGORY_META[focus.next.category].label}
            </AppText>
          </View>
          <ChevronRight size={18} color={theme.colors.textFaint} />
        </Pressable>
      ) : null}

      {isRest ? (
        <Card tone="sage" style={styles.restCard}>
          <Moon size={18} color={theme.colors.sage} />
          <View style={styles.restText}>
            <AppText variant="smallStrong">A rest day is still a valid day.</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              Optional blocks can still be done, but nothing is required today.
            </AppText>
          </View>
          <Pressable onPress={() => void handleRest()} hitSlop={8} accessibilityRole="button">
            <AppText variant="caption" color={theme.colors.primary}>
              Undo
            </AppText>
          </Pressable>
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title="Today’s timeline"
          caption={`${items.length} blocks · tap a checkbox to keep your progress`}
          actionLabel="Edit routine"
          onAction={editRoutine}
        />
        <View style={[styles.timelineSurface, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <DayTimeline
            blocks={blocks}
            goals={timelineGoals}
            dayLog={dayLog}
            nowMinutes={now}
            onToggle={(id) => void handleToggle(id)}
            onPressGoal={openGoal}
            onRest={() => void handleRest()}
          />
        </View>
        <View style={styles.timelineActions}>
          <Pressable
            onPress={editRoutine}
            accessibilityRole="button"
            style={[styles.timelineAction, { backgroundColor: theme.colors.primary }]}
          >
            <ListChecks size={15} color={theme.colors.primaryText} />
            <AppText variant="smallStrong" color={theme.colors.primaryText}>
              Rearrange the day
            </AppText>
          </Pressable>
          {otherGoals.length ? (
            <Pressable
              onPress={() => router.push('/(tabs)/plan')}
              accessibilityRole="button"
              style={[styles.timelineActionGhost, { borderColor: theme.colors.borderStrong }]}
            >
              <AppText variant="smallStrong">Side quests {otherGoals.length}</AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Quick moves" caption="The tools you reach for most" />
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => {
                selectionFeedback();
                router.push(action.route);
              }}
              style={({ pressed }) => [
                styles.quick,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.quickIcon, { backgroundColor: `${action.color}18` }]}>
                <action.Icon size={19} color={action.color} strokeWidth={2} />
              </View>
              <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                {action.label}
              </AppText>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRest ? 'Undo rest day' : 'Mark today as rest'}
            onPress={() => {
              selectionFeedback();
              void handleRest();
            }}
            style={({ pressed }) => [
              styles.quick,
              {
                backgroundColor: isRest ? theme.colors.yellowSoft : theme.colors.surface,
                borderColor: isRest ? theme.colors.yellowDeep : theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={[styles.quickIcon, { backgroundColor: theme.colors.lavender }]}>
              <Moon size={19} color={theme.colors.purpleDeep} strokeWidth={2} />
            </View>
            <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
              {isRest ? 'Rest on' : 'Rest'}
            </AppText>
          </Pressable>
        </View>
      </View>

      {otherGoals.length ? (
        <View style={styles.section}>
          <SectionHeader
            title="Side quests"
            caption="Small extras outside the routine"
            actionLabel={`All ${otherGoals.length}`}
            onAction={() => router.push('/(tabs)/plan')}
          />
          <View style={styles.sideList}>
            {otherGoals.slice(0, 4).map((goal) => (
              <View key={goal.id} style={[styles.sideRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <GoalCard
                  goal={goal}
                  onToggle={() => void handleToggle(goal.id)}
                  onPress={() => openGoal(goal.id)}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {showCheckIn ? (
        <Card style={styles.checkInCard}>
          <View style={styles.checkInHeader}>
            <View style={[styles.checkInIcon, { backgroundColor: theme.colors.yellowSoft }]}>
              <Sparkles size={16} color={theme.colors.yellowDeep} />
            </View>
            <View style={styles.checkInText}>
              <AppText variant="bodyStrong">How are you arriving today?</AppText>
              <AppText variant="caption" color={theme.colors.textMuted}>
                Optional. A quick check-in helps you notice patterns without judgement.
              </AppText>
            </View>
          </View>
          <CheckInRow
            label="Energy"
            options={ENERGY}
            value={checkIn?.energy ?? null}
            onChange={(value) => void saveCheckIn({ energy: value })}
          />
          <CheckInRow
            label="Mood"
            options={MOOD}
            value={checkIn?.mood ?? null}
            onChange={(value) => void saveCheckIn({ mood: value })}
          />
          <CheckInRow
            label="Sleep"
            options={SLEEP}
            value={checkIn?.sleep ?? null}
            onChange={(value) => void saveCheckIn({ sleep: value })}
          />
        </Card>
      ) : null}

      <View style={styles.footerNote}>
        <CalendarDays size={14} color={theme.colors.textFaint} />
        <AppText variant="caption" color={theme.colors.textFaint}>
          Your day is editable. Your history stays yours.
        </AppText>
      </View>
    </Screen>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.miniStat}>
      <AppText variant="smallStrong" numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="caption" color={theme.colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

function CheckInRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.checkRow}>
      <AppText variant="caption" color={theme.colors.textMuted} style={styles.checkLabel}>
        {label}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            size="sm"
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateDot: { width: 7, height: 7, borderRadius: 99 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
  },
  avatarText: { fontSize: 17, lineHeight: 21 },
  avatarSpark: { position: 'absolute', width: 8, height: 8, borderRadius: 99, right: -3, top: -3 },
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  greetingText: { flex: 1, gap: 5, paddingTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  phaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 210,
  },
  phaseDot: { width: 6, height: 6, borderRadius: 3 },
  mascotWrap: { alignItems: 'center', gap: 1, marginTop: -6 },
  mascotNote: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(23,23,23,0.08)' },
  progressCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 15,
    gap: 10,
    shadowColor: '#171717',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { flex: 1, gap: 1 },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  progressStats: { flexDirection: 'row', alignItems: 'center' },
  miniStat: { flex: 1, alignItems: 'center', gap: 1 },
  progressDivider: { width: StyleSheet.hairlineWidth, height: 24 },
  upNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  upNextIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  upNextText: { flex: 1, gap: 1 },
  restCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  restText: { flex: 1, gap: 2 },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 18,
    padding: 13,
  },
  conflictText: { flex: 1, gap: 2 },
  section: { gap: 10 },
  timelineSurface: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    overflow: 'hidden',
  },
  timelineActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  timelineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 38,
  },
  timelineActionGhost: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: { flexDirection: 'row', gap: 7 },
  quick: {
    flex: 1,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sideList: { gap: 8 },
  sideRow: { borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 13 },
  checkInCard: { gap: 12 },
  checkInHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkInIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkInText: { flex: 1, gap: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkLabel: { width: 44 },
  chips: { gap: 6 },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
});
