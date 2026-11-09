import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography } from '@/theme';

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  children?: React.ReactNode;
}

export function AppText({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const base = typography[variant] as TextStyle;
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.5}
      {...rest}
      style={[
        styles.base,
        base,
        {
          color: color ?? theme.colors.text,
          fontFamily: theme.fontFamily,
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
