import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { DayStatus } from '@/types';
import { addDays, formatDateKey, startOfWeekKey } from '@/lib/date';
import { AppText } from './ui/AppText';

interface HeatmapProps {
  statuses: Record<string, DayStatus>;
  start: string;
  end: string;
}

const cell = 13;
const gap = 3;

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function Heatmap({ statuses, start, end }: HeatmapProps) {
  const theme = useTheme();
  const first = startOfWeekKey(start);
  const weeks: string[] = [];
  let cursor = first;
  let guard = 0;
  while (cursor <= end && guard < 60) {
    weeks.push(cursor);
    cursor = addDays(cursor, 7);
    guard++;
  }

  const colorFor = (status: DayStatus | undefined): string => {
    switch (status) {
      case 'completed':
        return theme.colors.heat4;
      case 'partial':
        return theme.colors.heat2;
      case 'rest':
      case 'recovery':
        return theme.colors.amber;
      case 'missed':
        return theme.colors.heat1;
      case 'future':
        return 'transparent';
      default:
        return theme.colors.heat0;
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <View style={styles.dayLabels}>
          {WEEKDAY_LABELS.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.dayLabel}>
              <AppText variant="caption" color={theme.colors.textFaint}>
                {index % 2 === 0 ? label : ''}
              </AppText>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.grid}>
            {weeks.map((weekStart) => (
              <View key={weekStart} style={styles.column}>
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const date = addDays(weekStart, dayIndex);
                  if (date > end) return <View key={date} style={styles.cell} />;
                  const status = statuses[date];
                  const isFuture = status === 'future';
                  return (
                    <View
                      key={date}
                      accessible
                      accessibilityLabel={`${formatDateKey(date, { month: 'short', day: 'numeric' })}: ${
                        status ?? 'no entry'
                      }`}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: colorFor(status),
                          borderWidth: isFuture ? StyleSheet.hairlineWidth : 0,
                          borderColor: theme.colors.border,
                          opacity: status === undefined ? 0.55 : 1,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={styles.legend}>
        <AppText variant="caption" color={theme.colors.textFaint}>
          Less
        </AppText>
        {[theme.colors.heat0, theme.colors.heat1, theme.colors.heat2, theme.colors.heat3, theme.colors.heat4].map(
          (color) => (
            <View key={color} style={[styles.legendCell, { backgroundColor: color }]} />
          ),
        )}
        <AppText variant="caption" color={theme.colors.textFaint}>
          More
        </AppText>
        <View style={[styles.legendCell, { backgroundColor: theme.colors.amber }]} />
        <AppText variant="caption" color={theme.colors.textFaint}>
          Rest
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  labels: { flexDirection: 'row', gap: 6 },
  dayLabels: { gap, paddingTop: 0 },
  dayLabel: { height: cell, justifyContent: 'center', width: 10 },
  grid: { flexDirection: 'row', gap },
  column: { gap },
  cell: { width: cell, height: cell, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  legendCell: { width: 11, height: 11, borderRadius: 2.5 },
});
