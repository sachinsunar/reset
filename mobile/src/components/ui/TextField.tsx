import React, { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
}

export const TextField = forwardRef<React.ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
  { label, error, helper, required, style, multiline, ...rest },
  ref,
) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.labelRow}>
          <AppText variant="smallStrong">{label}</AppText>
          {required ? (
            <AppText variant="caption" color={theme.colors.amber}>
              required
            </AppText>
          ) : null}
        </View>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.textFaint}
        multiline={multiline}
        selectionColor={theme.colors.primary}
        allowFontScaling
        maxFontSizeMultiplier={1.4}
        {...rest}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.border,
            fontFamily: theme.fontFamily,
            minHeight: multiline ? 96 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
            paddingTop: multiline ? 12 : 0,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" color={theme.colors.error}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color={theme.colors.textFaint}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
  },
});
