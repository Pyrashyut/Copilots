// components/SwipeCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SwipeCardProps {
  profile: any;
  isImmersive: boolean; 
  isActive?: boolean; 
  matchData?: { score: number, common: string[] }; 
}

export default function SwipeCard({ profile, isImmersive, isActive = true, matchData }: SwipeCardProps) {
  const mediaUrl = profile.photos && profile.photos.length > 0 
    ? profile.photos[0] 
    : 'https://via.placeholder.com/400x600/161616/FFFFFF?text=No+Photo';

  const isVideo = mediaUrl.match(/\.(mp4|mov|qt)$/i);

  const player = useVideoPlayer(isVideo ? mediaUrl : null, player => {
    player.loop = true;
    player.muted = false;
  });

  useEffect(() => {
    if (isVideo && player) {
      if (isActive) player.play();
      else player.pause();
    }
  }, [isActive, isVideo, player]);

  return (
    <View style={styles.card}>
      {/* Background Media */}
      {isVideo ? (
        <VideoView style={styles.media} player={player} contentFit="cover" nativeControls={false} />
      ) : (
        <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
      )}
      
      {!isImmersive && (
        <>
          {/* Top Shadow */}
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topOverlay} />
          
          {/* Section 3.5.5: AI COMPATIBILITY BADGE */}
          {matchData && (
            <View style={styles.matchBadgeContainer}>
                <LinearGradient 
                    colors={['#D4AF37', '#B8860B']} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 1}}
                    style={styles.matchGradient}
                >
                    <Ionicons name="sparkles" size={12} color="#FFF" />
                    <Text style={styles.matchText}>{matchData.score}% Compatibility</Text>
                </LinearGradient>
            </View>
          )}

          {/* Bottom Info Overlay */}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)', '#000000']} style={styles.bottomOverlay}>
            <View style={styles.infoContainer}>
              
              {/* Common Interest "The Why" */}
              {matchData && matchData.common.length > 0 && (
                <View style={styles.reasonPill}>
                    <Text style={styles.reasonText}>✨ {matchData.common[0]}</Text>
                </View>
              )}

              <View style={styles.row}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>{profile.username}{profile.age ? `, ${profile.age}` : ''}</Text>
                  <Ionicons name="checkmark-circle" size={22} color="#FF9100" />
                </View>
                {isVideo && (
                    <View style={styles.videoBadge}>
                        <Text style={styles.videoBadgeText}>VIDEO</Text>
                    </View>
                )}
              </View>

              <Text style={styles.locationText}>
                <Ionicons name="location-sharp" size={14} color="#FFF" /> {profile.location || 'Explorer'}
              </Text>

              <Text style={styles.bioText} numberOfLines={2}>
                {profile.bio || "Ready for a new adventure..."}
              </Text>

              {/* Personality Tags */}
              <View style={styles.tagContainer}>
                {(profile.personality_tags || []).slice(0, 3).map((tag: string, i: number) => (
                  <View key={i} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    width: width * 0.92, 
    height: height * 0.65, 
    borderRadius: 24, 
    backgroundColor: '#161616', 
    overflow: 'hidden', 
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  media: { ...StyleSheet.absoluteFillObject },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  
  // AI Match Badge (Top Right)
  matchBadgeContainer: { 
    position: 'absolute', 
    top: 20, 
    right: 20, 
    borderRadius: 12, 
    overflow: 'hidden', 
    elevation: 5 
  },
  matchGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 8,
    gap: 6
  },
  matchText: { color: '#FFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },

  bottomOverlay: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 400, 
    justifyContent: 'flex-end', 
    padding: 20 
  },
  infoContainer: { gap: 6 },
  
  // The "Why" Reason Pill
  reasonPill: { 
    backgroundColor: 'rgba(212, 175, 55, 0.25)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 10, 
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)'
  },
  reasonText: { color: '#D4AF37', fontSize: 13, fontWeight: '700' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  
  videoBadge: { backgroundColor: '#E03724', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  videoBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  
  locationText: { color: '#FFF', fontSize: 16, opacity: 0.9, fontWeight: '500' },
  bioText: { color: '#FFF', fontSize: 14, opacity: 0.7, lineHeight: 20, marginTop: 4 },
  
  // Tags
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tagPill: { 
    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  tagText: { color: '#FFF', fontSize: 12, fontWeight: '600' }
});