// app/(tabs)/index.tsx
// Location-aware discovery: respects Fixed / Remote Country / Remote Anywhere modes
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

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setMyProfile(me);
    await fetchProfiles(user.id, me);
  };

  const fetchProfiles = async (myId: string, me: any) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: swipesToExclude } = await supabase
        .from('swipes')
        .select('likee_id, is_like, created_at')
        .eq('liker_id', myId);

      const excludeIds = swipesToExclude
        ?.filter(s => {
          if (s.is_like) return true;
          return new Date(s.created_at) > thirtyDaysAgo;
        })
        .map(s => s.likee_id) || [];

      excludeIds.push(myId);

      // Base query — always get visible profiles, exclude already-swiped
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_visible', true)
        .not('id', 'in', `(${excludeIds.join(',')})`);

      // ── LOCATION FILTERING ──────────────────────────────────────
      // remote_anywhere: no filter — see everyone
      // remote_country: show profiles in same country OR remote_anywhere users
      // fixed: show profiles in same country OR remote_anywhere users
      //        (we filter same-city at UI level since city is free text)
      
      const myMode = me?.location_mode || 'fixed';
      const myCountry = me?.location_country;

      if (myMode === 'remote_anywhere') {
        // See everyone — no location filter needed
      } else if (myMode === 'remote_country' || myMode === 'fixed') {
        if (myCountry) {
          // See: same country users + anyone who is remote_anywhere
          query = query.or(`location_country.eq.${myCountry},location_mode.eq.remote_anywhere`);
        }
        // If no country set on my profile, fall back to showing all (degrade gracefully)
      }
      // ─────────────────────────────────────────────────────────────

      const { data } = await query.limit(20);
      setProfiles(data || []);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── COMPATIBILITY ENGINE ─────────────────────────────────────────
  const getMatchData = (theirProfile: any) => {
    if (!myProfile || !theirProfile) return { score: 50, common: [] };

    let score = 50;
    let commonReasons: string[] = [];

    // Layer 1: Experience Matrix (40% weight)
    const myLoves = myProfile.preferences?.loved || [];
    const theirLoves = theirProfile.preferences?.loved || [];
    const commonMatrix = myLoves.filter((item: string) => theirLoves.includes(item));
    if (commonMatrix.length > 0) {
      score += Math.min(commonMatrix.length * 12, 36);
      commonReasons.push(`You both love ${commonMatrix[0]}`);
    }

    // Layer 2: Personality Tags (30% weight)
    const myTags = myProfile.personality_tags || [];
    const theirTags = theirProfile.personality_tags || [];
    const commonTags = myTags.filter((t: string) => theirTags.includes(t));
    if (commonTags.length > 0) {
      score += 15;
      commonReasons.push(`Both identify as ${commonTags[0]}`);
    }

    // Layer 3: Spotify Genres (30% weight)
    const myGenres = myProfile.spotify_genres || [];
    const theirGenres = theirProfile.spotify_genres || [];
    const commonGenres = myGenres.filter((g: string) => theirGenres.includes(g));
    if (commonGenres.length > 0) {
      score += 10;
      commonReasons.push(`Shared taste in ${commonGenres[0]} music`);
    }

    // Layer 4: Location mode bonus
    if (myProfile.location_mode === 'remote_anywhere' && theirProfile.location_mode === 'remote_anywhere') {
      score += 5;
      commonReasons.push('Both location-independent');
    } else if (myProfile.location_city && theirProfile.location_city &&
               myProfile.location_city.toLowerCase() === theirProfile.location_city.toLowerCase()) {
      score += 8;
      commonReasons.push(`Both based in ${myProfile.location_city}`);
    }

    if (score > 99) score = 99;
    if (score < 42) score = 42;

    return { score, common: commonReasons };
  };
  // ─────────────────────────────────────────────────────────────────

  const recordSwipe = async (direction: 'left' | 'right') => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;
    const isLike = direction === 'right';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value / 20}deg` }
    ]
  }));

  // Location mode label for the header
  const locationLabel = myProfile?.location_mode === 'remote_anywhere'
    ? '🌍 Global'
    : myProfile?.location_country
    ? `📍 ${myProfile.location_mode === 'remote_country' ? myProfile.location_country : (myProfile.location_city || myProfile.location_country)}`
    : null;

  if (loading) return <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={[styles.blurPath, styles.blurCoral]} />
        <View style={[styles.blurPath, styles.blurYellow]} />

        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.appBar}>
            <Image source={require('../../assets/images/logo.png')} style={styles.headerLogo} />
            <View style={styles.segmentedPicker}>
              <TouchableOpacity
                style={[styles.segment, activeSegment === 'people' && styles.activeSegment]}
                onPress={() => setActiveSegment('people')}
              >
                <Text style={[styles.segmentLabel, activeSegment === 'people' && styles.activeLabel]}>People</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, activeSegment === 'trips' && styles.activeSegment]}
                onPress={() => setActiveSegment('trips')}
              >
                <Text style={[styles.segmentLabel, activeSegment === 'trips' && styles.activeLabel]}>Trips</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => fetchInitialData()}>
              <Ionicons name="refresh-outline" size={22} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Location mode indicator */}
          {locationLabel && (
            <TouchableOpacity
              style={styles.locationBadge}
              onPress={() => router.push('/profile/edit')}
            >
              <Text style={styles.locationBadgeText}>{locationLabel}</Text>
              <Ionicons name="chevron-down" size={11} color="#999" />
            </TouchableOpacity>
          )}

          {activeSegment === 'people' ? (
            <View style={styles.mainArea}>
              <View style={styles.cardContainer}>
                {profiles.length > currentIndex ? (
                  <GestureDetector gesture={Gesture.Exclusive(panGesture, tapGesture)}>
                    <Animated.View style={animatedStyle}>
                      <SwipeCard
                        profile={profiles[currentIndex]}
                        isImmersive={false}
                        isActive={true}
                        matchData={getMatchData(profiles[currentIndex])}
                      />
                    </Animated.View>
                  </GestureDetector>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="sparkles-outline" size={60} color="#DDD" />
                    <Text style={styles.emptyText}>No more explorers found.</Text>
                    {myProfile?.location_mode === 'fixed' && (
                      <Text style={styles.emptyHint}>Try switching to Remote mode to see more people.</Text>
                    )}
                    <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchInitialData()}>
                      <Text style={styles.refreshBtnText}>Refresh Discovery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {profiles.length > currentIndex && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.passBtn} onPress={() => handleSwipe('left')}>
                    <Ionicons name="close" size={32} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.likeBtn} onPress={() => handleSwipe('right')}>
                    <LinearGradient colors={['#E8755A', '#CA573D']} style={styles.likeGradient}>
                      <Ionicons name="heart" size={32} color="#FFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.comingSoon}>
              <Ionicons name="map-outline" size={48} color="#DDD" />
              <Text style={styles.comingSoonText}>Curated Trips Coming Soon</Text>
            </View>
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
  locationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 20, marginBottom: 6,
  },
  locationBadgeText: { fontSize: 12, fontWeight: '600', color: '#666' },
  mainArea: { flex: 1, justifyContent: 'space-between', paddingVertical: 10 },
  cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', gap: 12 },
  emptyText: { color: '#000', opacity: 0.3, fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },
  emptyHint: { color: '#E8755A', fontSize: 13, textAlign: 'center', paddingHorizontal: 40, opacity: 0.8 },
  refreshBtn: { backgroundColor: '#161616', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, marginTop: 10 },
  refreshBtnText: { color: '#FFF', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 15, paddingHorizontal: 25, paddingBottom: 15 },
  passBtn: { flex: 1, height: 60, backgroundColor: 'rgba(22, 22, 22, 0.15)', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  likeBtn: { flex: 1, height: 60, borderRadius: 30, overflow: 'hidden' },
  likeGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  comingSoon: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  comingSoonText: { color: '#999', fontSize: 15 },
});