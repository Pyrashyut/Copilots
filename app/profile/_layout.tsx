// app/profile/_layout.tsx
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" />
      <Stack.Screen name="edit-banner" />
      <Stack.Screen name="edit-pfp" />
      <Stack.Screen name="view" />
    </Stack>
  );
}