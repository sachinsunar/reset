import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Check, Pause, Play, RotateCcw, Timer, X } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { getSubjects } from '@/db/repositories/academic';
import { getLearningTopics } from '@/db/repositories/learning';
import { getFocusSessions, getFocusStats, saveFocusSession } from '@/db/repositories/focus';
import { formatDateKey, formatDuration, formatMinutesClock, todayKey } from '@/lib/date';
import { showToast } from '@/lib/toastBus';
import { successFeedback } from '@/lib/haptics';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingState } from '@/components/ui/States';

const PRESETS = [15, 25, 45];

export default function FocusScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ label?: string; subject?: string }>();
  const today = todayKey();
  const [preset, setPreset] = useState(25);
  const [custom, setCustom] = useState('');
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const endsAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [label, setLabel] = useState(params.label ?? '');
  const [link, setLink] = useState<string>('none');
  const [saving, setSaving] = useState(false);

  const data = useQuery({
    queryKey: ['focus-overview', today],
    queryFn: async () => {
      const [subjects, topics, stats, sessions] = await Promise.all([
        getSubjects(),
        getLearningTopics(),
        getFocusStats(),
        getFocusSessions(20),
      ]);
      return { subjects, topics, stats, sessions };
    },
    staleTime: 15_000,
  });

  const subjects = data.data?.subjects ?? [];
  const learningTopics = data.data?.topics ?? [];
  const nextLearning = learningTopics.find((topic) => topic.status !== 'completed') ?? learningTopics[0];
  const stats = data.data?.stats;
  const sessions = data.data?.sessions ?? [];
  const duration = preset * 60;
  const elapsed = Math.max(0, duration - remaining);
  const progress = duration ? elapsed / duration : 0;

  useEffect(() => {
    if (params.subject === 'auto' && link === 'none' && subjects.length) {
      setLink(subjects[0].id);
    }
  }, [params.subject, subjects, link]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      if (!endsAtRef.current) return;
      const next = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) {
        setRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRemaining(0);
        void successFeedback();
      }
    }, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const start = () => {
    if (remaining <= 0) return;
    if (!startedAt) setStartedAt(new Date().toISOString());
    endsAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  };

  const pause = () => {
    if (endsAtRef.current) {
      setRemaining(Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000)));
    }
    endsAtRef.current = null;
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    endsAtRef.current = null;
    setRemaining(duration);
    setStartedAt(null);
  };

  const choosePreset = (minutes: number) => {
    if (running) return;
    setPreset(minutes);
    setCustom('');
    setRemaining(minutes * 60);
    setStartedAt(null);
  };

  const applyCustom = (value: string) => {
    setCustom(value);
    if (running) return;
    const minutes = Number(value);
    if (Number.isFinite(minutes) && minutes >= 1 && minutes <= 180) {
      setPreset(minutes);
      setRemaining(minutes * 60);
      setStartedAt(null);
    }
  };

  const finish = async () => {
    const minutes = Math.max(1, Math.round(elapsed / 60));
    if (elapsed < 10) {
      showToast('Give the session a little more time before saving.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const subjectId = subjects.some((subject) => subject.id === link) ? link : null;
      const learningTopicId = link === 'learning' ? nextLearning?.id ?? null : null;
      await saveFocusSession({
        label: label.trim() || 'Focus session',
        subjectId,
        learningTopicId,
        minutes,
        startedAt: startedAt ?? new Date(Date.now() - elapsed * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        completed: true,
      });
      await data.refetch();
      await successFeedback();
      showToast(`Saved ${formatDuration(minutes)} of focus.`, 'success');
      setRemaining(duration);
      setStartedAt(null);
      setRunning(false);
      endsAtRef.current = null;
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    reset();
    setLabel('');
    showToast('Session discarded.', 'info');
  };

  const timeText = formatMinutesClock(remaining);

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header title="Focus" subtitle="One thing, for a short while" />

      <Card tone="hero" style={styles.hero}>
        <View style={styles.heroText}>
          <AppText variant="caps" color={theme.colors.heroMuted}>
            {running ? 'In progress' : remaining === 0 ? 'Time is up' : 'Ready when you are'}
          </AppText>
          <AppText variant="small" color={theme.colors.heroMuted}>
            {link === 'learning'
              ? nextLearning?.title ?? 'NestJS Project Time'
              : subjects.find((subject) => subject.id === link)?.name ?? 'Unlinked focus'}
          </AppText>
        </View>
        <View style={styles.timerWrap}>
          <ProgressRing
            progress={progress}
            size={244}
            strokeWidth={10}
            color={theme.colors.purple}
            trackColor="rgba(23,23,23,0.14)"
          >
            <AppText
              variant="display"
              color={theme.colors.heroText}
              style={styles.timerText}
            >
              {timeText}
            </AppText>
            <AppText variant="caption" color={theme.colors.heroMuted}>
              {remaining === 0 ? 'session complete' : `of ${preset} minutes`}
            </AppText>
          </ProgressRing>
        </View>
        <View style={styles.controls}>
          <Button
            label={running ? 'Pause' : remaining === 0 ? 'Restart' : 'Start'}
            icon={
              running ? (
                <Pause size={17} color={theme.colors.primaryText} />
              ) : (
                <Play size={17} color={theme.colors.primaryText} />
              )
            }
            onPress={running ? pause : remaining === 0 ? reset : start}
            style={styles.controlMain}
          />
          <Button
            label="Reset"
            variant="soft"
            icon={<RotateCcw size={16} color={theme.colors.text} />}
            onPress={reset}
            style={styles.controlSide}
          />
        </View>
      </Card>

      {!running ? (
        <View style={styles.section}>
          <SectionHeader title="Session length" />
          <View style={styles.wrap}>
            {PRESETS.map((minutes) => (
              <Chip
                key={minutes}
                label={`${minutes} min`}
                selected={!custom && preset === minutes}
                onPress={() => choosePreset(minutes)}
              />
            ))}
            <View style={styles.custom}>
              <TextField
                label=""
                placeholder="Custom"
                value={custom}
                onChangeText={applyCustom}
                keyboardType="number-pad"
                style={styles.customInput}
              />
              <AppText variant="caption" color={theme.colors.textFaint}>
                min
              </AppText>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="What is this for?" />
        <Card style={styles.form}>
          <TextField
            label="Label (optional)"
            placeholder="e.g. Numerical methods: interpolation"
            value={label}
            onChangeText={setLabel}
            editable={!running}
          />
          <View style={styles.group}>
            <AppText variant="smallStrong">Link time to</AppText>
            <View style={styles.wrap}>
              <Chip
                label="Nothing"
                size="sm"
                selected={link === 'none'}
                onPress={() => !running && setLink('none')}
              />
              {subjects.map((subject) => (
                <Chip
                  key={subject.id}
                  label={subject.name}
                  size="sm"
                  selected={link === subject.id}
                  onPress={() => !running && setLink(subject.id)}
                />
              ))}
              {nextLearning ? (
                <Chip
                  label="Project"
                  size="sm"
                  selected={link === 'learning'}
                  onPress={() => !running && setLink('learning')}
                />
              ) : null}
            </View>
            <AppText variant="caption" color={theme.colors.textFaint}>
              Study sessions are logged automatically. Project time is added to your project step.
            </AppText>
          </View>
        </Card>
      </View>

      <View style={styles.actions}>
        <Button
          label="End and save session"
          variant="secondary"
          icon={<Check size={16} color={theme.colors.text} />}
          onPress={finish}
          loading={saving}
          disabled={elapsed < 10 || running}
          fullWidth
        />
        {running ? (
          <AppText variant="caption" color={theme.colors.textFaint} align="center">
            Pause to save a partial session.
          </AppText>
        ) : null}
        {startedAt && !running ? (
          <Button
            label="Discard session"
            variant="ghost"
            size="sm"
            icon={<X size={14} color={theme.colors.textMuted} />}
            onPress={cancel}
            fullWidth
          />
        ) : null}
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <AppText variant="heading">{formatDuration(stats?.minutesToday ?? 0)}</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            focused today
          </AppText>
        </View>
        <View style={styles.statItem}>
          <AppText variant="heading">{formatDuration(stats?.minutesWeek ?? 0)}</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            this week
          </AppText>
        </View>
        <View style={styles.statItem}>
          <AppText variant="heading">{stats?.totalSessions ?? 0}</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            sessions
          </AppText>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent sessions" />
        {data.isLoading ? (
          <LoadingState label="Loading sessions…" />
        ) : sessions.length ? (
          <Card padded={false} style={styles.listCard}>
            {sessions.slice(0, 8).map((session, index) => {
              const subject = subjects.find((item) => item.id === session.subjectId);
              const topic = learningTopics.find((item) => item.id === session.learningTopicId);
              return (
                <View
                  key={session.id}
                  style={[
                    styles.sessionRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  ]}
                >
                  <View style={[styles.sessionIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <Timer size={15} color={theme.colors.primary} />
                  </View>
                  <View style={styles.sessionText}>
                    <AppText variant="smallStrong" numberOfLines={1}>
                      {session.label}
                    </AppText>
                    <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                      {formatDateKey(session.day, { month: 'short', day: 'numeric' })}
                      {subject ? ` · ${subject.name}` : topic ? ` · ${topic.title}` : ''}
                    </AppText>
                  </View>
                  <AppText variant="smallStrong" color={theme.colors.primary}>
                    {formatDuration(session.minutes)}
                  </AppText>
                </View>
              );
            })}
          </Card>
        ) : (
          <Card>
            <AppText variant="small" color={theme.colors.textMuted} align="center">
              No focus sessions yet. Start with 15 minutes — the timer will wait.
            </AppText>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  hero: { gap: 14, alignItems: 'stretch' },
  heroText: { gap: 2 },
  timerWrap: { alignItems: 'center', paddingVertical: 6 },
  timerText: { fontSize: 54, lineHeight: 62, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', gap: 8 },
  controlMain: { flex: 2 },
  controlSide: { flex: 1 },
  section: { gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  custom: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  customInput: { minWidth: 90 },
  form: { gap: 14 },
  group: { gap: 8 },
  actions: { gap: 6 },
  stats: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  statItem: { flex: 1, gap: 1 },
  listCard: { overflow: 'hidden' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  sessionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sessionText: { flex: 1, gap: 1 },
});
