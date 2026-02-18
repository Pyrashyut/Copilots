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
  matchData?: { score: number, common: string[] }; // NEW PROP
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
      {isVideo ? (
        <VideoView style={styles.media} player={player} contentFit="cover" nativeControls={false} />
      ) : (
        <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
      )}
      
      {!isImmersive && (
        <>
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={styles.topOverlay} />
          
          {/* COMPATIBILITY BADGE */}
          {matchData && (
            <View style={styles.matchBadge}>
                <LinearGradient colors={['#D4AF37', '#B8860B']} style={styles.matchGradient}>
                    <Text style={styles.matchText}>{matchData.score}% Match</Text>
                </LinearGradient>
            </View>
          )}

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)', '#000000']} style={styles.bottomOverlay}>
            <View style={styles.infoContainer}>
              <View style={styles.row}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>{profile.username}{profile.age ? `, ${profile.age}` : ''}</Text>
                  <Ionicons name="checkmark-circle" size={22} color="#FF9100" />
                </View>
                {isVideo && <View style={styles.liveBadge}><Text style={styles.liveText}>VIDEO</Text></View>}
              </View>

              <Text style={styles.locationText}>{profile.location || 'Explorer'}</Text>

              {/* COMMON INTERESTS SECTION */}
              {matchData && matchData.common.length > 0 && (
                <View style={styles.commonRow}>
                    <Ionicons name="sparkles" size={14} color="#D4AF37" />
                    <Text style={styles.commonText}>You both love {matchData.common[0]}</Text>
                </View>
              )}

              <Text style={styles.bioText} numberOfLines={2}>{profile.bio || "Ready to explore the world."}</Text>

              <View style={styles.pillContainer}>
                {(profile.preferences?.loved || []).slice(0, 2).map((item: string, i: number) => (
                  <View key={i} style={styles.pill}><Text style={styles.pillText}>{item}</Text></View>
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
  card: { width: width * 0.92, height: height * 0.65, borderRadius: 24, backgroundColor: '#161616', overflow: 'hidden', elevation: 10 },
  media: { ...StyleSheet.absoluteFillObject },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  
  // New Match Badge Styles
  matchBadge: { position: 'absolute', top: 20, right: 20, borderRadius: 12, overflow: 'hidden', elevation: 5 },
  matchGradient: { paddingHorizontal: 12, paddingVertical: 6 },
  matchText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 350, justifyContent: 'flex-end', padding: 24 },
  infoContainer: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nameText: { color: '#FFF', fontSize: 26, fontWeight: '700' },
  liveBadge: { backgroundColor: '#E03724', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  locationText: { color: '#FFF', fontSize: 16, opacity: 0.8 },
  
  // New Common Interests Style
  commonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(212, 175, 55, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  commonText: { color: '#D4AF37', fontSize: 12, fontWeight: '700' },

  bioText: { color: '#FFF', fontSize: 14, opacity: 0.8, lineHeight: 18 },
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  pillText: { color: '#FFF', fontSize: 12, fontWeight: '500' }
});