import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ChevronRight,
  Dumbbell,
  Flame,
  Footprints,
  Moon,
  ShieldAlert,
  Timer,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { getFitnessStats, getWorkoutLogs } from '@/db/repositories/fitness';
import { addDays, formatDateKey, formatDuration, startOfWeekKey, todayKey, weekdayOfKey } from '@/lib/date';
import { BODY_FAT_NOTE, SAFETY_NOTE, WEEKLY_WORKOUTS, workoutForDate } from '@/lib/fitness';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/States';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const KIND_ICON = {
  run: Footprints,
  walk: Footprints,
  strength: Dumbbell,
  mobility: Activity,
  rest: Moon,
};

export default function FitnessDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const today = todayKey();
  const plan = workoutForDate(today);
  const weekStart = startOfWeekKey(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const data = useQuery({
    queryKey: ['fitness-overview', today],
    queryFn: async () => {
      const [stats, logs] = await Promise.all([
        getFitnessStats(),
        getWorkoutLogs(addDays(today, -29), today),
      ]);
      return { stats, logs };
    },
    staleTime: 15_000,
  });

  const logs = data.data?.logs ?? [];
  const stats = data.data?.stats;
  const loggedDates = new Set(logs.filter((log) => log.completed).map((log) => log.date));
  const todayLog = logs.find((log) => log.date === today && log.completed);
  const todayIcon = KIND_ICON[plan.kind];
  const TodayIcon = todayIcon;

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header title="Fitness" subtitle="Strength, energy, consistency" />

      <Card tone="hero" style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroText}>
            <AppText variant="caps" color={theme.colors.heroMuted}>
              Today · {WEEKDAY_SHORT[weekdayOfKey(today)]}
            </AppText>
            <AppText variant="title" color={theme.colors.heroText}>
              {plan.title}
            </AppText>
            <AppText variant="small" color={theme.colors.heroMuted}>
              {plan.focus}
              {plan.durationMin ? ` · ${formatDuration(plan.durationMin)}` : ''}
            </AppText>
          </View>
          <View style={styles.heroIcon}>
            <TodayIcon size={30} color={theme.colors.sage} strokeWidth={1.7} />
          </View>
        </View>
        <View style={styles.heroFooter}>
          <AppText variant="caption" color={theme.colors.heroMuted}>
            {todayLog ? 'Logged for today. Recovery is part of it.' : 'A short session is enough.'}
          </AppText>
          <Button
            label={todayLog ? 'View or edit log' : plan.kind === 'rest' ? 'Open rest day' : 'Open workout'}
            size="sm"
            variant="soft"
            onPress={() => router.push(`/fitness/${today}`)}
          />
        </View>
      </Card>

      <View style={styles.tiles}>
        <StatTile
          label="This week"
          value={`${stats?.workoutsThisWeek ?? 0}×`}
          hint={formatDuration(stats?.minutesThisWeek ?? 0)}
          icon={<Flame size={15} color={theme.colors.amber} />}
        />
        <StatTile
          label="Last 30 days"
          value={`${stats?.workoutsLast30 ?? 0}×`}
          hint="Sessions logged"
          icon={<TrendingUp size={15} color={theme.colors.sage} />}
        />
        <StatTile
          label="All time"
          value={formatDuration(stats?.totalMinutes ?? 0)}
          hint={
            stats?.totalDistance
              ? `${stats.totalDistance.toFixed(1)} km moved`
              : 'Movement accumulated'
          }
          icon={<Timer size={15} color={theme.colors.sage} />}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="This week"
          caption="Tap any day to open its session"
          actionLabel="Today"
          onAction={() => router.push(`/fitness/${today}`)}
        />
        <Card padded={false} style={styles.weekCard}>
          {weekDates.map((date, index) => {
            const dayPlan = WEEKLY_WORKOUTS[weekdayOfKey(date)];
            const Icon = KIND_ICON[dayPlan.kind];
            const done = loggedDates.has(date);
            const isToday = date === today;
            return (
              <Pressable
                key={date}
                onPress={() => router.push(`/fitness/${date}`)}
                accessibilityRole="button"
                accessibilityLabel={`${formatDateKey(date, { weekday: 'long' })}: ${dayPlan.title}`}
                style={[
                  styles.weekRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  isToday && { backgroundColor: theme.colors.primarySoft },
                ]}
              >
                <View
                  style={[
                    styles.dayBadge,
                    {
                      backgroundColor: done
                        ? theme.colors.primary
                        : isToday
                          ? theme.colors.surface
                          : theme.colors.surfaceMuted,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    color={done ? theme.colors.primaryText : theme.colors.textMuted}
                  >
                    {WEEKDAY_SHORT[weekdayOfKey(date)]}
                  </AppText>
                  <AppText
                    variant="bodyStrong"
                    color={done ? theme.colors.primaryText : theme.colors.text}
                  >
                    {Number(date.slice(8, 10))}
                  </AppText>
                </View>
                <View style={[styles.weekIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Icon size={17} color={dayPlan.kind === 'rest' ? theme.colors.amber : theme.colors.primary} />
                </View>
                <View style={styles.weekText}>
                  <AppText variant="smallStrong" numberOfLines={1}>
                    {dayPlan.title}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                    {dayPlan.durationMin ? `${formatDuration(dayPlan.durationMin)} · ` : ''}
                    {done ? 'Logged' : dayPlan.focus}
                  </AppText>
                </View>
                <ChevronRight size={16} color={theme.colors.textFaint} />
              </Pressable>
            );
          })}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent movement" />
        {data.isLoading ? (
          <LoadingState label="Loading workouts…" />
        ) : logs.length ? (
          <Card padded={false} style={styles.weekCard}>
            {logs.slice(0, 8).map((log, index) => (
              <Pressable
                key={log.id}
                onPress={() => router.push(`/fitness/${log.date}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open workout from ${log.date}`}
                style={[
                  styles.weekRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                ]}
              >
                <View style={styles.weekText}>
                  <AppText variant="smallStrong" numberOfLines={1}>
                    {log.title}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textMuted}>
                    {formatDateKey(log.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {log.durationMin ? ` · ${formatDuration(log.durationMin)}` : ''}
                    {log.distanceKm ? ` · ${log.distanceKm.toFixed(1)} km` : ''}
                  </AppText>
                </View>
                <AppText variant="caption" color={theme.colors.textFaint}>
                  {log.intensity}
                </AppText>
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={<Dumbbell size={22} color={theme.colors.primary} />}
              title="No workouts logged yet"
              message="Open today’s session and log what you actually did. A walk counts."
              actionLabel="Open today’s session"
              onAction={() => router.push(`/fitness/${today}`)}
            />
          </Card>
        )}
      </View>

      <Card tone="amber" style={styles.note}>
        <View style={styles.noteHead}>
          <ShieldAlert size={16} color={theme.colors.amber} />
          <AppText variant="smallStrong">A gentle safety note</AppText>
        </View>
        <AppText variant="caption" color={theme.colors.textMuted}>
          {SAFETY_NOTE}
        </AppText>
      </Card>

      <Card tone="sage" style={styles.note}>
        <View style={styles.noteHead}>
          <Activity size={16} color={theme.colors.primary} />
          <AppText variant="smallStrong">About the belly-fat goal</AppText>
        </View>
        <AppText variant="caption" color={theme.colors.textMuted}>
          {BODY_FAT_NOTE}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  hero: { gap: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroText: { flex: 1, gap: 4 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,23,23,0.08)',
  },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tiles: { flexDirection: 'row', gap: 8 },
  section: { gap: 10 },
  weekCard: { overflow: 'hidden' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11 },
  dayBadge: { width: 40, alignItems: 'center', borderRadius: 10, paddingVertical: 5, gap: 0 },
  weekIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  weekText: { flex: 1, gap: 1 },
  note: { gap: 6 },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
});
