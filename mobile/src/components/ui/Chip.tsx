import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  color,
  backgroundColor,
  size = 'md',
  disabled = false,
}: ChipProps) {
  const theme = useTheme();
  const fg = selected ? color ?? theme.colors.primary : theme.colors.textMuted;
  const bg = selected ? backgroundColor ?? theme.colors.primarySoft : theme.colors.surfaceMuted;
  const content = (
    <View style={[styles.inner, { gap: size === 'sm' ? 5 : 7 }]}>
      {icon}
      <AppText
        variant={size === 'sm' ? 'caption' : 'smallStrong'}
        color={disabled ? theme.colors.textFaint : fg}
      >
        {label}
      </AppText>
    </View>
  );

  if (!onPress) {
    return (
      <View
        style={[
          styles.base,
          {
            backgroundColor: bg,
            paddingVertical: size === 'sm' ? 5 : 8,
            paddingHorizontal: size === 'sm' ? 9 : 13,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          paddingVertical: size === 'sm' ? 5 : 8,
          paddingHorizontal: size === 'sm' ? 9 : 13,
          opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 999 },
  inner: { flexDirection: 'row', alignItems: 'center' },
});
