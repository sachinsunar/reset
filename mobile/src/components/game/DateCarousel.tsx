import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { DayStatus } from '@/types';
import { AppText } from '@/components/ui/AppText';
import { buildDateStrip } from '@/lib/schedule';

interface DateCarouselProps {
  selected: string;
  today: string;
  onChange: (date: string) => void;
  statuses?: Record<string, DayStatus | undefined>;
  anchor?: string;
  past?: number;
  future?: number;
}

const CELL_WIDTH = 56;
const GAP = 8;

export function DateCarousel({
  selected,
  today,
  onChange,
  statuses,
  anchor,
  past = 3,
  future = 11,
}: DateCarouselProps) {
  const theme = useTheme();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const days = buildDateStrip(anchor ?? today, today, past, future);
  const selectedIndex = Math.max(0, days.findIndex((day) => day.date === selected));

  useEffect(() => {
    const x = Math.max(0, selectedIndex * (CELL_WIDTH + GAP) - 90);
    scrollRef.current?.scrollTo({ x, animated: true });
  }, [selectedIndex]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {days.map((day) => {
        const isSelected = day.date === selected;
        const status = statuses?.[day.date];
        const dotColor = isSelected
          ? theme.colors.yellow
          : status === 'completed'
            ? theme.colors.emerald
            : status === 'partial'
              ? theme.colors.sage
              : status === 'rest' || status === 'recovery'
                ? theme.colors.amber
                : status === 'missed'
                  ? theme.colors.error
                  : 'transparent';

        return (
          <Pressable
            key={day.date}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${day.weekdayShort} ${day.dayNumber}${day.isToday ? ', today' : ''}`}
            onPress={() => onChange(day.date)}
            style={({ pressed }) => [
              styles.cell,
              {
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                opacity: pressed ? 0.74 : 1,
              },
            ]}
          >
            <AppText
              variant="caption"
              color={isSelected ? theme.colors.primaryText : theme.colors.textMuted}
              style={isSelected ? styles.selectedWeekday : undefined}
            >
              {day.weekdayShort.toUpperCase()}
            </AppText>
            <AppText
              variant="heading"
              color={isSelected ? theme.colors.primaryText : theme.colors.text}
            >
              {day.dayNumber}
            </AppText>
            <View style={styles.footer}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              {day.isToday && !isSelected ? (
                <AppText variant="caption" color={theme.colors.goldDeep} style={styles.today}>
                  TODAY
                </AppText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: GAP, paddingVertical: 2, paddingRight: 20 },
  cell: {
    width: CELL_WIDTH,
    minHeight: 82,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  footer: { height: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  today: { fontSize: 8, lineHeight: 11, fontWeight: '800', letterSpacing: 0.4 },
  selectedWeekday: { opacity: 0.8 },
});
