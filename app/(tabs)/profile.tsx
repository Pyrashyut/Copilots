// app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reload profile whenever the tab comes into focus (in case of edits)
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettings = () => {
    // Navigate to the hidden settings tab
    router.push('/settings');
  };

  const handleEdit = () => {
    router.push('/profile/edit');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.navy} />
      </View>
    );
  }

  // Fallback if no photos
  const mainPhoto = profile?.photos?.[0] || 'https://via.placeholder.com/400';

  return (
    <LinearGradient 
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]} 
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      <View style={styles.bgDecoration1} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={handleSettings}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* PROFILE CARD (View as others see) */}
          <View style={styles.profileCard}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: mainPhoto }} style={styles.profileImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.imageOverlay}
              >
                <Text style={styles.name}>
                  {profile?.username}
                  {profile?.age ? `, ${profile.age}` : ''}
                </Text>
                <Text style={styles.location}>
                  <Ionicons name="location" size={14} color={Colors.highlight.gold} /> {profile?.location || 'No Location'}
                </Text>
              </LinearGradient>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>5.0</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>100%</Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
            </View>
          </View>

          {/* EDIT BUTTON */}
          <TouchableOpacity style={styles.editButton} onPress={handleEdit} activeOpacity={0.8}>
            <LinearGradient
              colors={Colors.gradient.sunset}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.editGradient}
            >
              <Ionicons name="create-outline" size={20} color={Colors.neutral.white} />
              <Text style={styles.editText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* BIO SECTION */}
          {profile?.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About Me</Text>
              <View style={styles.contentCard}>
                <Text style={styles.bodyText}>{profile.bio}</Text>
              </View>
            </View>
          )}

          {/* EXPERIENCE MATRIX PREVIEW */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travel Preferences</Text>
            <View style={styles.contentCard}>
              <View style={styles.prefRow}>
                <Ionicons name="airplane" size={20} color={Colors.primary.navy} />
                <Text style={styles.prefText}>
                  {profile?.travel_traits?.pacing === 'left' ? 'Relaxed' : 'Action Packed'}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.prefRow}>
                <Ionicons name="wallet" size={20} color={Colors.primary.navy} />
                <Text style={styles.prefText}>
                  {profile?.travel_traits?.budget === 'left' ? 'Budget' : 'Luxury'}
                </Text>
              </View>
              
              {/* Show count of rated items */}
              <View style={styles.matrixSummary}>
                <Text style={styles.matrixText}>
                  {Object.keys(profile?.preferences || {}).length} experiences rated in Matrix
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{height: 40}} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgDecoration1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
  },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.neutral.white,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  /* PROFILE CARD */
  profileCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  imageContainer: {
    height: 350,
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 60,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.neutral.white,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  
  /* STATS */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.neutral.white,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.navy,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral.grey,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.neutral.border,
  },

  /* EDIT BUTTON */
  editButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  editGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  editText: {
    color: Colors.neutral.white,
    fontWeight: '700',
    fontSize: 16,
  },

  /* SECTIONS */
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contentCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 16,
    padding: 20,
  },
  bodyText: {
    fontSize: 15,
    color: Colors.primary.navy,
    lineHeight: 22,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  prefText: {
    fontSize: 16,
    color: Colors.primary.navy,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral.border,
    marginVertical: 12,
  },
  matrixSummary: {
    marginTop: 12,
    backgroundColor: Colors.neutral.trailDust,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  matrixText: {
    fontSize: 13,
    color: Colors.neutral.grey,
    fontWeight: '600',
  }
});