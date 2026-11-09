import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';

interface GameProgressBarProps {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function GameProgressBar({
  progress,
  color,
  trackColor,
  height = 10,
}: GameProgressBarProps) {
  const theme = useTheme();
  const value = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    value.value = withTiming(clamped, { duration: 650 });
  }, [clamped, value]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${value.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: trackColor ?? theme.colors.surfaceStrong },
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={[
          styles.fill,
          { height, backgroundColor: color ?? theme.colors.gold },
          fillStyle,
        ]}
      />
      <View style={[styles.shine, { height: Math.max(2, height * 0.28) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: 999, overflow: 'hidden' },
  fill: { borderRadius: 999 },
  shine: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
