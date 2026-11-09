import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';

export function OfflineBanner() {
  const theme = useTheme();
  const net = useNetInfo();
  if (net.isConnected !== false) return null;
  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.amberSoft }]}>
      <WifiOff size={14} color={theme.colors.amber} />
      <AppText variant="caption" color={theme.colors.amber}>
        Offline · everything is saved on this device
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});
