import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const segments = useSegments();
  const router = useRouter();

  // Helper to fetch profile status
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
        
        // 1. Get Session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        // 2. If User, Check Profile
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
        // 3. CRITICAL: Always finish loading!
        console.log("3. Data Load Complete.");
        setDataLoaded(true);
      }
    };

    initialize();

    // Listen for Auth Changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      setSession(session);
      
      if (session) {
        // If we just logged in, checking profile might take a moment
        // We don't block the UI here, just update state when ready
        checkOnboardingStatus(session.user.id).then(isComplete => {
          setOnboardingComplete(isComplete);
        });
      } else {
        setOnboardingComplete(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // NAVIGATION PROTECTION LOGIC
  useEffect(() => {
    if (!dataLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === 'onboarding';
    const inTabsGroup = segments[0] === '(tabs)';

    const protectRoute = async () => {
      if (session) {
        // If we think we are incomplete, but trying to go to tabs, DOUBLE CHECK
        if (!onboardingComplete && inTabsGroup) {
           console.log("Double checking onboarding status...");
           const recheck = await checkOnboardingStatus(session.user.id);
           if (recheck) {
             setOnboardingComplete(true);
             return; 
           }
        }

        if (onboardingComplete) {
          // If done, kick out of onboarding/login
          if (inAuthGroup || inOnboardingGroup) {
            router.replace('/(tabs)'); 
          }
        } else {
          // If not done, kick out of tabs
          if (!inOnboardingGroup) {
            router.replace('/onboarding/step0');
          }
        }
      } else {
        // Not logged in
        if (!inAuthGroup) {
          router.replace('/(auth)/login');
        }
      }
    };

    protectRoute();
    
  }, [session, onboardingComplete, segments, dataLoaded]);

  if (!dataLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary.navy }}>
        <ActivityIndicator size="large" color={Colors.highlight.gold} />
      </View>
    );
  }

  return <Slot />;
}