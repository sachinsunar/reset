import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  RotateCcw,
  SkipForward,
  Sparkles,
  Swords,
  Timer,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import {
  getGoal,
  completeGoal,
  uncompleteGoal,
  skipGoal,
  restoreGoal,
  rescheduleGoal,
} from '@/db/repositories/goals';
import { addDays, formatDateKey, formatDuration, formatTime12h, isValidDateKey } from '@/lib/date';
import { SKIP_REASONS } from '@/lib/completion';
import { showToast } from '@/lib/toastBus';
import { successFeedback } from '@/lib/haptics';
import { missionXp } from '@/lib/xp';
import type { Goal } from '@/types';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SheetModal } from '@/components/ui/SheetModal';
import { TextField } from '@/components/ui/TextField';
import { AppText } from '@/components/ui/AppText';
import { CategoryIcon, CATEGORY_META } from '@/components/CategoryIcon';
import { XpPill } from '@/components/game/XpPill';
import { LoadingState, ErrorState } from '@/components/ui/States';

export default function GoalDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useAppStore((state) => state.today);
  const refreshStore = useAppStore((state) => state.refresh);
  const goalQuery = useQuery({
    queryKey: ['goal', id],
    queryFn: () => getGoal(id),
    enabled: Boolean(id),
  });
  const goal = goalQuery.data;
  const [skipOpen, setSkipOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [customReason, setCustomReason] = useState('');
  const [moveDate, setMoveDate] = useState(today);
  const [moveTime, setMoveTime] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (goal) {
      setMoveDate(goal.date);
      setMoveTime(goal.scheduledTime ?? '');
    }
  }, [goal]);

  const refreshAll = async () => {
    await goalQuery.refetch();
    await refreshStore();
  };

  const toggleComplete = async () => {
    if (!goal) return;
    setBusy(true);
    try {
      if (goal.status === 'completed') {
        await uncompleteGoal(goal.id);
        showToast('Marked as in progress again.', 'info');
      } else {
        await completeGoal(goal.id);
        await successFeedback();
        showToast(`Mission cleared. +${missionXp(goal)} XP earned.`, 'success');
      }
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async (reason: string) => {
    if (!goal) return;
    setBusy(true);
    try {
      await skipGoal(goal.id, reason.trim() || 'Chose to skip');
      await refreshAll();
      setSkipOpen(false);
      setCustomReason('');
      showToast('Skipped with a reason. It will not count against you.', 'info');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!goal) return;
    setBusy(true);
    try {
      await restoreGoal(goal.id);
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async () => {
    if (!goal) return;
    const normalized = moveTime.trim();
    if (normalized && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(normalized)) {
      showToast('Use a time like 09:30.', 'warning');
      return;
    }
    if (!isValidDateKey(moveDate)) {
      showToast('Use a date like 2026-11-05.', 'warning');
      return;
    }
    setBusy(true);
    try {
      await rescheduleGoal(goal.id, moveDate, normalized ? normalized.replace(/^(\d):/, '0$1:') : null);
      await refreshAll();
      setMoveOpen(false);
      showToast('Moved. Plans can change.', 'info');
    } finally {
      setBusy(false);
    }
  };

  const goRelated = () => {
    if (!goal) return;
    if (goal.category === 'study') router.push('/academic');
    else if (goal.category === 'fitness') router.push('/fitness');
    else if (goal.category === 'career') router.push('/learning');
  };

  if (goalQuery.isLoading) {
    return (
      <Screen edges={['top']}>
        <Header title="Mission" showBack />
        <LoadingState label="Opening mission…" />
      </Screen>
    );
  }

  if (goalQuery.isError || !goal) {
    return (
      <Screen edges={['top']}>
        <Header title="Mission" showBack />
        <ErrorState message="That mission could not be found." onRetry={() => goalQuery.refetch()} />
      </Screen>
    );
  }

  const completed = goal.status === 'completed';
  const skipped = goal.status === 'skipped';
  const meta = CATEGORY_META[goal.category];
  const rewardXp = missionXp(goal);

  return (
    <Screen scroll edges={['top']} bottomPadding={32} contentContainerStyle={styles.content}>
      <Header title="Mission details" showBack />

      <Card tone={completed ? 'sage' : 'surface'} style={styles.hero}>
        <View style={styles.heroTop}>
          <CategoryIcon category={goal.category} size={20} boxSize={46} />
          <View style={styles.heroText}>
            <View style={styles.missionEyebrow}>
              <Swords size={12} color={theme.colors.goldDeep} />
              <AppText variant="caps" color={theme.colors.goldDeep}>
                {goal.kind === 'core' ? 'CORE MISSION' : 'SIDE QUEST'}
              </AppText>
            </View>
            <AppText variant="title">{goal.title}</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              {meta.label} · {goal.source === 'routine' ? 'Routine' : 'Added by you'}
            </AppText>
          </View>
          {completed ? <CheckCircle2 size={25} color={theme.colors.emerald} /> : null}
        </View>
        <View style={styles.rewardRow}>
          <XpPill amount={rewardXp} earned={completed} />
          {!completed && !skipped ? (
            <View style={styles.rewardHint}>
              <Sparkles size={12} color={theme.colors.goldDeep} />
              <AppText variant="caption" color={theme.colors.goldDeep}>
                Clear this mission to bank the XP
              </AppText>
            </View>
          ) : null}
        </View>
        {goal.description ? (
          <AppText variant="small" color={theme.colors.textMuted}>
            {goal.description}
          </AppText>
        ) : null}
        <View style={styles.metaGrid}>
          <Meta icon={<CalendarClock size={15} color={theme.colors.sage} />} label="Day" value={formatDateKey(goal.date, { weekday: 'short', month: 'short', day: 'numeric' })} />
          <Meta icon={<Clock size={15} color={theme.colors.sage} />} label="Start" value={goal.scheduledTime ? formatTime12h(goal.scheduledTime) : 'Anytime'} />
          <Meta icon={<Timer size={15} color={theme.colors.sage} />} label="Estimate" value={goal.estMinutes ? formatDuration(goal.estMinutes) : 'Open'} />
          <Meta icon={<Check size={15} color={theme.colors.sage} />} label="Source" value={goal.source === 'routine' ? 'Routine' : goal.source === 'manual' ? 'Added by you' : goal.source} />
        </View>
        {completed && goal.completedAt ? (
          <AppText variant="caption" color={theme.colors.primary}>
            Completed {new Date(goal.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </AppText>
        ) : null}
        {skipped ? (
          <AppText variant="caption" color={theme.colors.amber}>
            Skipped{goal.skipReason ? ` · ${goal.skipReason}` : ''}. This does not count against you.
          </AppText>
        ) : null}
      </Card>

      <View style={styles.actions}>
        {skipped ? (
          <Button label="Restore to today's list" variant="secondary" onPress={handleRestore} loading={busy} fullWidth icon={<RotateCcw size={16} color={theme.colors.text} />} />
        ) : (
          <Button
            label={completed ? 'Reopen mission' : 'Clear mission'}
            onPress={toggleComplete}
            loading={busy}
            fullWidth
            variant={completed ? 'secondary' : 'primary'}
            icon={<Check size={17} color={completed ? theme.colors.text : theme.colors.primaryText} />}
          />
        )}
        <View style={styles.actionRow}>
          {!completed && !skipped ? (
            <Button
              label="Skip"
              variant="soft"
              size="sm"
              onPress={() => setSkipOpen(true)}
              icon={<SkipForward size={14} color={theme.colors.primary} />}
              style={styles.flex}
            />
          ) : null}
          <Button
            label="Move"
            variant="soft"
            size="sm"
            onPress={() => setMoveOpen(true)}
            icon={<CalendarClock size={14} color={theme.colors.primary} />}
            style={styles.flex}
          />
        </View>
        {goal.category === 'study' || goal.category === 'fitness' || goal.category === 'career' ? (
          <Button
            label={
              goal.category === 'study'
                ? 'Open academic'
                : goal.category === 'fitness'
                  ? 'Open fitness plan'
                  : 'Open NestJS project'
            }
            variant="ghost"
            onPress={goRelated}
            icon={<ArrowRight size={15} color={theme.colors.textMuted} />}
            fullWidth
          />
        ) : null}
        {goal.category === 'study' || goal.category === 'career' ? (
          <Button
            label="Start a focus session"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/focus',
                params: { label: goal.title, subject: goal.category === 'study' ? 'auto' : '' },
              })
            }
            icon={<Timer size={15} color={theme.colors.text} />}
            fullWidth
          />
        ) : null}
      </View>

      <Card tone="muted" style={styles.note}>
        <AppText variant="caption" color={theme.colors.textMuted}>
          A mission is a direction, not a debt. Move it, skip it with a reason, or let it be enough for
          today.
        </AppText>
      </Card>

      <SheetModal
        visible={skipOpen}
        title="Skip this goal?"
        subtitle="A reason keeps it honest — and removes it from today's denominator."
        onClose={() => setSkipOpen(false)}
      >
        <View style={styles.reasons}>
          {SKIP_REASONS.map((reason) => (
            <Chip key={reason} label={reason} onPress={() => handleSkip(reason)} />
          ))}
        </View>
        <TextField
          label="Or write your own"
          placeholder="A short reason"
          value={customReason}
          onChangeText={setCustomReason}
          maxLength={80}
        />
        <Button
          label="Skip with this reason"
          variant="secondary"
          onPress={() => handleSkip(customReason)}
          disabled={!customReason.trim()}
          fullWidth
        />
      </SheetModal>

      <SheetModal
        visible={moveOpen}
        title="Move this goal"
        subtitle="It will become a one-off goal on the new day."
        onClose={() => setMoveOpen(false)}
      >
        <View style={styles.wrap}>
          <Chip label="Today" selected={moveDate === today} onPress={() => setMoveDate(today)} />
          <Chip
            label="Tomorrow"
            selected={moveDate === addDays(today, 1)}
            onPress={() => setMoveDate(addDays(today, 1))}
          />
          <Chip
            label="In 3 days"
            selected={moveDate === addDays(today, 3)}
            onPress={() => setMoveDate(addDays(today, 3))}
          />
        </View>
        <TextField
          label="Date"
          placeholder="YYYY-MM-DD"
          value={moveDate}
          onChangeText={setMoveDate}
          autoCapitalize="none"
        />
        <TextField
          label="Start time (optional)"
          placeholder="09:30"
          value={moveTime}
          onChangeText={setMoveTime}
        />
        <Button label="Move goal" onPress={handleMove} loading={busy} fullWidth />
      </SheetModal>
    </Screen>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metaItem}>
      {icon}
      <View>
        <AppText variant="caption" color={theme.colors.textFaint}>
          {label}
        </AppText>
        <AppText variant="smallStrong">{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  hero: { gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText: { flex: 1, gap: 3 },
  missionEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rewardHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: '44%' },
  actions: { gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  note: { marginTop: 4 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
