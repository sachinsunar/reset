import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Lock, Moon, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { DayLog, Goal, ScheduleBlock } from '@/types';
import { AppText } from '@/components/ui/AppText';
import { Checkbox } from '@/components/ui/Checkbox';
import { CategoryIcon } from '@/components/CategoryIcon';
import { XpPill } from '@/components/game/XpPill';
import { buildScheduleItems, type ScheduleItem } from '@/lib/schedule';

interface DayTimelineProps {
  blocks: ScheduleBlock[];
  goals: Goal[];
  dayLog: DayLog | null;
  nowMinutes?: number | null;
  onToggle?: (goalId: string) => void;
  onPressGoal?: (goalId: string) => void;
  onRest?: () => void;
}

export function DayTimeline({
  blocks,
  goals,
  dayLog,
  nowMinutes,
  onToggle,
  onPressGoal,
  onRest,
}: DayTimelineProps) {
  const theme = useTheme();
  const items = buildScheduleItems(blocks, goals, nowMinutes);
  const isRest = Boolean(dayLog?.isRest || dayLog?.isRecovery);

  if (!items.length) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
          <Sparkles size={19} color={theme.colors.sage} />
        </View>
        <AppText variant="small" color={theme.colors.textMuted} align="center">
          No missions are scheduled for this day.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {isRest ? (
        <View style={[styles.restBanner, { backgroundColor: theme.colors.amberSoft }]}>
          <Moon size={15} color={theme.colors.amber} />
          <AppText variant="caption" color={theme.colors.amber} style={styles.restBannerText}>
            {dayLog?.isRecovery ? 'Recovery day' : 'Rest day'} · streak protected
          </AppText>
          {onRest ? (
            <Pressable onPress={onRest} accessibilityRole="button" hitSlop={8}>
              <AppText variant="caption" color={theme.colors.primary}>
                Undo
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {items.map((item, index) => (
        <TimelineRow
          key={item.id}
          item={item}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          onToggle={onToggle}
          onPressGoal={onPressGoal}
        />
      ))}
    </View>
  );
}

function TimelineRow({
  item,
  isFirst,
  isLast,
  onToggle,
  onPressGoal,
}: {
  item: ScheduleItem;
  isFirst: boolean;
  isLast: boolean;
  onToggle?: (goalId: string) => void;
  onPressGoal?: (goalId: string) => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const completed = item.state === 'completed';
  const skipped = item.state === 'skipped';
  const active = item.state === 'active';
  const canOpen = Boolean(item.goalId && onPressGoal);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const nodeColor = completed
    ? theme.colors.turquoise
    : active
      ? theme.colors.purple
      : skipped
        ? theme.colors.amber
        : item.trackable
          ? theme.colors.purple
          : theme.colors.borderStrong;

  const bodyBackground = completed
    ? theme.colors.turquoiseSoft
    : active
      ? theme.colors.yellowSoft
      : skipped
        ? theme.colors.earthSoft
        : theme.colors.surface;
  const borderColor = active
    ? theme.colors.purple
    : completed
      ? theme.colors.turquoise
      : theme.colors.border;

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <View style={styles.timeCol}>
        <AppText
          variant="caption"
          color={active ? theme.colors.purpleDeep : theme.colors.textMuted}
          numberOfLines={1}
          style={styles.time}
        >
          {item.timeLabel}
        </AppText>
      </View>

      <View style={styles.railCol}>
        {!isFirst ? (
          <View
            style={[
              styles.line,
              styles.lineTop,
              { backgroundColor: completed ? theme.colors.turquoiseSoft : theme.colors.border },
            ]}
          />
        ) : null}
        {!isLast ? (
          <View
            style={[
              styles.line,
              styles.lineBottom,
              { backgroundColor: completed ? theme.colors.turquoiseSoft : theme.colors.border },
            ]}
          />
        ) : null}
        <View
          style={[
            styles.nodeRing,
            {
              borderColor: nodeColor,
              backgroundColor: active ? theme.colors.lavender : theme.colors.surface,
            },
          ]}
        >
          <View
            style={[
              styles.nodeCore,
              {
                backgroundColor: nodeColor,
                transform: [{ scale: active ? 1 : completed ? 0.85 : 0.65 }],
              },
            ]}
          />
        </View>
      </View>

      <Pressable
        disabled={!canOpen}
        onPress={() => {
          if (item.goalId) onPressGoal?.(item.goalId);
        }}
        onPressIn={() => {
          if (canOpen) scale.value = withSpring(0.985, { damping: 18, stiffness: 260 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 260 });
        }}
        accessibilityRole={canOpen ? 'button' : undefined}
        accessibilityLabel={canOpen ? `Open ${item.title}` : item.title}
        style={[
          styles.body,
          {
            backgroundColor: bodyBackground,
            borderColor,
            borderLeftColor: active ? theme.colors.purple : nodeColor,
          },
          active && styles.activeBody,
        ]}
      >
        <View style={styles.bodyTop}>
          <View style={styles.titleWrap}>
            <View style={styles.titleLine}>
              <AppText
                variant="smallStrong"
                color={completed ? theme.colors.textMuted : theme.colors.text}
                style={[styles.title, completed ? styles.done : undefined]}
                numberOfLines={2}
              >
                {item.title}
              </AppText>
              {active ? (
                <View style={[styles.now, { backgroundColor: theme.colors.primary }]}>
                  <AppText variant="caption" color={theme.colors.primaryText} style={styles.nowText}>
                    NOW
                  </AppText>
                </View>
              ) : null}
            </View>
            <View style={styles.metaRow}>
              <CategoryIcon category={item.category} size={10} boxSize={18} />
              <AppText variant="caption" color={theme.colors.textMuted}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </AppText>
              {item.fixed ? (
                <View style={styles.fixedTag}>
                  <Lock size={9} color={theme.colors.purpleDeep} />
                  <AppText variant="caption" color={theme.colors.purpleDeep}>
                    fixed
                  </AppText>
                </View>
              ) : null}
              {item.kind === 'optional' ? (
                <AppText variant="caption" color={theme.colors.earth}>
                  · optional
                </AppText>
              ) : null}
              {skipped ? (
                <AppText variant="caption" color={theme.colors.amber}>
                  · skipped
                </AppText>
              ) : null}
            </View>
          </View>
          {item.trackable && item.goalId ? (
            <Checkbox
              checked={completed}
              onToggle={() => item.goalId && onToggle?.(item.goalId)}
              accessibilityLabel={`Mark ${item.title} ${completed ? 'not done' : 'done'}`}
              size={24}
              color={completed ? theme.colors.turquoise : active ? theme.colors.purple : theme.colors.borderStrong}
            />
          ) : null}
        </View>

        {item.description && !completed && item.trackable ? (
          <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={2}>
            {item.description}
          </AppText>
        ) : null}

        {item.goalId && item.trackable ? (
          <View style={styles.rewardRow}>
            <XpPill amount={item.xp} compact earned={completed} />
            {active ? (
              <AppText variant="caption" color={theme.colors.purpleDeep}>
                Current focus
              </AppText>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const NODE_SIZE = 16;
const NODE_TOP = 18;

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  empty: { paddingVertical: 28, alignItems: 'center', gap: 8 },
  emptyIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  restBannerText: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 4 },
  timeCol: { width: 57, paddingTop: 15, alignItems: 'flex-end' },
  time: { fontVariant: ['tabular-nums'] },
  railCol: { width: 20, alignItems: 'center' },
  line: { position: 'absolute', width: 2, left: 9, backgroundColor: '#ccc' },
  lineTop: { top: 0, height: NODE_TOP },
  lineBottom: { top: NODE_TOP + NODE_SIZE, bottom: -10 },
  nodeRing: {
    position: 'absolute',
    top: NODE_TOP,
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeCore: { width: 6, height: 6, borderRadius: 3 },
  body: {
    flex: 1,
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: 10,
  },
  activeBody: {
    shadowColor: '#B94DF2',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  bodyTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  titleWrap: { flex: 1, gap: 4 },
  titleLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  fixedTag: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  now: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  nowText: { fontSize: 8.5, lineHeight: 11, fontWeight: '800', letterSpacing: 0.5 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  done: { textDecorationLine: 'line-through' },
});
