import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Info, TriangleAlert } from 'lucide-react-native';
import { useTheme } from './ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { subscribeToasts, type ToastMessage } from '@/lib/toastBus';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: ToastMessage) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToasts(show);
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [show]);

  const tone = toast
    ? {
        success: { bg: theme.colors.primary, fg: theme.colors.primaryText, Icon: Check },
        info: { bg: theme.colors.surface, fg: theme.colors.text, Icon: Info },
        warning: { bg: theme.colors.errorSoft, fg: theme.colors.error, Icon: TriangleAlert },
      }[toast.kind]
    : null;

  return (
    <View style={styles.root}>
      {children}
      {toast && tone ? (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.duration(240)}
          exiting={FadeOutDown.duration(180)}
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 84,
              backgroundColor: tone.bg,
              borderColor: toast.kind === 'info' ? theme.colors.border : 'transparent',
            },
          ]}
        >
          <tone.Icon size={16} color={tone.fg} strokeWidth={2.4} />
          <AppText variant="smallStrong" color={tone.fg} style={styles.message}>
            {toast.message}
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#101A13',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  message: { flex: 1 },
});
