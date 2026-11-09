import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './ui/AppText';

export interface BarDatum {
  label: string;
  value: number;
  display?: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  color?: string;
  emptyColor?: string;
  maxValue?: number;
  highlightLast?: boolean;
  labelEvery?: number;
  unit?: string;
}

export function BarChart({
  data,
  height = 110,
  color,
  emptyColor,
  maxValue,
  highlightLast = true,
  labelEvery = 1,
  unit = '',
}: BarChartProps) {
  const theme = useTheme();
  const max = Math.max(maxValue ?? 0, ...data.map((d) => d.value), 1);
  return (
    <View style={styles.wrap}>
      <View style={[styles.plot, { height }]}>
        {data.map((item, index) => {
          const ratio = Math.max(0, Math.min(1, item.value / max));
          const isLast = index === data.length - 1;
          return (
            <View key={`${item.label}-${index}`} style={styles.barSlot}>
              <View
                accessible
                accessibilityLabel={`${item.label}: ${item.display ?? item.value}${unit}`}
                style={[
                  styles.bar,
                  {
                    height: item.value === 0 ? 3 : Math.max(4, ratio * height),
                    backgroundColor:
                      item.value === 0
                        ? emptyColor ?? theme.colors.surfaceStrong
                        : highlightLast && isLast
                          ? color ?? theme.colors.primary
                          : color ?? theme.colors.sage,
                    opacity: item.value === 0 ? 1 : isLast ? 1 : 0.65,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((item, index) => (
          <View key={`${item.label}-label-${index}`} style={styles.labelSlot}>
            {index % labelEvery === 0 || index === data.length - 1 ? (
              <AppText variant="caption" color={theme.colors.textFaint} numberOfLines={1}>
                {item.label}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: 4, minWidth: 3 },
  labels: { flexDirection: 'row', gap: 3 },
  labelSlot: { flex: 1, alignItems: 'center' },
});
