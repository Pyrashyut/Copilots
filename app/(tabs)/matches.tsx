// app/(tabs)/matches.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
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

      // 1. Get all people I liked
      const { data: myLikes } = await supabase
        .from('swipes')
        .select('likee_id')
        .eq('liker_id', user.id)
        .eq('is_like', true);

      // 2. Get all people who liked me
      const { data: likedMe } = await supabase
        .from('swipes')
        .select('liker_id')
        .eq('likee_id', user.id)
        .eq('is_like', true);

      const myLikeIds = myLikes?.map(s => s.likee_id) || [];
      const likedMeIds = likedMe?.map(s => s.liker_id) || [];

      // 3. Find Mutual Matches (Intersection of IDs)
      const mutualIds = myLikeIds.filter(id => likedMeIds.includes(id));

      if (mutualIds.length === 0) {
        setNegotiations([]);
        setNewMatches([]);
        setLoading(false);
        return;
      }

      // 4. Fetch Profiles for these mutual matches
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, photos')
        .in('id', mutualIds);

      // 5. Fetch Bookings for these mutual matches to see status
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      // 6. Categorize
      const negs: any[] = [];
      const fresh: any[] = [];

      profiles?.forEach(profile => {
        const booking = bookings?.find(b => 
          (b.user_a === profile.id || b.user_b === profile.id)
        );

        if (!booking) {
          fresh.push(profile);
        } else if (booking.status === 'pending') {
          negs.push({ ...profile, booking });
        }
        // 'active' bookings are ignored here because they live in the "Trips" tab
      });

      setNegotiations(negs);
      setNewMatches(fresh);
    } catch (error) {
      console.error("Matches direct fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleAction = (matchId: string, name: string) => {
    router.push({ pathname: '/trip/selection', params: { matchId, name } });
  };

  if (loading && !newMatches.length && !negotiations.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.navy} />
      </View>
    );
  }

  return (
    <LinearGradient 
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]} 
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
        <Text style={styles.headerSubtitle}>Propose an adventure to connect</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#fff"/>}
      >
        {/* IN NEGOTIATION */}
        {negotiations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Proposals</Text>
            {negotiations.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.card}
                onPress={() => handleAction(item.id, item.username)}
              >
                <Image source={{ uri: item.photos?.[0] }} style={styles.avatar} />
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.username}</Text>
                  <Text style={styles.statusText}>
                    {item.booking.invited_by === item.id ? 'Received proposal! 🎁' : 'Sent proposal... ✈️'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.neutral.greyLight} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* NEW MATCHES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Connections</Text>
          {newMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No new matches. Check Discover!</Text>
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
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary.navy },
  header: { paddingHorizontal: 24, paddingTop: 70, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  scrollContent: { paddingBottom: 100 },
  section: { marginBottom: 30, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  cardInfo: { flex: 1, marginLeft: 12 },
  name: { fontSize: 17, fontWeight: '700', color: Colors.primary.navy },
  statusText: { fontSize: 13, color: Colors.highlight.gold, fontWeight: '600', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  matchCard: { width: '48%', aspectRatio: 0.8, borderRadius: 16, overflow: 'hidden' },
  matchImage: { width: '100%', height: '100%' },
  matchOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  matchName: { color: '#fff', fontWeight: '800', fontSize: 16 },
  planBadge: { alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  planText: { color: Colors.primary.navy, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 }
});