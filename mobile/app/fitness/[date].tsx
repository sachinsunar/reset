import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Check, Dumbbell, Footprints, Moon, ShieldAlert, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import {
  deleteWorkoutLogForDate,
  getWorkoutLogForDate,
  upsertWorkoutLog,
} from '@/db/repositories/fitness';
import {
  exercisesForIntensity,
  SAFETY_NOTE,
  workoutForDate,
} from '@/lib/fitness';
import { formatDateKey, formatDuration, isValidDateKey, todayKey } from '@/lib/date';
import { showToast } from '@/lib/toastBus';
import { successFeedback } from '@/lib/haptics';
import type { WorkoutLog } from '@/types';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingState } from '@/components/ui/States';

const INTENSITIES: { value: WorkoutLog['intensity']; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Hard' },
];

export default function WorkoutDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const today = todayKey();
  const date = params.date && isValidDateKey(params.date) ? params.date : today;
  const plan = workoutForDate(date);
  const [easy, setEasy] = useState(false);
  const [minutes, setMinutes] = useState(String(plan.durationMin || 15));
  const [distance, setDistance] = useState('');
  const [intensity, setIntensity] = useState<WorkoutLog['intensity']>('normal');
  const [notes, setNotes] = useState('');
  const [addMovement, setAddMovement] = useState(false);
  const [saving, setSaving] = useState(false);

  const logQuery = useQuery({
    queryKey: ['workout-log', date, plan.key],
    queryFn: () => getWorkoutLogForDate(date, plan.key),
  });
  const existing = logQuery.data;

  useEffect(() => {
    setMinutes(String(existing?.durationMin || plan.durationMin || 15));
    setDistance(existing?.distanceKm ? String(existing.distanceKm) : '');
    setIntensity(existing?.intensity ?? 'normal');
    setNotes(existing?.notes ?? '');
    setEasy(false);
    setAddMovement(false);
  }, [existing, plan.durationMin]);

  const isFuture = date > today;
  const isRest = plan.kind === 'rest';
  const includeMovement = !isRest || addMovement;
  const exercises = exercisesForIntensity(plan, easy);
  const Icon = isRest ? Moon : plan.kind === 'strength' ? Dumbbell : Footprints;

  const save = async () => {
    const minutesValue = Number(minutes);
    if (includeMovement && (!Number.isFinite(minutesValue) || minutesValue < 1 || minutesValue > 300)) {
      showToast('Use 1 to 300 minutes.', 'warning');
      return;
    }
    const distanceValue = distance.trim() ? Number(distance) : null;
    if (distanceValue != null && (!Number.isFinite(distanceValue) || distanceValue < 0)) {
      showToast('Distance should be a positive number.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await upsertWorkoutLog({
        date,
        workoutKey: plan.key,
        title: isRest ? 'Gentle walk' : plan.title,
        kind: isRest ? 'walk' : plan.kind,
        durationMin: includeMovement ? minutesValue : 0,
        distanceKm: includeMovement ? distanceValue : null,
        intensity: includeMovement ? intensity : 'easy',
        completed: true,
        notes: notes.trim(),
      });
      await logQuery.refetch();
      await successFeedback();
      showToast('Workout logged. Movement counts.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await deleteWorkoutLogForDate(date, plan.key);
      await logQuery.refetch();
      showToast('Workout log removed.', 'info');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header
        title={plan.title}
        subtitle={formatDateKey(date, { weekday: 'long', month: 'long', day: 'numeric' })}
      />

      <Card tone={isRest ? 'amber' : 'surface'} style={styles.hero}>
        <View style={styles.heroTop}>
          <View
            style={[
              styles.icon,
              { backgroundColor: isRest ? theme.colors.surface : theme.colors.primarySoft },
            ]}
          >
            <Icon size={24} color={isRest ? theme.colors.amber : theme.colors.primary} />
          </View>
          <View style={styles.heroText}>
            <AppText variant="bodyStrong">{plan.focus}</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              {plan.durationMin ? `${formatDuration(plan.durationMin)} · ` : ''}
              {plan.kind === 'rest' ? 'Recovery is training' : `Session ${plan.kind}`}
            </AppText>
          </View>
          {existing ? (
            <View style={[styles.logged, { backgroundColor: theme.colors.primarySoft }]}>
              <Check size={12} color={theme.colors.primary} />
              <AppText variant="caption" color={theme.colors.primary}>
                Logged
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="small" color={theme.colors.textMuted}>
          {plan.guidance}
        </AppText>
      </Card>

      {isRest && !addMovement ? (
        <Card style={styles.restCard}>
          <AppText variant="bodyStrong">Nothing is required today.</AppText>
          <AppText variant="small" color={theme.colors.textMuted}>
            If you feel like moving, a gentle walk or a few stretches is plenty. Otherwise, rest
            without earning it.
          </AppText>
          <Button
            label="Add an optional gentle walk"
            variant="soft"
            size="sm"
            onPress={() => {
              setAddMovement(true);
              setMinutes('15');
            }}
          />
        </Card>
      ) : null}

      {plan.exercises.length ? (
        <View style={styles.section}>
          <SectionHeader
            title="Session"
            actionLabel={easy ? 'Standard version' : 'Easy version'}
            onAction={() => setEasy(!easy)}
          />
          <Card padded={false} style={styles.listCard}>
            {exercises.map((exercise, index) => (
              <View
                key={exercise.name}
                style={[
                  styles.exercise,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                ]}
              >
                <View style={styles.setBadge}>
                  <AppText variant="caption" color={theme.colors.primary}>
                    {exercise.sets}×
                  </AppText>
                </View>
                <View style={styles.exerciseText}>
                  <AppText variant="smallStrong">{exercise.name}</AppText>
                  <AppText variant="caption" color={theme.colors.textMuted}>
                    {exercise.reps}
                  </AppText>
                  {exercise.note ? (
                    <AppText variant="caption" color={theme.colors.textFaint}>
                      {exercise.note}
                    </AppText>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
          <AppText variant="caption" color={theme.colors.textFaint}>
            {easy
              ? 'Easy version selected. Fewer reps, same intention.'
              : 'Standard version. Stop a rep or two before failure.'}
          </AppText>
        </View>
      ) : null}

      {includeMovement ? (
        <View style={styles.section}>
          <SectionHeader title={existing ? 'Update your log' : 'Log what you did'} />
          <Card style={styles.form}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label="Minutes"
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="number-pad"
                  placeholder="20"
                />
              </View>
              {plan.kind === 'run' || plan.kind === 'walk' || isRest ? (
                <View style={styles.flex}>
                  <TextField
                    label="Distance (km, optional)"
                    value={distance}
                    onChangeText={setDistance}
                    keyboardType="decimal-pad"
                    placeholder="2.5"
                  />
                </View>
              ) : null}
            </View>
            <View style={styles.group}>
              <AppText variant="smallStrong">Intensity</AppText>
              <View style={styles.wrap}>
                {INTENSITIES.map((item) => (
                  <Chip
                    key={item.value}
                    label={item.label}
                    size="sm"
                    selected={intensity === item.value}
                    onPress={() => setIntensity(item.value)}
                  />
                ))}
              </View>
            </View>
            <TextField
              label="Notes (optional)"
              placeholder="How did it feel? Anything to remember?"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            {isFuture ? (
              <AppText variant="caption" color={theme.colors.amber}>
                This day has not happened yet. You can preview the session, but not log it.
              </AppText>
            ) : (
              <Button
                label={existing ? 'Update workout log' : 'Save workout log'}
                onPress={save}
                loading={saving}
                fullWidth
              />
            )}
            {existing ? (
              <Button
                label="Remove log"
                variant="danger"
                size="sm"
                onPress={remove}
                loading={saving}
                icon={<Trash2 size={14} color={theme.colors.error} />}
                fullWidth
              />
            ) : null}
          </Card>
        </View>
      ) : null}

      {existing ? (
        <Card tone="sage" style={styles.savedCard}>
          <AppText variant="smallStrong">Saved for this day</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            {existing.title} · {existing.durationMin ? formatDuration(existing.durationMin) : 'Rest'} ·{' '}
            {existing.intensity}
            {existing.distanceKm ? ` · ${existing.distanceKm.toFixed(1)} km` : ''}
          </AppText>
          {existing.notes ? (
            <AppText variant="caption" color={theme.colors.textMuted}>
              {existing.notes}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      <Card tone="amber" style={styles.safety}>
        <View style={styles.safetyHead}>
          <ShieldAlert size={16} color={theme.colors.amber} />
          <AppText variant="smallStrong">Listen first</AppText>
        </View>
        <AppText variant="caption" color={theme.colors.textMuted}>
          {SAFETY_NOTE}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  hero: { gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: 2 },
  logged: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  restCard: { gap: 10 },
  section: { gap: 10 },
  listCard: { overflow: 'hidden' },
  exercise: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  setBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0DDFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseText: { flex: 1, gap: 1 },
  form: { gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  group: { gap: 7 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  savedCard: { gap: 3 },
  safety: { gap: 6 },
  safetyHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
});
