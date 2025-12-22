import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const TIERS = [
  { id: 'local', name: 'Local Explorer', price: '£50 - £150', tag: 'First Date Vibes', desc: 'Curated local experiences.', icon: 'cafe', color: ['#4FACFE', '#00F2FE'] },
  { id: 'national', name: 'Weekend Escape', price: '£200 - £800', tag: 'Mini Adventure', desc: '2-3 day trips within country.', icon: 'car', color: ['#6BCF7F', '#38D98D'] },
  { id: 'international', name: 'International', price: '£800 - £2,000', tag: 'Passport Required', desc: '4-7 days exploring new lands.', icon: 'airplane', color: ['#FA709A', '#FEE140'] },
  { id: 'exotic', name: 'Exotic Adventure', price: '£2,000+', tag: 'Bucket List', desc: '7-14 days in paradise.', icon: 'sunny', color: ['#667EEA', '#764BA2'] }
];

export default function TripSelection() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkExistingBooking();
  }, []);

  const checkExistingBooking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // Fetch ALL bookings between these two (not just single)
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`and(user_a.eq.${user.id},user_b.eq.${params.matchId}),and(user_a.eq.${params.matchId},user_b.eq.${user.id})`)
        .order('created_at', { ascending: false }); // Get newest first

      if (error) throw error;

      if (data && data.length > 0) {
        // If multiple exist (bug), keep the newest, delete the rest
        if (data.length > 1) {
          const toKeep = data[0];
          const toDelete = data.slice(1).map(b => b.id);
          await supabase.from('bookings').delete().in('id', toDelete);
          setBooking(toKeep);
        } else {
          setBooking(data[0]);
        }
      } else {
        setBooking(null);
      }
    } catch (e) {
      console.error("Fetch Error:", e);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (tierId: string) => {
    // Safety check
    if (booking) {
      Alert.alert("Hold on", "You already have a pending invite. Cancel it first.");
      return;
    }

    Alert.alert("Send Invitation?", "This will send a trip proposal.", [
      { text: "Cancel", style: "cancel" },
      { text: "Send Invite", onPress: async () => {
        setLoading(true);
        
        // 1. Double check cleanup
        await supabase
          .from('bookings')
          .delete()
          .or(`and(user_a.eq.${currentUser.id},user_b.eq.${params.matchId}),and(user_a.eq.${params.matchId},user_b.eq.${currentUser.id})`);

        // 2. Create New
        const { error } = await supabase.from('bookings').insert({
          tier_id: tierId,
          user_a: currentUser.id,
          user_b: params.matchId,
          invited_by: currentUser.id,
          status: 'pending'
        });

        if (error) {
          Alert.alert("Error", error.message);
        } else {
          checkExistingBooking(); 
        }
        setLoading(false);
      }}
    ]);
  };

  const handleAccept = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'active', 
        chat_started_at: new Date().toISOString() 
      })
      .eq('id', booking.id);
    
    if (error) Alert.alert("Error", error.message);
    else {
      router.replace({ pathname: '/trip/chat', params: { bookingId: booking.id } });
    }
    setLoading(false);
  };

  const handleCancelOrDecline = async (action: 'cancel' | 'decline') => {
    const title = action === 'cancel' ? "Cancel Invitation?" : "Decline Invitation?";
    const message = action === 'cancel' 
      ? "This will remove the invitation." 
      : "This will decline their offer. You can then propose a different trip.";

    Alert.alert(title, message, [
      { text: "Go Back", style: "cancel" },
      { text: action === 'cancel' ? "Yes, Cancel" : "Decline", style: 'destructive', onPress: async () => {
        setLoading(true);
        
        // Optimistic UI Update: Clear immediately so user feels it worked
        setBooking(null);

        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', booking.id);

        if (error) {
          Alert.alert("Error", "Could not delete booking.");
          checkExistingBooking(); // Revert on error
        } 
        
        setLoading(false);
      }}
    ]);
  };

  if (loading) return <ActivityIndicator style={{flex:1, marginTop: 50}} color={Colors.primary.navy} />;

  // SCENARIO 1: Booking Exists 
  if (booking) {
    const isMyInvite = booking.invited_by === currentUser.id;
    const tier = TIERS.find(t => t.id === booking.tier_id);

    return (
      <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary.navy} />
          </TouchableOpacity>
          
          <View style={styles.statusCard}>
             <Ionicons name={isMyInvite ? "paper-plane" : "gift"} size={48} color={Colors.primary.navy} />
             <Text style={styles.statusTitle}>
               {booking.status === 'active' ? 'Adventure Active!' : (isMyInvite ? 'Invitation Sent' : 'Invitation Received')}
             </Text>
             <Text style={styles.statusText}>
               {booking.status === 'active' 
                 ? "You can now chat in the active window." 
                 : (isMyInvite ? `You invited ${params.name} to the ${tier?.name || 'Trip'}. Waiting for them to accept.` : `${params.name} wants to go on a ${tier?.name || 'Trip'} with you!`)}
             </Text>

             {/* Status: ACTIVE */}
             {booking.status === 'active' && (
                <TouchableOpacity style={styles.actionButton} onPress={() => router.push({ pathname: '/trip/chat', params: { bookingId: booking.id } })}>
                  <Text style={styles.btnText}>Open Chat</Text>
                </TouchableOpacity>
             )}

             {/* Status: PENDING + RECEIVED */}
             {booking.status === 'pending' && !isMyInvite && (
               <View style={styles.btnColumn}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleAccept}>
                    <Text style={styles.btnText}>Accept & Start Chat</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.declineButton} onPress={() => handleCancelOrDecline('decline')}>
                    <Text style={styles.declineText}>Decline & Propose Other</Text>
                  </TouchableOpacity>
               </View>
             )}

             {/* Status: PENDING + SENT */}
             {booking.status === 'pending' && isMyInvite && (
                <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelOrDecline('cancel')}>
                  <Text style={styles.cancelText}>Cancel Invitation</Text>
                </TouchableOpacity>
             )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // SCENARIO 2: No Booking (Select a Tier)
  return (
    <View style={styles.container}>
      <SafeAreaView style={{backgroundColor: Colors.primary.navy}}>
         <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white"/></TouchableOpacity>
            <Text style={styles.headerTitle}>Plan with {params.name}</Text>
         </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{padding: 20}}>
        <Text style={styles.title}>Choose Adventure</Text>
        <Text style={styles.subtitle}>Send an invite. If they accept, you have 24 hours to chat.</Text>
        
        <View style={{gap: 15, marginTop: 20}}>
          {TIERS.map(tier => (
            <TouchableOpacity key={tier.id} onPress={() => handleInvite(tier.id)}>
              <LinearGradient colors={tier.color as any} style={styles.card}>
                <View style={styles.row}>
                   <Text style={styles.tierName}>{tier.name}</Text>
                   <Text style={styles.price}>{tier.price}</Text>
                </View>
                <Text style={styles.desc}>{tier.desc}</Text>
                <View style={styles.btn}>
                  <Text style={styles.btnLabel}>Send Invite</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.primary.navy} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.trailDust },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 15 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  backButton: { margin: 20 },
  
  statusCard: { margin: 20, backgroundColor: 'white', padding: 30, borderRadius: 20, alignItems: 'center', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  statusTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.primary.navy, marginTop: 20 },
  statusText: { textAlign: 'center', color: Colors.neutral.grey, marginTop: 10, lineHeight: 22, marginBottom: 20 },
  
  btnColumn: { width: '100%', gap: 10, alignItems: 'center' },
  actionButton: { backgroundColor: Colors.highlight.gold, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, width: '100%', alignItems: 'center' },
  btnText: { fontWeight: 'bold', color: Colors.primary.navy, fontSize: 16 },
  
  cancelButton: { marginTop: 10, padding: 10 },
  cancelText: { color: Colors.highlight.error, fontWeight: '600' },

  declineButton: { padding: 10 },
  declineText: { color: Colors.neutral.grey, fontWeight: '600' },

  title: { fontSize: 28, fontWeight: 'bold', color: Colors.primary.navy },
  subtitle: { fontSize: 15, color: Colors.neutral.grey, marginTop: 5 },
  card: { padding: 20, borderRadius: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierName: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  price: { color: 'white', fontWeight: 'bold' },
  desc: { color: 'rgba(255,255,255,0.9)', marginTop: 10, marginBottom: 15 },
  btn: { backgroundColor: 'white', alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 },
  btnLabel: { fontWeight: 'bold', color: Colors.primary.navy }
});