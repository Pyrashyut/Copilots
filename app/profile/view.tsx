// app/profile/view.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);

      // Check if blocked
      const { data: blockData } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .single();

      setIsBlocked(!!blockData);

      // Check if liked
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
        // Unlike
        await supabase
          .from('swipes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('likee_id', userId);
        
        setHasLiked(false);
        Alert.alert('Removed', 'Removed from liked');
      } else {
        // Like
        await supabase.from('swipes').insert({
          liker_id: currentUserId,
          likee_id: userId,
          is_like: true
        });

        setHasLiked(true);

        // Check for match
        const { data: isMatch } = await supabase
          .rpc('check_match', { 
            current_user_id: currentUserId, 
            target_user_id: userId 
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
                // Unblock
                await supabase
                  .from('blocks')
                  .delete()
                  .eq('blocker_id', currentUserId)
                  .eq('blocked_id', userId);
                
                setIsBlocked(false);
                Alert.alert('Unblocked', `${profile.username} has been unblocked`);
              } else {
                // Block
                await supabase.from('blocks').insert({
                  blocker_id: currentUserId,
                  blocked_id: userId
                });

                // Remove any existing likes/matches
                await supabase
                  .from('swipes')
                  .delete()
                  .or(`and(liker_id.eq.${currentUserId},likee_id.eq.${userId}),and(liker_id.eq.${userId},likee_id.eq.${currentUserId})`);

                setIsBlocked(true);
                Alert.alert('Blocked', `${profile.username} has been blocked`, [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              }
            } catch (error) {
              console.error('Block error:', error);
            }
          }
        }
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
        reason
      });

      Alert.alert('Reported', 'Thank you for your report. We will review it.');
    } catch (error) {
      console.error('Report error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary.navy} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReport} style={styles.headerBtn}>
            <Ionicons name="flag-outline" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>
        </View>

        <ScrollView>
          {/* Photo Carousel */}
          <View style={styles.photoContainer}>
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
                            index === currentImageIndex && styles.activeIndicator
                          ]} 
                        />
                      ))}
                    </View>
                    
                    {currentImageIndex > 0 && (
                      <TouchableOpacity 
                        style={[styles.photoNavBtn, styles.photoNavLeft]}
                        onPress={() => setCurrentImageIndex(prev => prev - 1)}
                      >
                        <Ionicons name="chevron-back" size={24} color={Colors.neutral.white} />
                      </TouchableOpacity>
                    )}
                    
                    {currentImageIndex < profile.photos.length - 1 && (
                      <TouchableOpacity 
                        style={[styles.photoNavBtn, styles.photoNavRight]}
                        onPress={() => setCurrentImageIndex(prev => prev + 1)}
                      >
                        <Ionicons name="chevron-forward" size={24} color={Colors.neutral.white} />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            ) : (
              <View style={[styles.mainPhoto, styles.placeholderPhoto]}>
                <Ionicons name="person" size={80} color={Colors.neutral.greyLight} />
              </View>
            )}
          </View>

          {/* Profile Info */}
          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {profile.username}
                {profile.age && `, ${profile.age}`}
              </Text>
            </View>

            {profile.job_title && (
              <View style={styles.infoRow}>
                <Ionicons name="briefcase" size={18} color={Colors.primary.navy} />
                <Text style={styles.infoText}>{profile.job_title}</Text>
              </View>
            )}

            {profile.location && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color={Colors.primary.navy} />
                <Text style={styles.infoText}>{profile.location}</Text>
              </View>
            )}

            {profile.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.bioTitle}>About</Text>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </View>
            )}

            {profile.preferences && Object.keys(profile.preferences).length > 0 && (
              <View style={styles.preferencesSection}>
                <Text style={styles.bioTitle}>Travel Preferences</Text>
                <View style={styles.preferencesGrid}>
                  {Object.entries(profile.preferences).map(([key, value]) => (
                    <View key={key} style={styles.preferenceChip}>
                      <Text style={styles.preferenceText}>{value as string}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.blockButton]}
            onPress={handleBlock}
          >
            <Ionicons 
              name={isBlocked ? "checkmark-circle" : "ban"} 
              size={24} 
              color={isBlocked ? Colors.secondary.teal : Colors.highlight.error} 
            />
            <Text style={[styles.actionText, { color: isBlocked ? Colors.secondary.teal : Colors.highlight.error }]}>
              {isBlocked ? 'Unblock' : 'Block'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.likeButton, hasLiked && styles.likedButton]}
            onPress={handleLike}
          >
            <LinearGradient
              colors={hasLiked ? [Colors.highlight.error, Colors.highlight.error] : Colors.gradient.sunset}
              style={styles.likeGradient}
            >
              <Ionicons name={hasLiked ? "heart" : "heart-outline"} size={28} color={Colors.neutral.white} />
              <Text style={styles.likeText}>{hasLiked ? 'Liked' : 'Like'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, color: Colors.neutral.grey, marginBottom: 20 },
  backBtn: { backgroundColor: Colors.primary.navy, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20 },
  backBtnText: { color: Colors.neutral.white, fontWeight: '600' },
  
  header: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  photoContainer: { position: 'relative', height: 500 },
  mainPhoto: { width: '100%', height: '100%', backgroundColor: Colors.neutral.border },
  placeholderPhoto: { justifyContent: 'center', alignItems: 'center' },
  photoIndicators: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 4,
  },
  indicator: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
  },
  activeIndicator: { backgroundColor: Colors.neutral.white },
  photoNavBtn: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNavLeft: { left: 10 },
  photoNavRight: { right: 10 },
  
  infoContainer: { padding: 24 },
  nameRow: { marginBottom: 16 },
  name: { fontSize: 32, fontWeight: '800', color: Colors.primary.navy },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  infoText: { fontSize: 16, color: Colors.neutral.greyDark, fontWeight: '500' },
  
  bioSection: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: Colors.neutral.border },
  bioTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary.navy, marginBottom: 12 },
  bioText: { fontSize: 15, color: Colors.neutral.greyDark, lineHeight: 24 },
  
  preferencesSection: { marginTop: 24 },
  preferencesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preferenceChip: {
    backgroundColor: Colors.neutral.trailDust,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  preferenceText: { fontSize: 13, color: Colors.primary.navy, fontWeight: '600' },
  
  actionBar: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.white,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  blockButton: { borderColor: Colors.highlight.error, flex: 0.8 },
  actionText: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  
  likeButton: {
    borderWidth: 0,
    padding: 0,
    overflow: 'hidden',
  },
  likedButton: {},
  likeGradient: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  likeText: { color: Colors.neutral.white, fontWeight: '700', fontSize: 16 },
});