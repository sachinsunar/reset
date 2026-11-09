import React from 'react';
import { View } from 'react-native';
import { CircleHelp } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) console.error('Reset error boundary:', error);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback onReset={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 12,
      }}
    >
      <CircleHelp size={30} color={theme.colors.textMuted} />
      <AppText variant="heading" align="center">
        Something went sideways
      </AppText>
      <AppText variant="small" color={theme.colors.textMuted} align="center">
        Your data is safe on this device. You can try reopening this screen.
      </AppText>
      <Button label="Try again" onPress={onReset} variant="soft" />
    </View>
  );
}
