import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import { addManualGoal } from '@/db/repositories/goals';
import { todayKey } from '@/lib/date';
import { showToast } from '@/lib/toastBus';
import { successFeedback } from '@/lib/haptics';
import type { Category, GoalKind } from '@/types';
import { SheetModal } from '@/components/ui/SheetModal';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { AppText } from '@/components/ui/AppText';
import { CategoryIcon } from '@/components/CategoryIcon';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'study', label: 'Study' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'career', label: 'Project' },
  { value: 'personal', label: 'Personal' },
  { value: 'sleep', label: 'Sleep' },
];

const schema = z.object({
  title: z.string().trim().min(2, 'Give this goal a short name.').max(80, 'Keep it under 80 characters.'),
  category: z.enum(['study', 'fitness', 'career', 'sleep', 'personal']),
  estMinutes: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 5 && Number(value) <= 480),
      'Use 5 to 480 minutes.',
    ),
  scheduledTime: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^([01]?\d|2[0-3]):[0-5]\d$/.test(value),
      'Use a time like 09:30.',
    ),
  kind: z.enum(['core', 'optional']),
});

type FormValues = z.infer<typeof schema>;

interface AddGoalSheetProps {
  visible: boolean;
  date: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function AddGoalSheet({ visible, date, onClose, onSaved }: AddGoalSheetProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const refresh = useAppStore((state) => state.refresh);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      category: 'study',
      estMinutes: '30',
      scheduledTime: '',
      kind: 'optional',
    },
  });

  const category = watch('category');
  const kind = watch('kind');

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    const normalizedTime = values.scheduledTime
      ? values.scheduledTime.replace(/^(\d):/, '0$1:')
      : null;
    await addManualGoal({
      date,
      title: values.title,
      category: values.category,
      estMinutes: values.estMinutes ? Number(values.estMinutes) : 0,
      scheduledTime: normalizedTime,
      kind: values.kind,
    });
    await queryClient.invalidateQueries({ queryKey: ['day-plan', date] });
    if (date === todayKey()) await refresh();
    successFeedback();
    showToast('Goal added to your day.', 'success');
    onSaved?.();
    close();
  };

  return (
    <SheetModal
      visible={visible}
      title="Add a goal"
      subtitle={date === todayKey() ? 'For today only. Keep it small and specific.' : `For ${date}.`}
      onClose={close}
    >
      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField
            label="What do you want to do?"
            placeholder="e.g. Revise 3 numerical methods questions"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.title?.message}
            autoFocus
            returnKeyType="done"
          />
        )}
      />

      <View style={styles.group}>
        <AppText variant="smallStrong">Category</AppText>
        <View style={styles.wrap}>
          {CATEGORIES.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              size="sm"
              selected={category === item.value}
              onPress={() => setValue('category', item.value)}
              icon={<CategoryIcon category={item.value} size={12} boxSize={18} />}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="smallStrong">Type</AppText>
        <View style={styles.wrap}>
          {(['core', 'optional'] as GoalKind[]).map((value) => (
            <Chip
              key={value}
              label={value === 'core' ? 'Essential' : 'Optional'}
              size="sm"
              selected={kind === value}
              onPress={() => setValue('kind', value)}
            />
          ))}
        </View>
        <AppText variant="caption" color={theme.colors.textFaint}>
          Essential goals count toward your day. Optional ones never add pressure.
        </AppText>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Controller
            control={control}
            name="estMinutes"
            render={({ field }) => (
              <TextField
                label="Minutes"
                placeholder="30"
                keyboardType="number-pad"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.estMinutes?.message}
              />
            )}
          />
        </View>
        <View style={styles.half}>
          <Controller
            control={control}
            name="scheduledTime"
            render={({ field }) => (
              <TextField
                label="Start time"
                placeholder="09:30"
                keyboardType="numbers-and-punctuation"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.scheduledTime?.message}
              />
            )}
          />
        </View>
      </View>

      <Button
        label="Add to today"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        fullWidth
        style={styles.save}
      />
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  save: { marginTop: 4 },
});
