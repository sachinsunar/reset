import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CircleHelp, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';
import { Button } from './Button';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={theme.colors.primary} />
      <AppText variant="small" color={theme.colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

export function ErrorState({
  message = 'Something did not load.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <CircleHelp size={22} color={theme.colors.textMuted} />
      <AppText variant="small" color={theme.colors.textMuted} align="center">
        {message}
      </AppText>
      {onRetry ? (
        <Button
          label="Try again"
          size="sm"
          variant="soft"
          icon={<RefreshCw size={14} color={theme.colors.primary} />}
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
});
