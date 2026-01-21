// app/(tabs)/matches.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

export default function MatchesScreen() {
  const router = useRouter();
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [newMatches, setNewMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          user_a_profile:profiles!bookings_user_a_fkey(username, photos),
          user_b_profile:profiles!bookings_user_b_fkey(username, photos)
        `)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .in('status', ['pending', 'active']);

      const { data: matches } = await supabase
        .from('matches_view')
        .select('*')
        .eq('user_id', user.id);

      const bookedUserIds = bookings?.map(b => b.user_a === user.id ? b.user_b : b.user_a) || [];
      const filteredMatches = matches?.filter(m => !bookedUserIds.includes(m.match_id)) || [];

      const formattedBookings = bookings?.map(b => {
        const isUserA = b.user_a === user.id;
        const otherProfile = isUserA ? b.user_b_profile : b.user_a_profile;
        return {
          ...b,
          otherUser: otherProfile,
          otherUserId: isUserA ? b.user_b : b.user_a
        };
      }) || [];

      setActiveChats(formattedBookings);
      setNewMatches(filteredMatches);

    } catch (error) {
      console.error("Data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handlePress = (type: 'chat' | 'match', item: any) => {
    if (type === 'match') {
      router.push({
        pathname: '/trip/selection',
        params: { matchId: item.match_id, name: item.username }
      });
    } else {
      if (item.status === 'active') {
        router.push({
          pathname: '/trip/chat',
          params: { bookingId: item.id }
        });
      } else {
        router.push({
          pathname: '/trip/selection',
          params: { matchId: item.otherUserId, name: item.otherUser.username }
        });
      }
    }
  };

  if (loading) {
    return (
      <LinearGradient 
        colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.neutral.trailDust]} 
        locations={[0, 0.5, 1]}
        style={styles.center}
      >
        <ActivityIndicator size="large" color={Colors.highlight.gold} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient 
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]} 
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      {/* Decorative Background Elements */}
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Copilots</Text>
          <Text style={styles.headerSubtitle}>Your travel connections</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>{activeChats.length + newMatches.length}</Text>
        </View>
      </View>

      <SectionList
        sections={[
          { title: 'Active Plans', data: activeChats, type: 'chat' },
          { title: 'New Matches', data: newMatches, type: 'match' }
        ]}
        keyExtractor={(item, index) => item.id || item.match_id + index}
        renderSectionHeader={({ section: { title, data } }) => (
          data.length > 0 ? (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{data.length}</Text>
                </View>
              </View>
            </View>
          ) : null
        )}
        renderItem={({ item, section }) => {
          if (section.type === 'chat') {
            return (
              <TouchableOpacity 
                style={styles.chatCard} 
                onPress={() => handlePress('chat', item)}
                activeOpacity={0.8}
              >
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: item.otherUser?.photos?.[0] }} style={styles.avatar} />
                  {item.status === 'active' && (
                    <View style={styles.activeDot} />
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.otherUser?.username}</Text>
                  <View style={styles.statusRow}>
                    <View style={[
                      styles.statusDot, 
                      item.status === 'active' ? styles.activeDotGreen : styles.pendingDotOrange
                    ]} />
                    <Text style={[
                      styles.status, 
                      item.status === 'active' ? styles.activeText : styles.pendingText
                    ]}>
                      {item.status === 'active' ? 'Chat Active (24h left)' : 'Invitation Pending'}
                    </Text>
                  </View>
                </View>
                <View style={styles.chevronCircle}>
                  <Ionicons name="chevron-forward" size={18} color={Colors.primary.navy} />
                </View>
              </TouchableOpacity>
            );
          } else {
            return (
              <TouchableOpacity 
                style={styles.matchCard} 
                onPress={() => handlePress('match', item)}
                activeOpacity={0.8}
              >
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: item.photos[0] }} style={styles.avatar} />
                  <View style={styles.newBadge}>
                    <Text style={styles.newText}>NEW</Text>
                  </View>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.username}</Text>
                  <Text style={styles.matchSub}>
                    Matched {new Date(item.matched_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                </View>
                <View style={styles.planButton}>
                  <Ionicons name="airplane" size={16} color={Colors.neutral.white} />
                  <Text style={styles.planText}>Plan</Text>
                </View>
              </TouchableOpacity>
            );
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={56} color={Colors.primary.navy} />
            </View>
            <Text style={styles.emptyTitle}>No Copilots Yet</Text>
            <Text style={styles.emptyText}>Start swiping to find your travel companions!</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={fetchData}
            tintColor={Colors.highlight.gold}
          />
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  // Background Decorations
  bgDecoration1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
  },
  bgDecoration2: {
    position: 'absolute',
    bottom: 100,
    left: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255, 217, 61, 0.06)',
  },
  
  header: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24, 
    paddingTop: 70,
    paddingBottom: 20,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: Colors.neutral.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  totalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  totalText: {
    color: Colors.neutral.white,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: Colors.neutral.white,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: { 
    paddingBottom: 40 
  },
  
  // Chat Card
  chatCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.neutral.white, 
    marginHorizontal: 20, 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12, 
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: Colors.neutral.border,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.highlight.success,
    borderWidth: 2,
    borderColor: Colors.neutral.white,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDotGreen: {
    backgroundColor: Colors.highlight.success,
  },
  pendingDotOrange: {
    backgroundColor: Colors.highlight.warning,
  },
  activeText: { 
    color: Colors.highlight.success, 
    fontWeight: '600',
    fontSize: 13,
  },
  pendingText: { 
    color: Colors.highlight.warning, 
    fontWeight: '600',
    fontSize: 13,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral.trailDust,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Match Card
  matchCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.neutral.white, 
    marginHorizontal: 20, 
    padding: 14, 
    borderRadius: 20, 
    marginBottom: 10, 
    borderWidth: 2,
    borderColor: Colors.secondary.teal,
    shadowColor: Colors.secondary.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  newBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: Colors.highlight.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.neutral.white,
  },
  newText: {
    color: Colors.neutral.white,
    fontSize: 9,
    fontWeight: '800',
  },
  matchSub: { 
    fontSize: 13, 
    color: Colors.neutral.grey,
    marginTop: 2,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary.teal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  planText: {
    color: Colors.neutral.white,
    fontSize: 13,
    fontWeight: '700',
  },
  
  info: { 
    flex: 1, 
    marginLeft: 14 
  },
  name: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: Colors.primary.navy 
  },
  status: { 
    fontSize: 13,
  },
  emptyState: { 
    paddingVertical: 100, 
    alignItems: 'center',
    paddingHorizontal: 40,
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
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.neutral.white,
    marginBottom: 12,
  },
  emptyText: { 
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});