import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

      // 1. Get Active Bookings (Chats)
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          user_a_profile:profiles!bookings_user_a_fkey(username, photos),
          user_b_profile:profiles!bookings_user_b_fkey(username, photos)
        `)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .in('status', ['pending', 'active']);

      // 2. Get Matches (People I haven't booked with yet)
      const { data: matches } = await supabase
        .from('matches_view')
        .select('*')
        .eq('user_id', user.id);

      // Filter out people I already have a booking with
      const bookedUserIds = bookings?.map(b => b.user_a === user.id ? b.user_b : b.user_a) || [];
      const filteredMatches = matches?.filter(m => !bookedUserIds.includes(m.match_id)) || [];

      // Format Bookings for Display
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
      // Go to Selection to start a plan
      router.push({
        pathname: '/trip/selection',
        params: { matchId: item.match_id, name: item.username }
      });
    } else {
      // Go to existing Booking
      // If active -> Chat
      // If pending -> Selection Screen (to accept/view status)
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary.navy} />
      </View>
    );
  }

  return (
    <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Copilots</Text>
        </View>

        <SectionList
          sections={[
            { title: 'Active Plans', data: activeChats, type: 'chat' },
            { title: 'New Matches', data: newMatches, type: 'match' }
          ]}
          keyExtractor={(item, index) => item.id || item.match_id + index}
          renderSectionHeader={({ section: { title, data } }) => (
            data.length > 0 ? <Text style={styles.sectionTitle}>{title}</Text> : null
          )}
          renderItem={({ item, section }) => {
            if (section.type === 'chat') {
              return (
                <TouchableOpacity style={styles.chatCard} onPress={() => handlePress('chat', item)}>
                  <Image source={{ uri: item.otherUser?.photos?.[0] }} style={styles.avatar} />
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.otherUser?.username}</Text>
                    <Text style={[styles.status, item.status === 'active' ? styles.activeText : styles.pendingText]}>
                      {item.status === 'active' ? '● Chat Active (24h left)' : '○ Invitation Pending'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.neutral.grey} />
                </TouchableOpacity>
              );
            } else {
              return (
                <TouchableOpacity style={styles.matchCard} onPress={() => handlePress('match', item)}>
                  <Image source={{ uri: item.photos[0] }} style={styles.avatar} />
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.username}</Text>
                    <Text style={styles.matchSub}>Match found {new Date(item.matched_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.iconCircle}>
                    <Ionicons name="airplane" size={16} color={Colors.primary.navy} />
                  </View>
                </TouchableOpacity>
              );
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
               <Text style={styles.emptyText}>No flights booked yet.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, marginBottom: 10 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: Colors.primary.navy },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.neutral.grey, marginTop: 20, marginBottom: 10, marginLeft: 20, textTransform: 'uppercase' },
  listContent: { paddingBottom: 40 },
  
  // Chat Card
  chatCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 20, padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, elevation: 3 },
  activeText: { color: Colors.highlight.success, fontWeight: '700' },
  pendingText: { color: Colors.highlight.warning, fontWeight: '600' },
  
  // Match Card
  matchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 20, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.neutral.border },
  matchSub: { fontSize: 12, color: Colors.neutral.grey },
  
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee' },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.primary.navy },
  status: { fontSize: 13, marginTop: 2 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.neutral.trailDust, alignItems: 'center', justifyContent: 'center' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.neutral.grey }
});