// app/trip/selection.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const TIERS = [
  { id: 'local', name: 'Local Explorer', price: '£50 - £150', duration: '4-8 Hours', desc: 'A curated local experience. Perfect for a first adventure.', icon: 'cafe-outline', color: '#E8755A' },
  { id: 'national', name: 'Weekend Escape', price: '£200 - £800', duration: '2-3 Days', desc: 'Boutique stays and planned activities within the country.', icon: 'car-outline', color: '#D4AF37' },
  { id: 'international', name: 'International', price: '£800 - £2,000', duration: '4-7 Days', desc: 'Flights, accommodation, and itinerary included.', icon: 'airplane-outline', color: '#2A9D8F' },
  { id: 'exotic', name: 'Exotic Adventure', price: '£2,000+', duration: '7-14 Days', desc: 'Once in a lifetime bucket-list destinations.', icon: 'sunny-outline', color: '#E03724' }
];

const PlanDetailCard = ({ tierId }: { tierId: string }) => {
  const tier = TIERS.find(t => t.id.toLowerCase() === (tierId || '').toLowerCase());
  
  if (!tier) return (
    <View style={styles.errorCard}>
      <Ionicons name="alert-circle" size={24} color="#D32F2F" />
      <Text style={styles.errorText}>Plan details unavailable ({tierId || 'Unknown'})</Text>
    </View>
  );

  return (
    <View style={styles.ticketContainer}>
      <View style={[styles.ticketHeader, { backgroundColor: tier.color }]}>
        <View style={styles.ticketIcon}>
          <Ionicons name={tier.icon as any} size={24} color={tier.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ticketTitle}>{tier.name}</Text>
          <Text style={styles.ticketSubtitle}>{tier.duration}</Text>
        </View>
        <Ionicons name="receipt-outline" size={24} color="rgba(255,255,255,0.8)" />
      </View>
      <View style={styles.ticketBody}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Estimated Cost</Text>
          <Text style={[styles.priceValue, { color: tier.color }]}>{tier.price}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.ticketDesc}>{tier.desc}</Text>
      </View>
      <View style={styles.ticketCircleLeft} />
      <View style={styles.ticketCircleRight} />
    </View>
  );
};

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

      // If a specific bookingId was passed (from a received proposal), load it directly
      if (params.bookingId && !String(params.bookingId).startsWith('demo_')) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', params.bookingId)
          .single();
        if (!error && data) { setBooking(data); return; }
      }

      // If it's a demo booking, synthesize a mock booking from the tierId param
      if (String(params.bookingId || '').startsWith('demo_') && params.tierId) {
        setBooking({
          id: params.bookingId,
          tier_id: params.tierId,
          status: 'pending',
          invited_by: params.matchId, // other user invited us
          user_a: params.matchId,
          user_b: user.id,
          _isDemo: true,
        });
        return;
      }

      // Otherwise query by user pair
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`and(user_a.eq.${user.id},user_b.eq.${params.matchId}),and(user_a.eq.${params.matchId},user_b.eq.${user.id})`)
        .order('created_at', { ascending: false });

      if (error) { setBooking(null); return; }

      if (data && data.length > 0) {
        const active = data.find(b => b.status !== 'cancelled');
        setBooking(active || null);
      } else {
        setBooking(null);
      }
    } catch (e) {
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { checkExistingBooking(); }, [params.matchId]));

  const handleInvite = async (tierId: string) => {
    if (!currentUserId) return;
    
    if (booking && (booking.status === 'active' || booking.status === 'completed')) {
      Alert.alert("Active Trip", "You already have a trip with this user.");
      return;
    }

    setLoading(true);
    try {
      // Clean up any cancelled bookings first
      await supabase
        .from('bookings')
        .delete()
        .or(`and(user_a.eq.${currentUserId},user_b.eq.${params.matchId}),and(user_a.eq.${params.matchId},user_b.eq.${currentUserId})`)
        .eq('status', 'cancelled');

      // Also clean up stale pending invites
      await supabase
        .from('bookings')
        .delete()
        .or(`and(user_a.eq.${currentUserId},user_b.eq.${params.matchId}),and(user_a.eq.${params.matchId},user_b.eq.${currentUserId})`)
        .eq('status', 'pending');

      const { data, error } = await supabase.from('bookings').insert({
        tier_id: tierId,
        user_a: currentUserId,
        user_b: params.matchId,
        invited_by: currentUserId,
        status: 'pending'
      }).select().single();

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
    if (booking._isDemo) {
      Alert.alert('Demo Mode', 'In the live app, this would take you to the payment screen to confirm the trip!');
      return;
    }
    const tierName = TIERS.find(t => t.id === booking.tier_id)?.name || 'Trip';
    router.push({ pathname: '/trip/payment', params: { bookingId: booking.id, tierName } });
  };

  const handleDeclineOrCancel = async () => {
    if (!booking) return;
    const isMyInvite = booking.invited_by === currentUserId;
    
    Alert.alert(
      isMyInvite ? "Cancel Invite?" : "Decline Invite?", 
      "This will remove the trip proposal.", 
      [
        { text: "No, Keep it", style: "cancel" },
        { 
          text: "Yes, Remove", 
          style: "destructive", 
          onPress: async () => {
            setLoading(true);
            try {
              // DELETE the row instead of updating status to avoid constraint issues
              const { error } = await supabase
                .from('bookings')
                .delete()
                .eq('id', booking.id);
              
              if (error) throw error;
              setBooking(null);
            } catch (e: any) { 
              Alert.alert("Error", "Could not cancel. Please try again.");
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
            <View style={styles.statusWrapper}>
              <View style={styles.statusHeader}>
                <Ionicons 
                  name={
                    booking.status === 'active' ? "checkmark-circle" : 
                    booking.status === 'completed' ? "flag" : 
                    "mail-unread"
                  } 
                  size={32} 
                  color={booking.status === 'completed' ? "#3B9F16" : "#E8755A"} 
                />
                <Text style={styles.statusTitle}>
                  {booking.status === 'active' ? 'Trip Confirmed' : 
                   booking.status === 'completed' ? 'Trip Completed' :
                   (booking.invited_by === currentUserId ? 'Invitation Sent' : 'New Invitation')}
                </Text>
              </View>

              <Text style={styles.statusDesc}>
                {booking.status === 'active' 
                  ? "You can now start your Vibe Check chat." 
                  : (booking.invited_by === currentUserId 
                    ? `Waiting for ${params.name} to accept.` 
                    : `${params.name} invited you to:`)}
              </Text>

              <PlanDetailCard tierId={booking.tier_id} />

              <View style={styles.actionColumn}>
                {booking.status === 'pending' && booking.invited_by !== currentUserId && (
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleAccept}>
                    <Text style={styles.primaryBtnText}>Accept & Pay Deposit</Text>
                  </TouchableOpacity>
                )}
                
                {booking.status === 'active' && (
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push({ pathname: '/trip/chat', params: { bookingId: booking.id } })}>
                    <Text style={styles.primaryBtnText}>Open Vibe Check Chat</Text>
                  </TouchableOpacity>
                )}

                {booking.status === 'completed' && (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/trips')}>
                    <Text style={[styles.secondaryBtnText, { color: '#161616' }]}>View in Past Trips</Text>
                  </TouchableOpacity>
                )}

                {(booking.status === 'pending' || booking.status === 'active') && (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={handleDeclineOrCancel}>
                    <Text style={styles.secondaryBtnText}>
                      {booking.invited_by === currentUserId ? 'Cancel Invitation' : 'Decline'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Choose Adventure</Text>
              <Text style={styles.sectionSubtitle}>Select a plan to invite {params.name}.</Text>

              {TIERS.map((tier) => (
                <TouchableOpacity key={tier.id} style={styles.tierCard} onPress={() => handleInvite(tier.id)}>
                  <View style={styles.tierHeader}>
                    <View style={[styles.tierIconBox, { backgroundColor: tier.color + '15' }]}>
                      <Ionicons name={tier.icon as any} size={24} color={tier.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tierName}>{tier.name}</Text>
                      <Text style={[styles.tierPrice, { color: tier.color }]}>{tier.price}</Text>
                    </View>
                  </View>
                  <Text style={styles.tierDesc}>{tier.desc}</Text>
                  <View style={styles.inviteBtn}>
                    <Text style={[styles.inviteBtnText, { color: tier.color }]}>Send Invite</Text>
                    <Ionicons name="arrow-forward" size={16} color={tier.color} />
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
  sectionSubtitle: { fontSize: 16, color: '#161616', opacity: 0.5, marginBottom: 24 },
  tierCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  tierIconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tierName: { fontSize: 18, fontWeight: '700', color: '#161616' },
  tierPrice: { fontSize: 14, fontWeight: '700' },
  tierDesc: { fontSize: 14, color: '#161616', opacity: 0.6, lineHeight: 20 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  inviteBtnText: { fontWeight: '700', fontSize: 14 },
  statusWrapper: { width: '100%', alignItems: 'center' },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  statusTitle: { fontSize: 22, fontWeight: '700', color: '#161616' },
  statusDesc: { fontSize: 16, color: '#161616', opacity: 0.6, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  ticketContainer: { width: '100%', backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  ticketIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  ticketTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  ticketSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },
  ticketBody: { padding: 20, backgroundColor: '#FFF' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  priceLabel: { fontSize: 14, color: '#666', fontWeight: '600' },
  priceValue: { fontSize: 22, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F1F1F1', marginBottom: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD', borderRadius: 1 },
  ticketDesc: { fontSize: 15, color: '#444', lineHeight: 22, textAlign: 'center' },
  ticketCircleLeft: { position: 'absolute', top: 70, left: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FEFEFE' },
  ticketCircleRight: { position: 'absolute', top: 70, right: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FEFEFE' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, backgroundColor: '#FFF0F0', borderRadius: 12, marginBottom: 20, width: '100%' },
  errorText: { color: '#D32F2F', fontWeight: '600' },
  actionColumn: { width: '100%', gap: 12, alignItems: 'center' },
  primaryBtn: { width: '100%', backgroundColor: '#E8755A', paddingVertical: 18, borderRadius: 100, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { width: '100%', backgroundColor: 'transparent', paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#E03724', fontWeight: '600', fontSize: 14 }
});