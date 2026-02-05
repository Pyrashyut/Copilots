// app/(tabs)/matches.tsx
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

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

      // 1. Get mutual matches
      const { data: myLikes } = await supabase.from('swipes').select('likee_id').eq('liker_id', user.id).eq('is_like', true);
      const { data: likedMe } = await supabase.from('swipes').select('liker_id').eq('likee_id', user.id).eq('is_like', true);

      const myLikeIds = (myLikes || []).map(s => s.likee_id);
      const likedMeIds = (likedMe || []).map(s => s.liker_id);
      const mutualIds = myLikeIds.filter(id => likedMeIds.includes(id));

      if (mutualIds.length === 0) {
        setNegotiations([]);
        setNewMatches([]);
        return;
      }

      // 2. Fetch profiles
      const { data: profiles } = await supabase.from('profiles').select('id, username, photos').in('id', mutualIds);
      
      // 3. Fetch bookings - Using separate queries for better reliability
      const { data: bookingsA } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_a', user.id);

      const { data: bookingsB } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_b', user.id);

      // Combine and filter for only pending/active
      const allBookings = [...(bookingsA || []), ...(bookingsB || [])]
        .filter(b => b.status === 'pending' || b.status === 'active');

      const negs: any[] = [];
      const fresh: any[] = [];

      profiles?.forEach(profile => {
        const booking = allBookings.find(b => 
            (b.user_a === profile.id || b.user_b === profile.id) && b.status === 'pending'
        );
        
        const activeTrip = allBookings.find(b => 
            (b.user_a === profile.id || b.user_b === profile.id) && b.status === 'active'
        );

        if (!booking && !activeTrip) {
          fresh.push(profile);
        } else if (booking) {
          // Calculate the status text here during the loop for 100% accuracy
          const isMyInvite = booking.invited_by === user.id;
          negs.push({ 
            ...profile, 
            booking, 
            statusLabel: isMyInvite ? 'Waiting for response... ✈️' : 'Received proposal! 🎁'
          });
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

  const handleAction = (matchId: string, name: string) => {
    router.push({ pathname: '/trip/selection', params: { matchId, name } });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Matches</Text>
          <Text style={styles.headerSubtitle}>Propose a trip to start a chat</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#E8755A"/>}
        >
          {negotiations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trip Proposals</Text>
              {negotiations.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.proposalCard} 
                  onPress={() => handleAction(item.id, item.username)}
                >
                  <Image source={{ uri: item.photos?.[0] }} style={styles.avatar} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.name}>{item.username}</Text>
                    <Text style={styles.statusText}>{item.statusLabel}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Explorers</Text>
            {newMatches.length === 0 && negotiations.length === 0 && !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="heart-outline" size={48} color="#DDD" />
                <Text style={styles.emptyText}>No matches yet. Keep discovering!</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {newMatches.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.matchCard} 
                    onPress={() => handleAction(item.id, item.username)}
                  >
                    <Image source={{ uri: item.photos?.[0] }} style={styles.matchImage} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.matchOverlay}>
                      <Text style={styles.matchName}>{item.username}</Text>
                      <View style={styles.planBadge}>
                        <Text style={styles.planText}>Plan Trip</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {loading && <ActivityIndicator color="#E8755A" style={{ marginTop: 20 }} />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  blurPath: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.4 },
  blurCoral: { top: '15%', left: -80, backgroundColor: 'rgba(255, 122, 73, 0.08)' },
  blurYellow: { top: -50, right: -50, backgroundColor: 'rgba(255, 243, 73, 0.08)' },
  header: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#161616', fontFamily: 'DM Sans' },
  headerSubtitle: { fontSize: 16, color: '#161616', opacity: 0.5, fontFamily: 'DM Sans' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', color: '#000', opacity: 0.4, letterSpacing: 1, marginBottom: 15 },
  proposalCard: { 
    backgroundColor: '#FFF', borderRadius: 16, flexDirection: 'row', alignItems: 'center', 
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', 
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2 
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F2F2F2' },
  cardInfo: { flex: 1, marginLeft: 15 },
  name: { fontSize: 17, fontWeight: '700', color: '#161616' },
  statusText: { fontSize: 13, color: '#E8755A', fontWeight: '600', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  matchCard: { width: '48%', aspectRatio: 0.8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F2F2F2' },
  matchImage: { width: '100%', height: '100%' },
  matchOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, height: '50%', justifyContent: 'flex-end' },
  matchName: { color: '#FFF', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  planBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  planText: { color: '#E8755A', fontSize: 10, fontWeight: '800' },
  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  emptyText: { color: '#161616', opacity: 0.3, fontSize: 15, textAlign: 'center' }
});