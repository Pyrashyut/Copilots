import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: Colors.primary.navy },
      headerTintColor: Colors.neutral.white,
      headerTitleStyle: { fontWeight: 'bold' },
      title: 'Setup Profile'
    }}>
      <Stack.Screen name="step1" options={{ title: 'The Pilot License' }} />
      <Stack.Screen name="step2" options={{ title: 'Travel Style' }} />
      <Stack.Screen name="step3" options={{ title: 'Experience Matrix' }} />
    </Stack>
  );
}