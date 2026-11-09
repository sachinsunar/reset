import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { BarChart3, CalendarDays, Home, NotebookPen, UserRound, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { selectionFeedback } from '@/lib/haptics';
import { AppText } from '@/components/ui/AppText';

const TAB_META: Record<string, { label: string; Icon: LucideIcon }> = {
  index: { label: 'Home', Icon: Home },
  plan: { label: 'Plan', Icon: CalendarDays },
  progress: { label: 'Progress', Icon: BarChart3 },
  journal: { label: 'Journal', Icon: NotebookPen },
  profile: { label: 'Profile', Icon: UserRound },
};

export function AppTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name] ?? TAB_META.index;
        const focused = state.index === index;
        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            selectionFeedback();
            navigateToTab(route.key);
          }
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            onPress={onPress}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.item}
          >
            <View
              style={[
                styles.iconWrap,
                focused && { backgroundColor: theme.colors.primary },
              ]}
            >
              <meta.Icon
                size={21}
                color={focused ? theme.colors.primaryText : theme.colors.textFaint}
                strokeWidth={focused ? 2.2 : 1.8}
              />
            </View>
            <AppText
              variant="caption"
              color={focused ? theme.colors.primary : theme.colors.textFaint}
              numberOfLines={1}
            >
              {meta.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 46, justifyContent: 'center' },
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
