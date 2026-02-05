// app/trip/chat.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('24h 00m');
  const [isExpired, setIsExpired] = useState(false);
  
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedScore, setSelectedScore] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const bookingId = params.bookingId as string;

  useEffect(() => {
    initChat();
    const timerInterval = setInterval(updateTimer, 60000); 
    updateTimer();

    const channel = supabase
      .channel(`chat:${bookingId}`)
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` 
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
      }).subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(timerInterval);
    };
  }, []);

  const initChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: booking } = await supabase
        .from('bookings')
        .select('user_a, user_b')
        .eq('id', bookingId)
        .single();
    
    if (booking) {
        setPartnerId(booking.user_a === user.id ? booking.user_b : booking.user_a);
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    
    if (data) {
        setMessages(data);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
    }
  };

  const updateTimer = async () => {
    const { data: booking } = await supabase.from('bookings').select('chat_started_at').eq('id', bookingId).single();

    if (booking?.chat_started_at) {
      const startTime = new Date(booking.chat_started_at).getTime();
      const now = new Date().getTime();
      const difference = (startTime + 24 * 60 * 60 * 1000) - now; 

      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
      } else {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    }
  };

  const sendMessage = async () => {
    if (isExpired) return Alert.alert("Time Expired", "The chat window has closed.");
    if (!newMessage.trim() || !userId) return;
    
    const text = newMessage;
    setNewMessage('');
    
    const { error } = await supabase.from('messages').insert({ 
        booking_id: bookingId, 
        sender_id: userId, 
        content: text 
    });

    if (error) Alert.alert("Error", "Message could not be sent");
  };

  const submitRating = async () => {
    if (selectedScore === 0) return Alert.alert("Select a score", "Please select a star rating.");
    if (!partnerId || !userId) return;

    setSubmittingRating(true);
    try {
      // 1. Insert the rating
      const { error: ratingError } = await supabase.from('ratings').insert({
        rater_id: userId,
        ratee_id: partnerId,
        booking_id: bookingId,
        score: selectedScore
      });
      if (ratingError) throw ratingError;

      // 2. IMPORTANT: Update booking status to 'completed'
      const { error: statusError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);
      if (statusError) throw statusError;

      Alert.alert("Trip Finalized! ✅", "Your rating was submitted.");
      setShowRatingModal(false);
      router.replace('/(tabs)/trips');
    } catch (e: any) {
      Alert.alert("Error", "Could not complete trip: " + e.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Vibe Check</Text>
            <View style={[styles.timerBadge, isExpired && { backgroundColor: '#E03724' }]}>
                <Ionicons name="time" size={14} color="#FFF" />
                <Text style={styles.timerText}>{timeLeft}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowRatingModal(true)} style={styles.finishBtn}>
             <Text style={styles.finishBtnText}>End Trip</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isMe = item.sender_id === userId;
              return (
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                  <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>{item.content}</Text>
                </View>
              );
            }}
          />

          <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
             <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholder="Type a message..." value={newMessage} onChangeText={setNewMessage} multiline />
                <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={!newMessage.trim() || isExpired}>
                    <LinearGradient colors={['#E8755A', '#CA573D']} style={styles.sendGradient}><Ionicons name="arrow-up" size={20} color="#FFF" /></LinearGradient>
                </TouchableOpacity>
             </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={showRatingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Rate your partner</Text>
                <Text style={styles.modalDesc}>How was your experience planning with this explorer?</Text>
                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((num) => (
                        <TouchableOpacity key={num} onPress={() => setSelectedScore(num)}>
                            <Ionicons name={selectedScore >= num ? "star" : "star-outline"} size={40} color={selectedScore >= num ? "#FF9100" : "#CCC"} />
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity style={styles.submitRatingBtn} onPress={submitRating} disabled={submittingRating}>
                    {submittingRating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitRatingText}>Submit & Close Trip</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowRatingModal(false)} style={styles.cancelRatingBtn}><Text style={styles.cancelRatingText}>Not yet</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  headerInfo: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#161616' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#161616', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timerText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  finishBtn: { backgroundColor: 'rgba(232, 117, 90, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  finishBtnText: { color: '#E8755A', fontWeight: '700', fontSize: 13 },
  listContent: { padding: 16, paddingBottom: 20 },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 20, marginBottom: 12 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#E8755A', borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#F2F2F2', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  myText: { color: '#FFF', fontWeight: '500' },
  theirText: { color: '#161616' },
  inputWrapper: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#FEFEFE', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.03)' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F2F2F2', borderRadius: 24, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, maxHeight: 100, paddingVertical: 8, fontSize: 15, color: '#161616' },
  sendBtn: { marginBottom: 2 },
  sendGradient: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#161616', marginBottom: 10 },
  modalDesc: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  submitRatingBtn: { width: '100%', backgroundColor: '#161616', paddingVertical: 16, borderRadius: 100, alignItems: 'center' },
  submitRatingText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  cancelRatingBtn: { marginTop: 20 },
  cancelRatingText: { color: '#666', fontSize: 14, fontWeight: '600' }
});