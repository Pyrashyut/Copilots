import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import SwipeCard from '../../components/SwipeCard';
import { Ionicons } from '@expo/vector-icons';

export default function DiscoverScreen() {
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

      // 1. Get IDs of people I already swiped on
      const { data: swipes } = await supabase
        .from('swipes')
        .select('likee_id')
        .eq('liker_id', user.id);

      const swipedIds = swipes?.map(s => s.likee_id) || [];
      swipedIds.push(user.id); // Exclude myself

      // 2. Fetch profiles NOT in that list
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${swipedIds.join(',')})`)
        .limit(10); // Load 10 at a time

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

    // 1. Optimistic UI update (move to next card immediately)
    setCurrentIndex(prev => prev + 1);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Record Swipe in DB
      await supabase.from('swipes').insert({
        liker_id: user.id,
        likee_id: currentProfile.id,
        is_like: isLike
      });

      // 3. Check for Match (Only if it was a Like)
      if (isLike) {
        const { data: isMatch } = await supabase
          .rpc('check_match', { 
            current_user_id: user.id, 
            target_user_id: currentProfile.id 
          });

        if (isMatch) {
          Alert.alert("IT'S A MATCH!", "Pack your bags!");
          // TODO: Add to matches table logic later
        }
      }

    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary.navy} />
      </View>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No more pilots in your area.</Text>
        <TouchableOpacity onPress={() => { setLoading(true); fetchProfiles(); setCurrentIndex(0); }} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>Refresh Radar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <SwipeCard profile={profiles[currentIndex]} />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.roundButton, styles.passButton]} 
          onPress={() => handleSwipe('left')}
        >
          <Ionicons name="close" size={30} color="#FF4D4D" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.roundButton, styles.likeButton]} 
          onPress={() => handleSwipe('right')}
        >
          <Ionicons name="heart" size={30} color="#2ECC71" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.trailDust,
    alignItems: 'center',
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.trailDust,
  },
  cardContainer: {
    flex: 0.8,
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '80%',
    marginTop: 30,
  },
  roundButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  passButton: {
    borderWidth: 1,
    borderColor: '#FF4D4D',
  },
  likeButton: {
    borderWidth: 1,
    borderColor: '#2ECC71',
    backgroundColor: '#E8F8F5'
  },
  emptyText: {
    fontSize: 18,
    color: Colors.neutral.grey,
    marginBottom: 20,
  },
  refreshBtn: {
    padding: 15,
    backgroundColor: Colors.primary.navy,
    borderRadius: 8,
  },
  refreshText: {
    color: 'white',
    fontWeight: 'bold',
  }
});