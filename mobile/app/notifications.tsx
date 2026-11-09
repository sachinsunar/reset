import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Bell, BellOff, ChevronRight, Moon, Send } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '@/db/repositories/settings';
import {
  getNotificationPermission,
  requestNotificationPermission,
  scheduleReminders,
  sendTestReminder,
} from '@/lib/notifications';
import type { NotificationPreferences } from '@/types';
import { isTimeWithinQuietHours } from '@/lib/date';
import { showToast } from '@/lib/toastBus';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SheetModal } from '@/components/ui/SheetModal';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/States';

type EditTarget =
  | { kind: 'quietStart' | 'quietEnd'; value: string }
  | { kind: 'item'; index: number; value: string };

export default function NotificationsScreen() {
  const theme = useTheme();
  const profile = useAppStore((state) => state.profile);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [busy, setBusy] = useState(false);

  const data = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: getNotificationPreferences,
  });

  useEffect(() => {
    if (data.data) setPrefs(data.data);
  }, [data.data]);

  useEffect(() => {
    getNotificationPermission().then(setPermission).catch(() => setPermission(false));
  }, []);

  const persist = async (next: NotificationPreferences, announce = false) => {
    setPrefs(next);
    await saveNotificationPreferences(next);
    const result = await scheduleReminders(next, profile?.wakeTime ?? '06:30');
    if (announce) {
      if (result.scheduled === 0) {
        showToast('Reminders are off or notifications are not permitted.', 'info');
      } else {
        showToast(
          `${result.scheduled} gentle reminder${result.scheduled === 1 ? '' : 's'} scheduled.${
            result.skippedQuiet ? ' Some fall inside quiet hours.' : ''
          }`,
          'success',
        );
      }
    }
  };

  const toggleMaster = async (value: boolean) => {
    if (!prefs) return;
    if (value) {
      const granted = await requestNotificationPermission();
      setPermission(granted);
      if (!granted) {
        showToast('Notifications are blocked in device settings.', 'warning');
        return;
      }
    }
    await persist({ ...prefs, enabled: value }, true);
  };

  const toggleItem = async (index: number) => {
    if (!prefs) return;
    const items = prefs.items.map((item, i) =>
      i === index ? { ...item, enabled: !item.enabled } : item,
    );
    await persist({ ...prefs, items });
  };

  const saveTime = async () => {
    if (!prefs || !edit) return;
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(edit.value)) {
      showToast('Use a time like 07:30.', 'warning');
      return;
    }
    const normalized = edit.value.replace(/^(\d):/, '0$1:');
    let next: NotificationPreferences;
    if (edit.kind === 'item') {
      next = {
        ...prefs,
        items: prefs.items.map((item, i) =>
          i === edit.index ? { ...item, time: normalized } : item,
        ),
      };
    } else {
      next = { ...prefs, [edit.kind]: normalized };
    }
    await persist(next, true);
    setEdit(null);
  };

  const requestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted);
    if (granted) showToast('Notifications allowed.', 'success');
    else showToast('You can enable them later in device settings.', 'info');
  };

  if (!prefs || data.isLoading) {
    return (
      <Screen edges={['top']}>
        <Header title="Notifications" />
        <LoadingState label="Loading reminders…" />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header title="Notifications" subtitle="Quiet by default, useful when on" />

      <Card tone={prefs.enabled ? 'sage' : 'surface'} style={styles.master}>
        <View style={[styles.masterIcon, { backgroundColor: prefs.enabled ? theme.colors.surface : theme.colors.surfaceMuted }]}>
          {prefs.enabled ? (
            <Bell size={21} color={theme.colors.primary} />
          ) : (
            <BellOff size={21} color={theme.colors.textMuted} />
          )}
        </View>
        <View style={styles.masterText}>
          <AppText variant="bodyStrong">Gentle reminders</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            Off until you choose otherwise. No streak shaming, ever.
          </AppText>
        </View>
        <Switch
          value={prefs.enabled}
          onValueChange={toggleMaster}
          trackColor={{ false: theme.colors.surfaceStrong, true: theme.colors.sage }}
          thumbColor={prefs.enabled ? theme.colors.primary : theme.colors.surface}
          accessibilityLabel="Enable gentle reminders"
        />
      </Card>

      {permission === false ? (
        <Card tone="amber" style={styles.permission}>
          <AppText variant="smallStrong">Device permission is off</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            Reset can only schedule reminders after your device allows notifications.
          </AppText>
          <View style={styles.permissionActions}>
            <Button label="Request permission" size="sm" variant="soft" onPress={requestPermission} />
            <Button
              label="Open settings"
              size="sm"
              variant="ghost"
              onPress={() => Linking.openSettings()}
            />
          </View>
        </Card>
      ) : null}

      <View style={styles.section}>
        <AppText variant="heading">Reminders</AppText>
        <Card padded={false} style={styles.list}>
          {prefs.items.map((item, index) => {
            const quiet = isTimeWithinQuietHours(item.time, prefs.quietStart, prefs.quietEnd);
            return (
              <View
                key={item.key}
                style={[
                  styles.row,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  { opacity: prefs.enabled ? 1 : 0.55 },
                ]}
              >
                <View style={styles.rowText}>
                  <AppText variant="smallStrong">{item.label}</AppText>
                  {quiet ? (
                    <AppText variant="caption" color={theme.colors.amber}>
                      Inside quiet hours · will be skipped
                    </AppText>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setEdit({ kind: 'item', index, value: item.time })}
                  accessibilityRole="button"
                  accessibilityLabel={`Change time for ${item.label}`}
                  style={[styles.time, { backgroundColor: theme.colors.surfaceMuted }]}
                >
                  <AppText variant="caption">{item.time}</AppText>
                  <ChevronRight size={13} color={theme.colors.textFaint} />
                </Pressable>
                <Switch
                  value={item.enabled}
                  disabled={!prefs.enabled}
                  onValueChange={() => toggleItem(index)}
                  trackColor={{ false: theme.colors.surfaceStrong, true: theme.colors.sage }}
                  thumbColor={item.enabled ? theme.colors.primary : theme.colors.surface}
                  accessibilityLabel={`Toggle ${item.label}`}
                />
              </View>
            );
          })}
        </Card>
      </View>

      <View style={styles.section}>
        <AppText variant="heading">Quiet hours</AppText>
        <Card style={styles.quiet}>
          <View style={styles.quietHead}>
            <Moon size={16} color={theme.colors.amber} />
            <AppText variant="small" color={theme.colors.textMuted} style={styles.quietText}>
              Reminders between these times are never scheduled.
            </AppText>
          </View>
          <View style={styles.quietRow}>
            <Pressable
              onPress={() => setEdit({ kind: 'quietStart', value: prefs.quietStart })}
              accessibilityRole="button"
              style={[styles.timeBox, { backgroundColor: theme.colors.surfaceMuted }]}
            >
              <AppText variant="caption" color={theme.colors.textMuted}>
                From
              </AppText>
              <AppText variant="bodyStrong">{prefs.quietStart}</AppText>
            </Pressable>
            <Pressable
              onPress={() => setEdit({ kind: 'quietEnd', value: prefs.quietEnd })}
              accessibilityRole="button"
              style={[styles.timeBox, { backgroundColor: theme.colors.surfaceMuted }]}
            >
              <AppText variant="caption" color={theme.colors.textMuted}>
                Until
              </AppText>
              <AppText variant="bodyStrong">{prefs.quietEnd}</AppText>
            </Pressable>
          </View>
          <AppText variant="caption" color={theme.colors.textFaint}>
            Quiet hours can cross midnight, for example 22:00 to 05:30.
          </AppText>
        </Card>
      </View>

      <View style={styles.actions}>
        <Button
          label="Send a test reminder"
          variant="secondary"
          icon={<Send size={15} color={theme.colors.text} />}
          onPress={async () => {
            const granted = await requestNotificationPermission();
            setPermission(granted);
            if (!granted) {
              showToast('Allow notifications first.', 'warning');
              return;
            }
            await sendTestReminder();
            showToast('Test reminder will appear in a moment.', 'info');
          }}
          fullWidth
        />
        <Button
          label={busy ? 'Updating…' : 'Re-apply reminder schedule'}
          variant="ghost"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await persist(prefs, true);
            } finally {
              setBusy(false);
            }
          }}
          fullWidth
        />
      </View>

      <Card tone="muted" style={styles.note}>
        <AppText variant="caption" color={theme.colors.textMuted}>
          Reminders are local to this device. They are deliberately sparse: a wake anchor, one
          movement nudge, study, revision, an optional reflection, and wind-down.
        </AppText>
      </Card>

      <SheetModal
        visible={Boolean(edit)}
        title="Set time"
        subtitle="Use 24-hour time, for example 07:30."
        onClose={() => setEdit(null)}
      >
        <TextField
          label="Time"
          value={edit?.value ?? ''}
          onChangeText={(value) => edit && setEdit({ ...edit, value })}
          placeholder="07:30"
          autoFocus
        />
        <Button label="Save time" onPress={saveTime} fullWidth />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  master: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  masterIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  masterText: { flex: 1, gap: 2 },
  permission: { gap: 8 },
  permissionActions: { flexDirection: 'row', gap: 8 },
  section: { gap: 10 },
  list: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13 },
  rowText: { flex: 1, gap: 2 },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  quiet: { gap: 10 },
  quietHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  quietText: { flex: 1 },
  quietRow: { flexDirection: 'row', gap: 8 },
  timeBox: { flex: 1, gap: 1, borderRadius: 12, padding: 11 },
  actions: { gap: 6 },
  note: { gap: 4 },
});
