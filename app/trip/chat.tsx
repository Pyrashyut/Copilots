import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertButton, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>("Loading...");
  const [userId, setUserId] = useState<string | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const bookingId = params.bookingId as string;

  useEffect(() => {
    initChat();
    const interval = setInterval(updateTimer, 60000); 
    
    const channel = supabase.channel(`chat_room:${bookingId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`
      }, 
      (payload) => {
        handleRealtimeEvent(payload);
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const initChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: bookingData } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    setBooking(bookingData);
    updateTimer(bookingData);

    let clearedAt = null;
    if (bookingData) {
      if (user.id === bookingData.user_a) clearedAt = bookingData.user_a_cleared_at;
      if (user.id === bookingData.user_b) clearedAt = bookingData.user_b_cleared_at;
    }

    let query = supabase.from('messages').select('*').eq('booking_id', bookingId).order('created_at', { ascending: true });
    if (clearedAt) query = query.gt('created_at', clearedAt);

    const { data: msgs } = await query;

    if (msgs) {
      const visibleMsgs = msgs.filter(m => !m.hidden_by || !m.hidden_by.includes(user.id));
      setMessages(visibleMsgs);
    }
  };

  const handleRealtimeEvent = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      setMessages(prev => {
        if (prev.find(m => m.id === payload.new.id)) return prev;
        return [...prev, payload.new];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } 
    else if (payload.eventType === 'DELETE') {
      // Remove message if ID matches payload.old.id
      if (payload.old && payload.old.id) {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      }
    }
    else if (payload.eventType === 'UPDATE') {
      // Handle "Hidden By" updates
      if (userId && payload.new.hidden_by && payload.new.hidden_by.includes(userId)) {
        setMessages(prev => prev.filter(m => m.id !== payload.new.id));
      }
    }
  };

  const updateTimer = (manualBookingData?: any) => {
    const b = manualBookingData || booking;
    if (b?.chat_started_at) {
      const start = new Date(b.chat_started_at).getTime();
      const now = new Date().getTime();
      const diff = (start + 24 * 60 * 60 * 1000) - now;
      
      if (diff <= 0) {
        setTimeLeft("Expired");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId) return;
    const text = newMessage.trim();
    setNewMessage('');
    
    // Optimistic Append (Optional, but Realtime is usually fast enough for sending)
    const { error } = await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: userId,
      content: text
    });

    if (error) {
      Alert.alert("Error", "Failed to send");
      setNewMessage(text);
    }
  };

  const handleMessageLongPress = (msg: any) => {
  const isMe = msg.sender_id === userId;

  const buttons: AlertButton[] = [
    {
      text: "Cancel",
      style: "cancel",
    },
  ];

  if (isMe) {
    buttons.push({
      text: "Unsend (Everyone)",
      style: "destructive",
      onPress: () => {
        void deleteMessage(msg.id, "everyone");
      },
    });
  }

  buttons.push({
    text: "Delete (For Me)",
    style: "default",
    onPress: () => {
      void deleteMessage(msg.id, "me", msg.hidden_by);
    },
  });

  Alert.alert(
    "Message Options",
    isMe ? "Choose an action" : "Manage this message",
    buttons
  );
};

  // --- FIXED DELETE LOGIC ---
  const deleteMessage = async (msgId: number, type: 'everyone' | 'me', currentHiddenBy?: string[]) => {
    // 1. OPTIMISTIC UPDATE: Remove from screen immediately
    setMessages(prev => prev.filter(m => m.id !== msgId));

    // 2. Perform Database Action
    if (type === 'everyone') {
      const { error } = await supabase.from('messages').delete().eq('id', msgId);
      if (error) {
        console.error("Delete failed:", error);
        // Ideally revert optimistic update here if needed, but rarely fails
      }
    } else {
      const newHidden = currentHiddenBy ? [...currentHiddenBy, userId] : [userId];
      await supabase
        .from('messages')
        .update({ hidden_by: newHidden })
        .eq('id', msgId);
    }
  };

  const handleClearChat = async () => {
    Alert.alert("Clear Chat?", "This will hide current history for you.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        // Optimistic Clear
        setMessages([]);
        setShowMenu(false);

        const field = booking.user_a === userId ? 'user_a_cleared_at' : 'user_b_cleared_at';
        await supabase
          .from('bookings')
          .update({ [field]: new Date().toISOString() })
          .eq('id', bookingId);
      }}
    ]);
  };

  return (
    <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.container}>
      <SafeAreaView style={{flex: 1}} edges={['top']}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary.navy} />
          </TouchableOpacity>
          
          <View style={styles.timerBadge}>
             <Ionicons name="time" size={16} color="white" />
             <Text style={styles.timerText}>{timeLeft}</Text>
          </View>
          
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={24} color={Colors.primary.navy} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{padding: 15}}
          renderItem={({ item }) => {
            const isMe = item.sender_id === userId;
            return (
              <TouchableOpacity onLongPress={() => handleMessageLongPress(item)} activeOpacity={0.8}>
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                  <Text style={isMe ? styles.myText : styles.theirText}>{item.content}</Text>
                </View>
                {isMe && <Text style={styles.seenText}>Sent</Text>}
              </TouchableOpacity>
            );
          }}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={10}>
          <View style={styles.inputArea}>
            <TextInput 
              style={styles.input} 
              placeholder="Type a message..." 
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={!newMessage.trim()}>
              <Ionicons name="send" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <Modal transparent visible={showMenu} animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
                <Ionicons name="trash-outline" size={20} color={Colors.highlight.error} />
                <Text style={styles.menuTextDestructive}>Clear Chat</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => { Alert.alert("Reported", "User has been flagged."); setShowMenu(false); }}>
                <Ionicons name="flag-outline" size={20} color={Colors.primary.navy} />
                <Text style={styles.menuText}>Report User</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                <Text style={styles.menuText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: 'rgba(255,255,255,0.9)' },
  iconBtn: { padding: 5 },
  timerBadge: { flexDirection: 'row', backgroundColor: Colors.highlight.warning, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, gap: 5, alignItems: 'center' },
  timerText: { color: 'white', fontWeight: 'bold' },
  
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 2 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary.navy, borderBottomRightRadius: 2 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', borderBottomLeftRadius: 2 },
  myText: { color: 'white' },
  theirText: { color: Colors.primary.navy },
  seenText: { alignSelf: 'flex-end', fontSize: 10, color: '#999', marginBottom: 10, marginRight: 5 },
  
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { width: '80%', backgroundColor: 'white', borderRadius: 15, padding: 10, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 15 },
  menuText: { fontSize: 16, fontWeight: '600', color: Colors.primary.navy },
  menuTextDestructive: { fontSize: 16, fontWeight: '600', color: Colors.highlight.error },
  divider: { height: 1, backgroundColor: '#eee' }
});