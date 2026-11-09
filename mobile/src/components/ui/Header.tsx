import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}

export function Header({ title, subtitle, showBack = true, right, onBack }: HeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.side}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
              onPress={() => (onBack ? onBack() : router.back())}
              style={({ pressed }) => [
                styles.back,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <ChevronLeft size={20} color={theme.colors.text} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.center}>
          <AppText variant="heading" align="center" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color={theme.colors.textMuted} align="center" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.side, styles.right]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  side: { width: 60 },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, gap: 1 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
