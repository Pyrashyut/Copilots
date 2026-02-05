// app/trip/selection.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const TIERS = [
  { id: 'local', name: 'Local Explorer', price: '£50 - £150', desc: 'First Date, Elevated. 4-8 hours.', icon: 'cafe-outline' },
  { id: 'national', name: 'Weekend Escape', price: '£200 - £800', desc: 'Weekend Wanderers. 2-3 days.', icon: 'car-outline' },
  { id: 'international', name: 'International', price: '£800 - £2,000', desc: 'Passport Required. 4-7 days.', icon: 'airplane-outline' },
  { id: 'exotic', name: 'Exotic Adventure', price: '£2,000+', desc: 'Once in a Lifetime. 7-14 days.', icon: 'sunny-outline' }
];

export default function TripSelection() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const checkExistingBooking = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Query for ANY bookings between these two users (removed status filter)
      const { data: dataA, error: errorA } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_a', user.id)
        .eq('user_b', params.matchId);

      const { data: dataB, error: errorB } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_a', params.matchId)
        .eq('user_b', user.id);

      if (errorA || errorB) {
        console.error("Error fetching bookings:", errorA || errorB);
        setBooking(null);
        return;
      }

      // Combine results
      const allBookings = [...(dataA || []), ...(dataB || [])];

      if (allBookings.length > 0) {
        // Sort by created_at to get the most recent one
        allBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setBooking(allBookings[0]);
      } else {
        setBooking(null);
      }
    } catch (e) {
      console.error("Error checking booking:", e);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkExistingBooking();
    }, [params.matchId])
  );

  const handleInvite = async (tierId: string) => {
    if (!currentUserId) return;
    
    // Safety check: Don't allow invite if there is already an active/completed booking
    if (booking && (booking.status === 'active' || booking.status === 'completed')) {
      Alert.alert("Cannot Invite", "You already have a trip history with this user.");
      return;
    }

    setLoading(true);
    try {
      // Clear OLD pending/cancelled bookings first
      await supabase
        .from('bookings')
        .delete()
        .eq('user_a', currentUserId)
        .eq('user_b', params.matchId)
        .in('status', ['pending', 'cancelled']); // Only delete pending/cancelled

      await supabase
        .from('bookings')
        .delete()
        .eq('user_a', params.matchId)
        .eq('user_b', currentUserId)
        .in('status', ['pending', 'cancelled']);

      // Create new booking
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          tier_id: tierId,
          user_a: currentUserId,
          user_b: params.matchId,
          invited_by: currentUserId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!booking) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'active', chat_started_at: new Date().toISOString() })
        .eq('id', booking.id)
        .select()
        .single();
      
      if (error) throw error;
      router.replace({ pathname: '/trip/chat', params: { bookingId: data.id } });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineOrCancel = async () => {
    if (!booking) return;
    
    Alert.alert(
      "Confirm Action",
      "This will remove the current proposal.",
      [
        { text: "Keep it", style: "cancel" },
        { 
          text: "Confirm", 
          style: "destructive", 
          onPress: async () => {
            setBooking(null); // Optimistic update
            setLoading(true);
            try {
              await supabase.from('bookings').delete().eq('id', booking.id);
            } catch (e: any) {
              console.error("Exception during delete:", e);
              checkExistingBooking(); // Revert on error
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>;

  return (
    <View style={styles.container}>
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {booking?.status === 'completed' ? 'Trip History' : `Plan with ${params.name}`}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {booking ? (
            <View style={styles.statusCard}>
              {/* COMPLETED STATE */}
              {booking.status === 'completed' ? (
                <>
                  <View style={[styles.iconCircle, { backgroundColor: '#F2F2F2' }]}>
                    <Ionicons name="checkmark-done-circle" size={48} color="#3B9F16" />
                  </View>
                  <Text style={styles.statusTitle}>Trip Ended</Text>
                  <Text style={styles.statusDesc}>
                    You have successfully completed a {booking.tier_id} trip with {params.name}.
                  </Text>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/trips')}>
                    <Text style={[styles.secondaryBtnText, { color: '#161616' }]}>View in Past Trips</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* ACTIVE OR PENDING STATE */
                <>
                  <View style={styles.iconCircle}>
                    <Ionicons 
                      name={booking.status === 'active' ? "checkmark-circle" : "mail-unread-outline"} 
                      size={48} 
                      color="#E8755A" 
                    />
                  </View>
                  <Text style={styles.statusTitle}>
                    {booking.status === 'active' ? 'Trip Confirmed!' : (booking.invited_by === currentUserId ? 'Invitation Sent' : 'New Invitation!')}
                  </Text>
                  <Text style={styles.statusDesc}>
                    {booking.status === 'active' 
                      ? "You can now start your 5-minute Vibe Check chat." 
                      : (booking.invited_by === currentUserId 
                        ? `Waiting for ${params.name} to accept your ${booking.tier_id} trip.` 
                        : `${params.name} wants to go on a ${booking.tier_id} trip with you!`)}
                  </Text>

                  <View style={styles.actionColumn}>
                    {booking.status === 'pending' && booking.invited_by !== currentUserId && (
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleAccept}>
                        <Text style={styles.primaryBtnText}>Accept & Start Chat</Text>
                      </TouchableOpacity>
                    )}
                    {booking.status === 'active' && (
                      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push({ pathname: '/trip/chat', params: { bookingId: booking.id } })}>
                        <Text style={styles.primaryBtnText}>Open Chat</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.secondaryBtn} onPress={handleDeclineOrCancel}>
                      <Text style={styles.secondaryBtnText}>
                        {booking.invited_by === currentUserId ? 'Cancel Invitation' : 'Decline & Propose Other'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ) : (
            /* NO BOOKING FOUND - SHOW TIERS */
            <>
              <Text style={styles.sectionTitle}>Choose Adventure</Text>
              <Text style={styles.sectionSubtitle}>Send an invitation to {params.name}. If they accept, you have 24 hours to chat.</Text>

              {TIERS.map((tier) => (
                <TouchableOpacity key={tier.id} style={styles.tierCard} onPress={() => handleInvite(tier.id)}>
                  <View style={styles.tierHeader}>
                    <View style={styles.tierIconBox}>
                      <Ionicons name={tier.icon as any} size={24} color="#E8755A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tierName}>{tier.name}</Text>
                      <Text style={styles.tierPrice}>{tier.price}</Text>
                    </View>
                  </View>
                  <Text style={styles.tierDesc}>{tier.desc}</Text>
                  <View style={styles.inviteBtn}>
                    <Text style={styles.inviteBtnText}>Send Invite</Text>
                    <Ionicons name="arrow-forward" size={16} color="#E8755A" />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  blurPath: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.3 },
  blurCoral: { top: '10%', left: -100, backgroundColor: 'rgba(232, 117, 90, 0.1)' },
  blurYellow: { bottom: '10%', right: -100, backgroundColor: 'rgba(212, 175, 55, 0.08)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 28, fontWeight: '700', color: '#161616', marginBottom: 8 },
  sectionSubtitle: { fontSize: 16, color: '#161616', opacity: 0.5, marginBottom: 24, lineHeight: 22 },
  tierCard: { backgroundColor: '#F2F2F2', borderRadius: 20, padding: 20, marginBottom: 16, gap: 12 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  tierIconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  tierName: { fontSize: 18, fontWeight: '700', color: '#161616' },
  tierPrice: { fontSize: 14, color: '#E8755A', fontWeight: '600' },
  tierDesc: { fontSize: 14, color: '#161616', opacity: 0.6, lineHeight: 20 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  inviteBtnText: { color: '#E8755A', fontWeight: '700', fontSize: 14 },
  statusCard: { backgroundColor: '#F9F9F9', borderRadius: 24, padding: 32, alignItems: 'center', marginTop: 40, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 2 },
  statusTitle: { fontSize: 22, fontWeight: '700', color: '#161616', marginBottom: 10 },
  statusDesc: { fontSize: 16, color: '#161616', opacity: 0.6, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  actionColumn: { width: '100%', gap: 12, alignItems: 'center' },
  primaryBtn: { width: '100%', backgroundColor: '#161616', paddingVertical: 18, borderRadius: 100, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { width: '100%', backgroundColor: 'transparent', paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#E03724', fontWeight: '600', fontSize: 14 }
});