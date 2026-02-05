// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImmersive, setIsImmersive] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    try {
      // Fetch only visible users
      const { data } = await supabase.from('profiles').select('*').eq('is_visible', true).limit(20);
      setProfiles(data || []);
    } finally { setLoading(false); }
  };

  const viewProfile = () => {
    if (profiles[currentIndex]) {
      router.push({ pathname: '/profile/view', params: { userId: profiles[currentIndex].id } });
    }
  };

  const nextCard = () => {
    translateX.value = 0;
    translateY.value = 0;
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const outX = direction === 'right' ? width * 1.5 : -width * 1.5;
    translateX.value = withTiming(outX, { duration: 300 }, () => {
      runOnJS(nextCard)();
    });
  };

  // Gestures
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        runOnJS(handleSwipe)(e.translationX > 0 ? 'right' : 'left');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(1000)
    .onStart(() => { runOnJS(setIsImmersive)(true); })
    .onFinalize(() => { runOnJS(setIsImmersive)(false); });

  const tapGesture = Gesture.Tap()
    .onEnd(() => { runOnJS(viewProfile)(); });

  const composedGesture = Gesture.Exclusive(
    panGesture, 
    Gesture.Simultaneous(tapGesture, longPressGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value / 20}deg` }
    ]
  }));

  const hasMoreProfiles = profiles.length > currentIndex;

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>
  );

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
              <TouchableOpacity><Ionicons name="search-outline" size={22} color="#000" /></TouchableOpacity>
            </View>
          )}

          {activeSegment === 'people' ? (
            <View style={styles.mainArea}>
              <View style={styles.cardContainer}>
                {hasMoreProfiles ? (
                  <GestureDetector gesture={composedGesture}>
                    <Animated.View style={animatedStyle}>
                      <SwipeCard profile={profiles[currentIndex]} isImmersive={isImmersive} />
                    </Animated.View>
                  </GestureDetector>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="sparkles-outline" size={60} color="#DDD" />
                    <Text style={styles.emptyText}>No more explorers found nearby.</Text>
                    <TouchableOpacity style={styles.refreshBtn} onPress={() => { setCurrentIndex(0); fetchProfiles(); }}>
                      <Text style={styles.refreshBtnText}>Refresh Discovery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* ACTION BUTTONS: Now conditionally rendered based on hasMoreProfiles */}
              {!isImmersive && hasMoreProfiles && (
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
            <ScrollView contentContainerStyle={styles.tripsContent}>
              <Text style={styles.sectionTitle}>Curated Adventures</Text>
              <Text style={styles.emptyText}>Trip packages coming soon...</Text>
            </ScrollView>
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
  tripsContent: { padding: 20 },
  sectionTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20 }
});