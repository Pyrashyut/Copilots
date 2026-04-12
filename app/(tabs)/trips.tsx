// app/(tabs)/trips.tsx
// Fix: bookings.user_a/user_b FK points to auth.users not profiles,
// so we fetch profiles in a second query instead of using select join hints.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

const TIER_META: Record<string, { label: string; icon: string; color: string[] }> = {
  local:         { label: 'Local Explorer',   icon: 'cafe',     color: ['#4FACFE', '#00F2FE'] },
  national:      { label: 'Weekend Escape',   icon: 'car',      color: ['#6BCF7F', '#38D98D'] },
  international: { label: 'International',    icon: 'airplane', color: ['#FA709A', '#FEE140'] },
  exotic:        { label: 'Exotic Adventure', icon: 'sunny',    color: ['#667EEA', '#764BA2'] },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: Colors.highlight.warning },
  active:    { label: 'Active',    color: Colors.highlight.success },
  completed: { label: 'Completed', color: Colors.secondary.teal },
  cancelled: { label: 'Cancelled', color: Colors.neutral.grey },
  expired:   { label: 'Expired',   color: Colors.neutral.greyLight },
};

export default function TripsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [pastTrips, setPastTrips] = useState<any[]>([]);

  const fetchTrips = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Step 1: fetch raw bookings (no profile join — FK goes to auth.users)
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!bookings || bookings.length === 0) {
        setActiveTrips([]);
        setPastTrips([]);
        return;
      }

      // Step 2: collect all other-user IDs
      const otherIds = bookings.map(b => (b.user_a === user.id ? b.user_b : b.user_a));
      const uniqueIds = [...new Set(otherIds)];

      // Step 3: fetch those profiles from the profiles table
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, username, photos')
        .in('id', uniqueIds);

      const profileMap: Record<string, any> = {};
      (profileRows || []).forEach(p => { profileMap[p.id] = p; });

      // Step 4: enrich bookings
      const enriched = bookings.map(b => {
        const otherId = b.user_a === user.id ? b.user_b : b.user_a;
        return { ...b, otherUser: profileMap[otherId] || null, otherUserId: otherId };
      });

      setActiveTrips(enriched.filter(b => ['pending', 'active'].includes(b.status)));
      setPastTrips(enriched.filter(b => ['completed', 'cancelled', 'expired'].includes(b.status)));
    } catch (e) {
      console.error('Trips fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchTrips(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchTrips(); };

  const handleTripPress = (trip: any) => {
    if (trip.status === 'active') {
      router.push({ pathname: '/trip/chat', params: { bookingId: trip.id } });
    } else if (trip.status === 'pending') {
      router.push({
        pathname: '/trip/selection',
        params: { matchId: trip.otherUserId, name: trip.otherUser?.username ?? 'Unknown' },
      });
    }
  };

  const TripCard = ({ trip, isPast }: { trip: any; isPast: boolean }) => {
    const tier = TIER_META[trip.tier_id] ?? TIER_META.local;
    const status = STATUS_META[trip.status] ?? STATUS_META.expired;
    const createdDate = new Date(trip.created_at).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={[styles.tripCard, isPast && styles.tripCardPast]}
        onPress={() => !isPast && handleTripPress(trip)}
        activeOpacity={isPast ? 1 : 0.8}
      >
        <LinearGradient
          colors={tier.color as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tierBadge}
        >
          <Ionicons name={tier.icon as any} size={18} color="white" />
        </LinearGradient>

        <View style={styles.tripCardBody}>
          <View style={styles.tripCardTop}>
            <View style={styles.tripCardInfo}>
              <Text style={styles.tripTierLabel}>{tier.label}</Text>
              <Text style={styles.tripPartnerName}>
                with {trip.otherUser?.username ?? 'Unknown'}
              </Text>
              <Text style={styles.tripDate}>{createdDate}</Text>
            </View>

            {trip.otherUser?.photos?.[0] && (
              <Image
                source={{ uri: trip.otherUser.photos[0] }}
                style={styles.partnerAvatar}
              />
            )}
          </View>

          <View style={styles.tripCardFooter}>
            <View style={[styles.statusPill, { backgroundColor: status.color + '22' }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            </View>

            {!isPast && trip.status === 'active' && (
              <TouchableOpacity
                style={styles.openChatBtn}
                onPress={() =>
                  router.push({ pathname: '/trip/chat', params: { bookingId: trip.id } })
                }
              >
                <Ionicons name="chatbubble-ellipses" size={14} color={Colors.neutral.white} />
                <Text style={styles.openChatText}>Open Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
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
          <Text style={styles.headerTitle}>Trips</Text>
          <Text style={styles.headerSubtitle}>Your adventures</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>{activeTrips.length + pastTrips.length}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.highlight.gold}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTrips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{activeTrips.length}</Text>
              </View>
            </View>
            {activeTrips.map(t => (
              <TripCard key={t.id} trip={t} isPast={false} />
            ))}
          </View>
        )}

        {pastTrips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Past</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{pastTrips.length}</Text>
              </View>
            </View>
            {pastTrips.map(t => (
              <TripCard key={t.id} trip={t} isPast={true} />
            ))}
          </View>
        )}

        {activeTrips.length === 0 && pastTrips.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="airplane-outline" size={56} color={Colors.primary.navy} />
            </View>
            <Text style={styles.emptyTitle}>No Trips Yet</Text>
            <Text style={styles.emptyText}>
              Match with someone and send a trip invitation to get started!
            </Text>
            <TouchableOpacity
              style={styles.discoverBtn}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.discoverBtnText}>Discover People</Text>
            </TouchableOpacity>
          </View>
        )}
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
  totalBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  totalText: { color: Colors.neutral.white, fontSize: 16, fontWeight: '800' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  countText: { color: Colors.neutral.white, fontSize: 12, fontWeight: '700' },

  tripCard: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral.white,
    borderRadius: 20, marginBottom: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  tripCardPast: { opacity: 0.7 },
  tierBadge: { width: 56, justifyContent: 'center', alignItems: 'center' },
  tripCardBody: { flex: 1, padding: 14 },
  tripCardTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tripCardInfo: { flex: 1 },
  tripTierLabel: { fontSize: 16, fontWeight: '700', color: Colors.primary.navy, marginBottom: 2 },
  tripPartnerName: { fontSize: 13, color: Colors.neutral.grey, marginBottom: 2 },
  tripDate: { fontSize: 12, color: Colors.neutral.greyLight },
  partnerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.neutral.border, marginLeft: 10,
  },

  tripCardFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 10,
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  openChatBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary.navy,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, gap: 5,
  },
  openChatText: { color: Colors.neutral.white, fontSize: 12, fontWeight: '700' },

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
    textAlign: 'center', lineHeight: 24, marginBottom: 24,
  },
  discoverBtn: {
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16,
  },
  discoverBtnText: { color: Colors.primary.navy, fontWeight: '700', fontSize: 15 },
});