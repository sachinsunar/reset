import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Clock } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { catColor } from '@/theme';
import type { Goal } from '@/types';
import { formatDuration, formatTime12h } from '@/lib/date';
import { missionXp } from '@/lib/xp';
import { AppText } from './ui/AppText';
import { Checkbox } from './ui/Checkbox';
import { CategoryIcon, CATEGORY_META } from './CategoryIcon';
import { XpPill } from './game/XpPill';

interface GoalCardProps {
  goal: Goal;
  onToggle: () => void;
  onPress?: () => void;
  compact?: boolean;
  showDescription?: boolean;
}

export function GoalCard({
  goal,
  onToggle,
  onPress,
  compact = false,
  showDescription = true,
}: GoalCardProps) {
  const theme = useTheme();
  const completed = goal.status === 'completed';
  const skipped = goal.status === 'skipped';
  const meta = CATEGORY_META[goal.category];
  const accent = catColor(goal.category, theme.dark);
  const timeLabel = goal.scheduledTime ? formatTime12h(goal.scheduledTime) : null;
  const xp = missionXp(goal);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.title}${completed ? ', completed' : ''}${skipped ? ', skipped' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        compact && styles.compact,
        {
          opacity: skipped ? 0.62 : pressed && onPress ? 0.78 : 1,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: completed ? theme.colors.emerald : accent.fg }]} />
      <Checkbox
        checked={completed}
        onToggle={onToggle}
        accessibilityLabel={`Mark ${goal.title} ${completed ? 'not done' : 'done'}`}
        size={compact ? 24 : 27}
        color={completed ? theme.colors.emerald : theme.colors.borderStrong}
      />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText
            variant="bodyStrong"
            numberOfLines={2}
            style={[styles.title, completed ? styles.doneText : undefined]}
            color={completed ? theme.colors.textMuted : theme.colors.text}
          >
            {goal.title}
          </AppText>
          {!completed && !skipped ? <XpPill amount={xp} compact /> : null}
        </View>
        <View style={styles.metaRow}>
          <CategoryIcon category={goal.category} size={10} boxSize={18} />
          <AppText variant="caption" color={theme.colors.textMuted}>
            {meta.label}
          </AppText>
          {timeLabel ? (
            <>
              <View style={[styles.dot, { backgroundColor: theme.colors.textFaint }]} />
              <AppText variant="caption" color={theme.colors.textMuted}>
                {timeLabel}
              </AppText>
            </>
          ) : null}
          {goal.estMinutes > 0 ? (
            <>
              <View style={[styles.dot, { backgroundColor: theme.colors.textFaint }]} />
              <Clock size={10} color={theme.colors.textMuted} />
              <AppText variant="caption" color={theme.colors.textMuted}>
                {formatDuration(goal.estMinutes)}
              </AppText>
            </>
          ) : null}
          {goal.kind === 'optional' ? (
            <View style={[styles.optional, { backgroundColor: theme.colors.earthSoft }]}>
              <AppText variant="caption" color={theme.colors.earth}>
                OPTIONAL
              </AppText>
            </View>
          ) : null}
        </View>
        {showDescription && goal.description && !completed && !compact ? (
          <AppText variant="small" color={theme.colors.textMuted} numberOfLines={2}>
            {goal.description}
          </AppText>
        ) : null}
        {skipped ? (
          <AppText variant="caption" color={theme.colors.amber}>
            Skipped{goal.skipReason ? ` · ${goal.skipReason}` : ''}
          </AppText>
        ) : null}
      </View>
      {onPress ? <ChevronRight size={17} color={theme.colors.textFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    paddingRight: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compact: { paddingVertical: 10 },
  accent: { width: 3, alignSelf: 'stretch', borderRadius: 99 },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  dot: { width: 2.5, height: 2.5, borderRadius: 2, marginHorizontal: 2 },
  optional: { borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1 },
  doneText: { textDecorationLine: 'line-through' },
});
