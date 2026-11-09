import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from '@/components/ui/AppText';

interface XpPillProps {
  amount: number;
  compact?: boolean;
  earned?: boolean;
}

export function XpPill({ amount, compact = false, earned = false }: XpPillProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.pill,
        compact && styles.compact,
        {
          backgroundColor: earned ? theme.colors.emeraldSoft : theme.colors.goldSoft,
          borderColor: earned ? theme.colors.emerald : theme.colors.gold,
        },
      ]}
    >
      <Sparkles
        size={compact ? 10 : 12}
        color={earned ? theme.colors.emerald : theme.colors.goldDeep}
        strokeWidth={2.4}
      />
      <AppText
        variant="caption"
        color={earned ? theme.colors.emerald : theme.colors.goldDeep}
        style={styles.label}
      >
        {earned ? 'Earned' : `+${amount} XP`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  compact: { paddingHorizontal: 6, paddingVertical: 2 },
  label: { fontWeight: '700', letterSpacing: 0.1 },
});
