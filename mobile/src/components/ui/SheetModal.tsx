import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';

interface SheetModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  scroll?: boolean;
}

export function SheetModal({
  visible,
  title,
  subtitle,
  onClose,
  children,
  scroll = true,
}: SheetModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const body = (
    <View style={styles.body}>
      <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="heading">{title}</AppText>
          {subtitle ? (
            <AppText variant="caption" color={theme.colors.textMuted}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={10}
          style={[styles.close, { backgroundColor: theme.colors.surfaceMuted }]}
        >
          <X size={18} color={theme.colors.textMuted} />
        </Pressable>
      </View>
      {children}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface,
                paddingBottom: Math.max(insets.bottom, 18),
                borderColor: theme.colors.border,
              },
            ]}
          >
            {scroll ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {body}
              </ScrollView>
            ) : (
              body
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  keyboard: { width: '100%' },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  scrollContent: { paddingBottom: 6 },
  body: { paddingHorizontal: 20, gap: 14 },
  handle: { width: 38, height: 4, borderRadius: 4, alignSelf: 'center', marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
