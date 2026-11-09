import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}

export function StatTile({ label, value, hint, icon }: StatTileProps) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.colors.surfaceMuted }]}>
      <View style={styles.top}>
        <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
          {label}
        </AppText>
        {icon}
      </View>
      <AppText variant="heading">{value}</AppText>
      {hint ? (
        <AppText variant="caption" color={theme.colors.textFaint} numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: 16, padding: 13, gap: 3, minHeight: 88 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
});
