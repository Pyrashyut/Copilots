// app/(tabs)/inbox.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

// Helper to format relative time (e.g., "2h ago")
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHrs = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${diffDays}d ago`;
};

export default function InboxScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const notifs = [];

      // 1. SYSTEM WELCOME (Static for MVP)
      notifs.push({
        id: 'sys-1',
        type: 'system',
        title: 'Welcome to Frolicr',
        body: 'Complete your profile to start matching!',
        created_at: new Date().toISOString(),
        read: true,
      });

      // 2. FETCH TRIP INVITES (Bookings)
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (bookings && bookings.length > 0) {
        // Fetch profiles manually to avoid FK errors
        const userIds = new Set<string>();
        bookings.forEach(b => {
          if (b.user_a !== user.id) userIds.add(b.user_a);
          if (b.user_b !== user.id) userIds.add(b.user_b);
        });

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, photos')
          .in('id', Array.from(userIds));

        const profileMap: Record<string, any> = {};
        profiles?.forEach(p => (profileMap[p.id] = p));

        bookings.forEach(b => {
          const isUserA = b.user_a === user.id;
          const otherId = isUserA ? b.user_b : b.user_a;
          const otherUser = profileMap[otherId];
          const isMyInvite = b.invited_by === user.id;

          if (b.status === 'pending') {
            notifs.push({
              id: `booking-${b.id}`,
              type: 'trip_invite',
              title: isMyInvite ? 'Invitation Sent' : 'New Trip Proposal',
              body: isMyInvite 
                ? `You invited ${otherUser?.username || 'User'} to a trip.` 
                : `${otherUser?.username || 'Someone'} wants to go on an adventure!`,
              created_at: b.created_at,
              data: { matchId: otherId, name: otherUser?.username }, // For navigation
              avatar: otherUser?.photos?.[0]
            });
          } else if (b.status === 'active') {
            notifs.push({
              id: `booking-active-${b.id}`,
              type: 'trip_confirmed',
              title: 'Trip Confirmed! ✈️',
              body: `Your trip with ${otherUser?.username} is confirmed. Pack your bags!`,
              created_at: b.chat_started_at || b.created_at,
              data: { bookingId: b.id },
              avatar: otherUser?.photos?.[0]
            });
          }
        });
      }

      // 3. FETCH MATCHES (Matches View)
      // We assume matches_view works, but if it fails, we catch it.
      // Ideally, we'd query 'swipes' directly for robustness, but let's try this.
      const { data: matches } = await supabase
        .from('matches_view')
        .select('*')
        .eq('user_id', user.id)
        .order('matched_at', { ascending: false })
        .limit(10);

      if (matches) {
        matches.forEach(m => {
          notifs.push({
            id: `match-${m.match_id}`,
            type: 'match',
            title: 'It\'s a Match!',
            body: `You and ${m.username} liked each other.`,
            created_at: m.matched_at,
            data: { matchId: m.match_id, name: m.username },
            avatar: m.photos?.[0]
          });
        });
      }

      // Sort by date (newest first)
      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(notifs);

    } catch (error) {
      console.error('Inbox fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const handlePress = (item: any) => {
    if (item.type === 'trip_invite' || item.type === 'match') {
      // Go to Trip Selection to Plan/Respond
      router.push({
        pathname: '/trip/selection',
        params: item.data
      });
    } else if (item.type === 'trip_confirmed') {
      // Go to Trips Tab (or directly to chat)
      router.navigate('/(tabs)/trips');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'system': return { name: 'notifications', color: Colors.primary.navy };
      case 'trip_invite': return { name: 'paper-plane', color: Colors.highlight.gold };
      case 'trip_confirmed': return { name: 'airplane', color: Colors.secondary.teal };
      case 'match': return { name: 'heart', color: Colors.highlight.error };
      default: return { name: 'notifications', color: Colors.neutral.grey };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.navy} />
      </View>
    );
  }

  return (
    <LinearGradient 
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]} 
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      <View style={styles.bgDecoration1} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox</Text>
        <Text style={styles.headerSubtitle}>Updates & Alerts</Text>
      </View>

      <View style={styles.contentContainer}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchNotifications} tintColor={Colors.primary.navy} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.neutral.greyLight} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const icon = getIcon(item.type);
            return (
              <TouchableOpacity 
                style={styles.notifItem} 
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
              >
                {/* Icon or Avatar */}
                <View style={styles.iconContainer}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(27, 58, 87, 0.1)' }]}>
                      <Ionicons name={icon.name as any} size={20} color={icon.color} />
                    </View>
                  )}
                  {/* Small Type Icon overlay if avatar exists */}
                  {item.avatar && (
                    <View style={styles.miniIconBadge}>
                      <Ionicons name={icon.name as any} size={10} color={Colors.neutral.white} />
                    </View>
                  )}
                </View>

                <View style={styles.textContainer}>
                  <View style={styles.row}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.time}>{formatTime(item.created_at)}</Text>
                  </View>
                  <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                </View>

                {!item.read && item.type !== 'system' && (
                  <View style={styles.unreadDot} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { 
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

  contentContainer: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  listContent: {
    padding: 20,
    paddingTop: 24,
  },

  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: Colors.neutral.white,
  },
  
  iconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutral.border,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary.navy,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral.white,
  },

  textContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.navy,
  },
  time: {
    fontSize: 12,
    color: Colors.neutral.greyLight,
  },
  body: {
    fontSize: 14,
    color: Colors.neutral.grey,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.highlight.error,
    marginLeft: 8,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    color: Colors.neutral.grey,
    fontSize: 16,
  }
});