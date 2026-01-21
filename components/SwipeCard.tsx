// components/SwipeCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface Profile {
  id: string;
  username: string;
  photos: string[];
  job_title?: string;
  age?: number;
  location?: string;
  bio?: string;
}

export default function SwipeCard({ profile }: { profile: Profile }) {
  const photoUrl = profile.photos && profile.photos.length > 0 
    ? profile.photos[0] 
    : 'https://via.placeholder.com/400x600/4ECDC4/FFFFFF?text=No+Photo';

  return (
    <View style={styles.card}>
      <Image 
        source={{ uri: photoUrl }} 
        style={styles.image} 
        resizeMode="cover"
      />
      
      {/* Photo Count Indicator */}
      {profile.photos && profile.photos.length > 1 && (
        <View style={styles.photoIndicator}>
          <Ionicons name="images" size={14} color={Colors.neutral.white} />
          <Text style={styles.photoCount}>{profile.photos.length}</Text>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      >
        <View style={styles.infoContainer}>
          {/* Name & Age */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {profile.username}
              {profile.age ? `, ${profile.age}` : ''}
            </Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.secondary.teal} />
            </View>
          </View>
          
          {/* Job Title */}
          {profile.job_title && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="briefcase" size={14} color={Colors.primary.navy} />
              </View>
              <Text style={styles.infoText}>{profile.job_title}</Text>
            </View>
          )}

          {/* Location */}
          {profile.location && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="location" size={14} color={Colors.primary.navy} />
              </View>
              <Text style={styles.infoText}>{profile.location}</Text>
            </View>
          )}

          {/* Bio Preview */}
          {profile.bio && (
            <View style={styles.bioContainer}>
              <Text style={styles.bioText} numberOfLines={2}>
                {profile.bio}
              </Text>
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
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  photoCount: {
    color: Colors.neutral.white,
    fontSize: 12,
    fontWeight: '600',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 100,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  infoContainer: {
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.neutral.white,
    flex: 1,
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    color: Colors.neutral.white,
    fontWeight: '500',
    flex: 1,
  },
  bioContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  bioText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
});