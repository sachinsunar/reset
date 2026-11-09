import React from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export default function Index() {
  const hydrated = useAppStore((state) => state.hydrated);
  const onboardingComplete = useAppStore((state) => state.profile?.onboardingComplete ?? false);

  if (!hydrated) return null;
  return <Redirect href={onboardingComplete ? '/(tabs)' : '/onboarding'} />;
}
