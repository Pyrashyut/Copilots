// app/(tabs)/trips.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const TIERS: Record<string, { name: string, image: any }> = {
  'local': { name: 'Local Explorer', image: require('../../assets/images/icon.png') }, 
  'national': { name: 'Weekend Escape', image: require('../../assets/images/icon.png') },
  'international': { name: 'International', image: require('../../assets/images/icon.png') },
  'exotic': { name: 'Exotic Adventure', image: require('../../assets/images/icon.png') }
};

const TIER_IMAGES: Record<string, string> = {
  'local': 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=800&auto=format&fit=crop',
  'national': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800&auto=format&fit=crop',
  'international': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
  'exotic': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop',
};

export default function TripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Bookings (Simple select, no joins to avoid errors)
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .eq('status', 'active') 
        .order('chat_started_at', { ascending: false });

      if (bookingError) throw bookingError;

      if (!bookings || bookings.length === 0) {
        setTrips([]);
        setLoading(false);
        return;
      }

      // 2. Collect all User IDs involved in these bookings
      const userIds = new Set<string>();
      bookings.forEach(b => {
        if (b.user_a !== user.id) userIds.add(b.user_a);
        if (b.user_b !== user.id) userIds.add(b.user_b);
      });

      // 3. Fetch Profiles for those users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, photos')
        .in('id', Array.from(userIds));

      if (profileError) throw profileError;

      // 4. Create a map for easy lookup
      const profileMap: Record<string, any> = {};
      profiles?.forEach(p => {
        profileMap[p.id] = p;
      });

      // 5. Merge data manually
      const formattedTrips = bookings.map(b => {
        const isUserA = b.user_a === user.id;
        const otherUserId = isUserA ? b.user_b : b.user_a;
        const otherUser = profileMap[otherUserId] || { username: 'Traveler', photos: [] };
        
        return {
          ...b,
          otherUser: otherUser,
          otherUserId: otherUserId,
          tierName: TIERS[b.tier_id]?.name || 'Adventure',
          bgImage: TIER_IMAGES[b.tier_id] || TIER_IMAGES['local']
        };
      });

      setTrips(formattedTrips);
    } catch (error) {
      console.error('Trips fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [])
  );

  const handleOpenChat = (bookingId: string) => {
    router.push({
      pathname: '/trip/chat',
      params: { bookingId }
    });
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
        <Text style={styles.headerTitle}>My Trips</Text>
        <Text style={styles.headerSubtitle}>Upcoming Adventures</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchTrips} tintColor={Colors.neutral.white}/>
        }
      >
        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="airplane-outline" size={48} color={Colors.primary.navy} />
            </View>
            <Text style={styles.emptyTitle}>No Active Trips</Text>
            <Text style={styles.emptyText}>
              You haven't confirmed any adventures yet. Go to your Matches to start planning!
            </Text>
            <TouchableOpacity 
              style={styles.findBtn}
              onPress={() => router.navigate('/(tabs)/matches')}
            >
              <Text style={styles.findBtnText}>Go to Matches</Text>
            </TouchableOpacity>
          </View>
        ) : (
          trips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <ImageBackground
                source={{ uri: trip.bgImage }}
                style={styles.cardHeader}
                imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.tripHeaderContent}>
                    <Text style={styles.tripTier}>{trip.tierName}</Text>
                    <View style={styles.partnerBadge}>
                      <Text style={styles.partnerText}>with {trip.otherUser?.username}</Text>
                      <Image 
                        source={{ uri: trip.otherUser?.photos?.[0] || 'https://via.placeholder.com/50' }} 
                        style={styles.smallAvatar} 
                      />
                    </View>
                  </View>
                </LinearGradient>
              </ImageBackground>

              <View style={styles.cardBody}>
                <View style={styles.statusRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Booking Confirmed</Text>
                  <Text style={styles.dateText}>
                    {trip.chat_started_at ? new Date(trip.chat_started_at).toLocaleDateString() : 'Date TBD'}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.chatButton}
                    onPress={() => handleOpenChat(trip.id)}
                  >
                    <LinearGradient
                      colors={Colors.gradient.sunset}
                      style={styles.btnGradient}
                    >
                      <Ionicons name="chatbubbles" size={18} color={Colors.neutral.white} />
                      <Text style={styles.chatBtnText}>Chat (24h left)</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.itineraryButton}>
                    <Ionicons name="map-outline" size={20} color={Colors.primary.navy} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    padding: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral.white,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  findBtn: {
    backgroundColor: Colors.secondary.teal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  findBtnText: {
    color: Colors.neutral.white,
    fontWeight: '700',
    fontSize: 14,
  },
  tripCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    height: 140,
    justifyContent: 'flex-end',
  },
  cardGradient: {
    height: '100%',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopLeftRadius: 16, 
    borderTopRightRadius: 16,
  },
  tripHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  tripTier: {
    color: Colors.neutral.white,
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 8,
  },
  partnerText: {
    color: Colors.neutral.white,
    fontSize: 12,
    fontWeight: '600',
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.neutral.border,
  },
  cardBody: {
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.highlight.success,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.navy,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: Colors.neutral.grey,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  chatBtnText: {
    color: Colors.neutral.white,
    fontWeight: '700',
    fontSize: 14,
  },
  itineraryButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.neutral.trailDust,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
});