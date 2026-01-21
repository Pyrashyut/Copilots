// app/_layout.tsx
import { Session } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image } from 'react-native';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const segments = useSegments();
  const router = useRouter();

  const checkOnboardingStatus = async (userId: string) => {
    try {
      console.log("Checking DB status for:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Profile check error:", error);
        return false;
      }
      return data?.onboarding_complete || false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log("1. App Initializing...");
        
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
          console.log("2. User found, checking profile...");
          const isComplete = await checkOnboardingStatus(session.user.id);
          setOnboardingComplete(isComplete);
        } else {
          console.log("2. No user found.");
        }
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        console.log("3. Data Load Complete.");
        setDataLoaded(true);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      setSession(session);
      
      if (session) {
        checkOnboardingStatus(session.user.id).then(isComplete => {
          setOnboardingComplete(isComplete);
        });
      } else {
        setOnboardingComplete(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === 'onboarding';
    const inTabsGroup = segments[0] === '(tabs)';

    const protectRoute = async () => {
      if (session) {
        if (!onboardingComplete && inTabsGroup) {
           console.log("Double checking onboarding status...");
           const recheck = await checkOnboardingStatus(session.user.id);
           if (recheck) {
             setOnboardingComplete(true);
             return; 
           }
        }

        if (onboardingComplete) {
          if (inAuthGroup || inOnboardingGroup) {
            router.replace('/(tabs)'); 
          }
        } else {
          if (!inOnboardingGroup) {
            router.replace('/onboarding/step0');
          }
        }
      } else {
        if (!inAuthGroup) {
          router.replace('/(auth)/login');
        }
      }
    };

    protectRoute();
    
  }, [session, onboardingComplete, segments, dataLoaded]);

  if (!dataLoaded) {
    return (
      <LinearGradient 
        colors={Colors.gradient.adventure}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Image 
          source={require('../assets/images/logo.png')}
          style={{ width: 200, height: 80, marginBottom: 40 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={Colors.highlight.gold} />
      </LinearGradient>
    );
  }

  return <Slot />;
}