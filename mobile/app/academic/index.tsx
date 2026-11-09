import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, Clock, GraduationCap, Plus, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import {
  getAcademicStats,
  getSubjects,
  getTopics,
  getStudySessions,
} from '@/db/repositories/academic';
import { addDays, diffDays, formatDateKey, formatDuration, todayKey } from '@/lib/date';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/States';
import { StudySessionSheet } from '@/features/academic/StudySessionSheet';

export default function AcademicDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const today = todayKey();
  const [logOpen, setLogOpen] = useState(false);

  const data = useQuery({
    queryKey: ['academic-overview', today],
    queryFn: async () => {
      const [subjects, topics, stats, sessions] = await Promise.all([
        getSubjects(),
        getTopics(),
        getAcademicStats(),
        getStudySessions(addDays(today, -13), today),
      ]);
      return { subjects, topics, stats, sessions };
    },
    staleTime: 15_000,
  });

  const subjects = data.data?.subjects ?? [];
  const topics = data.data?.topics ?? [];
  const stats = data.data?.stats;
  const sessions = data.data?.sessions ?? [];
  const weeklyTotal = stats?.minutesWeek ?? 0;
  const nextExam = subjects
    .filter((subject) => subject.examDate)
    .sort((a, b) => (a.examDate ?? '').localeCompare(b.examDate ?? ''))[0];
  const daysToExam = nextExam?.examDate ? diffDays(today, nextExam.examDate) : null;
  const overallTopics = topics.length;
  const overallComplete = topics.filter((topic) => topic.status === 'completed').length;

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header title="Academic" subtitle="BCA backlog · steady, not heroic" />

      <Card tone="hero" style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroText}>
            <AppText variant="caps" color={theme.colors.heroMuted}>
              Weekly study
            </AppText>
            <AppText variant="display" color={theme.colors.heroText}>
              {formatDuration(weeklyTotal)}
            </AppText>
            <AppText variant="small" color={theme.colors.heroMuted}>
              {stats?.minutesToday
                ? `${formatDuration(stats.minutesToday)} today · keep it sustainable`
                : 'No time logged today yet.'}
            </AppText>
          </View>
          <GraduationCap size={42} color="rgba(122,40,168,0.28)" strokeWidth={1.4} />
        </View>
        <View style={styles.heroBottom}>
          <View style={styles.heroStat}>
            <AppText variant="heading" color={theme.colors.heroText}>
              {overallComplete}/{overallTopics || 0}
            </AppText>
            <AppText variant="caption" color={theme.colors.heroMuted}>
              syllabus topics
            </AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.heroStat}>
            <AppText variant="heading" color={theme.colors.heroText}>
              {nextExam && daysToExam != null
                ? daysToExam >= 0
                  ? `${daysToExam}d`
                  : 'Done'
                : '—'}
            </AppText>
            <AppText variant="caption" color={theme.colors.heroMuted}>
              {nextExam?.examDate
                ? `to ${nextExam.code || nextExam.name}`
                : 'set an exam date'}
            </AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.heroStat}>
            <AppText variant="heading" color={theme.colors.heroText}>
              {stats?.sessionsTotal ?? 0}
            </AppText>
            <AppText variant="caption" color={theme.colors.heroMuted}>
              total sessions
            </AppText>
          </View>
        </View>
      </Card>

      <View style={styles.tiles}>
        <StatTile
          label="Today"
          value={formatDuration(stats?.minutesToday ?? 0)}
          hint="Study logged"
          icon={<Clock size={15} color={theme.colors.sage} />}
        />
        <StatTile
          label="This week"
          value={formatDuration(weeklyTotal)}
          hint={`${sessions.length} sessions in 14 days`}
          icon={<BookOpen size={15} color={theme.colors.sage} />}
        />
        <StatTile
          label="Completed"
          value={`${overallComplete}`}
          hint={`${overallTopics} topics configured`}
          icon={<Sparkles size={15} color={theme.colors.sage} />}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Log study time"
          icon={<Plus size={16} color={theme.colors.primaryText} />}
          onPress={() => setLogOpen(true)}
          fullWidth
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Allocation check"
          caption="Planned share vs time actually studied this week"
        />
        <Card style={styles.card}>
          {subjects.map((subject, index) => {
            const subjectTopics = topics.filter((topic) => topic.subjectId === subject.id);
            const completed = subjectTopics.filter((topic) => topic.status === 'completed').length;
            const studied = stats?.bySubject.find((row) => row.subjectId === subject.id)?.minutes ?? 0;
            const actualShare = weeklyTotal ? studied / weeklyTotal : 0;
            return (
              <Pressable
                key={subject.id}
                onPress={() => router.push(`/academic/subject/${subject.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${subject.name}`}
                style={[
                  styles.subject,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                ]}
              >
                <View style={styles.subjectTop}>
                  <View style={[styles.dot, { backgroundColor: subject.color }]} />
                  <View style={styles.subjectText}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {subject.name}
                    </AppText>
                    <AppText variant="caption" color={theme.colors.textMuted}>
                      {subject.code} · {completed}/{subjectTopics.length || 0} topics
                    </AppText>
                  </View>
                  <View style={styles.share}>
                    <AppText variant="smallStrong" color={theme.colors.primary}>
                      {Math.round(subject.allocation * 100)}%
                    </AppText>
                    <AppText variant="caption" color={theme.colors.textFaint}>
                      target
                    </AppText>
                  </View>
                  <ChevronRight size={16} color={theme.colors.textFaint} />
                </View>
                <ProgressBar progress={actualShare} color={subject.color} height={6} />
                <View style={styles.shareMeta}>
                  <AppText variant="caption" color={theme.colors.textFaint}>
                    {studied ? `${Math.round(actualShare * 100)}% of this week` : 'No time this week'}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textFaint}>
                    {subjectTopics.length
                      ? `${Math.round((completed / subjectTopics.length) * 100)}% syllabus`
                      : 'Add topics to begin'}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
          {!subjects.length && !data.isLoading ? (
            <EmptyState
              icon={<BookOpen size={22} color={theme.colors.primary} />}
              title="No subjects"
              message="Your subjects will appear here after setup."
            />
          ) : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Recent study"
          actionLabel={sessions.length ? 'Log another' : undefined}
          onAction={sessions.length ? () => setLogOpen(true) : undefined}
        />
        {data.isLoading ? (
          <LoadingState label="Loading study sessions…" />
        ) : sessions.length ? (
          <Card padded={false} style={styles.listCard}>
            {sessions.slice(0, 8).map((session, index) => {
              const subject = subjects.find((item) => item.id === session.subjectId);
              return (
                <View
                  key={session.id}
                  style={[
                    styles.sessionRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  ]}
                >
                  <View style={[styles.sessionIcon, { backgroundColor: subject?.color ? `${subject.color}22` : theme.colors.surfaceMuted }]}>
                    <BookOpen size={16} color={subject?.color ?? theme.colors.textMuted} />
                  </View>
                  <View style={styles.sessionText}>
                    <AppText variant="smallStrong" numberOfLines={1}>
                      {subject?.name ?? 'General study'} · {session.kind}
                    </AppText>
                    <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                      {session.notes || formatDateKey(session.day, { month: 'short', day: 'numeric' })}
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
            <EmptyState
              icon={<BookOpen size={22} color={theme.colors.primary} />}
              title="No sessions yet"
              message="Log the first one when you finish. Small sessions count."
              actionLabel="Log study time"
              onAction={() => setLogOpen(true)}
            />
          </Card>
        )}
      </View>

      <Card tone="sage" style={styles.note}>
        <AppText variant="caption" color={theme.colors.textMuted}>
          Backlog rule
        </AppText>
        <AppText variant="smallStrong">
          Start with the topic that feels least clear. One question, one page, then decide what is
          next.
        </AppText>
      </Card>

      <StudySessionSheet
        visible={logOpen}
        subjects={subjects}
        onClose={() => setLogOpen(false)}
        onSaved={() => data.refetch()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  hero: { gap: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroText: { flex: 1, gap: 4 },
  heroBottom: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, gap: 1 },
  divider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(23,23,23,0.16)' },
  tiles: { flexDirection: 'row', gap: 8 },
  actions: { gap: 8 },
  section: { gap: 10 },
  card: { gap: 14 },
  subject: { gap: 7 },
  subjectTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subjectText: { flex: 1, gap: 1 },
  share: { alignItems: 'flex-end' },
  shareMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  listCard: { overflow: 'hidden' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  sessionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sessionText: { flex: 1, gap: 1 },
  note: { gap: 4 },
});
