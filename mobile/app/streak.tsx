import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Flame, LifeBuoy, Trophy } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import { getAllDayInputs, getDayStatuses } from '@/db/repositories/days';
import {
  addDays,
  formatMonth,
  monthGridRange,
  todayKey,
  weekdayOfKey,
} from '@/lib/date';
import { canTakeRecovery } from '@/lib/streak';
import type { DayStatus } from '@/types';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { LoadingState } from '@/components/ui/States';

const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StreakScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = todayKey();
  const profile = useAppStore((state) => state.profile);
  const streak = useAppStore((state) => state.streak);
  const [monthKey, setMonthKey] = useState(today.slice(0, 7));

  const range = monthGridRange(`${monthKey}-01`);
  const data = useQuery({
    queryKey: ['streak-calendar', monthKey, today],
    queryFn: async () => {
      const [statuses, inputs] = await Promise.all([
        getDayStatuses(range.start, range.end),
        getAllDayInputs(),
      ]);
      return {
        statuses,
        allowance: canTakeRecovery(inputs, today, profile?.restDaysPerWeek ?? 1),
      };
    },
    staleTime: 20_000,
  });

  const cells: (string | null)[] = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    cells.push(cursor);
    cursor = addDays(cursor, 1);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const statusColor = (status: DayStatus | undefined): string => {
    switch (status) {
      case 'completed':
        return theme.colors.primary;
      case 'partial':
        return theme.colors.heat2;
      case 'rest':
      case 'recovery':
        return theme.colors.amber;
      case 'missed':
        return theme.colors.heat1;
      default:
        return 'transparent';
    }
  };

  const monthLabel = formatMonth(`${monthKey}-01`);

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header title="Streak calendar" subtitle="Consistency with room for life" />

      <View style={styles.tiles}>
        <StatTile
          label="Current"
          value={`${streak.current}d`}
          hint="Keep the bar kind"
          icon={<Flame size={15} color={theme.colors.amber} />}
        />
        <StatTile
          label="Longest"
          value={`${streak.longest}d`}
          hint="Your best run"
          icon={<Trophy size={15} color={theme.colors.sage} />}
        />
        <StatTile
          label="Days counted"
          value={`${streak.totalCompleted}`}
          hint="All time"
          icon={<LifeBuoy size={15} color={theme.colors.sage} />}
        />
      </View>

      <Card style={styles.weekRow}>
        <View style={styles.weekStat}>
          <AppText variant="heading">{Math.round(streak.weekPercent * 100)}%</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            this week
          </AppText>
        </View>
        <View style={styles.divider} />
        <View style={styles.weekStat}>
          <AppText variant="heading">{Math.round(streak.monthPercent * 100)}%</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            this month
          </AppText>
        </View>
        <View style={styles.divider} />
        <View style={styles.weekStat}>
          <AppText variant="heading">
            {data.data?.allowance.used ?? 0}/{data.data?.allowance.limit ?? profile?.restDaysPerWeek ?? 1}
          </AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            rest days used
          </AppText>
        </View>
      </Card>

      <Card style={styles.calendar}>
        <View style={styles.calendarHead}>
          <Pressable
            onPress={() => setMonthKey(addDays(`${monthKey}-01`, -1).slice(0, 7))}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={[styles.arrow, { backgroundColor: theme.colors.surfaceMuted }]}
          >
            <ChevronLeft size={18} color={theme.colors.text} />
          </Pressable>
          <View style={styles.monthText}>
            <AppText variant="heading">{monthLabel}</AppText>
            <Pressable onPress={() => setMonthKey(today.slice(0, 7))} hitSlop={8}>
              <AppText variant="caption" color={theme.colors.primary}>
                Back to this month
              </AppText>
            </Pressable>
          </View>
          <Pressable
            onPress={() => setMonthKey(addDays(`${monthKey}-01`, 32).slice(0, 7))}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={[styles.arrow, { backgroundColor: theme.colors.surfaceMuted }]}
          >
            <ChevronRight size={18} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={styles.weekdays}>
          {WEEKDAY.map((day) => (
            <View key={day} style={styles.weekdayCell}>
              <AppText variant="caption" color={theme.colors.textFaint}>
                {day.slice(0, 1)}
              </AppText>
            </View>
          ))}
        </View>

        {data.isLoading ? (
          <LoadingState label="Loading calendar…" />
        ) : (
          <View style={styles.grid}>
            {cells.map((date, index) => {
              if (!date) return <View key={`blank-${index}`} style={styles.dayCell} />;
              const status = data.data?.statuses[date];
              const isToday = date === today;
              const isFuture = date > today;
              const color = statusColor(status);
              const inMonth = date.slice(0, 7) === monthKey;
              return (
                <Pressable
                  key={date}
                  onPress={() =>
                    router.push({ pathname: '/schedule', params: { date } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${date}: ${status ?? 'no entry'}`}
                  style={[
                    styles.dayCell,
                    {
                      borderColor: isToday ? theme.colors.primary : 'transparent',
                      opacity: inMonth ? 1 : 0.35,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dayInner,
                      {
                        backgroundColor:
                          color === 'transparent'
                            ? theme.colors.surfaceMuted
                            : `${color}${status === 'partial' ? 'AA' : 'D9'}`,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={
                        status === 'completed'
                          ? theme.colors.primaryText
                          : status === 'missed'
                            ? theme.colors.textMuted
                            : theme.colors.text
                      }
                    >
                      {Number(date.slice(8, 10))}
                    </AppText>
                  </View>
                  {isFuture ? (
                    <View style={[styles.futureDot, { backgroundColor: theme.colors.border }]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.legend}>
          <Legend color={theme.colors.primary} label="Complete" />
          <Legend color={theme.colors.heat2} label="Partial" />
          <Legend color={theme.colors.amber} label="Rest" />
          <Legend color={theme.colors.heat1} label="Missed" />
        </View>
      </Card>

      <Card tone="sage" style={styles.note}>
        <AppText variant="smallStrong">
          {streak.current === 0
            ? 'The streak resets. Your effort does not.'
            : 'Rest is part of the pattern.'}
        </AppText>
        <AppText variant="caption" color={theme.colors.textMuted}>
          A day counts when {Math.round((profile?.streakThreshold ?? 0.7) * 100)}% of essential
          goals are complete. Skipped goals are removed from the count. Rest and recovery days keep
          the streak intact without inflating it.
        </AppText>
      </Card>

      <AppText variant="caption" color={theme.colors.textFaint} align="center">
        Today is {weekdayOfKey(today) === 0 ? 'Sunday' : WEEKDAY[weekdayOfKey(today) - 1]}. One day
        is enough to begin again.
      </AppText>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText variant="caption" color={theme.colors.textFaint}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  tiles: { flexDirection: 'row', gap: 8 },
  weekRow: { flexDirection: 'row', alignItems: 'center' },
  weekStat: { flex: 1, gap: 1 },
  divider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: '#00000012' },
  calendar: { gap: 12 },
  calendarHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  monthText: { flex: 1, alignItems: 'center', gap: 1 },
  weekdays: { flexDirection: 'row' },
  weekdayCell: { flex: 1, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 9,
  },
  dayInner: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  futureDot: { width: 3, height: 3, borderRadius: 2, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  note: { gap: 4 },
});
