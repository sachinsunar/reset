import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Lock, Moon, Palette, Sunrise } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import { updateRoutineAnchors } from '@/db/repositories/settings';
import type { ThemeMode } from '@/types';
import { showToast } from '@/lib/toastBus';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { SectionHeader } from '@/components/ui/SectionHeader';

export default function PreferencesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const profile = useAppStore((state) => state.profile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const refresh = useAppStore((state) => state.refresh);
  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [wakeTime, setWakeTime] = useState(profile?.wakeTime ?? '06:30');
  const [bedtime, setBedtime] = useState(profile?.bedtime ?? '22:30');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setEmail(profile.email ?? '');
    setWakeTime(profile.wakeTime);
    setBedtime(profile.bedtime);
  }, [profile]);

  const saveIdentity = async () => {
    if (name.trim().length < 2) {
      showToast('Enter a name with at least two characters.', 'warning');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('Enter a valid email or leave it empty.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() || null });
      showToast('Profile updated.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const saveRhythm = async () => {
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(wakeTime) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(bedtime)) {
      showToast('Use times like 06:30 and 22:30.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const wake = wakeTime.replace(/^(\d):/, '0$1:');
      const bed = bedtime.replace(/^(\d):/, '0$1:');
      await updateProfile({ wakeTime: wake, bedtime: bed });
      await updateRoutineAnchors(wake, bed);
      await queryClient.invalidateQueries({ queryKey: ['day-plan'] });
      await queryClient.invalidateQueries({ queryKey: ['routine-blocks'] });
      await refresh();
      showToast('Daily anchors updated.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const setTheme = async (mode: ThemeMode) => {
    await updateProfile({ themeMode: mode });
  };

  if (!profile) {
    return (
      <Screen edges={['top']}>
        <Header title="Preferences" />
        <AppText variant="small" color={theme.colors.textMuted}>
          Profile not loaded.
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header title="Preferences" subtitle="Make Reset fit your life" />

      <View style={styles.section}>
        <SectionHeader title="You" />
        <Card style={styles.form}>
          <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
          <TextField
            label="Email (optional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            helper="Only used if you enable optional cloud sync."
          />
          <Button label="Save profile" onPress={saveIdentity} loading={saving} fullWidth />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Appearance" />
        <Card style={styles.themeCard}>
          <View style={styles.themeHead}>
            <Palette size={17} color={theme.colors.primary} />
            <AppText variant="small" color={theme.colors.textMuted} style={styles.flex}>
              Light, dark, or follow your device.
            </AppText>
          </View>
          <View style={styles.wrap}>
            {(
              [
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ] as { value: ThemeMode; label: string }[]
            ).map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={profile.themeMode === option.value}
                onPress={() => setTheme(option.value)}
              />
            ))}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Daily anchors" caption="Updates sleep and wake blocks for future days" />
        <Card style={styles.form}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="Wake up"
                value={wakeTime}
                onChangeText={setWakeTime}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Wind down"
                value={bedtime}
                onChangeText={setBedtime}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          <View style={styles.hintRow}>
            <Sunrise size={14} color={theme.colors.sage} />
            <AppText variant="caption" color={theme.colors.textFaint}>
              The sleep block scales to your bedtime.
            </AppText>
            <Moon size={14} color={theme.colors.sage} />
          </View>
          <Button label="Save daily anchors" variant="secondary" onPress={saveRhythm} loading={saving} fullWidth />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Streak rules" caption="Change these whenever your season changes" />
        <Card style={styles.form}>
          <View style={styles.group}>
            <AppText variant="smallStrong">A day counts at</AppText>
            <View style={styles.wrap}>
              {[0.6, 0.7, 0.8].map((value) => (
                <Chip
                  key={value}
                  label={`${Math.round(value * 100)}%`}
                  selected={Math.abs(profile.streakThreshold - value) < 0.001}
                  onPress={() => updateProfile({ streakThreshold: value })}
                />
              ))}
            </View>
            <AppText variant="caption" color={theme.colors.textFaint}>
              Percentage of essential goals. Skipped goals are excluded.
            </AppText>
          </View>
          <View style={styles.group}>
            <AppText variant="smallStrong">Flexible rest days per week</AppText>
            <View style={styles.wrap}>
              {[0, 1, 2].map((value) => (
                <Chip
                  key={value}
                  label={value === 0 ? 'None' : `${value} day${value === 1 ? '' : 's'}`}
                  selected={profile.restDaysPerWeek === value}
                  onPress={() => updateProfile({ restDaysPerWeek: value })}
                />
              ))}
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Data & privacy" />
        <Card style={styles.privacy}>
          <Lock size={17} color={theme.colors.primary} />
          <View style={styles.flex}>
            <AppText variant="smallStrong">Local-first by default</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              Your entries live in a private SQLite database on this device. Sync is optional and
              only happens when you set up the backup service.
            </AppText>
          </View>
        </Card>
        <Card style={styles.privacy}>
          <Check size={17} color={theme.colors.primary} />
          <View style={styles.flex}>
            <AppText variant="smallStrong">Timezone</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              {profile.timezone} · dates follow Nepal time, not your device location.
            </AppText>
          </View>
        </Card>
      </View>

      <AppText variant="caption" color={theme.colors.textFaint} align="center">
        Reset keeps your routine editable because life is not static.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  section: { gap: 10 },
  form: { gap: 12 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  themeCard: { gap: 10 },
  themeHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  group: { gap: 7 },
  privacy: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
