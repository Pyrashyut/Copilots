// components/SwipeCard.tsx
// Changes from original:
// - Accepts optional matchData prop (score + reasons)
// - Shows compatibility score badge and reason pills on card
// - Shows super like indicator if profile was super liked

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

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

const TIER_LABELS: Record<string, string> = {
  local:         '🏙️ Local',
  national:      '🚗 National',
  international: '✈️ International',
  exotic:        '🌴 Exotic',
};

export default function SwipeCard({
  profile,
  matchData,
}: {
  profile: Profile;
  matchData?: MatchData;
}) {
  const photoUrl =
    profile.photos && profile.photos.length > 0
      ? profile.photos[0]
      : 'https://via.placeholder.com/400x600/4ECDC4/FFFFFF?text=No+Photo';

  const scoreColors = matchData ? getScoreColor(matchData.score) : null;

  return (
    <View style={styles.card}>
      <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />

      {/* Photo count */}
      {profile.photos && profile.photos.length > 1 && (
        <View style={styles.photoIndicator}>
          <Ionicons name="images" size={14} color={Colors.neutral.white} />
          <Text style={styles.photoCount}>{profile.photos.length}</Text>
        </View>
      )}

      {/* Compatibility score badge — top left */}
      {matchData && scoreColors && (
        <LinearGradient
          colors={scoreColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.scoreBadge}
        >
          <Ionicons name="star" size={11} color="white" />
          <Text style={styles.scoreText}>{matchData.score}%</Text>
          <Text style={styles.scoreLabel}>{getScoreLabel(matchData.score)}</Text>
        </LinearGradient>
      )}

      {/* Super like indicator */}
      {matchData?.isSuperLike && (
        <View style={styles.superLikeBadge}>
          <Ionicons name="star" size={14} color={Colors.highlight.gold} />
          <Text style={styles.superLikeText}>Super Liked</Text>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.88)']}
        style={styles.gradient}
      >
        <View style={styles.infoContainer}>
          {/* Name & Age */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.username}
              {profile.age ? `, ${profile.age}` : ''}
            </Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.secondary.teal} />
            </View>
          </View>

          {/* Job */}
          {profile.job_title && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="briefcase" size={13} color={Colors.primary.navy} />
              </View>
              <Text style={styles.infoText} numberOfLines={1}>{profile.job_title}</Text>
            </View>
          )}

          {/* Location */}
          {profile.location && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="location" size={13} color={Colors.primary.navy} />
              </View>
              <Text style={styles.infoText} numberOfLines={1}>{profile.location}</Text>
            </View>
          )}

          {/* Trip tier preferences */}
          {profile.trip_tier_preferences && profile.trip_tier_preferences.length > 0 && (
            <View style={styles.tierRow}>
              {profile.trip_tier_preferences.slice(0, 3).map(tier => (
                <View key={tier} style={styles.tierPill}>
                  <Text style={styles.tierPillText}>
                    {TIER_LABELS[tier] ?? tier}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Compatibility reasons */}
          {matchData && matchData.reasons.length > 0 && (
            <View style={styles.reasonsSection}>
              <View style={styles.reasonsDivider} />
              <Text style={styles.reasonsHeading}>Why you match</Text>
              <View style={styles.reasonsRow}>
                {matchData.reasons.slice(0, 3).map((r, i) => (
                  <View key={i} style={styles.reasonPill}>
                    <Ionicons name="checkmark" size={10} color={Colors.highlight.success} />
                    <Text style={styles.reasonText} numberOfLines={1}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Bio — only show if no reasons to save space */}
          {(!matchData || matchData.reasons.length === 0) && profile.bio && (
            <View style={styles.bioContainer}>
              <Text style={styles.bioText} numberOfLines={2}>{profile.bio}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: width * 0.9,
    height: height * 0.64,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.neutral.white,
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.neutral.border,
  },
  photoIndicator: {
    position: 'absolute',
    top: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, gap: 4,
  },
  photoCount: { color: Colors.neutral.white, fontSize: 12, fontWeight: '600' },

  // Score badge
  scoreBadge: {
    position: 'absolute',
    top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, gap: 4,
  },
  scoreText: { color: 'white', fontSize: 13, fontWeight: '800' },
  scoreLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },

  // Super like badge
  superLikeBadge: {
    position: 'absolute',
    top: 52, left: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, gap: 4,
    borderWidth: 1, borderColor: Colors.highlight.gold,
  },
  superLikeText: { color: Colors.highlight.gold, fontSize: 11, fontWeight: '700' },

  gradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingTop: 80, paddingBottom: 20,
    paddingHorizontal: 18,
  },
  infoContainer: { gap: 6 },

  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 2,
  },
  name: { fontSize: 28, fontWeight: '800', color: Colors.neutral.white, flex: 1 },
  verifiedBadge: { marginLeft: 8 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.neutral.white,
    justifyContent: 'center', alignItems: 'center',
  },
  infoText: { fontSize: 14, color: Colors.neutral.white, fontWeight: '500', flex: 1 },

  // Trip tier pills
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tierPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  tierPillText: { color: Colors.neutral.white, fontSize: 11, fontWeight: '600' },

  // Compatibility reasons
  reasonsSection: { marginTop: 4 },
  reasonsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  reasonsHeading: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 6,
  },
  reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reasonPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(107,207,127,0.25)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, gap: 4,
    borderWidth: 1, borderColor: 'rgba(107,207,127,0.4)',
  },
  reasonText: { color: Colors.neutral.white, fontSize: 11, fontWeight: '600', maxWidth: 120 },

  // Bio fallback
  bioContainer: {
    marginTop: 6, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
  },
  bioText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
});