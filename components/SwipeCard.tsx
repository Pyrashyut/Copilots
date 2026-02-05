// components/SwipeCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SwipeCardProps {
  profile: any;
  isImmersive: boolean; 
}

export default function SwipeCard({ profile, isImmersive }: SwipeCardProps) {
  const photoUrl = profile.photos && profile.photos.length > 0 
    ? profile.photos[0] 
    : 'https://via.placeholder.com/400x600/161616/FFFFFF?text=No+Photo';

  return (
    <View style={styles.card}>
      <Image 
        source={{ uri: photoUrl }} 
        style={styles.image} 
        resizeMode="cover"
      />
      
      {/* Hide overlays entirely during immersive hold */}
      {!isImmersive && (
        <>
          {/* Top subtle vignette */}
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={styles.topOverlay} />

          {/* Bottom Info Section */}
          <LinearGradient 
            colors={['transparent', 'rgba(0,0,0,0.7)', '#000000']} 
            style={styles.bottomOverlay}
          >
            <View style={styles.infoContainer}>
              
              {/* Name, Age & Verified Badge */}
              <View style={styles.row}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>
                    {profile.username}{profile.age ? `, ${profile.age}` : ''}
                  </Text>
                  <Ionicons name="checkmark-circle" size={22} color="#FF9100" />
                </View>
                <View style={styles.dot} />
                <Text style={styles.locationText}>{profile.location || 'London'}</Text>
              </View>

              {/* Travel Preference (Gold text from Figma) */}
              <View style={styles.prefRow}>
                <Ionicons name="map-outline" size={18} color="#D8AF45" />
                <Text style={styles.prefText}>Prefers Local Escape</Text>
              </View>

              {/* Bio Preview */}
              <Text style={styles.bioText} numberOfLines={2}>
                {profile.bio || "Street food hunter. Sunrise chaser. Looking for a travel companion."}
              </Text>

              {/* Matrix Tags (Pills) */}
              <View style={styles.pillContainer}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Loves Hiking</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Wants to try Diving</Text>
                </View>
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
    height: height * 0.65, // Adjusted to avoid bottom button overlap on iOS
    borderRadius: 24,
    backgroundColor: '#161616',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  image: { ...StyleSheet.absoluteFillObject },
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
  infoContainer: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nameText: { color: '#FFF', fontSize: 26, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  locationText: { color: '#FFF', fontSize: 18, opacity: 0.8 },
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