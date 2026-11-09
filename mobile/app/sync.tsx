import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Cloud,
  CloudOff,
  Database,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import { showToast } from '@/lib/toastBus';
import { formatDateTimeLabel } from '@/lib/date';
import {
  ApiError,
  api,
  clearSession,
  getSession,
  getServerUrl,
  setServerUrl,
  signIn,
  signUp,
} from '@/services/api';
import {
  downloadLatestBackup,
  syncNow,
  syncStatus,
  uploadBackup,
} from '@/services/sync';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { LoadingState } from '@/components/ui/States';

type Mode = 'signin' | 'signup';

const friendly = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

export default function SyncScreen() {
  const theme = useTheme();
  const refresh = useAppStore((state) => state.refresh);
  const queryClient = useQueryClient();

  const session = useQuery({ queryKey: ['sync-session'], queryFn: getSession });
  const status = useQuery({ queryKey: ['sync-status'], queryFn: syncStatus });
  const url = useQuery({ queryKey: ['sync-url'], queryFn: getServerUrl });

  const [server, setServer] = useState('');
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (url.data) setServer(url.data);
  }, [url.data]);

  useEffect(() => {
    if (status.data?.email) setEmail(status.data.email);
  }, [status.data?.email]);

  const signedIn = Boolean(session.data);

  const afterChange = async () => {
    await Promise.all([
      session.refetch(),
      status.refetch(),
      refresh(),
      queryClient.invalidateQueries(),
    ]);
  };

  const saveServer = async () => {
    setBusy('server');
    setError(null);
    try {
      const normalized = await setServerUrl(server);
      setServer(normalized);
      await queryClient.invalidateQueries({ queryKey: ['sync-url'] });
      showToast('Server address saved.', 'success');
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(null);
    }
  };

  const checkConnection = async () => {
    setBusy('check');
    setError(null);
    try {
      await setServerUrl(server);
      await api.request('/health', { timeoutMs: 8000 });
      showToast('Server is reachable.', 'success');
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(null);
    }
  };

  const authenticate = async () => {
    setBusy(mode);
    setError(null);
    try {
      await setServerUrl(server);
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        if (name.trim().length < 2) {
          throw new ApiError('Tell us your name first.');
        }
        if (password.length < 8) {
          throw new ApiError('Use at least 8 characters for your password.');
        }
        await signUp(name, email, password);
      }
      setPassword('');
      await afterChange();
      showToast(mode === 'signin' ? 'Signed in. Ready to sync.' : 'Account created.', 'success');
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(null);
    }
  };

  const runSync = async () => {
    setBusy('sync');
    setError(null);
    try {
      const result = await syncNow({ full: true });
      await afterChange();
      showToast(
        result.pushed + result.pulled === 0
          ? 'Everything is already in sync.'
          : `Synced ${result.pushed} up, ${result.pulled} down.`,
        'success',
      );
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(null);
    }
  };

  const backup = async () => {
    setBusy('backup');
    setError(null);
    try {
      const info = await uploadBackup();
      await status.refetch();
      showToast(`Backup saved (${Math.max(1, Math.round(info.sizeBytes / 1024))} KB).`, 'success');
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(null);
    }
  };

  const restore = () => {
    Alert.alert(
      'Restore this backup?',
      'Local entries on this device will be replaced by the latest cloud backup. Pending unsynced changes will be discarded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setBusy('restore');
            setError(null);
            try {
              const result = await downloadLatestBackup();
              await afterChange();
              showToast(`Restored ${result.restoredRows} rows across ${result.tables} tables.`, 'success');
            } catch (err) {
              setError(friendly(err));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const signOut = () => {
    Alert.alert('Sign out of sync?', 'Your local data stays on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          await afterChange();
          showToast('Signed out of cloud sync.', 'info');
        },
      },
    ]);
  };

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header title="Sync & backup" subtitle="Optional, private, yours" />
      <OfflineBanner />

      {session.isLoading ? (
        <LoadingState label="Checking cloud account…" />
      ) : signedIn ? (
        <>
          <Card tone="sage" style={styles.account}>
            <View style={[styles.cloudIcon, { backgroundColor: theme.colors.surface }]}>
              <Cloud size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{session.data?.user.name}</AppText>
              <AppText variant="caption" color={theme.colors.textMuted}>
                {session.data?.user.email}
              </AppText>
            </View>
            <Pressable
              onPress={signOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              hitSlop={8}
            >
              <LogOut size={18} color={theme.colors.textMuted} />
            </Pressable>
          </Card>

          <Card style={styles.statusCard}>
            <StatusRow
              icon={<RefreshCw size={15} color={theme.colors.sage} />}
              label="Last sync"
              value={
                status.data?.lastSyncAt
                  ? formatDateTimeLabel(status.data.lastSyncAt)
                  : 'Not synced yet'
              }
            />
            <StatusRow
              icon={<Database size={15} color={theme.colors.sage} />}
              label="Waiting to upload"
              value={`${status.data?.pending ?? 0} change${status.data?.pending === 1 ? '' : 's'}`}
            />
            <StatusRow
              icon={<Upload size={15} color={theme.colors.sage} />}
              label="Last backup"
              value={
                status.data?.lastBackupAt
                  ? formatDateTimeLabel(status.data.lastBackupAt)
                  : 'No backup yet'
              }
            />
          </Card>

          <View style={styles.actions}>
            <Button
              label="Sync now"
              icon={<RefreshCw size={16} color={theme.colors.primaryText} />}
              loading={busy === 'sync'}
              onPress={runSync}
              fullWidth
            />
            <Button
              label="Upload backup"
              variant="secondary"
              icon={<Upload size={16} color={theme.colors.text} />}
              loading={busy === 'backup'}
              onPress={backup}
              fullWidth
            />
            <Button
              label="Restore latest backup"
              variant="ghost"
              loading={busy === 'restore'}
              onPress={restore}
              fullWidth
            />
          </View>

          <Card style={styles.serverCard}>
            <AppText variant="smallStrong">Server</AppText>
            <View style={styles.serverRow}>
              <View style={styles.flex}>
                <TextField
                  label="API address"
                  value={server}
                  onChangeText={setServer}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
              <Button
                label="Save"
                size="sm"
                variant="soft"
                loading={busy === 'server'}
                onPress={saveServer}
              />
            </View>
            <AppText variant="caption" color={theme.colors.textFaint}>
              Android emulator: use http://10.0.2.2:4000. A physical phone needs your computer's
              LAN address.
            </AppText>
          </Card>

          <Card tone="muted" style={styles.note}>
            <ShieldCheck size={17} color={theme.colors.primary} />
            <AppText variant="caption" color={theme.colors.textMuted} style={styles.flex}>
              The server stores your email, a bcrypt password hash, and the records you sync. No
              third-party analytics, no ads, no training on your journal.
            </AppText>
          </Card>
        </>
      ) : (
        <>
          <Card style={styles.form}>
            <View style={styles.authHead}>
              <CloudOff size={20} color={theme.colors.textMuted} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">Connect your own server</AppText>
                <AppText variant="caption" color={theme.colors.textMuted}>
                  Reset is fully usable offline. Sync is only for backup across devices.
                </AppText>
              </View>
            </View>

            <TextField
              label="Server address"
              value={server}
              onChangeText={setServer}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              helper="Example: http://192.168.1.20:4000"
            />
            <View style={styles.serverButtons}>
              <Button
                label="Save address"
                size="sm"
                variant="soft"
                loading={busy === 'server'}
                onPress={saveServer}
              />
              <Button
                label="Check connection"
                size="sm"
                variant="ghost"
                loading={busy === 'check'}
                onPress={checkConnection}
              />
            </View>

            {mode === 'signup' ? (
              <TextField
                label="Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            ) : null}
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              helper={mode === 'signup' ? 'At least 8 characters.' : undefined}
            />

            {error ? (
              <AppText variant="caption" color={theme.colors.error}>
                {error}
              </AppText>
            ) : null}

            <Button
              label={mode === 'signin' ? 'Sign in' : 'Create account'}
              onPress={authenticate}
              loading={busy === mode}
              fullWidth
            />
            <Pressable
              onPress={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              accessibilityRole="button"
            >
              <AppText variant="caption" color={theme.colors.primary} align="center">
                {mode === 'signin'
                  ? 'New here? Create a sync account'
                  : 'Already have an account? Sign in'}
              </AppText>
            </Pressable>
          </Card>

          <Card tone="muted" style={styles.note}>
            <ShieldCheck size={17} color={theme.colors.primary} />
            <AppText variant="caption" color={theme.colors.textMuted} style={styles.flex}>
              Username and password go only to the server you point at. The token is kept in the
              device keychain.
            </AppText>
          </Card>
        </>
      )}
    </Screen>
  );
}

function StatusRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.statusRow}>
      {icon}
      <AppText variant="caption" color={theme.colors.textMuted} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="caption">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  flex: { flex: 1 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cloudIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusCard: { gap: 9 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { gap: 6 },
  serverCard: { gap: 9 },
  serverRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  note: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  form: { gap: 11 },
  authHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  serverButtons: { flexDirection: 'row', gap: 8 },
});
