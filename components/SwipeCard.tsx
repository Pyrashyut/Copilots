// components/SwipeCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.28;
const SWIPE_OUT_DURATION = 220;

interface MatchData {
  score: number;
  reasons: string[];
  isSuperLike?: boolean;
}

interface Profile {
  id: string;
  username: string;
  photos: string[];
  job_title?: string;
  age?: number;
  location?: string;
  bio?: string;
  personality_tags?: string[];
  preferences?: Record<string, any>;
  trip_tier_preferences?: string[];
}

function getScoreColor(score: number): string[] {
  if (score >= 80) return ['#6BCF7F', '#38D98D'];
  if (score >= 60) return ['#FFD93D', '#FFA502'];
  return ['#FF6B6B', '#FF4757'];
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Great match';
  if (score >= 60) return 'Good match';
  return 'Low match';
}

export default function SwipeCard({
  profile,
  matchData,
  onSwipeLeft,
  onSwipeRight,
  onTap,
}: {
  profile: Profile;
  matchData?: MatchData;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
}) {
  const position = useRef(new Animated.ValueXY()).current;
  const swipedRef = useRef(false);

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, width * 0.15],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const passOpacity = position.x.interpolate({
    inputRange: [-width * 0.15, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const swipeCard = (direction: 'left' | 'right') => {
    if (swipedRef.current) return;
    swipedRef.current = true;
    const x = direction === 'right' ? width * 1.6 : -width * 1.6;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => {
      if (direction === 'right') onSwipeRight?.();
      else onSwipeLeft?.();
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 6,
      tension: 80,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !swipedRef.current,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
      onPanResponderMove: (_, g) => {
        position.setValue({ x: g.dx, y: g.dy * 0.3 });
      },
      onPanResponderRelease: (_, g) => {
        const wasTap = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6;
        if (wasTap) {
          onTap?.();
          return;
        }
        if (g.dx > SWIPE_THRESHOLD) swipeCard('right');
        else if (g.dx < -SWIPE_THRESHOLD) swipeCard('left');
        else resetPosition();
      },
    })
  ).current;

  const photoUrl =
    profile.photos && profile.photos.length > 0
      ? profile.photos[0]
      : 'https://via.placeholder.com/400x600/4ECDC4/FFFFFF?text=No+Photo';

  const scoreColors = matchData ? getScoreColor(matchData.score) : null;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />

      {/* Swipe direction indicators */}
      <Animated.View style={[styles.swipeIndicator, styles.likeIndicator, { opacity: likeOpacity }]}>
        <Text style={styles.likeIndicatorText}>LIKE ❤️</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeIndicator, styles.passIndicator, { opacity: passOpacity }]}>
        <Text style={styles.passIndicatorText}>PASS ✕</Text>
      </Animated.View>

      {/* Photo count badge */}
      {profile.photos && profile.photos.length > 1 && (
        <View style={styles.photoIndicator}>
          <Ionicons name="images" size={14} color="#FFF" />
          <Text style={styles.photoCount}>{profile.photos.length}</Text>
        </View>
      )}

      {/* Gradient overlay + info */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
        pointerEvents="none"
      >
        <View style={styles.infoContainer}>
          {/* Name row */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.username}{profile.age ? `, ${profile.age}` : ''}
            </Text>
            <Ionicons name="checkmark-circle" size={22} color="#FF9100" style={{ marginLeft: 6 }} />
          </View>

          {/* Location */}
          {profile.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={13} color="#D8AF45" />
              <Text style={styles.infoText} numberOfLines={1}>{profile.location}</Text>
            </View>
          )}

          {/* Personality tags */}
          {profile.personality_tags && profile.personality_tags.length > 0 && (
            <View style={styles.tagRow}>
              {profile.personality_tags.slice(0, 3).map(tag => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagPillText}>{tag.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Trip tier — first preference */}
          {profile.trip_tier_preferences && profile.trip_tier_preferences.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="map" size={13} color="#D8AF45" />
              <Text style={[styles.infoText, { color: '#D8AF45' }]}>
                Prefers {profile.trip_tier_preferences[0]} trips
              </Text>
            </View>
          )}

          {/* Compatibility reasons */}
          {matchData && matchData.reasons.length > 0 && (
            <View style={styles.reasonsRow}>
              {matchData.reasons.slice(0, 2).map((r, i) => (
                <View key={i} style={styles.reasonPill}>
                  <Ionicons name="checkmark" size={10} color="#6BCF7F" />
                  <Text style={styles.reasonText}>{r}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Action buttons inside card — bottom */}
      <View style={styles.cardActions} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.cardPassBtn}
          onPress={() => swipeCard('left')}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={26} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardLikeBtn}
          onPress={() => swipeCard('right')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#E8755A', '#CA573D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardLikeGradient}
          >
            <Ionicons name="heart" size={26} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = height * 0.67;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  swipeIndicator: {
    position: 'absolute',
    top: 32,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 3,
    zIndex: 10,
  },
  likeIndicator: {
    left: 20,
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76,175,80,0.15)',
    transform: [{ rotate: '-15deg' }],
  },
  passIndicator: {
    right: 20,
    borderColor: '#F44336',
    backgroundColor: 'rgba(244,67,54,0.15)',
    transform: [{ rotate: '15deg' }],
  },
  likeIndicatorText: { color: '#4CAF50', fontSize: 18, fontWeight: '900' },
  passIndicatorText: { color: '#F44336', fontSize: 18, fontWeight: '900' },

  photoIndicator: {
    position: 'absolute',
    top: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, gap: 4,
  },
  photoCount: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  scoreBadge: {
    position: 'absolute',
    top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, gap: 4,
  },
  scoreText: { color: 'white', fontSize: 13, fontWeight: '800' },
  scoreLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },

  gradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingTop: 100,
    paddingBottom: 88,
    paddingHorizontal: 18,
  },
  infoContainer: { gap: 6 },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: { fontSize: 24, fontWeight: '800', color: '#FFF', flex: 1 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500', flex: 1 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tagPill: {
    backgroundColor: 'rgba(216,175,69,0.24)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(216,175,69,0.35)',
  },
  tagPillText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  reasonPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(107,207,127,0.2)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, gap: 4,
    borderWidth: 1, borderColor: 'rgba(107,207,127,0.35)',
  },
  reasonText: { color: '#FFF', fontSize: 11, fontWeight: '600' },

  // Buttons inside card
  cardActions: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  cardPassBtn: {
    flex: 1,
    height: 54,
    borderRadius: 30,
    backgroundColor: 'rgba(22,22,22,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLikeBtn: {
    flex: 1,
    height: 54,
    borderRadius: 30,
    overflow: 'hidden',
  },
  cardLikeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
