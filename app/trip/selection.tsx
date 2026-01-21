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

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`and(user_a.eq.${user.id},user_b.eq.${params.matchId}),and(user_a.eq.${params.matchId},user_b.eq.${user.id})`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
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
    if (booking) {
      Alert.alert("Hold on", "You already have a pending invite. Cancel it first.");
      return;
    }

    Alert.alert("Send Invitation?", "This will send a trip proposal.", [
      { text: "Cancel", style: "cancel" },
      { text: "Send Invite", onPress: async () => {
        setLoading(true);
        
        await supabase
          .from('bookings')
          .delete()
          .or(`and(user_a.eq.${currentUser.id},user_b.eq.${params.matchId}),and(user_a.eq.${params.matchId},user_b.eq.${currentUser.id})`);

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
        setBooking(null);

        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', booking.id);

        if (error) {
          Alert.alert("Error", "Could not delete booking.");
          checkExistingBooking();
        } 
        
        setLoading(false);
      }}
    ]);
  };

  if (loading) return <ActivityIndicator style={{flex:1, marginTop: 50}} color={Colors.highlight.gold} />;

  if (booking) {
    const isMyInvite = booking.invited_by === currentUser.id;
    const tier = TIERS.find(t => t.id === booking.tier_id);

    return (
      <LinearGradient 
        colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]} 
        locations={[0, 0.3, 0.6, 1]}
        style={styles.container}
      >
        {/* Decorative Background Elements */}
        <View style={styles.bgDecoration1} />
        <View style={styles.bgDecoration2} />
        
        <SafeAreaView style={styles.safeArea}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>
          
          <View style={styles.statusCard}>
             <View style={styles.iconCircle}>
               <Ionicons name={isMyInvite ? "paper-plane" : "gift"} size={48} color={Colors.primary.navy} />
             </View>
             <Text style={styles.statusTitle}>
               {booking.status === 'active' ? 'Adventure Active!' : (isMyInvite ? 'Invitation Sent' : 'Invitation Received')}
             </Text>
             <Text style={styles.statusText}>
               {booking.status === 'active' 
                 ? "You can now chat in the active window." 
                 : (isMyInvite ? `You invited ${params.name} to the ${tier?.name || 'Trip'}. Waiting for them to accept.` : `${params.name} wants to go on a ${tier?.name || 'Trip'} with you!`)}
             </Text>

             {booking.status === 'active' && (
                <TouchableOpacity style={styles.actionButton} onPress={() => router.push({ pathname: '/trip/chat', params: { bookingId: booking.id } })}>
                  <LinearGradient
                    colors={Colors.gradient.sunset}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="chatbubbles" size={20} color={Colors.neutral.white} />
                    <Text style={styles.btnText}>Open Chat</Text>
                  </LinearGradient>
                </TouchableOpacity>
             )}

             {booking.status === 'pending' && !isMyInvite && (
               <View style={styles.btnColumn}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleAccept}>
                    <LinearGradient
                      colors={Colors.gradient.sunset}
                      style={styles.buttonGradient}
                    >
                      <Ionicons name="checkmark-circle" size={20} color={Colors.neutral.white} />
                      <Text style={styles.btnText}>Accept & Start Chat</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.declineButton} onPress={() => handleCancelOrDecline('decline')}>
                    <Text style={styles.declineText}>Decline & Propose Other</Text>
                  </TouchableOpacity>
               </View>
             )}

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

  return (
    <LinearGradient 
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]} 
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      {/* Decorative Background Elements */}
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />
      
      <SafeAreaView style={{flex: 1}}>
         <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.neutral.white}/>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Plan with {params.name}</Text>
            <View style={{width: 40}} />
         </View>
         
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
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Background Decorations
  bgDecoration1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
  },
  bgDecoration2: {
    position: 'absolute',
    bottom: 100,
    left: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255, 217, 61, 0.06)',
  },
  
  safeArea: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 15, 
    gap: 15 
  },
  headerTitle: { 
    color: Colors.neutral.white, 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  backButton: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  statusCard: { 
    margin: 20, 
    backgroundColor: 'white', 
    padding: 30, 
    borderRadius: 20, 
    alignItems: 'center', 
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutral.trailDust,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: Colors.primary.navy, 
    marginBottom: 12
  },
  statusText: { 
    textAlign: 'center', 
    color: Colors.neutral.grey, 
    marginBottom: 20, 
    lineHeight: 22 
  },
  
  btnColumn: { width: '100%', gap: 10, alignItems: 'center' },
  actionButton: { 
    width: '100%', 
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  btnText: { 
    fontWeight: 'bold', 
    color: Colors.neutral.white, 
    fontSize: 16 
  },
  
  cancelButton: { marginTop: 10, padding: 10 },
  cancelText: { 
    color: Colors.highlight.error, 
    fontWeight: '600' 
  },

  declineButton: { padding: 10 },
  declineText: { 
    color: Colors.neutral.grey, 
    fontWeight: '600' 
  },

  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: Colors.neutral.white 
  },
  subtitle: { 
    fontSize: 15, 
    color: 'rgba(255, 255, 255, 0.8)', 
    marginTop: 5 
  },
  card: { 
    padding: 20, 
    borderRadius: 16,
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  tierName: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  price: { 
    color: 'white', 
    fontWeight: 'bold' 
  },
  desc: { 
    color: 'rgba(255,255,255,0.9)', 
    marginTop: 10, 
    marginBottom: 15 
  },
  btn: { 
    backgroundColor: 'white', 
    alignSelf: 'flex-start', 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5 
  },
  btnLabel: { 
    fontWeight: 'bold', 
    color: Colors.primary.navy 
  }
});