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

  // Helper to fetch profile status
  const checkOnboardingStatus = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', userId)
        .single();
      return data?.onboarding_complete || false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    setIsMounted(true);

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
          const isComplete = await checkOnboardingStatus(session.user.id);
          setOnboardingComplete(isComplete);
        }
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setDataLoaded(true);
      }
    };

    initialize();

    // LISTEN FOR CHANGES (This fixes the loop!)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        // If session refreshes, check DB again to see if they finished onboarding
        const isComplete = await checkOnboardingStatus(session.user.id);
        setOnboardingComplete(isComplete);
      } else {
        setOnboardingComplete(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!dataLoaded || !isMounted) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === 'onboarding';
    
    // User is logged in
    if (session) {
      if (onboardingComplete) {
        // User is DONE -> Go to Tabs
        if (inAuthGroup || inOnboardingGroup) {
          router.replace('/(tabs)'); 
        }
      } else {
        // User is NOT DONE -> Go to Step 0 (Identity)
        if (!inOnboardingGroup) {
          router.replace('/onboarding/step0');
        }
      }
    } 
    // User is logged out
    else {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    }
  }, [session, onboardingComplete, segments, dataLoaded, isMounted]);

  if (!dataLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary.navy }}>
        <ActivityIndicator size="large" color={Colors.highlight.gold} />
      </View>
    );
  }

  return <Slot />;
}