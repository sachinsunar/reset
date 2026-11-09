import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Moon, NotebookPen, Sparkles, Sun, Zap } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import { getJournalEntry, getJournalEntries, saveJournalEntry } from '@/db/repositories/journal';
import { formatDateKey, relativeDayLabel } from '@/lib/date';
import { showToast } from '@/lib/toastBus';
import { successFeedback } from '@/lib/haptics';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Chip } from '@/components/ui/Chip';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SheetModal } from '@/components/ui/SheetModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/States';
import type { JournalEntry } from '@/types';

const schema = z
  .object({
    accomplished: z.string().max(2000, 'Keep this under 2000 characters.'),
    difficult: z.string().max(2000, 'Keep this under 2000 characters.'),
    improve: z.string().max(2000, 'Keep this under 2000 characters.'),
    freeText: z.string().max(4000, 'Keep this under 4000 characters.'),
  })
  .refine(
    (values) =>
      [values.accomplished, values.difficult, values.improve, values.freeText].some(
        (value) => value.trim().length > 0,
      ),
    { message: 'Write at least one line before saving.', path: ['accomplished'] },
  );

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = { accomplished: '', difficult: '', improve: '', freeText: '' };

export default function JournalScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const today = useAppStore((state) => state.today);
  const checkIn = useAppStore((state) => state.checkIn);
  const [viewing, setViewing] = useState<JournalEntry | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const entryQuery = useQuery({
    queryKey: ['journal-entry', today],
    queryFn: () => getJournalEntry(today),
  });
  const historyQuery = useQuery({
    queryKey: ['journal-history', today],
    queryFn: () => getJournalEntries(60),
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    const entry = entryQuery.data;
    if (entry) {
      reset({
        accomplished: entry.accomplished,
        difficult: entry.difficult,
        improve: entry.improve,
        freeText: entry.freeText,
      });
      setSavedAt(entry.updatedAt);
    }
  }, [entryQuery.data, reset]);

  const values = watch();
  const hasContent = useMemo(
    () => Object.values(values).some((value) => value.trim().length > 0),
    [values],
  );

  const onSubmit = async (form: FormValues) => {
    const entry = await saveJournalEntry(today, form);
    setSavedAt(entry.updatedAt);
    successFeedback();
    showToast('Saved. This is for you, not for a score.', 'success');
    await entryQuery.refetch();
    await historyQuery.refetch();
    reset(form);
  };

  const history = (historyQuery.data ?? []).filter(
    (entry) =>
      entry.date !== today &&
      (entry.accomplished || entry.difficult || entry.improve || entry.freeText),
  );

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="caption" color={theme.colors.textMuted}>
            {formatDateKey(today, { weekday: 'long', month: 'long', day: 'numeric' })}
          </AppText>
          <AppText variant="display">Journal</AppText>
          <AppText variant="small" color={theme.colors.textMuted}>
            A quiet place to notice, not to judge.
          </AppText>
        </View>
        <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft }]}>
          <NotebookPen size={20} color={theme.colors.primary} />
        </View>
      </View>

      {checkIn ? (
        <Card tone="sage" style={styles.checkIn}>
          <View style={styles.checkInTop}>
            <Sparkles size={15} color={theme.colors.primary} />
            <AppText variant="caption" color={theme.colors.textMuted}>
              Today’s check-in
            </AppText>
            <Pressable
              onPress={() => router.push('/')}
              accessibilityRole="button"
              style={styles.editCheckIn}
            >
              <AppText variant="caption" color={theme.colors.primary}>
                Update on Home
              </AppText>
            </Pressable>
          </View>
          <View style={styles.checkInChips}>
            <CheckInPill icon={<Zap size={12} color={theme.colors.primary} />} label="Energy" value={checkIn.energy} />
            <CheckInPill icon={<Sun size={12} color={theme.colors.primary} />} label="Mood" value={checkIn.mood} />
            <CheckInPill icon={<Moon size={12} color={theme.colors.primary} />} label="Sleep" value={checkIn.sleep} />
          </View>
        </Card>
      ) : null}

      <Card style={styles.formCard}>
        <View style={styles.formHead}>
          <View>
            <AppText variant="heading">Evening reflection</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              Three lines is plenty. Every field is optional.
            </AppText>
          </View>
          {hasContent ? (
            <Chip label="Unsaved changes" size="sm" selected={isDirty} />
          ) : null}
        </View>

        <Controller
          control={control}
          name="accomplished"
          render={({ field }) => (
            <TextField
              label="What went right today?"
              placeholder="Even something small counts."
              multiline
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.accomplished?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="difficult"
          render={({ field }) => (
            <TextField
              label="What felt difficult?"
              placeholder="Name it without turning it into a verdict."
              multiline
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="improve"
          render={({ field }) => (
            <TextField
              label="What would help tomorrow?"
              placeholder="One adjustment, not a whole new life plan."
              multiline
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="freeText"
          render={({ field }) => (
            <TextField
              label={params.mode === 'note' ? 'Quick note' : 'Anything else'}
              placeholder="Free writing, a thought, a question."
              multiline
              autoFocus={params.mode === 'note'}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.freeText?.message}
            />
          )}
        />
        <Button
          label="Save reflection"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          fullWidth
        />
        {savedAt ? (
          <AppText variant="caption" color={theme.colors.textFaint} align="center">
            Last saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </AppText>
        ) : null}
      </Card>

      <View style={styles.section}>
        <SectionHeader
          title="Recent reflections"
          caption={history.length ? 'Look back without keeping score.' : undefined}
        />
        {historyQuery.isLoading ? (
          <LoadingState label="Opening your journal…" />
        ) : history.length ? (
          <View style={styles.history}>
            {history.slice(0, 14).map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => setViewing(entry)}
                accessibilityRole="button"
                accessibilityLabel={`Open reflection from ${entry.date}`}
                style={[
                  styles.historyRow,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.historyDate}>
                  <AppText variant="bodyStrong">{Number(entry.date.slice(8, 10))}</AppText>
                  <AppText variant="caption" color={theme.colors.textMuted}>
                    {formatDateKey(entry.date, { month: 'short' })}
                  </AppText>
                </View>
                <View style={styles.historyText}>
                  <AppText variant="smallStrong" numberOfLines={1}>
                    {entry.accomplished || entry.freeText || 'A quiet note'}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={2}>
                    {entry.difficult || entry.improve || entry.freeText || 'Saved reflection'}
                  </AppText>
                </View>
                <AppText variant="caption" color={theme.colors.textFaint}>
                  {relativeDayLabel(entry.date, today)}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : (
          <Card>
            <EmptyState
              icon={<BookOpen size={22} color={theme.colors.primary} />}
              title="Your journal is open"
              message="Reflections you save will appear here. No streak or quota is attached."
            />
          </Card>
        )}
      </View>

      <SheetModal
        visible={Boolean(viewing)}
        title={viewing ? formatDateKey(viewing.date, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Reflection'}
        onClose={() => setViewing(null)}
      >
        {viewing ? (
          <View style={styles.viewBody}>
            <ViewEntry label="What went right" value={viewing.accomplished} />
            <ViewEntry label="What felt difficult" value={viewing.difficult} />
            <ViewEntry label="What would help tomorrow" value={viewing.improve} />
            <ViewEntry label="Anything else" value={viewing.freeText} />
          </View>
        ) : null}
      </SheetModal>
    </Screen>
  );
}

function CheckInPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.surface }]}>
      {icon}
      <AppText variant="caption" color={theme.colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="caption" color={theme.colors.text}>
        {value ? value.charAt(0).toUpperCase() + value.slice(1) : '—'}
      </AppText>
    </View>
  );
}

function ViewEntry({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  if (!value.trim()) return null;
  return (
    <View style={styles.viewEntry}>
      <AppText variant="caption" color={theme.colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="small">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 8 },
  headerText: { flex: 1, gap: 3 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  checkIn: { gap: 9 },
  checkInTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editCheckIn: { marginLeft: 'auto' },
  checkInChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  formCard: { gap: 16 },
  formHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  section: { gap: 10 },
  history: { gap: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  historyDate: { alignItems: 'center', width: 34 },
  historyText: { flex: 1, gap: 2 },
  viewBody: { gap: 16, paddingBottom: 12 },
  viewEntry: { gap: 3 },
});
