// app/(tabs)/matches.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const DEMO_NEGOTIATIONS = [
  { id: 'demo_neg_1', username: 'Sofia', photos: [], statusLabel: 'Received proposal! 🎁', isReceived: true, booking: { tier_id: 'national', id: 'demo_booking_1' } },
  { id: 'demo_neg_2', username: 'Marcus', photos: [], statusLabel: 'Waiting for response...', isReceived: false, booking: { tier_id: 'local', id: 'demo_booking_2' } },
];

const DEMO_MATCHES = [
  { id: 'demo_m_1', username: 'Lena', photos: [] },
  { id: 'demo_m_2', username: 'Kai', photos: [] },
  { id: 'demo_m_3', username: 'Priya', photos: [] },
  { id: 'demo_m_4', username: 'Tom', photos: [] },
];

export default function MatchesScreen() {
  const router = useRouter();
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [newMatches, setNewMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myLikes } = await supabase.from('swipes').select('likee_id').eq('liker_id', user.id).eq('is_like', true);
      const { data: likedMe } = await supabase.from('swipes').select('liker_id').eq('likee_id', user.id).eq('is_like', true);

      const mutualIds = (myLikes || []).map(s => s.likee_id).filter(id => (likedMe || []).map(s => s.liker_id).includes(id));
      if (mutualIds.length === 0) { setNegotiations([]); setNewMatches([]); return; }

      const { data: profiles } = await supabase.from('profiles').select('id, username, photos').in('id', mutualIds);
      
      // Fetch ALL bookings for this user, regardless of status
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      const negs: any[] = [];
      const fresh: any[] = [];

      profiles?.forEach(profile => {
        // Find if there is ANY booking with this profile
        // We want to exclude them if they have a 'completed' booking
        const booking = allBookings?.find(b => (b.user_a === profile.id || b.user_b === profile.id));
        
        // If booking is completed or cancelled, we SKIP them entirely from Matches screen
        if (booking && (booking.status === 'completed' || booking.status === 'cancelled')) {
          return; 
        }

        if (!booking) {
          fresh.push(profile);
        } else if (booking.status === 'pending' || booking.status === 'active') {
          const isMyInvite = booking.invited_by === user.id;
          const isReceived = !isMyInvite && booking.status === 'pending';
          const status = booking.status === 'active'
            ? 'Trip Confirmed! ✈️'
            : (isMyInvite ? 'Waiting for response...' : 'Received proposal! 🎁');
          negs.push({ ...profile, booking, statusLabel: status, isReceived });
        }
      });

      setNegotiations(negs);
      setNewMatches(fresh);
    } catch (err) {
      console.error("Matches Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleAction = (matchId: string, name: string, bookingId?: string, tierId?: string) => {
    router.push({
      pathname: '/trip/selection',
      params: { matchId, name, ...(bookingId ? { bookingId } : {}), ...(tierId ? { tierId } : {}) },
    });
  };

  const handleCancelInvite = (bookingId: string, username: string) => {
    Alert.alert(
      'Cancel Request?',
      `Withdraw your trip invitation to ${username}?`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            if (String(bookingId).startsWith('demo_')) return;
            const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
            if (!error) fetchData();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Matches</Text>
          <Text style={styles.headerSubtitle}>Propose a trip to start a chat</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#E8755A"/>}>
          {/* Trip Proposals */}
          {(negotiations.length > 0 || DEMO_NEGOTIATIONS.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trip Proposals</Text>
              {(negotiations.length > 0 ? negotiations : DEMO_NEGOTIATIONS).map((item) => (
                item.isReceived ? (
                  /* ── Received proposal — actionable card ── */
                  <View key={item.id} style={styles.receivedCard}>
                    <View style={styles.receivedTop}>
                      {item.photos?.[0] ? (
                        <Image source={{ uri: item.photos[0] }} style={styles.avatarImg} />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={22} color="#CCC" />
                        </View>
                      )}
                      <View style={styles.cardInfo}>
                        <Text style={styles.name}>{item.username}</Text>
                        <Text style={styles.receivedLabel}>Sent you a trip plan 🎁</Text>
                      </View>
                    </View>
                    <View style={styles.proposalActions}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => handleAction(item.id, item.username, item.booking?.id, item.booking?.tier_id)}
                      >
                        <Text style={styles.counterBtnText}>Counter-offer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAction(item.id, item.username, item.booking?.id, item.booking?.tier_id)}
                      >
                        <Text style={styles.acceptBtnText}>View & Accept ✓</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* ── Waiting for response — card with actions ── */
                  <View key={item.id} style={styles.waitingCard}>
                    <View style={styles.waitingTop}>
                      {item.photos?.[0] ? (
                        <Image source={{ uri: item.photos[0] }} style={styles.avatarImg} />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={22} color="#CCC" />
                        </View>
                      )}
                      <View style={styles.cardInfo}>
                        <Text style={styles.name}>{item.username}</Text>
                        <View style={styles.waitingRow}>
                          <View style={styles.waitingDot} />
                          <Text style={styles.waitingText}>Waiting for response...</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.waitingActions}>
                      <TouchableOpacity
                        style={styles.withdrawBtn}
                        onPress={() => handleCancelInvite(item.booking?.id, item.username)}
                      >
                        <Ionicons name="close-circle-outline" size={15} color="#E03724" />
                        <Text style={styles.withdrawBtnText}>Withdraw</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.changeBtn}
                        onPress={() => handleAction(item.id, item.username, item.booking?.id, item.booking?.tier_id)}
                      >
                        <Ionicons name="swap-horizontal-outline" size={15} color="#555" />
                        <Text style={styles.changeBtnText}>Change Offer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              ))}
            </View>
          )}

          {/* New Matches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Explorers</Text>
            <View style={styles.grid}>
              {(newMatches.length > 0 ? newMatches : DEMO_MATCHES).map((item) => (
                <TouchableOpacity key={item.id} style={styles.matchCard} onPress={() => handleAction(item.id, item.username)}>
                  {item.photos?.[0] ? (
                    <Image source={{ uri: item.photos[0] }} style={styles.matchImage} />
                  ) : (
                    <View style={[styles.matchImage, styles.matchImagePlaceholder]}>
                      <Ionicons name="person" size={36} color="rgba(255,255,255,0.4)" />
                    </View>
                  )}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.matchOverlay}>
                    <Text style={styles.matchName}>{item.username}</Text>
                    <View style={styles.planBadge}><Text style={styles.planText}>Plan Trip</Text></View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  header: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#161616' },
  headerSubtitle: { fontSize: 16, color: '#161616', opacity: 0.5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', color: '#000', opacity: 0.4, letterSpacing: 1, marginBottom: 15 },
  // Received proposal card — coral border, action buttons
  receivedCard: {
    backgroundColor: '#FFF',
    borderRadius: 16, padding: 14, marginBottom: 14,
    borderWidth: 1.5, borderColor: 'rgba(232,117,90,0.35)',
    shadowColor: '#E8755A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  receivedTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  receivedLabel: { fontSize: 13, color: '#E8755A', fontWeight: '600', marginTop: 2 },
  proposalActions: { flexDirection: 'row', gap: 10 },
  counterBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
  },
  counterBtnText: { fontSize: 13, fontWeight: '700', color: '#555' },
  acceptBtn: {
    flex: 2, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#E8755A', alignItems: 'center',
  },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // Waiting card — with withdraw / change actions
  waitingCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  waitingTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  waitingActions: { flexDirection: 'row', gap: 10 },
  withdrawBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(224,55,36,0.3)',
    backgroundColor: 'rgba(224,55,36,0.06)',
  },
  withdrawBtnText: { fontSize: 13, fontWeight: '700', color: '#E03724' },
  changeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#FFF',
  },
  changeBtnText: { fontSize: 13, fontWeight: '700', color: '#555' },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  waitingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CCC' },
  waitingText: { fontSize: 13, color: '#AAA', fontWeight: '500' },

  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F2F2F2' },
  avatarImg: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F2F2F2' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 14 },
  name: { fontSize: 16, fontWeight: '700', color: '#161616' },
  statusText: { fontSize: 13, color: '#E8755A', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  matchCard: { width: '48%', aspectRatio: 0.8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F2F2F2' },
  matchImage: { width: '100%', height: '100%' },
  matchImagePlaceholder: { backgroundColor: '#264653', justifyContent: 'center', alignItems: 'center' },
  matchOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, height: '50%', justifyContent: 'flex-end' },
  matchName: { color: '#FFF', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  planBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  planText: { color: '#E8755A', fontSize: 10, fontWeight: '800' },
  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  emptyText: { color: '#161616', opacity: 0.3, fontSize: 15 },
});