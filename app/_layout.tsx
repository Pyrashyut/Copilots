import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const segments = useSegments();
  const router = useRouter();

  // 1. Handle Initialization (Session + Profile Fetch)
  useEffect(() => {
    setIsMounted(true);

    const initialize = async () => {
      try {
        // Get Session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
          // Get Profile Data
          const { data } = await supabase
            .from('profiles')
            .select('onboarding_complete')
            .eq('id', session.user.id)
            .single();
          
          setOnboardingComplete(data?.onboarding_complete || false);
        }
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setDataLoaded(true);
      }
    };

    initialize();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (!session) {
        setOnboardingComplete(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Handle Navigation (Only runs when data is fully loaded)
  useEffect(() => {
    if (!dataLoaded || !isMounted) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === 'onboarding';
    const inTabsGroup = segments[0] === '(tabs)';

    if (session && onboardingComplete) {
      // User is ready for the app
      if (inAuthGroup || inOnboardingGroup) {
        router.replace('/(tabs)'); 
      }
    } else if (session && !onboardingComplete) {
      // User needs to finish onboarding
      if (!inOnboardingGroup) {
        router.replace('/onboarding/step1');
      }
    } else if (!session) {
      // User is logged out
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    }
  }, [session, onboardingComplete, segments, dataLoaded, isMounted]);

  // Show loading screen while we fetch data
  if (!dataLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary.navy }}>
        <ActivityIndicator size="large" color={Colors.highlight.gold} />
      </View>
    );
  }

  return <Slot />;
}