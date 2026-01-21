// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

      const excludeIds = [
        ...(swipes?.map(s => s.likee_id) || []),
        ...(blockedByMe?.map(b => b.blocked_id) || []),
        ...(blockedMe?.map(b => b.blocker_id) || []),
        user.id,
      ];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .eq('is_visible', true)
        .limit(10);

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (currentIndex >= profiles.length) return;

    const profile = profiles[currentIndex];
    const isLike = direction === 'right';

    setCurrentIndex(i => i + 1);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('swipes').insert({
        liker_id: user.id,
        likee_id: profile.id,
        is_like: isLike,
      });

      if (isLike) {
        const { data: isMatch } = await supabase.rpc('check_match', {
          current_user_id: user.id,
          target_user_id: profile.id,
        });

        if (isMatch) {
          Alert.alert(
            "✈️ IT'S A MATCH!",
            `You and ${profile.username} both want to explore together!`
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const viewProfile = () => {
    if (currentIndex >= profiles.length) return;
    router.push({
      pathname: '/profile/view',
      params: { userId: profiles[currentIndex].id },
    });
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.neutral.trailDust]}
        style={styles.center}
      >
        <ActivityIndicator size="large" color={Colors.highlight.gold} />
        <Text style={styles.loadingText}>Finding your copilots...</Text>
      </LinearGradient>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <LinearGradient
        colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.neutral.trailDust]}
        style={styles.center}
      >
        <Text style={styles.emptyTitle}>No More Pilots</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]}
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      {/* ===== FIXED HEADER ===== */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>Find your travel companion</Text>
        </View>

        <View style={styles.counter}>
          <Ionicons name="people" size={16} color={Colors.neutral.white} />
          <Text style={styles.counterText}>
            {profiles.length - currentIndex}
          </Text>
        </View>
      </View>

      {/* ===== CARD AREA ===== */}
      <View style={styles.cardArea}>
        <SwipeCard profile={profiles[currentIndex]} />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={viewProfile}
        />
      </View>

      {/* ===== ACTIONS ===== */}
      <View style={styles.actionsContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => handleSwipe('left')}>
            <View style={[styles.actionButton, styles.pass]}>
              <Ionicons name="close" size={36} color={Colors.highlight.error} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={viewProfile}>
            <View style={[styles.actionButton, styles.info]}>
              <Ionicons name="information" size={30} color={Colors.neutral.white} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleSwipe('right')}>
            <View style={[styles.actionButton, styles.like]}>
              <Ionicons name="heart" size={36} color={Colors.neutral.white} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* HEADER FIX */
  header: {
    height: 110,
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  logo: {
    width: 90,
    height: 32,
    tintColor: Colors.neutral.white,
  },

  headerText: {
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.neutral.white,
  },

  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  counter: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  counterText: {
    color: Colors.neutral.white,
    fontWeight: '700',
  },

  /* CARD */
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ACTIONS */
  actionsContainer: {
    paddingBottom: 30,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },

  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pass: { backgroundColor: Colors.neutral.white },
  info: { backgroundColor: Colors.secondary.teal },
  like: { backgroundColor: Colors.highlight.success },

  loadingText: {
    marginTop: 16,
    color: Colors.neutral.white,
  },

  emptyTitle: {
    fontSize: 28,
    color: Colors.neutral.white,
  },
});
