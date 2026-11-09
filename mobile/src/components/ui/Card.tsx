import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

type Tone = 'surface' | 'muted' | 'sage' | 'amber' | 'hero' | 'error';

interface CardProps {
  children: React.ReactNode;
  tone?: Tone;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, tone = 'surface', style, padded = true }: CardProps) {
  const theme = useTheme();
  const tones: Record<Tone, string> = {
    surface: theme.colors.surface,
    muted: theme.colors.surfaceMuted,
    sage: theme.colors.primarySoft,
    amber: theme.colors.amberSoft,
    hero: theme.colors.hero,
    error: theme.colors.errorSoft,
  };
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tones[tone],
          borderColor: tone === 'hero' ? 'transparent' : theme.colors.border,
          shadowColor: theme.dark ? '#000' : '#171717',
          shadowOpacity: theme.dark ? 0 : 0.05,
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 1,
  },
  padded: { padding: 18 },
});
