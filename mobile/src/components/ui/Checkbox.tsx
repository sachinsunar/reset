import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface CheckboxProps {
  checked: boolean;
  onToggle?: () => void;
  size?: number;
  color?: string;
  accessibilityLabel: string;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onToggle,
  size = 26,
  color,
  accessibilityLabel,
  disabled = false,
}: CheckboxProps) {
  const theme = useTheme();
  const scale = useSharedValue(checked ? 1 : 0);
  const checkScale = useSharedValue(checked ? 1 : 0.6);

  useEffect(() => {
    scale.value = withTiming(checked ? 1 : 0, { duration: 180 });
    checkScale.value = withSpring(checked ? 1 : 0.6, { damping: 14, stiffness: 220 });
  }, [checked, scale, checkScale]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ scale: 0.85 + scale.value * 0.15 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      disabled={disabled}
      onPress={onToggle}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: checked ? color ?? theme.colors.primary : theme.colors.borderStrong,
          backgroundColor: checked ? color ?? theme.colors.primary : 'transparent',
        },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, fillStyle]}>
        <Animated.View style={iconStyle}>
          <Check size={size * 0.55} color={theme.colors.primaryText} strokeWidth={2.6} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
