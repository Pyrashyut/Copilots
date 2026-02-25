// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import SwipeCard from '../../components/SwipeCard';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;

export default function DiscoverScreen() {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<'people' | 'trips'>('people');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImmersive, setIsImmersive] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch my profile to compare preferences
    const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setMyProfile(me);

    await fetchProfiles(user.id);
  };

  const fetchProfiles = async (myId: string) => {
    try {
      // 1. Calculate the date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 2. Fetch swipes to exclude
      // We exclude: 
      // - Anyone I LIKED (is_like = true)
      // - Anyone I PASSED (is_like = false) but ONLY if it happened in the last 30 days
      const { data: swipesToExclude } = await supabase
        .from('swipes')
        .select('likee_id, is_like, created_at')
        .eq('liker_id', myId);

      const excludeIds = swipesToExclude
        ?.filter(s => {
            if (s.is_like) return true; // Keep likes hidden
            const swipeDate = new Date(s.created_at);
            return swipeDate > thirtyDaysAgo; // Keep recent passes hidden
        })
        .map(s => s.likee_id) || [];

      excludeIds.push(myId); // Always exclude myself

      // 3. Fetch potential matches
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_visible', true)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(20);

      setProfiles(data || []);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
    } finally { 
      setLoading(false); 
    }
  };

  // --- COMPATIBILITY ENGINE ---
  // Inside app/(tabs)/index.tsx

