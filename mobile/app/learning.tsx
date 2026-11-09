import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Check, Code2, ChevronRight, Route, Timer, BookOpen, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import {
  addLearningSession,
  getLearningSessions,
  getLearningStats,
  getLearningTopics,
  updateLearningTopic,
} from '@/db/repositories/learning';
import { formatDateKey, formatDuration, todayKey } from '@/lib/date';
import { LEARNING_STATUS_LABELS } from '@/lib/roadmap';
import type { LearningStatus, LearningTopic } from '@/types';
import { showToast } from '@/lib/toastBus';
import { successFeedback } from '@/lib/haptics';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { SheetModal } from '@/components/ui/SheetModal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatTile } from '@/components/ui/StatTile';
import { LoadingState } from '@/components/ui/States';

const STATUSES: LearningStatus[] = ['not_started', 'learning', 'practiced', 'completed'];

export default function LearningScreen() {
  const theme = useTheme();
  const today = todayKey();
  const [selected, setSelected] = useState<LearningTopic | null>(null);
  const [status, setStatus] = useState<LearningStatus>('not_started');
  const [notes, setNotes] = useState('');
  const [codeDone, setCodeDone] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  const data = useQuery({
    queryKey: ['learning-overview', today],
    queryFn: async () => {
      const [topics, stats, sessions] = await Promise.all([
        getLearningTopics(),
        getLearningStats(),
        getLearningSessions(50),
      ]);
      return { topics, stats, sessions };
    },
    staleTime: 15_000,
  });

  const topics = data.data?.topics ?? [];
  const stats = data.data?.stats;
  const sessions = data.data?.sessions ?? [];
  const completed = topics.filter((topic) => topic.status === 'completed').length;
  const percent = topics.length ? completed / topics.length : 0;
  const nextTopic = topics.find((topic) => topic.status !== 'completed');

  const openTopic = (topic: LearningTopic) => {
    setSelected(topic);
    setStatus(topic.status);
    setNotes(topic.notes);
    setCodeDone(topic.codeDone);
    setMinutes('');
  };

  const save = async () => {
    if (!selected) return;
    const minutesValue = minutes.trim() ? Number(minutes) : 0;
    if (!Number.isFinite(minutesValue) || minutesValue < 0 || minutesValue > 600) {
      showToast('Use 0 to 600 minutes.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateLearningTopic(selected.id, {
        status,
        notes: notes.trim(),
        codeDone,
      });
      if (minutesValue > 0) {
        await addLearningSession({
          topicId: selected.id,
          minutes: minutesValue,
          notes: notes.trim(),
        });
      }
      await data.refetch();
      await successFeedback();
      showToast(minutesValue > 0 ? 'Session logged and project updated.' : 'Project step updated.', 'success');
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header title="NestJS Project Time" subtitle="Build the project in small, applied steps" />

      <Card tone="hero" style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroText}>
            <AppText variant="caps" color={theme.colors.heroMuted}>
              Next step
            </AppText>
            <AppText variant="title" color={theme.colors.heroText}>
              {nextTopic?.title ?? 'Project path complete'}
            </AppText>
            <AppText variant="small" color={theme.colors.heroMuted}>
              {nextTopic?.description ?? 'Keep applying it in a real project.'}
            </AppText>
          </View>
          <Route size={40} color="rgba(122,40,168,0.28)" strokeWidth={1.4} />
        </View>
        <View style={styles.progressBlock}>
          <View style={styles.progressLabel}>
            <AppText variant="caption" color={theme.colors.heroMuted}>
              {completed} of {topics.length} complete
            </AppText>
            <AppText variant="caption" color={theme.colors.heroMuted}>
              {Math.round(percent * 100)}%
            </AppText>
          </View>
          <ProgressBar
            progress={percent}
            color={theme.colors.purple}
            trackColor="rgba(23,23,23,0.14)"
          />
        </View>
      </Card>

      <View style={styles.tiles}>
        <StatTile
          label="This week"
          value={formatDuration(stats?.minutesWeek ?? 0)}
          hint="Project time"
          icon={<Timer size={15} color={theme.colors.sage} />}
        />
        <StatTile
          label="Sessions"
          value={`${stats?.sessionsTotal ?? 0}`}
          hint={`${stats?.completedTopics ?? 0}/${stats?.totalTopics ?? 0} topics done`}
          icon={<Sparkles size={15} color={theme.colors.sage} />}
        />
        <StatTile
          label="Return streak"
          value={`${stats?.currentStreak ?? 0}d`}
          hint="Project days in a row"
          icon={<BookOpen size={15} color={theme.colors.sage} />}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Project path"
          caption="Optional on project days · hidden during exam season"
        />
        <View style={styles.roadmap}>
          {topics.map((topic, index) => {
            const isDone = topic.status === 'completed';
            const isNext = nextTopic?.id === topic.id;
            return (
              <Pressable
                key={topic.id}
                onPress={() => openTopic(topic)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${topic.title}`}
                style={[
                  styles.step,
                  {
                    backgroundColor: isNext ? theme.colors.primarySoft : theme.colors.surface,
                    borderColor: isNext ? theme.colors.sage : theme.colors.border,
                  },
                ]}
              >
                <View style={styles.rail}>
                  <View
                    style={[
                      styles.number,
                      {
                        backgroundColor: isDone
                          ? theme.colors.primary
                          : isNext
                            ? theme.colors.surface
                            : theme.colors.surfaceMuted,
                        borderColor: isNext ? theme.colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isDone ? (
                      <Check size={13} color={theme.colors.primaryText} strokeWidth={2.5} />
                    ) : (
                      <AppText variant="caption" color={isNext ? theme.colors.primary : theme.colors.textMuted}>
                        {index + 1}
                      </AppText>
                    )}
                  </View>
                  {index < topics.length - 1 ? (
                    <View
                      style={[
                        styles.connector,
                        { backgroundColor: isDone ? theme.colors.sage : theme.colors.border },
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.stepBody}>
                  <View style={styles.stepTop}>
                    <AppText
                      variant="bodyStrong"
                      style={styles.stepTitle}
                      color={isDone ? theme.colors.textMuted : theme.colors.text}
                    >
                      {topic.title}
                    </AppText>
                    <ChevronRight size={16} color={theme.colors.textFaint} />
                  </View>
                  <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={2}>
                    {topic.description}
                  </AppText>
                  <View style={styles.stepMeta}>
                    <AppText variant="caption" color={isDone ? theme.colors.primary : theme.colors.textFaint}>
                      {LEARNING_STATUS_LABELS[topic.status]}
                    </AppText>
                    {topic.minutes > 0 ? (
                      <AppText variant="caption" color={theme.colors.textFaint}>
                        · {formatDuration(topic.minutes)}
                      </AppText>
                    ) : null}
                    {topic.codeDone ? (
                      <View style={[styles.codeTag, { backgroundColor: theme.colors.primarySoft }]}>
                        <Code2 size={10} color={theme.colors.primary} />
                        <AppText variant="caption" color={theme.colors.primary}>
                          code
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent project sessions" />
        {data.isLoading ? (
          <LoadingState label="Loading sessions…" />
        ) : sessions.length ? (
          <Card padded={false} style={styles.sessions}>
            {sessions.slice(0, 8).map((session, index) => {
              const topic = topics.find((item) => item.id === session.topicId);
              return (
                <View
                  key={session.id}
                  style={[
                    styles.sessionRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.sessionText}>
                    <AppText variant="smallStrong" numberOfLines={1}>
                      {topic?.title ?? 'General NestJS'}
                    </AppText>
                    <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                      {formatDateKey(session.day, { month: 'short', day: 'numeric' })}
                      {session.notes ? ` · ${session.notes}` : ''}
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
              No project sessions yet. Pick the next step above and start with 20 minutes.
            </AppText>
          </Card>
        )}
      </View>

      <Card tone="sage" style={styles.note}>
        <AppText variant="caption" color={theme.colors.textMuted}>
          How to use this
        </AppText>
        <AppText variant="small">
          Read just enough to try something, then build a tiny piece. Mark a step practiced only
          after you have written code with it.
        </AppText>
      </Card>

      <SheetModal
        visible={Boolean(selected)}
        title={selected?.title ?? 'Project step'}
        subtitle={selected?.description}
        onClose={() => setSelected(null)}
      >
        <View style={styles.group}>
          <AppText variant="smallStrong">Status</AppText>
          <View style={styles.wrap}>
            {STATUSES.map((value) => (
              <Chip
                key={value}
                label={LEARNING_STATUS_LABELS[value]}
                size="sm"
                selected={status === value}
                onPress={() => setStatus(value)}
              />
            ))}
          </View>
        </View>
        <View style={styles.group}>
          <AppText variant="smallStrong">Practice</AppText>
          <View style={styles.wrap}>
            <Chip
              label="I wrote code for this"
              size="sm"
              selected={codeDone}
              onPress={() => setCodeDone(!codeDone)}
              icon={codeDone ? <Check size={12} color={theme.colors.primary} /> : null}
            />
          </View>
        </View>
        <TextField
          label="Minutes this session (optional)"
          placeholder="20"
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
        />
        <TextField
          label="Notes"
          placeholder="What did you build? What is still unclear?"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <Button
          label={minutes.trim() ? 'Save and log session' : 'Save step'}
          onPress={save}
          loading={saving}
          fullWidth
        />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  hero: { gap: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroText: { flex: 1, gap: 4 },
  progressBlock: { gap: 6 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  tiles: { flexDirection: 'row', gap: 8 },
  section: { gap: 10 },
  roadmap: { gap: 8 },
  step: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
  },
  rail: { alignItems: 'center', width: 26 },
  number: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: { width: 1.5, flex: 1, marginTop: 3, minHeight: 18 },
  stepBody: { flex: 1, gap: 3, paddingBottom: 2 },
  stepTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepTitle: { flex: 1 },
  stepMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 },
  codeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  sessions: { overflow: 'hidden' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  sessionText: { flex: 1, gap: 1 },
  note: { gap: 4 },
  group: { gap: 7 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});
