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
}

export default function SwipeCard({ profile, isImmersive, isActive = true }: SwipeCardProps) {
  const mediaUrl = profile.photos && profile.photos.length > 0 
    ? profile.photos[0] 
    : 'https://via.placeholder.com/400x600/161616/FFFFFF?text=No+Photo';

  const isVideo = mediaUrl.match(/\.(mp4|mov|qt)$/i);

  // Initialize player only if it's a video
  const player = useVideoPlayer(isVideo ? mediaUrl : null, player => {
    player.loop = true;
    player.muted = false;
  });

  // Handle Play/Pause based on active state
  useEffect(() => {
    if (isVideo && player) {
      if (isActive) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [isActive, isVideo, player]);

  return (
    <View style={styles.card}>
      {isVideo ? (
        <VideoView
          style={styles.media}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <Image 
          source={{ uri: mediaUrl }} 
          style={styles.media} 
          resizeMode="cover"
        />
      )}
      
      {!isImmersive && (
        <>
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={styles.topOverlay} />

          <LinearGradient 
            colors={['transparent', 'rgba(0,0,0,0.6)', '#000000']} 
            style={styles.bottomOverlay}
          >
            <View style={styles.infoContainer}>
              <View style={styles.row}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>
                    {profile.username}{profile.age ? `, ${profile.age}` : ''}
                  </Text>
                  <Ionicons name="checkmark-circle" size={22} color="#FF9100" />
                </View>
                {isVideo && <View style={styles.liveBadge}><Text style={styles.liveText}>VIDEO</Text></View>}
              </View>

              <View style={styles.row}>
                 <Text style={styles.locationText}>{profile.location || 'Unknown Location'}</Text>
              </View>

              <View style={styles.prefRow}>
                <Ionicons name="map-outline" size={18} color="#D8AF45" />
                <Text style={styles.prefText}>Travel Style: {profile.preferences?.loved?.[0] || 'Adventurer'}</Text>
              </View>

              <Text style={styles.bioText} numberOfLines={2}>
                {profile.bio || "Ready to explore the world."}
              </Text>

              <View style={styles.pillContainer}>
                {(profile.preferences?.loved || []).slice(0, 2).map((item: string, i: number) => (
                  <View key={i} style={styles.pill}>
                    <Text style={styles.pillText}>{item}</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  media: { ...StyleSheet.absoluteFillObject },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  bottomOverlay: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 350, 
    justifyContent: 'flex-end', 
    padding: 24 
  },
  infoContainer: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nameText: { color: '#FFF', fontSize: 26, fontWeight: '700' },
  liveBadge: { backgroundColor: '#E03724', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  locationText: { color: '#FFF', fontSize: 16, opacity: 0.8 },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefText: { color: '#D8AF45', fontSize: 15, fontWeight: '600' },
  bioText: { color: '#FFF', fontSize: 15, opacity: 0.8, lineHeight: 20 },
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill: { 
    backgroundColor: 'rgba(216, 175, 69, 0.20)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(216, 175, 69, 0.1)'
  },
  pillText: { color: '#FFF', fontSize: 13, fontWeight: '500' }
});