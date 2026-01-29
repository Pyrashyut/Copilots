// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import SwipeCard from '../../components/SwipeCard';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

export default function DiscoverScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: swipes } = await supabase
        .from('swipes')
        .select('likee_id')
        .eq('liker_id', user.id);

      const { data: blockedByMe } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      const { data: blockedMe } = await supabase
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', user.id);

      const excludeIds = [
        ...(swipes?.map(s => s.likee_id) || []),
        ...(blockedByMe?.map(b => b.blocked_id) || []),
        ...(blockedMe?.map(b => b.blocker_id) || []),
        user.id,
      ];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .eq('is_visible', true)
        .limit(100);

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const performSwipe = (direction: 'left' | 'right') => {
    if (currentIndex >= profiles.length) return;

    const profile = profiles[currentIndex];
    const isLike = direction === 'right';

    // Move to next card in state
    setCurrentIndex(i => i + 1);
    
    // Reset animation values instantly for the next card
    translateX.value = 0;
    translateY.value = 0;

    // Async DB operations
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('swipes').insert({
          liker_id: user.id,
          likee_id: profile.id,
          is_like: isLike,
        });

        if (isLike) {
          const { data: isMatch } = await supabase.rpc('check_match', {
            current_user_id: user.id,
            target_user_id: profile.id,
          });

          if (isMatch) {
            Alert.alert(
              "✈️ IT'S A MATCH!",
              `You and ${profile.username} both want to explore together!`
            );
          }
        }
      } catch (err) {
        console.error(err);
      }
    })();
  };

  // Button press handler (programmatic swipe)
  const handleButtonSwipe = (direction: 'left' | 'right') => {
    const multiplier = direction === 'right' ? 1 : -1;
    
    // Animate off screen then trigger logic
    translateX.value = withTiming(multiplier * width * 1.5, { duration: 300 }, () => {
      runOnJS(performSwipe)(direction);
    });
  };

  // Gesture handler
  const gesture = Gesture.Pan()
    .onChange((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        // Swipe detected
        const direction = event.translationX > 0 ? 'right' : 'left';
        const multiplier = direction === 'right' ? 1 : -1;
        
        translateX.value = withTiming(multiplier * width * 1.5, { duration: 200 }, () => {
          runOnJS(performSwipe)(direction);
        });
      } else {
        // Return to center
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  // Animated styles for the top card
  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-10, 0, 10],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  // Styles for the "Like/Nope" overlays on the card
  const likeOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, width / 4], [0, 1], Extrapolation.CLAMP),
  }));

  const nopeOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-width / 4, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const viewProfile = () => {
    if (currentIndex >= profiles.length) return;
    router.push({
      pathname: '/profile/view',
      params: { userId: profiles[currentIndex].id },
    });
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.neutral.trailDust]}
        style={styles.center}
      >
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logoLoader}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={Colors.highlight.gold} />
        <Text style={styles.loadingText}>Finding your matches...</Text>
      </LinearGradient>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <LinearGradient
        colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.neutral.trailDust]}
        style={styles.center}
      >
        <Text style={styles.emptyTitle}>No More Pilots</Text>
      </LinearGradient>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient
        colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.container}
      >
        {/* ===== FIXED HEADER ===== */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Discover</Text>
            <Text style={styles.headerSubtitle}>Find your travel companion</Text>
          </View>

          <View style={styles.counter}>
            <Ionicons name="people" size={16} color={Colors.neutral.white} />
            <Text style={styles.counterText}>
              {profiles.length - currentIndex}
            </Text>
          </View>
        </View>

        {/* ===== CARD AREA ===== */}
        <View style={styles.cardArea}>
          
          {/* Next Card (Background) - Visual Only */}
          {currentIndex + 1 < profiles.length && (
            <View style={[styles.cardWrapper, styles.nextCard]}>
              <SwipeCard profile={profiles[currentIndex + 1]} />
            </View>
          )}

          {/* Active Card (Foreground) - Draggable */}
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.cardWrapper, cardStyle]}>
              <SwipeCard profile={profiles[currentIndex]} />
              
              {/* Invisible touch area for profile view tap, 
                  but we need to be careful not to block gesture. 
                  Actually, tap on card usually opens profile. 
                  We can handle Tap gesture vs Pan, but simpler for MVP: 
                  info button opens profile. */}
              
              {/* Overlays */}
              <Animated.View style={[styles.overlay, styles.likeOverlay, likeOpacityStyle]}>
                <Text style={styles.overlayText}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[styles.overlay, styles.nopeOverlay, nopeOpacityStyle]}>
                <Text style={styles.overlayText}>NOPE</Text>
              </Animated.View>

            </Animated.View>
          </GestureDetector>
        </View>

        {/* ===== ACTIONS ===== */}
        <View style={styles.actionsContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={() => handleButtonSwipe('left')}>
              <View style={[styles.actionButton, styles.pass]}>
                <Ionicons name="close" size={36} color={Colors.highlight.error} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={viewProfile}>
              <View style={[styles.actionButton, styles.info]}>
                <Ionicons name="information" size={30} color={Colors.neutral.white} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleButtonSwipe('right')}>
              <View style={[styles.actionButton, styles.like]}>
                <Ionicons name="heart" size={36} color={Colors.neutral.white} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoLoader: {
    width: 200,
    height: 80,
    marginBottom: 20,
  },

  /* HEADER */
  header: {
    height: 110,
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },

  logo: {
    width: 90,
    height: 32,
    tintColor: Colors.neutral.white,
  },

  headerText: {
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.neutral.white,
  },

  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  counter: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  counterText: {
    color: Colors.neutral.white,
    fontWeight: '700',
  },

  /* CARD AREA */
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  cardWrapper: {
    position: 'absolute',
    // shadow logic is inside SwipeCard, but we need layout alignment
    alignItems: 'center',
    justifyContent: 'center',
  },

  nextCard: {
    transform: [{ scale: 0.95 }, { translateY: 10 }],
    opacity: 0.8,
    zIndex: -1,
  },

  /* OVERLAYS */
  overlay: {
    position: 'absolute',
    top: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 4,
    borderRadius: 12,
    zIndex: 100,
  },
  likeOverlay: {
    left: 40,
    borderColor: Colors.highlight.success,
    transform: [{ rotate: '-30deg' }],
  },
  nopeOverlay: {
    right: 40,
    borderColor: Colors.highlight.error,
    transform: [{ rotate: '30deg' }],
  },
  overlayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  /* ACTIONS */
  actionsContainer: {
    paddingBottom: 30,
    zIndex: 10,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },

  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },

  pass: { backgroundColor: Colors.neutral.white },
  info: { backgroundColor: Colors.secondary.teal },
  like: { backgroundColor: Colors.highlight.success },

  loadingText: {
    marginTop: 16,
    color: Colors.neutral.white,
  },

  emptyTitle: {
    fontSize: 28,
    color: Colors.neutral.white,
  },
});