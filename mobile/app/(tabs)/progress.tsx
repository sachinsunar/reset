import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BookOpen,
  CalendarCheck,
  Crown,
  Dumbbell,
  Flame,
  Footprints,
  GraduationCap,
  Layers,
  Sprout,
  Target,
  Timer,
  Trophy,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import { getDayLogs, getDayStatuses } from '@/db/repositories/days';
import { getSubjects, getTopics, getAcademicStats } from '@/db/repositories/academic';
import { getFitnessStats } from '@/db/repositories/fitness';
import { getFocusStats } from '@/db/repositories/focus';
import { getLearningStats } from '@/db/repositories/learning';
import { addDays, formatDuration, weekdayOfKey } from '@/lib/date';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { BarChart } from '@/components/BarChart';
import { Heatmap } from '@/components/Heatmap';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { GameProgressBar } from '@/components/game/GameProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/States';

const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  sprout: Sprout,
  'calendar-check': CalendarCheck,
  layers: Layers,
  'book-open': BookOpen,
  activity: Activity,
  'graduation-cap': GraduationCap,
};

export default function ProgressScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useAppStore((state) => state.today);
  const profile = useAppStore((state) => state.profile);
  const streak = useAppStore((state) => state.streak);
  const xp = useAppStore((state) => state.xp);
  const achievements = useAppStore((state) => state.achievements);

  const heatStart = addDays(today, -83);
  const weekStart = addDays(today, -6);
  const overview = useQuery({
    queryKey: ['progress-overview', today],
    queryFn: async () => {
      const [statuses, logs, academic, fitness, focus, learning, subjects, topics] =
        await Promise.all([
          getDayStatuses(heatStart, today),
          getDayLogs(weekStart, today),
          getAcademicStats(),
          getFitnessStats(),
          getFocusStats(),
          getLearningStats(),
          getSubjects(),
          getTopics(),
        ]);
      return { statuses, logs, academic, fitness, focus, learning, subjects, topics };
    },
    staleTime: 30_000,
  });

  const statuses = useMemoStatuses(overview.data?.statuses, today);
  const logsByDate = new Map((overview.data?.logs ?? []).map((log) => [log.date, log]));
  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const log = logsByDate.get(date);
    const percent = log ? Math.round(log.percent * 100) : 0;
    return {
      label: WEEKDAY_SHORT[weekdayOfKey(date)],
      value: percent,
      display: `${percent}%`,
    };
  });

  const data = overview.data;
  const subjectRows = (data?.subjects ?? []).map((subject) => {
    const subjectTopics = (data?.topics ?? []).filter((topic) => topic.subjectId === subject.id);
    const complete = subjectTopics.filter((topic) => topic.status === 'completed').length;
    const weekly = data?.academic.bySubject.find((row) => row.subjectId === subject.id);
    return {
      subject,
      total: subjectTopics.length,
      complete,
      minutes: weekly?.minutes ?? 0,
    };
  });
  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color={theme.colors.textMuted}>
            Patterns, not scores
          </AppText>
          <AppText variant="display">Progress</AppText>
        </View>
        <View style={[styles.trophy, { backgroundColor: theme.colors.amberSoft }]}>
          <Trophy size={18} color={theme.colors.amber} />
        </View>
      </View>

      <Card tone="hero" style={styles.hero}>
        <View style={styles.levelRow}>
          <View style={styles.levelLabel}>
            <Crown size={15} color={theme.colors.purpleDeep} />
            <AppText variant="caps" color={theme.colors.purpleDeep}>
              LEVEL {xp.level} · {xp.title.toUpperCase()}
            </AppText>
          </View>
          <AppText variant="caption" color={theme.colors.heroMuted}>
            {xp.totalXp} XP
          </AppText>
        </View>
        <GameProgressBar
          progress={xp.progress}
          color={theme.colors.purple}
          trackColor="rgba(23,23,23,0.14)"
          height={8}
        />
        <View style={styles.heroRow}>
          <View style={styles.heroText}>
            <AppText variant="caps" color={theme.colors.heroMuted}>
              Current streak
            </AppText>
            <View style={styles.streakRow}>
              <Flame size={26} color={theme.colors.amber} />
              <AppText variant="display" color={theme.colors.heroText}>
                {streak.current}
              </AppText>
              <AppText variant="small" color={theme.colors.heroMuted}>
                {streak.current === 1 ? 'day' : 'days'}
              </AppText>
            </View>
            <AppText variant="small" color={theme.colors.heroMuted}>
              {streak.current === 0
                ? 'Every pattern starts with one day. Today is available.'
                : streak.longest > streak.current
                  ? `Your longest run is ${streak.longest} days.`
                  : 'This is your longest run so far.'}
            </AppText>
          </View>
          <Target size={42} color="rgba(122,40,168,0.28)" strokeWidth={1.4} />
        </View>
        <View style={styles.heroStats}>
          <HeroStat label="This week" value={`${Math.round(streak.weekPercent * 100)}%`} />
          <View style={styles.heroDivider} />
          <HeroStat label="This month" value={`${Math.round(streak.monthPercent * 100)}%`} />
          <View style={styles.heroDivider} />
          <HeroStat label="Days counted" value={String(streak.totalCompleted)} />
        </View>
      </Card>

      <View style={styles.tiles}>
        <StatTile
          label="Study this week"
          value={formatDuration(data?.academic.minutesWeek ?? 0)}
          hint={`${data?.academic.sessionsTotal ?? 0} sessions total`}
          icon={<BookOpen size={15} color={theme.colors.sage} />}
        />
        <StatTile
          label="Focus this week"
          value={formatDuration(data?.focus.minutesWeek ?? 0)}
          hint={`${data?.focus.totalSessions ?? 0} sessions`}
          icon={<Timer size={15} color={theme.colors.sage} />}
        />
        <StatTile
          label="Movement"
          value={`${data?.fitness.workoutsThisWeek ?? 0}×`}
          hint={`${Math.round(data?.fitness.minutesThisWeek ?? 0)} min this week`}
          icon={<Dumbbell size={15} color={theme.colors.sage} />}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Last 7 days"
          caption="Day completion against your threshold"
        />
        <Card style={styles.card}>
          <BarChart data={weekBars} maxValue={100} unit="%" height={104} />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Consistency"
          caption="Last 12 weeks · rest days are protected"
        />
        <Card style={styles.card}>
          <Heatmap statuses={statuses} start={heatStart} end={today} />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Syllabus progress"
          actionLabel="Open academic"
          onAction={() => router.push('/academic')}
        />
        <Card style={styles.card}>
          {overview.isLoading ? (
            <LoadingState label="Loading subjects…" />
          ) : subjectRows.length ? (
            subjectRows.map((row, index) => {
              const syllabusPercent = row.total ? row.complete / row.total : 0;
              return (
                <Pressable
                  key={row.subject.id}
                  onPress={() => router.push(`/academic/subject/${row.subject.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${row.subject.name}`}
                  style={[
                    styles.subjectRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.subjectTop}>
                    <View style={[styles.subjectDot, { backgroundColor: row.subject.color }]} />
                    <AppText variant="bodyStrong" style={styles.subjectName} numberOfLines={1}>
                      {row.subject.name}
                    </AppText>
                    <AppText variant="caption" color={theme.colors.textMuted}>
                      {row.total ? `${row.complete}/${row.total} topics` : 'No topics yet'}
                    </AppText>
                  </View>
                  <ProgressBar
                    progress={syllabusPercent}
                    color={row.subject.color}
                    height={7}
                  />
                  <View style={styles.subjectMeta}>
                    <AppText variant="caption" color={theme.colors.textFaint}>
                      {Math.round(row.subject.allocation * 100)}% study share
                    </AppText>
                    <AppText variant="caption" color={theme.colors.textFaint}>
                      {row.minutes ? `${formatDuration(row.minutes)} this week` : 'No study logged this week'}
                    </AppText>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <EmptyState
              icon={<GraduationCap size={22} color={theme.colors.primary} />}
              title="No subjects yet"
              message="Add subjects in Academic to begin tracking syllabus progress."
              actionLabel="Open academic"
              onAction={() => router.push('/academic')}
            />
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Milestones"
          caption={`${unlockedCount} of ${achievements.length} unlocked`}
        />
        <View style={styles.badges}>
          {achievements.map((achievement) => {
            const Icon = ACHIEVEMENT_ICONS[achievement.icon] ?? Trophy;
            const unlocked = Boolean(achievement.unlockedAt);
            return (
              <View
                key={achievement.key}
                style={[
                  styles.badge,
                  {
                    backgroundColor: unlocked ? theme.colors.surface : theme.colors.surfaceMuted,
                    borderColor: unlocked ? theme.colors.sage : theme.colors.border,
                    opacity: unlocked ? 1 : 0.72,
                  },
                ]}
              >
                <View
                  style={[
                    styles.badgeIcon,
                    { backgroundColor: unlocked ? theme.colors.primarySoft : theme.colors.surfaceStrong },
                  ]}
                >
                  <Icon
                    size={18}
                    color={unlocked ? theme.colors.primary : theme.colors.textFaint}
                    strokeWidth={1.8}
                  />
                </View>
                <AppText variant="smallStrong" numberOfLines={2}>
                  {achievement.title}
                </AppText>
                <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={2}>
                  {achievement.description}
                </AppText>
                {unlocked ? (
                  <AppText variant="caption" color={theme.colors.primary}>
                    Unlocked
                  </AppText>
                ) : (
                  <AppText variant="caption" color={theme.colors.textFaint}>
                    In progress
                  </AppText>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <Card tone="sage" style={styles.reflectionCard}>
        <AppText variant="caption" color={theme.colors.textMuted}>
          A gentler measure
        </AppText>
        <AppText variant="bodyStrong">
          {streak.current >= 7
            ? 'Consistency is becoming a habit. Keep the bar low enough to stay kind.'
            : (data?.learning.currentStreak ?? 0) > 0
              ? 'You are returning to your project regularly. Repetition is doing its quiet work.'
              : 'The goal is not a perfect record. It is coming back.'}
        </AppText>
        <AppText variant="caption" color={theme.colors.textMuted}>
          Threshold: {Math.round((profile?.streakThreshold ?? 0.7) * 100)}% of essential goals ·{' '}
          {profile?.restDaysPerWeek ?? 1} flexible rest day
          {(profile?.restDaysPerWeek ?? 1) === 1 ? '' : 's'} each week
        </AppText>
      </Card>
    </Screen>
  );
}

function useMemoStatuses(
  statuses: Record<string, string> | undefined,
  today: string,
): Record<string, 'completed' | 'partial' | 'rest' | 'recovery' | 'missed' | 'future' | 'none'> {
  const result: Record<
    string,
    'completed' | 'partial' | 'rest' | 'recovery' | 'missed' | 'future' | 'none'
  > = {};
  const start = addDays(today, -83);
  for (let i = 0; i < 84; i++) {
    const date = addDays(start, i);
    if (date > today) result[date] = 'future';
    else {
      const status = statuses?.[date];
      result[date] =
        status === 'completed' ||
        status === 'partial' ||
        status === 'rest' ||
        status === 'recovery' ||
        status === 'missed'
          ? status
          : 'none';
    }
  }
  return result;
}

function HeroStat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.heroStat}>
      <AppText variant="heading" color={theme.colors.heroText}>
        {value}
      </AppText>
      <AppText variant="caption" color={theme.colors.heroMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  trophy: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 14 },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  levelLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroText: { flex: 1, gap: 5 },
  streakRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, gap: 1 },
  heroDivider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: 'rgba(23,23,23,0.16)' },
  tiles: { flexDirection: 'row', gap: 8 },
  section: { gap: 10 },
  card: { gap: 12 },
  subjectRow: { gap: 7, paddingVertical: 10 },
  subjectTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  subjectDot: { width: 8, height: 8, borderRadius: 4 },
  subjectName: { flex: 1 },
  subjectMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 13,
    gap: 4,
  },
  badgeIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  reflectionCard: { gap: 5 },
});
