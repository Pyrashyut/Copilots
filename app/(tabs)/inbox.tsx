// app/(tabs)/inbox.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function InboxScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRealNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const results: any[] = [];

      // 1. Fetch Mutual Matches
      const { data: matches } = await supabase
        .from('matches_view')
        .select('*')
        .eq('user_id', user.id)
        .order('matched_at', { ascending: false })
        .limit(10);

      if (matches) {
        matches.forEach(m => {
          results.push({
            id: `match-${m.match_id}`,
            type: 'match',
            title: 'New Match! ❤️',
            body: `You and ${m.username} liked each other.`,
            time: new Date(m.matched_at).toLocaleDateString(),
            icon: 'heart',
            color: '#E8755A',
            data: { matchId: m.match_id, name: m.username }
          });
        });
      }

      // 2. Fetch Trip Proposals
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*, user_a_profile:profiles!bookings_user_a_fkey(username), user_b_profile:profiles!bookings_user_b_fkey(username)')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (bookings) {
        bookings.forEach(b => {
          const isInviter = b.invited_by === user.id;
          const partnerName = b.user_a === user.id ? b.user_b_profile?.username : b.user_a_profile?.username;
          
          if (b.status === 'pending') {
            results.push({
              id: `booking-${b.id}`,
              type: 'proposal',
              title: isInviter ? 'Proposal Sent ✈️' : 'New Trip Proposal! 🎁',
              body: isInviter ? `Waiting for ${partnerName} to accept.` : `${partnerName} invited you on a trip.`,
              time: 'Recent',
              icon: 'paper-plane',
              color: '#D4AF37',
              data: { matchId: isInviter ? (b.user_a === user.id ? b.user_b : b.user_a) : b.invited_by, name: partnerName }
            });
          }
        });
      }

      setNotifications(results);
    } catch (error) {
      console.error("Inbox Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRealNotifications(); }, []));

  const handlePress = (item: any) => {
    router.push({ pathname: '/trip/selection', params: item.data });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inbox</Text>
          <Text style={styles.headerSubtitle}>Updates & Activity</Text>
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRealNotifications} tintColor="#E8755A" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.notifItem} onPress={() => handlePress(item)}>
              <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <View style={styles.textContent}>
                <View style={styles.notifHeader}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={!loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Your inbox is quiet for now.</Text>
            </View>
          ) : null}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  blurPath: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.4 },
  blurCoral: { top: '15%', left: -80, backgroundColor: 'rgba(255, 122, 73, 0.08)' },
  blurYellow: { top: -50, right: -50, backgroundColor: 'rgba(255, 243, 73, 0.08)' },
  header: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#161616' },
  headerSubtitle: { fontSize: 16, color: '#161616', opacity: 0.5 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  notifItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  textContent: { flex: 1, marginLeft: 15 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { fontSize: 16, fontWeight: '700', color: '#161616' },
  notifTime: { fontSize: 11, color: '#000', opacity: 0.3 },
  notifBody: { fontSize: 14, color: '#161616', opacity: 0.6, lineHeight: 18 },
  emptyState: { paddingVertical: 100, alignItems: 'center' },
  emptyText: { color: '#000', opacity: 0.3, fontSize: 16 }
});