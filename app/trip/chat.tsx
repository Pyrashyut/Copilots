// app/trip/chat.tsx
// Vibe Check: 5-minute timed chat window. Opens after both users pay deposit.
// After 5 minutes, chat is locked and trip is finalised.
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

const VIBE_CHECK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Explorer');
  
  // Timer state
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [chatNotStarted, setChatNotStarted] = useState(false);
  
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedScore, setSelectedScore] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bookingId = params.bookingId as string;

  useEffect(() => {
    initChat();

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
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = (startedAt: string) => {
    const tick = () => {
      const startTime = new Date(startedAt).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = VIBE_CHECK_DURATION_MS - elapsed;

      if (remaining <= 0) {
        setSecondsLeft(0);
        setIsExpired(true);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setSecondsLeft(Math.ceil(remaining / 1000));
      }
    };

    tick(); // run immediately
    timerRef.current = setInterval(tick, 1000);
  };

  const initChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: booking } = await supabase
      .from('bookings')
      .select('user_a, user_b, chat_started_at, status')
      .eq('id', bookingId)
      .single();
    
    if (booking) {
      const pId = booking.user_a === user.id ? booking.user_b : booking.user_a;
      setPartnerId(pId);

      // Fetch partner name
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', pId)
        .single();
      if (partnerProfile?.username) setPartnerName(partnerProfile.username);

      if (!booking.chat_started_at) {
        // Chat hasn't started yet — set it now (first person to open starts the clock)
        const now = new Date().toISOString();
        await supabase.from('bookings').update({ chat_started_at: now }).eq('id', bookingId);
        startCountdown(now);
      } else {
        // Clock already running — check if still valid
        const elapsed = Date.now() - new Date(booking.chat_started_at).getTime();
        if (elapsed >= VIBE_CHECK_DURATION_MS) {
          setIsExpired(true);
          setSecondsLeft(0);
        } else {
          startCountdown(booking.chat_started_at);
        }
      }
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

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (secondsLeft === null) return '#161616';
    if (secondsLeft <= 30) return '#E03724';
    if (secondsLeft <= 60) return '#EEC72E';
    return '#161616';
  };

  const sendMessage = async () => {
    if (isExpired) return Alert.alert("Vibe Check Ended", "The 5-minute window has closed. Complete your trip!");
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
      const { error: ratingError } = await supabase.from('ratings').insert({
        rater_id: userId,
        ratee_id: partnerId,
        booking_id: bookingId,
        score: selectedScore
      });
      if (ratingError) throw ratingError;

      const { error: statusError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);
      if (statusError) throw statusError;

      Alert.alert("Trip Finalised! ✅", "Your rating was submitted. Enjoy your adventure!");
      setShowRatingModal(false);
      router.replace('/(tabs)/trips');
    } catch (e: any) {
      Alert.alert("Error", "Could not complete trip: " + e.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  const timerLabel = isExpired 
    ? 'Time Up' 
    : secondsLeft !== null 
      ? formatTime(secondsLeft) 
      : '5:00';

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Vibe Check with {partnerName}</Text>
            <View style={[styles.timerBadge, { backgroundColor: getTimerColor() }, isExpired && { backgroundColor: '#E03724' }]}>
              <Ionicons name="timer-outline" size={13} color="#FFF" />
              <Text style={styles.timerText}>{timerLabel}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowRatingModal(true)} style={styles.finishBtn}>
            <Text style={styles.finishBtnText}>End Trip</Text>
          </TouchableOpacity>
        </View>

        {/* Expired Banner */}
        {isExpired && (
          <View style={styles.expiredBanner}>
            <Ionicons name="lock-closed" size={16} color="#FFF" />
            <Text style={styles.expiredText}>Vibe Check ended — time to meet in person! Rate your experience below.</Text>
          </View>
        )}

        {/* Info banner when active */}
        {!isExpired && secondsLeft !== null && secondsLeft > 0 && messages.length === 0 && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#E8755A" />
            <Text style={styles.infoText}>You have 5 minutes to connect before your adventure begins.</Text>
          </View>
        )}

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatEmoji}>👋</Text>
                <Text style={styles.emptyChatText}>Say hello! You have 5 minutes.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === userId;
              return (
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                  <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>{item.content}</Text>
                </View>
              );
            }}
          />

          {isExpired ? (
            <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <TouchableOpacity style={styles.rateNowBtn} onPress={() => setShowRatingModal(true)}>
                <Ionicons name="star" size={18} color="#FFF" />
                <Text style={styles.rateNowText}>Rate Your Experience & Finalise Trip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <View style={styles.inputContainer}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Say something..." 
                  value={newMessage} 
                  onChangeText={setNewMessage} 
                  multiline 
                  editable={!isExpired}
                />
                <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={!newMessage.trim() || isExpired}>
                  <LinearGradient colors={['#E8755A', '#CA573D']} style={styles.sendGradient}>
                    <Ionicons name="arrow-up" size={20} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate your experience</Text>
            <Text style={styles.modalDesc}>How was your Vibe Check with {partnerName}?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity key={num} onPress={() => setSelectedScore(num)}>
                  <Ionicons name={selectedScore >= num ? "star" : "star-outline"} size={40} color={selectedScore >= num ? "#FF9100" : "#CCC"} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.submitRatingBtn} onPress={submitRating} disabled={submittingRating}>
              {submittingRating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitRatingText}>Submit & Finalise Trip</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRatingModal(false)} style={styles.cancelRatingBtn}>
              <Text style={styles.cancelRatingText}>Not yet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  headerInfo: { alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#161616' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timerText: { color: '#FFF', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  finishBtn: { backgroundColor: 'rgba(232, 117, 90, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  finishBtnText: { color: '#E8755A', fontWeight: '700', fontSize: 13 },
  expiredBanner: { backgroundColor: '#E03724', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  expiredText: { color: '#FFF', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  infoBanner: { backgroundColor: 'rgba(232, 117, 90, 0.08)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  infoText: { color: '#E8755A', fontSize: 13, fontWeight: '500', flex: 1 },
  listContent: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyChatEmoji: { fontSize: 40 },
  emptyChatText: { fontSize: 16, color: '#999', fontWeight: '500' },
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
  rateNowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E8755A', paddingVertical: 16, borderRadius: 24, marginBottom: 8 },
  rateNowText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#161616', marginBottom: 10 },
  modalDesc: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  submitRatingBtn: { width: '100%', backgroundColor: '#E8755A', paddingVertical: 16, borderRadius: 100, alignItems: 'center' },
  submitRatingText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  cancelRatingBtn: { marginTop: 20 },
  cancelRatingText: { color: '#666', fontSize: 14, fontWeight: '600' }
});