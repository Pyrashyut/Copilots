import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === 'onboarding';

    const checkUser = async () => {
      if (session) {
        // Check if onboarding is complete
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', session.user.id)
          .single();

        if (data?.onboarding_complete) {
          // If complete, go to tabs (but not if already there)
          if (inAuthGroup || inOnboardingGroup) {
            router.replace('/(tabs)');
          }
        } else {
          // If NOT complete, force them to onboarding
          if (!inOnboardingGroup) {
            router.replace('/onboarding/step1');
          }
        }
      } else if (!session && !inAuthGroup) {
        router.replace('/(auth)/login');
      }
    };

    checkUser();
  }, [session, initialized, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary.navy }}>
        <ActivityIndicator size="large" color={Colors.highlight.gold} />
      </View>
    );
  }

  return <Slot />;
}