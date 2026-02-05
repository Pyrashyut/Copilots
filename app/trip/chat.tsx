// app/trip/chat.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  const [timeLeft, setTimeLeft] = useState('24h 00m');
  const [isExpired, setIsExpired] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const bookingId = params.bookingId as string;

  useEffect(() => {
    initChat();
    const timerInterval = setInterval(updateTimer, 60000); // Update every minute
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
      const difference = (startTime + 24 * 60 * 60 * 1000) - now; // 24 Hours

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
    if (isExpired) return Alert.alert("Time Expired", "The 24-hour chat window has closed.");
    if (!newMessage.trim() || !userId) return;
    const text = newMessage;
    setNewMessage('');
    await supabase.from('messages').insert({ booking_id: bookingId, sender_id: userId, content: text });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={24} color="#000" /></TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Vibe Check</Text>
            <View style={[styles.timerBadge, isExpired && { backgroundColor: '#E03724' }]}>
                <Ionicons name="time" size={14} color="#FFF" />
                <Text style={styles.timerText}>{timeLeft}</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
  sendGradient: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }
});