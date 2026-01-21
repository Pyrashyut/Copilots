// app/onboarding/_layout.tsx
import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: Colors.primary.navy },
      headerTintColor: Colors.neutral.white,
      headerTitleStyle: { fontWeight: 'bold' },
      headerShown: false
    }}>
      <Stack.Screen name="step0" options={{ title: 'Setup Profile' }} />
    </Stack>
  );
}