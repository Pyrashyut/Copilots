// app/(tabs)/inbox.tsx
// Fix: bookings.user_a/user_b FK points to auth.users not profiles,
// so we fetch profiles in a second query instead of using select join hints.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

type NotifType = 'new_match' | 'trip_invite' | 'trip_accepted' | 'trip_cancelled' | 'chat_active';

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  avatarUrl?: string;
  createdAt: string;
  read: boolean;
  action?: () => void;
}

const TYPE_ICON: Record<NotifType, { name: string; bg: string }> = {
  new_match:      { name: 'heart',              bg: Colors.highlight.error },
  trip_invite:    { name: 'paper-plane',         bg: Colors.secondary.teal },
  trip_accepted:  { name: 'checkmark-circle',    bg: Colors.highlight.success },
  trip_cancelled: { name: 'close-circle',        bg: Colors.neutral.grey },
  chat_active:    { name: 'chatbubble-ellipses', bg: Colors.primary.navyLight },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const DEMO_NOTIFS: Notif[] = [
  {
    id: 'demo_1',
    type: 'new_match',
    title: 'New match!',
    body: 'You and Sofia liked each other.',
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    read: false,
  },
  {
    id: 'demo_2',
    type: 'trip_invite',
    title: 'Trip invitation',
    body: 'Marcus invited you on a Weekend Escape.',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
  },
  {
    id: 'demo_3',
    type: 'trip_accepted',
    title: 'Invitation accepted!',
    body: 'Lena accepted your trip. Chat is now open.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    read: false,
  },
  {
    id: 'demo_4',
    type: 'chat_active',
    title: 'Chat is open',
    body: 'Your chat with Kai is active. Don\'t let the timer run out!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    read: true,
  },
  {
    id: 'demo_5',
    type: 'trip_cancelled',
    title: 'Trip cancelled',
    body: 'The trip with Alex was cancelled.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
  },
];

export default function InboxScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);

  const buildNotifs = (
    matches: any[],
    bookings: any[],
    profileMap: Record<string, any>,
    userId: string,
  ): Notif[] => {
    const list: Notif[] = [];

    // New matches
    matches.forEach(m => {
      list.push({
        id: `match_${m.match_id}`,
        type: 'new_match',
        title: 'New match!',
        body: `You and ${m.username} liked each other.`,
        avatarUrl: m.photos?.[0],
        createdAt: m.matched_at,
        read: false,
        action: () =>
          router.push({
            pathname: '/trip/selection',
            params: { matchId: m.match_id, name: m.username },
          }),
      });
    });

    // Booking-based notifications
    bookings.forEach(b => {
      const isUserA   = b.user_a === userId;
      const otherId   = isUserA ? b.user_b : b.user_a;
      const other     = profileMap[otherId];
      const isInviter = b.invited_by === userId;
      const name      = other?.username ?? 'Someone';
      const avatar    = other?.photos?.[0];

      if (b.status === 'pending' && !isInviter) {
        list.push({
          id: `invite_${b.id}`,
          type: 'trip_invite',
          title: 'Trip invitation',
          body: `${name} invited you on a trip.`,
          avatarUrl: avatar,
          createdAt: b.created_at,
          read: false,
          action: () =>
            router.push({
              pathname: '/trip/selection',
              params: { matchId: otherId, name },
            }),
        });
      }

      if (b.status === 'active' && isInviter) {
        list.push({
          id: `accepted_${b.id}`,
          type: 'trip_accepted',
          title: 'Invitation accepted!',
          body: `${name} accepted your trip. Chat is now open.`,
          avatarUrl: avatar,
          createdAt: b.chat_started_at ?? b.created_at,
          read: false,
          action: () =>
            router.push({ pathname: '/trip/chat', params: { bookingId: b.id } }),
        });
      }

      if (b.status === 'active' && !isInviter) {
        list.push({
          id: `chat_${b.id}`,
          type: 'chat_active',
          title: 'Chat is open',
          body: `Your chat with ${name} is active. Don't let the timer run out!`,
          avatarUrl: avatar,
          createdAt: b.chat_started_at ?? b.created_at,
          read: false,
          action: () =>
            router.push({ pathname: '/trip/chat', params: { bookingId: b.id } }),
        });
      }

      if (b.status === 'cancelled') {
        list.push({
          id: `cancelled_${b.id}`,
          type: 'trip_cancelled',
          title: 'Trip cancelled',
          body: `The trip with ${name} was cancelled.`,
          avatarUrl: avatar,
          createdAt: b.created_at,
          read: true,
        });
      }
    });

    list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list;
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      // 1. Fetch matches and raw bookings in parallel
      const [matchRes, bookingRes] = await Promise.all([
        supabase.from('matches_view').select('*').eq('user_id', user.id),
        supabase
          .from('bookings')
          .select('*')
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .order('created_at', { ascending: false }),
      ]);

      const bookings = bookingRes.data ?? [];

      // 2. Collect all other-user IDs from bookings
      const otherIds = bookings.map(b =>
        b.user_a === user.id ? b.user_b : b.user_a
      );
      const uniqueIds = [...new Set(otherIds)];

      // 3. Fetch those profiles
      let profileMap: Record<string, any> = {};
      if (uniqueIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, username, photos')
          .in('id', uniqueIds);
        (profileRows ?? []).forEach(p => { profileMap[p.id] = p; });
      }

      const built = buildNotifs(
        matchRes.data ?? [],
        bookings,
        profileMap,
        user.id,
      );
      setNotifs(built);
    } catch (e) {
      console.error('Inbox fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  // Real-time: re-fetch on booking or swipe changes
  useEffect(() => {
    const channel = supabase
      .channel('inbox_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'swipes' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const markRead = (id: string) =>
    setReadIds(prev => new Set([...prev, id]));

  const unreadCount = notifs.filter(n => !n.read && !readIds.has(n.id)).length;

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

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inbox</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={Colors.highlight.gold}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {(notifs.length > 0 ? notifs : DEMO_NOTIFS).map(n => {
            const isRead = n.read || readIds.has(n.id);
            const iconMeta = TYPE_ICON[n.type];
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.notifCard, isRead && styles.notifCardRead]}
                onPress={() => { markRead(n.id); n.action?.(); }}
                activeOpacity={n.action ? 0.8 : 1}
              >
                <View style={styles.notifLeft}>
                  {n.avatarUrl ? (
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: n.avatarUrl }} style={styles.avatar} />
                      <View style={[styles.iconOverlay, { backgroundColor: iconMeta.bg }]}>
                        <Ionicons name={iconMeta.name as any} size={10} color="white" />
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.iconCircle, { backgroundColor: iconMeta.bg }]}>
                      <Ionicons name={iconMeta.name as any} size={22} color="white" />
                    </View>
                  )}
                </View>

                <View style={styles.notifBody}>
                  <View style={styles.notifTitleRow}>
                    <Text style={[styles.notifTitle, isRead && styles.notifTitleRead]}>
                      {n.title}
                    </Text>
                    {!isRead && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifText}>{n.body}</Text>
                  <Text style={styles.notifTime}>{timeAgo(n.createdAt)}</Text>
                </View>

                {n.action && (
                  <Ionicons name="chevron-forward" size={18} color={Colors.neutral.greyLight} />
                )}
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoLoader: { width: 200, height: 80, marginBottom: 20 },

  bgDecoration1: {
    position: 'absolute', top: -100, right: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
  },
  bgDecoration2: {
    position: 'absolute', bottom: 100, left: -150,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: 'rgba(255, 217, 61, 0.06)',
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 70, paddingBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.neutral.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  unreadBadge: {
    backgroundColor: Colors.highlight.error,
    minWidth: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8,
  },
  unreadText: { color: Colors.neutral.white, fontSize: 14, fontWeight: '800' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  notifCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.neutral.white,
    borderRadius: 20, padding: 14, marginBottom: 10, gap: 12,
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 5,
  },
  notifCardRead: { opacity: 0.7 },

  notifLeft: { justifyContent: 'center', alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.neutral.border,
  },
  iconOverlay: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.neutral.white,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },

  notifBody: { flex: 1 },
  notifTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 2,
  },
  notifTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary.navy },
  notifTitleRead: { fontWeight: '500' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.highlight.error,
  },
  notifText: { fontSize: 13, color: Colors.neutral.grey, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: Colors.neutral.greyLight },

  emptyState: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.neutral.white,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  emptyTitle: { fontSize: 26, fontWeight: '800', color: Colors.neutral.white, marginBottom: 12 },
  emptyText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 16,
    textAlign: 'center', lineHeight: 24,
  },
});