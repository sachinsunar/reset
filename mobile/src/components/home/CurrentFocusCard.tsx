import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, ChevronRight, Coffee, Play, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { ScheduleItem } from '@/lib/schedule';
import type { RoutineFocus } from '@/lib/routineSchedule';
import { formatDuration, formatTime12h } from '@/lib/date';
import { AppText } from '@/components/ui/AppText';
import { CategoryIcon, CATEGORY_META } from '@/components/CategoryIcon';
import { XpPill } from '@/components/game/XpPill';

interface CurrentFocusCardProps {
  focus: RoutineFocus;
  onStart: (item: ScheduleItem) => void;
  onComplete: (goalId: string) => void;
  onOpen: (goalId: string) => void;
  onTimeline: () => void;
}

const HEADINGS: Record<RoutineFocus['kind'], string> = {
  current: 'CURRENT FOCUS',
  upcoming: 'UP NEXT',
  overdue: 'STILL WAITING',
  break: 'BREAK TIME',
  done: 'DAY COMPLETE',
  rest: 'REST DAY',
  empty: 'A CLEAR DAY',
};

export function CurrentFocusCard({
  focus,
  onStart,
  onComplete,
  onOpen,
  onTimeline,
}: CurrentFocusCardProps) {
  const theme = useTheme();
  const item = focus.item;
  const accent = item ? CATEGORY_META[item.category].label : 'Reset';
  const isNow = focus.kind === 'current';
  const isBreak = focus.kind === 'break';
  const isDone = focus.kind === 'done' || focus.kind === 'rest' || focus.kind === 'empty';
  const background = isNow
    ? theme.colors.yellow
    : focus.kind === 'overdue'
      ? theme.colors.errorSoft
      : isBreak
        ? theme.colors.lavender
        : theme.colors.surface;

  if (!item) {
    return (
      <View style={[styles.card, { backgroundColor: background, borderColor: theme.colors.border }]}>
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
            <Sparkles size={11} color={theme.colors.primaryText} />
            <AppText variant="caps" color={theme.colors.primaryText}>
              {HEADINGS[focus.kind]}
            </AppText>
          </View>
        </View>
        <AppText variant="title">
          {focus.kind === 'rest'
            ? 'Nothing is required today.'
            : focus.kind === 'empty'
              ? 'There is room to breathe.'
              : "You did what mattered today."}
        </AppText>
        <AppText variant="small" color={theme.colors.textMuted}>
          {focus.kind === 'rest'
            ? 'Rest protects the streak. Come back when you are ready.'
            : focus.kind === 'empty'
              ? 'Add a block or enjoy the open space.'
              : 'Every finished block is yours to keep. Let the rest of the day be lighter.'}
        </AppText>
        <Pressable onPress={onTimeline} accessibilityRole="button" style={styles.textAction}>
          <AppText variant="smallStrong" color={theme.colors.primary}>
            Open today’s plan
          </AppText>
          <ChevronRight size={15} color={theme.colors.primary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: background, borderColor: theme.colors.border }]}>
      <View pointerEvents="none" style={[styles.blobLarge, { backgroundColor: theme.colors.purple, opacity: isNow ? 0.14 : 0.07 }]} />
      <View pointerEvents="none" style={[styles.blobSmall, { backgroundColor: theme.colors.turquoise, opacity: isNow ? 0.2 : 0.08 }]} />

      <View style={styles.topRow}>
        <View
          style={[
            styles.badge,
            { backgroundColor: focus.kind === 'overdue' ? theme.colors.error : theme.colors.primary },
          ]}
        >
          {isBreak ? (
            <Coffee size={11} color={theme.colors.primaryText} />
          ) : (
            <Sparkles size={11} color={theme.colors.primaryText} />
          )}
          <AppText variant="caps" color={theme.colors.primaryText}>
            {HEADINGS[focus.kind]}
          </AppText>
        </View>
        <AppText variant="caption" color={theme.colors.textMuted}>
          {item.timeLabel}–{formatTime12h(item.endTime)}
        </AppText>
      </View>

      <View style={styles.heroRow}>
        <CategoryIcon category={item.category} size={23} boxSize={52} />
        <View style={styles.heroText}>
          <AppText variant="title" numberOfLines={2}>
            {item.title}
          </AppText>
          <View style={styles.metaRow}>
            <AppText variant="caption" color={theme.colors.textMuted}>
              {accent}
            </AppText>
            <View style={[styles.dot, { backgroundColor: theme.colors.textFaint }]} />
            <AppText variant="caption" color={theme.colors.textMuted}>
              {formatDuration(item.endMinutes - item.startMinutes)}
            </AppText>
            {item.trackable ? <XpPill amount={item.xp} compact /> : null}
          </View>
        </View>
      </View>

      {item.description ? (
        <AppText variant="small" color={theme.colors.textMuted} numberOfLines={3}>
          {item.description}
        </AppText>
      ) : null}

      {focus.kind === 'overdue' ? (
        <AppText variant="caption" color={theme.colors.error}>
          {focus.overdueCount > 1
            ? `${focus.overdueCount} activities have passed. Start with this one, or move it in the timeline.`
            : 'This one passed its time. It is still yours to start or complete.'}
        </AppText>
      ) : null}

      {isBreak ? (
        <View style={styles.breakRow}>
          <Coffee size={16} color={theme.colors.primary} />
          <AppText variant="small" color={theme.colors.textMuted} style={styles.flex}>
            {focus.next
              ? `Next up: ${focus.next.title} at ${focus.next.timeLabel}.`
              : 'No next block. Enjoy the pause.'}
          </AppText>
          <Pressable onPress={onTimeline} accessibilityRole="button" style={styles.smallAction}>
            <AppText variant="caption" color={theme.colors.primary}>
              Timeline
            </AppText>
          </Pressable>
        </View>
      ) : isDone ? null : (
        <View style={styles.actions}>
          <Pressable
            onPress={() => onStart(item)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryAction,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Play size={15} color={theme.colors.primaryText} fill={theme.colors.primaryText} />
            <AppText variant="smallStrong" color={theme.colors.primaryText}>
              {isNow ? 'Start focus' : focus.kind === 'overdue' ? 'Start now' : 'Start early'}
            </AppText>
          </Pressable>
          {item.goalId && item.trackable ? (
            <Pressable
              onPress={() => onComplete(item.goalId!)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryAction,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Check size={15} color={theme.colors.text} />
              <AppText variant="smallStrong">Complete</AppText>
            </Pressable>
          ) : null}
          {item.goalId ? (
            <Pressable
              onPress={() => onOpen(item.goalId!)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              style={styles.openButton}
            >
              <ChevronRight size={19} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 25,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#171717',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  blobLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 99,
    right: -70,
    top: -80,
  },
  blobSmall: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 99,
    left: -46,
    bottom: -48,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText: { flex: 1, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  dot: { width: 3, height: 3, borderRadius: 2, marginHorizontal: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 15,
    paddingHorizontal: 14,
    height: 42,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 42,
  },
  openButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  textAction: { flexDirection: 'row', alignItems: 'center', gap: 1, alignSelf: 'flex-start' },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  smallAction: { paddingHorizontal: 6, paddingVertical: 4 },
});
