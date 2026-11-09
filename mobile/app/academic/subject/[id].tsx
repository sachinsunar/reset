import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import {
  createTopic,
  deleteTopic,
  getAcademicStats,
  getStudySessions,
  getSubject,
  getTopics,
  updateSubject,
  updateTopic,
} from '@/db/repositories/academic';
import { addDays, diffDays, formatDuration, todayKey } from '@/lib/date';
import type { SyllabusTopic, TopicStatus } from '@/types';
import { showToast } from '@/lib/toastBus';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { StudySessionSheet } from '@/features/academic/StudySessionSheet';

const STATUSES: { value: TopicStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'learning', label: 'Learning' },
  { value: 'practiced', label: 'Practiced' },
  { value: 'needs_revision', label: 'Needs revision' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: 'Not started',
  learning: 'Learning',
  practiced: 'Practiced',
  needs_revision: 'Needs revision',
  completed: 'Completed',
};

export default function SubjectDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = todayKey();
  const [filter, setFilter] = useState<'all' | TopicStatus>('all');
  const [topicOpen, setTopicOpen] = useState(false);
  const [editing, setEditing] = useState<SyllabusTopic | null>(null);
  const [title, setTitle] = useState('');
  const [confidence, setConfidence] = useState(3);
  const [status, setStatus] = useState<TopicStatus>('not_started');
  const [notes, setNotes] = useState('');
  const [practiceDone, setPracticeDone] = useState(false);
  const [revisionDone, setRevisionDone] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [allocation, setAllocation] = useState('0');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [subjectNotes, setSubjectNotes] = useState('');
  const [subjectConfidence, setSubjectConfidence] = useState(3);
  const [saving, setSaving] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const data = useQuery({
    queryKey: ['subject-detail', id, today],
    queryFn: async () => {
      const [subject, topics, stats, sessions] = await Promise.all([
        getSubject(id),
        getTopics(id),
        getAcademicStats(),
        getStudySessions(addDays(today, -29), today),
      ]);
      return { subject, topics, stats, sessions: sessions.filter((s) => s.subjectId === id) };
    },
    enabled: Boolean(id),
  });

  const subject = data.data?.subject;
  const topics = data.data?.topics ?? [];
  const stats = data.data?.stats;
  const sessions = data.data?.sessions ?? [];
  const weekly = stats?.bySubject.find((row) => row.subjectId === id)?.minutes ?? 0;
  const completed = topics.filter((topic) => topic.status === 'completed').length;
  const filtered = useMemo(
    () => (filter === 'all' ? topics : topics.filter((topic) => topic.status === filter)),
    [topics, filter],
  );
  const examDays =
    subject?.examDate && subject.examDate >= today ? diffDays(today, subject.examDate) : null;

  const openNewTopic = () => {
    setEditing(null);
    setTitle('');
    setStatus('not_started');
    setConfidence(3);
    setNotes('');
    setPracticeDone(false);
    setRevisionDone(false);
    setTopicOpen(true);
  };

  const openTopic = (topic: SyllabusTopic) => {
    setEditing(topic);
    setTitle(topic.title);
    setStatus(topic.status);
    setConfidence(topic.confidence);
    setNotes(topic.notes);
    setPracticeDone(topic.practiceDone);
    setRevisionDone(topic.revisionDone);
    setTopicOpen(true);
  };

  const openSubjectEdit = () => {
    if (!subject) return;
    setAllocation(String(Math.round(subject.allocation * 100)));
    setExamDate(subject.examDate ?? '');
    setExamTime(subject.examTime ?? '');
    setSubjectNotes(subject.notes);
    setSubjectConfidence(subject.confidence);
    setSubjectOpen(true);
  };

  const saveTopic = async () => {
    if (title.trim().length < 2) {
      showToast('Give the topic a short title.', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateTopic(editing.id, {
          title: title.trim(),
          status,
          confidence,
          notes: notes.trim(),
          practiceDone,
          revisionDone,
        });
        showToast('Topic updated.', 'success');
      } else {
        await createTopic({
          subjectId: id,
          title: title.trim(),
          status,
          confidence,
        });
        showToast('Topic added. You can break it down further anytime.', 'success');
      }
      await data.refetch();
      setTopicOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const removeTopic = () => {
    if (!editing) return;
    Alert.alert('Remove this topic?', 'This only removes the topic from your checklist.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteTopic(editing.id);
          await data.refetch();
          setTopicOpen(false);
          showToast('Topic removed.', 'info');
        },
      },
    ]);
  };

  const saveSubject = async () => {
    if (!subject) return;
    const allocationValue = Number(allocation);
    if (!Number.isFinite(allocationValue) || allocationValue < 0 || allocationValue > 100) {
      showToast('Allocation should be between 0 and 100.', 'warning');
      return;
    }
    if (examDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(examDate.trim())) {
      showToast('Use an exam date like 2026-12-10.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateSubject(subject.id, {
        allocation: allocationValue / 100,
        examDate: examDate.trim() || null,
        examTime: examTime.trim() || null,
        notes: subjectNotes.trim(),
        confidence: subjectConfidence,
      });
      await data.refetch();
      setSubjectOpen(false);
      showToast('Subject updated.', 'success');
    } finally {
      setSaving(false);
    }
  };

  if (data.isLoading) {
    return (
      <Screen edges={['top']}>
        <Header title="Subject" />
        <LoadingState label="Opening subject…" />
      </Screen>
    );
  }

  if (data.isError || !subject) {
    return (
      <Screen edges={['top']}>
        <Header title="Subject" />
        <ErrorState message="This subject could not be found." onRetry={() => data.refetch()} />
      </Screen>
    );
  }

  const syllabusPercent = topics.length ? completed / topics.length : 0;

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header
        title={subject.code || 'Subject'}
        right={
          <Pressable
            onPress={openSubjectEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit subject"
            style={[styles.editButton, { backgroundColor: theme.colors.surfaceMuted }]}
          >
            <Pencil size={16} color={theme.colors.primary} />
          </Pressable>
        }
      />

      <Card style={{ ...styles.hero, borderLeftWidth: 4, borderLeftColor: subject.color }}>
        <AppText variant="title">{subject.name}</AppText>
        <AppText variant="small" color={theme.colors.textMuted}>
          {Math.round(subject.allocation * 100)}% planned study share ·{' '}
          {examDays != null ? `${examDays} days to exam` : subject.examDate ? 'Exam passed' : 'No exam date set'}
        </AppText>
        {subject.examDate ? (
          <AppText variant="caption" color={theme.colors.textMuted}>
            {subject.examDate}
            {subject.examTime ? ` · ${subject.examTime}` : ''}
          </AppText>
        ) : null}
        <View style={styles.progressBlock}>
          <View style={styles.progressLabel}>
            <AppText variant="caption" color={theme.colors.textMuted}>
              Syllabus completion
            </AppText>
            <AppText variant="smallStrong">
              {completed}/{topics.length || 0}
            </AppText>
          </View>
          <ProgressBar progress={syllabusPercent} color={subject.color} height={8} />
        </View>
        <View style={styles.heroMeta}>
          <View style={styles.metaItem}>
            <AppText variant="heading">{formatDuration(weekly)}</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              studied this week
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="heading">{sessions.length}</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              sessions in 30 days
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="heading">{subject.confidence}/5</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              confidence
            </AppText>
          </View>
        </View>
        {subject.notes ? (
          <AppText variant="caption" color={theme.colors.textMuted}>
            {subject.notes}
          </AppText>
        ) : null}
      </Card>

      <View style={styles.actions}>
        <Button
          label="Add topic"
          icon={<Plus size={16} color={theme.colors.primaryText} />}
          onPress={openNewTopic}
          style={styles.flex}
        />
        <Button
          label="Log study"
          variant="secondary"
          icon={<BookOpen size={16} color={theme.colors.text} />}
          onPress={() => setLogOpen(true)}
          style={styles.flex}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Syllabus topics"
          caption="Add your own topics; nothing is assumed."
        />
        <View style={styles.filters}>
          <Chip label="All" size="sm" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {STATUSES.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              size="sm"
              selected={filter === item.value}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </View>
        {filtered.length ? (
          <Card padded={false} style={styles.listCard}>
            {filtered.map((topic, index) => (
              <Pressable
                key={topic.id}
                onPress={() => openTopic(topic)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${topic.title}`}
                style={[
                  styles.topicRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                ]}
              >
                <View
                  style={[
                    styles.topicMark,
                    {
                      backgroundColor:
                        topic.status === 'completed'
                          ? subject.color
                          : topic.status === 'learning'
                            ? theme.colors.primarySoft
                            : theme.colors.surfaceMuted,
                    },
                  ]}
                >
                  {topic.status === 'completed' ? (
                    <Check size={13} color="#FFFFFF" strokeWidth={2.6} />
                  ) : (
                    <AppText variant="caption" color={theme.colors.textMuted}>
                      {topic.confidence}
                    </AppText>
                  )}
                </View>
                <View style={styles.topicText}>
                  <AppText
                    variant="smallStrong"
                    numberOfLines={2}
                    color={topic.status === 'completed' ? theme.colors.textMuted : theme.colors.text}
                  >
                    {topic.title}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textMuted}>
                    {STATUS_LABEL[topic.status]}
                    {topic.practiceDone ? ' · practiced' : ''}
                    {topic.revisionDone ? ' · revised' : ''}
                  </AppText>
                </View>
                <ChevronRight size={16} color={theme.colors.textFaint} />
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={<BookOpen size={22} color={theme.colors.primary} />}
              title={topics.length ? 'Nothing in this filter' : 'No topics yet'}
              message={
                topics.length
                  ? 'Try another status or add a topic.'
                  : 'Break the syllabus into small, named topics. Add the first one now.'
              }
              actionLabel={topics.length ? undefined : 'Add first topic'}
              onAction={topics.length ? undefined : openNewTopic}
            />
          </Card>
        )}
      </View>

      <Card tone="sage" style={styles.note}>
        <AppText variant="caption" color={theme.colors.textMuted}>
          How to use confidence
        </AppText>
        <AppText variant="small">
          1 means “I would not attempt this yet.” 5 means “I can explain and solve it without
          notes.” Update it honestly after practice — it is a signal, not a label.
        </AppText>
      </Card>

      <SheetModal
        visible={topicOpen}
        title={editing ? 'Edit topic' : 'Add a topic'}
        subtitle="Keep the title specific enough to act on."
        onClose={() => setTopicOpen(false)}
      >
        <TextField
          label="Topic"
          placeholder="e.g. Newton–Raphson method"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />
        <View style={styles.group}>
          <AppText variant="smallStrong">Status</AppText>
          <View style={styles.wrap}>
            {STATUSES.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                size="sm"
                selected={status === item.value}
                onPress={() => setStatus(item.value)}
              />
            ))}
          </View>
        </View>
        <View style={styles.group}>
          <AppText variant="smallStrong">Confidence</AppText>
          <View style={styles.wrap}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Chip
                key={value}
                label={String(value)}
                size="sm"
                selected={confidence === value}
                onPress={() => setConfidence(value)}
              />
            ))}
          </View>
        </View>
        <View style={styles.group}>
          <AppText variant="smallStrong">Done so far</AppText>
          <View style={styles.wrap}>
            <Chip
              label="Practiced"
              size="sm"
              selected={practiceDone}
              onPress={() => setPracticeDone(!practiceDone)}
            />
            <Chip
              label="Revised"
              size="sm"
              selected={revisionDone}
              onPress={() => setRevisionDone(!revisionDone)}
            />
          </View>
        </View>
        <TextField
          label="Notes"
          placeholder="A definition, a question, a page reference."
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <Button label={editing ? 'Save topic' : 'Add topic'} onPress={saveTopic} loading={saving} fullWidth />
        {editing ? (
          <Button
            label="Remove topic"
            variant="danger"
            size="sm"
            onPress={removeTopic}
            icon={<Trash2 size={14} color={theme.colors.error} />}
            fullWidth
          />
        ) : null}
      </SheetModal>

      <SheetModal
        visible={subjectOpen}
        title="Edit subject"
        subtitle="Allocations guide attention; they are not a contract."
        onClose={() => setSubjectOpen(false)}
      >
        <TextField
          label="Planned share of study time (%)"
          value={allocation}
          onChangeText={setAllocation}
          keyboardType="number-pad"
          helper="Aim for the three shares to total roughly 100%."
        />
        <TextField
          label="Exam date"
          placeholder="YYYY-MM-DD"
          value={examDate}
          onChangeText={setExamDate}
          autoCapitalize="none"
        />
        <TextField
          label="Exam time"
          placeholder="11:00"
          value={examTime}
          onChangeText={setExamTime}
          keyboardType="numbers-and-punctuation"
        />
        <View style={styles.group}>
          <AppText variant="smallStrong">Subject confidence</AppText>
          <View style={styles.wrap}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Chip
                key={value}
                label={String(value)}
                size="sm"
                selected={subjectConfidence === value}
                onPress={() => setSubjectConfidence(value)}
              />
            ))}
          </View>
        </View>
        <TextField
          label="Notes"
          placeholder="Exam pattern, resources, or anything to remember."
          value={subjectNotes}
          onChangeText={setSubjectNotes}
          multiline
        />
        <Button label="Save subject" onPress={saveSubject} loading={saving} fullWidth />
      </SheetModal>

      <StudySessionSheet
        visible={logOpen}
        subjects={[subject]}
        defaultSubjectId={subject.id}
        onClose={() => setLogOpen(false)}
        onSaved={() => data.refetch()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  editButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 10 },
  progressBlock: { gap: 5, marginTop: 2 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroMeta: { flexDirection: 'row', gap: 10, marginTop: 2 },
  metaItem: { flex: 1, gap: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  section: { gap: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  listCard: { overflow: 'hidden' },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  topicMark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  topicText: { flex: 1, gap: 2 },
  note: { gap: 4 },
  group: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});
