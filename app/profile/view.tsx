// app/profile/view.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function ViewProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const userId = params.userId as string;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);

      const { data: blockData } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .single();

      setIsBlocked(!!blockData);

      const { data: likeData } = await supabase
        .from('swipes')
        .select('id')
        .eq('liker_id', user.id)
        .eq('likee_id', userId)
        .eq('is_like', true)
        .single();

      setHasLiked(!!likeData);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) return;

    try {
      if (hasLiked) {
        await supabase
          .from('swipes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('likee_id', userId);

        setHasLiked(false);
        Alert.alert('Removed', 'Removed from liked');
      } else {
        await supabase.from('swipes').insert({
          liker_id: currentUserId,
          likee_id: userId,
          is_like: true,
        });

        setHasLiked(true);

        const { data: isMatch } = await supabase.rpc('check_match', {
          current_user_id: currentUserId,
          target_user_id: userId,
        });

        if (isMatch) {
          Alert.alert(
            "✈️ IT'S A MATCH!",
            `You and ${profile.username} both want to explore together!`,
            [{ text: 'Amazing!', style: 'default' }]
          );
        } else {
          Alert.alert('Liked! ❤️', `You liked ${profile.username}`);
        }
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleBlock = async () => {
    if (!currentUserId) return;

    Alert.alert(
      isBlocked ? 'Unblock User' : 'Block User',
      isBlocked
        ? `Unblock ${profile.username}? They will be able to see your profile again.`
        : `Block ${profile.username}? You won't see each other anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (isBlocked) {
                await supabase
                  .from('blocks')
                  .delete()
                  .eq('blocker_id', currentUserId)
                  .eq('blocked_id', userId);

                setIsBlocked(false);
                Alert.alert('Unblocked', `${profile.username} has been unblocked`);
              } else {
                await supabase.from('blocks').insert({
                  blocker_id: currentUserId,
                  blocked_id: userId,
                });

                await supabase
                  .from('swipes')
                  .delete()
                  .or(`and(liker_id.eq.${currentUserId},likee_id.eq.${userId}),and(liker_id.eq.${userId},likee_id.eq.${currentUserId})`);

                setIsBlocked(true);
                Alert.alert('Blocked', `${profile.username} has been blocked`, [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              }
            } catch (error) {
              console.error('Block error:', error);
            }
          },
        },
      ]
    );
  };

  const handleReport = () => {
    Alert.alert('Report User', 'What would you like to report?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate') },
      { text: 'Fake Profile', onPress: () => submitReport('fake') },
      { text: 'Harassment', onPress: () => submitReport('harassment') },
    ]);
  };

  const submitReport = async (reason: string) => {
    if (!currentUserId) return;

    try {
      await supabase.from('reports').insert({
        reporter_id: currentUserId,
        reported_id: userId,
        reason,
      });

      Alert.alert('Reported', 'Thank you for your report. We will review it.');
    } catch (error) {
      console.error('Report error:', error);
    }
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
        <Text style={styles.loadingText}>Loading profile...</Text>
      </LinearGradient>
    );
  }

  if (!profile) {
    return (
      <LinearGradient
        colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.neutral.trailDust]}
        style={styles.center}
      >
        <Text style={styles.emptyTitle}>Profile not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]}
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{profile.username}</Text>
            <Text style={styles.headerSubtitle}>
              {profile.age ? `${profile.age} • ` : ''}
              {profile.location || 'Traveler'}
            </Text>
          </View>

          <TouchableOpacity onPress={handleReport} style={styles.iconBtn}>
            <Ionicons name="flag-outline" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Photo card */}
          <View style={styles.photoCard}>
            {profile.photos && profile.photos.length > 0 ? (
              <>
                <Image
                  source={{ uri: profile.photos[currentImageIndex] }}
                  style={styles.mainPhoto}
                  resizeMode="cover"
                />

                {profile.photos.length > 1 && (
                  <>
                    <View style={styles.photoIndicators}>
                      {profile.photos.map((_: any, index: number) => (
                        <View
                          key={index}
                          style={[
                            styles.indicator,
                            index === currentImageIndex && styles.activeIndicator,
                          ]}
                        />
                      ))}
                    </View>

                    {currentImageIndex > 0 && (
                      <TouchableOpacity
                        style={[styles.photoNavBtn, styles.photoNavLeft]}
                        onPress={() => setCurrentImageIndex((prev) => prev - 1)}
                      >
                        <Ionicons name="chevron-back" size={26} color={Colors.neutral.white} />
                      </TouchableOpacity>
                    )}

                    {currentImageIndex < profile.photos.length - 1 && (
                      <TouchableOpacity
                        style={[styles.photoNavBtn, styles.photoNavRight]}
                        onPress={() => setCurrentImageIndex((prev) => prev + 1)}
                      >
                        <Ionicons name="chevron-forward" size={26} color={Colors.neutral.white} />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            ) : (
              <View style={[styles.mainPhoto, styles.placeholderPhoto]}>
                <Ionicons name="person" size={90} color="rgba(255,255,255,0.35)" />
              </View>
            )}
          </View>

          {/* Glass plate with all details */}
          <View style={styles.glassPlate}>
            <Text style={styles.plateName}>
              {profile.username}
              {profile.age ? `, ${profile.age}` : ''}
            </Text>

            {profile.job_title && (
              <View style={styles.infoRow}>
                <Ionicons name="briefcase" size={20} color={Colors.highlight.gold} />
                <Text style={styles.infoText}>{profile.job_title}</Text>
              </View>
            )}

            {profile.location && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color={Colors.highlight.gold} />
                <Text style={styles.infoText}>{profile.location}</Text>
              </View>
            )}

            {profile.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.sectionTitle}>About Me</Text>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </View>
            )}

            {/* UPDATED PREFERENCES SECTION */}
            {profile.preferences && Object.keys(profile.preferences).length > 0 && (
              <View style={styles.preferencesSection}>
                <Text style={styles.sectionTitle}>Travel Preferences</Text>
                <View style={styles.preferencesGrid}>
                  {Object.entries(profile.preferences).map(([key, value]) => (
                    <View key={key} style={styles.preferenceChip}>
                      <Text style={styles.preferenceLabel}>{key}</Text>
                      <Text style={styles.preferenceValue}>{value as string}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.actionsContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={handleBlock}>
              <View style={[styles.actionButton, styles.block]}>
                <Ionicons
                  name={isBlocked ? 'checkmark-circle' : 'ban'}
                  size={36}
                  color={isBlocked ? Colors.secondary.teal : Colors.highlight.error}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLike}>
              <View
                style={[
                  styles.actionButton,
                  hasLiked ? styles.liked : styles.like,
                ]}
              >
                <Ionicons
                  name={hasLiked ? 'heart' : 'heart-outline'}
                  size={40}
                  color={Colors.neutral.white}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  bgDecoration1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(78, 205, 196, 0.10)',
  },
  bgDecoration2: {
    position: 'absolute',
    bottom: 80,
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 217, 61, 0.08)',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  logoLoader: {
    width: 180,
    height: 60,
    marginBottom: 24,
  },

  header: {
    height: 110,
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.neutral.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  scrollContent: {
    paddingBottom: 160,
  },

  photoCard: {
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 28,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 14,
  },

  mainPhoto: {
    width: '100%',
    height: width * 1.15,
    borderRadius: 32,
  },

  placeholderPhoto: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  photoIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  activeIndicator: {
    backgroundColor: Colors.neutral.white,
    width: 22,
  },

  photoNavBtn: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNavLeft: { left: 16 },
  photoNavRight: { right: 16 },

  glassPlate: {
    marginHorizontal: 24,
    marginBottom: 140,
    padding: 28,
    paddingTop: 0,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    backdropFilter: 'blur(14px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 12,
  },

  plateName: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.neutral.white,
    textAlign: 'center',
    marginBottom: 24,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },

  infoText: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral.white,
    marginBottom: 14,
    marginTop: 8,
  },

  bioSection: {
    marginTop: 12,
  },

  bioText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.90)',
    lineHeight: 26,
  },

  preferencesSection: {
    marginTop: 28,
  },

  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // UPDATED STYLES FOR PREFERENCES
  preferenceChip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    minWidth: '45%',
  },
  preferenceLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  preferenceValue: {
    fontSize: 15,
    color: Colors.neutral.white,
    fontWeight: '700',
  },

  actionsContainer: {
    paddingBottom: 38,
    paddingTop: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  block: {
    backgroundColor: Colors.neutral.white,
  },
  like: {
    backgroundColor: Colors.highlight.success,
  },
  liked: {
    backgroundColor: Colors.highlight.error,
  },

  loadingText: {
    marginTop: 16,
    color: Colors.neutral.white,
    fontSize: 16,
  },
  emptyTitle: {
    fontSize: 28,
    color: Colors.neutral.white,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: Colors.primary.navy,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
  },
  backBtnText: {
    color: Colors.neutral.white,
    fontWeight: '700',
    fontSize: 16,
  },
});