const getMatchData = (theirProfile: any) => {
    if (!myProfile || !theirProfile) return { score: 50, common: [] };

    let score = 50; // Starting base
    let commonReasons: string[] = [];

    // Layer 1: Experience Matrix (40% Weight)
    const myLoves = myProfile.preferences?.loved || [];
    const theirLoves = theirProfile.preferences?.loved || [];
    const commonMatrix = myLoves.filter((item: string) => theirLoves.includes(item));
    
    if (commonMatrix.length > 0) {
      score += (commonMatrix.length * 12);
      commonReasons.push(`You both love ${commonMatrix[0]}`);
    }

    // Layer 2: Personality Tags (30% Weight)
    const myTags = myProfile.personality_tags || [];
    const theirTags = theirProfile.personality_tags || [];
    const commonTags = myTags.filter((t: string) => theirTags.includes(t));

    if (commonTags.length > 0) {
      score += 15;
      commonReasons.push(`Both identify as ${commonTags[0]}`);
    }

    // Layer 3: Spotify Genres (30% Weight)
    const myGenres = myProfile.spotify_genres || [];
    const theirGenres = theirProfile.spotify_genres || [];
    const commonGenres = myGenres.filter((g: string) => theirGenres.includes(g));

    if (commonGenres.length > 0) {
      score += 10;
      commonReasons.push(`Shared taste in ${commonGenres[0]} music`);
    }

    // Caps
    if (score > 99) score = 99;
    if (score < 40) score = 42; // Minimum floor for a match

    return { 
      score, 
      common: commonReasons 
    };
};

  const recordSwipe = async (direction: 'left' | 'right') => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;
    const isLike = direction === 'right';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // We use UPSERT so if they re-appear after 30 days and you swipe again, it updates the timestamp
        await supabase.from('swipes').upsert({
          liker_id: user.id,
          likee_id: currentProfile.id,
          is_like: isLike,
          created_at: new Date().toISOString()
        });
      }
    } catch (error) { console.error(error); }
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const outX = direction === 'right' ? width * 1.5 : -width * 1.5;
    translateX.value = withTiming(outX, { duration: 300 }, () => {
        translateX.value = 0;
        translateY.value = 0;
        runOnJS(recordSwipe)(direction);
    });
  };

  // Gestures
  const panGesture = Gesture.Pan()
    .onUpdate((e) => { translateX.value = e.translationX; translateY.value = e.translationY; })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        runOnJS(handleSwipe)(e.translationX > 0 ? 'right' : 'left');
      } else {
        translateX.value = withSpring(0); translateY.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (profiles[currentIndex]) {
        runOnJS(router.push)({ pathname: '/profile/view', params: { userId: profiles[currentIndex].id } } as any);
    }
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { rotate: `${translateX.value / 20}deg` }]
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={[styles.blurPath, styles.blurCoral]} />
        <View style={[styles.blurPath, styles.blurYellow]} />

        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {!isImmersive && (
            <View style={styles.appBar}>
              <Image source={require('../../assets/images/logo.png')} style={styles.headerLogo} />
              <View style={styles.segmentedPicker}>
                <TouchableOpacity style={[styles.segment, activeSegment === 'people' && styles.activeSegment]} onPress={() => setActiveSegment('people')}>
                  <Text style={[styles.segmentLabel, activeSegment === 'people' && styles.activeLabel]}>People</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segment, activeSegment === 'trips' && styles.activeSegment]} onPress={() => setActiveSegment('trips')}>
                  <Text style={[styles.segmentLabel, activeSegment === 'trips' && styles.activeLabel]}>Trips</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => fetchInitialData()}><Ionicons name="refresh-outline" size={22} color="#000" /></TouchableOpacity>
            </View>
          )}

          {activeSegment === 'people' ? (
            <View style={styles.mainArea}>
              <View style={styles.cardContainer}>
                {profiles.length > currentIndex ? (
                  <GestureDetector gesture={Gesture.Exclusive(panGesture, tapGesture)}>
                    <Animated.View style={animatedStyle}>
                      <SwipeCard 
                        profile={profiles[currentIndex]} 
                        isImmersive={isImmersive}
                        isActive={true}
                        matchData={getMatchData(profiles[currentIndex])} // PASS MATCH DATA
                      />
                    </Animated.View>
                  </GestureDetector>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="sparkles-outline" size={60} color="#DDD" />
                    <Text style={styles.emptyText}>No more explorers found nearby.</Text>
                    <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchInitialData()}>
                      <Text style={styles.refreshBtnText}>Refresh Discovery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {!isImmersive && profiles.length > currentIndex && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.passBtn} onPress={() => handleSwipe('left')}><Ionicons name="close" size={32} color="#FFF" /></TouchableOpacity>
                  <TouchableOpacity style={styles.likeBtn} onPress={() => handleSwipe('right')}>
                    <LinearGradient colors={['#E8755A', '#CA573D']} style={styles.likeGradient}><Ionicons name="heart" size={32} color="#FFF" /></LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={{padding: 20}}><Text>Curated Trips Coming Soon</Text></View>
          )}
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  blurPath: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.4 },
  blurCoral: { top: '15%', left: -80, backgroundColor: 'rgba(255, 122, 73, 0.08)' },
  blurYellow: { top: -50, right: -50, backgroundColor: 'rgba(255, 243, 73, 0.08)' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 50 },
  headerLogo: { width: 32, height: 32 },
  segmentedPicker: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: 3, width: 160 },
  segment: { flex: 1, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  activeSegment: { backgroundColor: '#FFF' },
  segmentLabel: { fontSize: 14, fontWeight: '500', color: '#000', opacity: 0.4 },
  activeLabel: { opacity: 1, fontWeight: '700' },
  mainArea: { flex: 1, justifyContent: 'space-between', paddingVertical: 10 },
  cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', gap: 16 },
  emptyText: { color: '#000', opacity: 0.3, fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },
  refreshBtn: { backgroundColor: '#161616', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, marginTop: 10 },
  refreshBtnText: { color: '#FFF', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 15, paddingHorizontal: 25, paddingBottom: 15 },
  passBtn: { flex: 1, height: 60, backgroundColor: 'rgba(22, 22, 22, 0.15)', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  likeBtn: { flex: 1, height: 60, borderRadius: 30, overflow: 'hidden' },
  likeGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});