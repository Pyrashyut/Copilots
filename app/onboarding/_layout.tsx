// app/onboarding/_layout.tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="step0" />
      <Stack.Screen name="personality" />
      <Stack.Screen name="integrations" />
      <Stack.Screen name="matrix" />
    </Stack>
  );
}