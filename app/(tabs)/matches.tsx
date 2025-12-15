import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function MatchesScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('matches_view')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error("Matches fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reload matches every time the user looks at this tab
  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [])
  );

  const openTripPlanning = (matchId: string, username: string) => {
    // Navigate to the Trip Planning Screen (We will build this next)
    router.push({
      pathname: '/trip/selection',
      params: { matchId, name: username }
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary.navy} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Copilots</Text>
      
      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="airplane-outline" size={60} color={Colors.neutral.grey} />
          <Text style={styles.emptyText}>No copilots yet.</Text>
          <Text style={styles.subText}>Keep swiping in Discover!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.match_id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.matchCard} 
              onPress={() => openTripPlanning(item.match_id, item.username)}
            >
              <Image 
                source={{ uri: item.photos[0] }} 
                style={styles.avatar} 
              />
              <View style={styles.info}>
                <Text style={styles.name}>{item.username}</Text>
                <Text style={styles.status}>Ready to plan</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.primary.navy} />
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMatches} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.trailDust,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.trailDust,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.navy,
    marginBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.navy,
    marginTop: 20,
  },
  subText: {
    fontSize: 16,
    color: Colors.neutral.grey,
    marginTop: 5,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.navy,
  },
  status: {
    fontSize: 14,
    color: Colors.primary.coral,
    fontWeight: '600',
    marginTop: 2,
  },
});