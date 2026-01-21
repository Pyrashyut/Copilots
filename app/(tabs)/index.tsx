// app/(tabs)/index.tsx - Updated with profile viewing
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SwipeCard from '../../components/SwipeCard';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

export default function DiscoverScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all IDs to exclude: swiped users, blocked users, and users who blocked me
      const { data: swipes } = await supabase
        .from('swipes')
        .select('likee_id')
        .eq('liker_id', user.id);

      const { data: blockedByMe } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      const { data: blockedMe } = await supabase
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', user.id);

      const swipedIds = swipes?.map(s => s.likee_id) || [];
      const blockedByMeIds = blockedByMe?.map(b => b.blocked_id) || [];
      const blockedMeIds = blockedMe?.map(b => b.blocker_id) || [];
      
      const excludeIds = [...new Set([...swipedIds, ...blockedByMeIds, ...blockedMeIds, user.id])];

      // Fetch visible profiles only
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .eq('is_visible', true)
        .limit(10);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (profiles.length === 0 || currentIndex >= profiles.length) return;

    const currentProfile = profiles[currentIndex];
    const isLike = direction === 'right';

    setCurrentIndex(prev => prev + 1);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('swipes').insert({
        liker_id: user.id,
        likee_id: currentProfile.id,
        is_like: isLike
      });

      if (isLike) {
        const { data: isMatch } = await supabase
          .rpc('check_match', { 
            current_user_id: user.id, 
            target_user_id: currentProfile.id 
          });

        if (isMatch) {
          Alert.alert(
            "✈️ IT'S A MATCH!", 
            `You and ${currentProfile.username} both want to explore together!`,
            [{ text: 'Amazing!', style: 'default' }]
          );
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const viewProfile = () => {
    if (profiles.length === 0 || currentIndex >= profiles.length) return;
    const currentProfile = profiles[currentIndex];
    router.push({ pathname: '/profile/view', params: { userId: currentProfile.id } });
  };

  if (loading) {
    return (
      <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary.navy} />
        <Text style={styles.loadingText}>Finding your copilots...</Text>
      </LinearGradient>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.center}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="airplane" size={48} color={Colors.primary.navy} />
          </View>
          <Text style={styles.emptyTitle}>No More Pilots</Text>
          <Text style={styles.emptyText}>You've seen everyone in your area.{'\n'}Check back soon for new travelers!</Text>
          <TouchableOpacity 
            onPress={() => { 
              setLoading(true); 
              fetchProfiles(); 
              setCurrentIndex(0); 
            }} 
            style={styles.refreshBtn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.gradient.sunset}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.refreshGradient}
            >
              <Ionicons name="refresh" size={20} color={Colors.neutral.white} />
              <Text style={styles.refreshText}>Refresh Radar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.profileCounter}>
          <Text style={styles.counterText}>{profiles.length - currentIndex}</Text>
        </View>
      </View>

      {/* Card Container */}
      <View style={styles.cardContainer}>
        <SwipeCard profile={profiles[currentIndex]} />
        
        {/* View Profile Button Overlay */}
        <TouchableOpacity 
          style={styles.viewProfileBtn}
          onPress={viewProfile}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
            style={styles.viewProfileGradient}
          >
            <Ionicons name="information-circle" size={24} color={Colors.neutral.white} />
            <Text style={styles.viewProfileText}>View Full Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.passButton]} 
          onPress={() => handleSwipe('left')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={styles.buttonGradient}
          >
            <Ionicons name="close" size={32} color={Colors.highlight.error} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.infoButton]} 
          onPress={viewProfile}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4ECDC4', '#3BB5AD']}
            style={styles.buttonGradient}
          >
            <Ionicons name="information" size={28} color={Colors.neutral.white} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.likeButton]} 
          onPress={() => handleSwipe('right')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6BCF7F', '#51B96F']}
            style={styles.buttonGradient}
          >
            <Ionicons name="heart" size={32} color={Colors.neutral.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.neutral.grey,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary.navy,
  },
  profileCounter: {
    backgroundColor: Colors.primary.navy,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: Colors.neutral.white,
    fontWeight: '700',
    fontSize: 16,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  viewProfileBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewProfileGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  viewProfileText: {
    color: Colors.neutral.white,
    fontWeight: '700',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  infoButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passButton: {},
  likeButton: {},
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary.navy,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.neutral.grey,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  refreshBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
  },
  refreshText: {
    color: Colors.neutral.white,
    fontWeight: '700',
    fontSize: 17,
  },
});