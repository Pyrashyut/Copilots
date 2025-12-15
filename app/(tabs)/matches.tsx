// app/(tabs)/matches.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [])
  );

  const openTripPlanning = (matchId: string, username: string) => {
    router.push({
      pathname: '/trip/selection',
      params: { matchId, name: username }
    });
  };

  if (loading) {
    return (
      <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary.navy} />
        <Text style={styles.loadingText}>Loading copilots...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Copilots</Text>
        {matches.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{matches.length}</Text>
          </View>
        )}
      </View>
      
      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="people" size={56} color={Colors.primary.navy} />
          </View>
          <Text style={styles.emptyTitle}>No Copilots Yet</Text>
          <Text style={styles.emptyText}>
            Keep swiping in Discover to find{'\n'}your travel companions!
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.gradient.sunset}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyButtonGradient}
            >
              <Ionicons name="compass" size={20} color={Colors.neutral.white} />
              <Text style={styles.emptyButtonText}>Start Discovering</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.match_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={[
                styles.matchCard,
                index === 0 && styles.firstCard,
              ]} 
              onPress={() => openTripPlanning(item.match_id, item.username)}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                {/* Avatar with gradient border */}
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={Colors.gradient.sunset}
                    style={styles.avatarGradient}
                  >
                    <View style={styles.avatarInner}>
                      <Image 
                        source={{ uri: item.photos[0] || 'https://via.placeholder.com/100' }} 
                        style={styles.avatar} 
                      />
                    </View>
                  </LinearGradient>
                  <View style={styles.activeIndicator} />
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <Text style={styles.name}>{item.username}</Text>
                  <View style={styles.statusRow}>
                    <View style={styles.statusDot} />
                    <Text style={styles.status}>Ready to plan your adventure</Text>
                  </View>
                </View>

                {/* Arrow */}
                <View style={styles.arrowCircle}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary.navy} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl 
              refreshing={loading} 
              onRefresh={fetchMatches}
              tintColor={Colors.primary.navy}
            />
          }
        />
      )}
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
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary.navy,
  },
  badge: {
    backgroundColor: Colors.highlight.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.primary.navy,
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  matchCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  firstCard: {
    shadowColor: Colors.shadow.medium,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    overflow: 'hidden',
    backgroundColor: Colors.neutral.white,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.highlight.success,
    borderWidth: 3,
    borderColor: Colors.neutral.white,
  },
  info: {
    flex: 1,
    marginLeft: 16,
    gap: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary.navy,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary.teal,
  },
  status: {
    fontSize: 14,
    color: Colors.neutral.grey,
    fontWeight: '500',
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral.trailDust,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
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
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyButtonText: {
    color: Colors.neutral.white,
    fontWeight: '700',
    fontSize: 17,
  },
});