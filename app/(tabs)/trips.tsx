// app/(tabs)/trips.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function TripsScreen() {
  const router = useRouter();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRealTrips = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Filter by 'active' status ONLY
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .eq('status', 'active');

      if (!bookings || bookings.length === 0) {
        setActiveTrips([]);
        return;
      }

      const partnerIds = bookings.map(b => b.user_a === user.id ? b.user_b : b.user_a);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, photos')
        .in('id', partnerIds);

      const formatted = bookings.map(b => {
        const partnerId = b.user_a === user.id ? b.user_b : b.user_a;
        const partnerProfile = profiles?.find(p => p.id === partnerId);
        return {
          ...b,
          partner: partnerProfile || { username: 'Explorer', photos: [] }
        };
      });

      setActiveTrips(formatted);
    } catch (err) {
      console.error("Trips Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRealTrips(); }, []));

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Trips</Text>
          <Text style={styles.headerSubtitle}>Your upcoming adventures</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRealTrips} tintColor="#E8755A" />}>
          <Text style={styles.sectionLabel}>Active Adventures</Text>
          {activeTrips.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}><Ionicons name="airplane-outline" size={40} color="#E8755A" /></View>
              <Text style={styles.emptyText}>No active trips found.</Text>
            </View>
          ) : (
            activeTrips.map((trip) => (
              <TouchableOpacity key={trip.id} style={styles.tripCard} onPress={() => router.push({ pathname: '/trip/chat', params: { bookingId: trip.id } })}>
                <View style={styles.cardTop}>
                  <View style={styles.tierBadge}><Text style={styles.tierText}>{trip.tier_id}</Text></View>
                  <View style={styles.timerBadge}><Ionicons name="chatbubbles-outline" size={14} color="#E8755A" /><Text style={styles.timerText}>Chat Unlocked</Text></View>
                </View>
                <View style={styles.cardMain}>
                  <Image source={{ uri: trip.partner?.photos?.[0] || 'https://via.placeholder.com/100' }} style={styles.partnerAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.destination}>Trip with {trip.partner?.username}</Text>
                    <Text style={styles.statusLine}>Confirmed • {new Date(trip.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </View>
              </TouchableOpacity>
            ))
          )}
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
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', color: '#000', opacity: 0.4, letterSpacing: 1, marginBottom: 15 },
  tripCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  tierBadge: { backgroundColor: 'rgba(232, 117, 90, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tierText: { color: '#E8755A', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText: { fontSize: 12, color: '#E8755A', fontWeight: '600' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partnerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F2F2F2' },
  destination: { fontSize: 17, fontWeight: '700', color: '#161616' },
  statusLine: { fontSize: 13, color: '#000', opacity: 0.4, marginTop: 2 },
  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 16 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#000', opacity: 0.3, fontSize: 16, textAlign: 'center' },
});