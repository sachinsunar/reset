import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Check, Lock, Moon, Sunrise } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import type { ThemeMode } from '@/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

const schema = z.object({
  name: z.string().trim().min(2, 'What should we call you?').max(40),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email.'),
  wakeTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Use a time like 06:30.'),
  bedtime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Use a time like 22:30.'),
  streakThreshold: z.number().min(0.5).max(1),
  restDaysPerWeek: z.number().min(0).max(3),
  learningDays: z.array(z.number()).min(1, 'Choose at least one project day.'),
  themeMode: z.enum(['system', 'light', 'dark']),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ['Welcome', 'You', 'Rhythm', 'Focus'];

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const finishOnboarding = useAppStore((state) => state.finishOnboarding);
  const [step, setStep] = useState(0);
  const {
    control,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      wakeTime: '06:30',
      bedtime: '22:30',
      streakThreshold: 0.7,
      restDaysPerWeek: 1,
      learningDays: [1, 3, 5],
      themeMode: 'system',
    },
  });

  const learningDays = watch('learningDays');
  const threshold = watch('streakThreshold');
  const restDays = watch('restDaysPerWeek');
  const themeMode = watch('themeMode');
  const wakeTime = watch('wakeTime');
  const bedtime = watch('bedtime');

  const next = async () => {
    if (step === 1) {
      const valid = await trigger(['name', 'email']);
      if (!valid) return;
    }
    if (step === 2) {
      const valid = await trigger(['wakeTime', 'bedtime', 'learningDays']);
      if (!valid) return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const submit = async (values: FormValues) => {
    await finishOnboarding({
      name: values.name,
      email: values.email || undefined,
      wakeTime: normalizeTime(values.wakeTime),
      bedtime: normalizeTime(values.bedtime),
      learningDays: values.learningDays,
      streakThreshold: values.streakThreshold,
      restDaysPerWeek: values.restDaysPerWeek,
      themeMode: values.themeMode,
    });
    router.replace('/(tabs)');
  };

  return (
    <Screen
      scroll
      edges={['top', 'bottom']}
      bottomPadding={32}
      contentContainerStyle={styles.content}
    >
      <View style={styles.topBar}>
        <View style={styles.dots}>
          {STEPS.map((label, index) => (
            <View
              key={label}
              style={[
                styles.dot,
                {
                  backgroundColor: index <= step ? theme.colors.primary : theme.colors.surfaceStrong,
                  width: index === step ? 22 : 7,
                },
              ]}
            />
          ))}
        </View>
        <AppText variant="caption" color={theme.colors.textMuted}>
          {step + 1} of {STEPS.length}
        </AppText>
      </View>

      {step === 0 ? (
        <View style={styles.step}>
          <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
            <Sunrise size={30} color={theme.colors.primaryText} strokeWidth={1.7} />
          </View>
          <View style={styles.titleBlock}>
            <AppText variant="display">Start again, without starting over.</AppText>
            <AppText variant="body" color={theme.colors.textMuted}>
              Reset is a calm, local-first space for rebuilding a routine, clearing a backlog,
              moving your body, and learning something new.
            </AppText>
          </View>
          <View style={styles.points}>
            {[
              'A daily plan that changes with your phase',
              'Progress measured with rest built in',
              'Everything works offline; sync is optional',
            ].map((point) => (
              <View key={point} style={styles.point}>
                <View style={[styles.check, { backgroundColor: theme.colors.primarySoft }]}>
                  <Check size={13} color={theme.colors.primary} strokeWidth={2.4} />
                </View>
                <AppText variant="small" style={styles.pointText}>
                  {point}
                </AppText>
              </View>
            ))}
          </View>
          <Card tone="sage" style={styles.privacy}>
            <Lock size={16} color={theme.colors.primary} />
            <AppText variant="caption" color={theme.colors.textMuted} style={styles.pointText}>
              Your data is stored on this device. No account, feed, or social pressure.
            </AppText>
          </Card>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.step}>
          <View style={styles.titleBlock}>
            <AppText variant="display">What should we call you?</AppText>
            <AppText variant="small" color={theme.colors.textMuted}>
              A first name is enough. This stays on your device.
            </AppText>
          </View>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <TextField
                label="Name"
                placeholder="Your first name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.name?.message}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label="Email (optional)"
                placeholder="For optional backup and sync"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />
          <AppText variant="caption" color={theme.colors.textFaint}>
            You can skip email. Backup is opt-in and only used if you connect the sync service.
          </AppText>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.step}>
          <View style={styles.titleBlock}>
            <AppText variant="display">Build the day around your rhythm.</AppText>
            <AppText variant="small" color={theme.colors.textMuted}>
              These are starting points. Every time can be edited later.
            </AppText>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeHalf}>
              <Controller
                control={control}
                name="wakeTime"
                render={({ field }) => (
                  <TextField
                    label="Wake up"
                    placeholder="06:30"
                    keyboardType="numbers-and-punctuation"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.wakeTime?.message}
                  />
                )}
              />
              <View style={styles.quickRow}>
                {['05:30', '06:00', '06:30', '07:00'].map((time) => (
                  <Chip
                    key={time}
                    label={time}
                    size="sm"
                    selected={wakeTime === time}
                    onPress={() => setValue('wakeTime', time, { shouldValidate: true })}
                  />
                ))}
              </View>
            </View>
            <View style={styles.timeHalf}>
              <Controller
                control={control}
                name="bedtime"
                render={({ field }) => (
                  <TextField
                    label="Wind down"
                    placeholder="22:30"
                    keyboardType="numbers-and-punctuation"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.bedtime?.message}
                  />
                )}
              />
              <View style={styles.quickRow}>
                {['21:30', '22:00', '22:30', '23:00'].map((time) => (
                  <Chip
                    key={time}
                    label={time}
                    size="sm"
                    selected={bedtime === time}
                    onPress={() => setValue('bedtime', time, { shouldValidate: true })}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="smallStrong">NestJS project days</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              Optional project sessions on these evenings. Choose what feels sustainable.
            </AppText>
            <View style={styles.wrap}>
              {DAYS.map((day) => {
                const selected = learningDays.includes(day.value);
                return (
                  <Chip
                    key={day.value}
                    label={day.label}
                    selected={selected}
                    onPress={() =>
                      setValue(
                        'learningDays',
                        selected
                          ? learningDays.filter((value) => value !== day.value)
                          : [...learningDays, day.value],
                        { shouldValidate: true },
                      )
                    }
                  />
                );
              })}
            </View>
            {errors.learningDays ? (
              <AppText variant="caption" color={theme.colors.error}>
                {errors.learningDays.message}
              </AppText>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="smallStrong">What makes a day count?</AppText>
            <View style={styles.wrap}>
              {[
                { value: 0.6, label: '60%' },
                { value: 0.7, label: '70% · balanced' },
                { value: 0.8, label: '80%' },
              ].map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  size="sm"
                  selected={threshold === option.value}
                  onPress={() => setValue('streakThreshold', option.value)}
                />
              ))}
            </View>
            <AppText variant="caption" color={theme.colors.textFaint}>
              Essential goals only. Skipped goals do not count against you.
            </AppText>
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="smallStrong">Flexible rest days each week</AppText>
            <View style={styles.wrap}>
              {[0, 1, 2].map((value) => (
                <Chip
                  key={value}
                  label={value === 0 ? 'None' : value === 1 ? '1 day' : '2 days'}
                  size="sm"
                  selected={restDays === value}
                  onPress={() => setValue('restDaysPerWeek', value)}
                />
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.step}>
          <View style={styles.titleBlock}>
            <AppText variant="display">One last thing.</AppText>
            <AppText variant="small" color={theme.colors.textMuted}>
              Reset is yours to shape. You can change all of this later.
            </AppText>
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="smallStrong">Appearance</AppText>
            <View style={styles.themeRow}>
              {(
                [
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ] as { value: ThemeMode; label: string }[]
              ).map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setValue('themeMode', option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: themeMode === option.value }}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor:
                        themeMode === option.value ? theme.colors.primarySoft : theme.colors.surface,
                      borderColor:
                        themeMode === option.value ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="smallStrong"
                    color={themeMode === option.value ? theme.colors.primary : theme.colors.text}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <Card style={styles.summary}>
            <Row icon={<Sunrise size={16} color={theme.colors.sage} />} label="Wake up" value={wakeTime} />
            <Row icon={<Moon size={16} color={theme.colors.sage} />} label="Wind down" value={bedtime} />
            <Row
              icon={<Check size={16} color={theme.colors.sage} />}
              label="Day counts at"
              value={`${Math.round(threshold * 100)}%`}
            />
            <Row
              icon={<Check size={16} color={theme.colors.sage} />}
              label="Project days"
              value={
                learningDays.length
                  ? DAYS.filter((day) => learningDays.includes(day.value))
                      .map((day) => day.label)
                      .join(', ')
                  : 'None yet'
              }
            />
          </Card>

          <AppText variant="caption" color={theme.colors.textFaint}>
            By continuing, you create a local profile. Notifications stay off until you turn them
            on. Your plan begins today.
          </AppText>
        </View>
      ) : null}

      <View style={styles.footer}>
        {step > 0 ? (
          <Button
            label="Back"
            variant="ghost"
            icon={<ArrowLeft size={15} color={theme.colors.textMuted} />}
            onPress={() => setStep(step - 1)}
          />
        ) : null}
        <View style={styles.footerGrow} />
        {step < STEPS.length - 1 ? (
          <Button
            label={step === 0 ? 'Begin' : 'Continue'}
            icon={<ArrowRight size={16} color={theme.colors.primaryText} />}
            onPress={next}
          />
        ) : (
          <Button
            label="Create my reset"
            onPress={handleSubmit(submit)}
            loading={isSubmitting}
            icon={<ArrowRight size={16} color={theme.colors.primaryText} />}
          />
        )}
      </View>
    </Screen>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.summaryRow}>
      {icon}
      <AppText variant="small" color={theme.colors.textMuted} style={styles.pointText}>
        {label}
      </AppText>
      <AppText variant="smallStrong">{value}</AppText>
    </View>
  );
}

function normalizeTime(value: string): string {
  return value.replace(/^(\d):/, '0$1:');
}

const styles = StyleSheet.create({
  content: { gap: 22, paddingTop: 8 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { height: 7, borderRadius: 4 },
  step: { gap: 22 },
  logo: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { gap: 10 },
  points: { gap: 12 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pointText: { flex: 1 },
  check: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  privacy: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeHalf: { flex: 1, gap: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  fieldGroup: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summary: { gap: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  footerGrow: { flex: 1 },
});
