import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertButton,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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

    const channel = supabase
      .channel(`chat_room:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          handleRealtimeEvent(payload);
        }
      )
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

    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    setBooking(bookingData);
    updateTimer(bookingData);

    let clearedAt = null;
    if (bookingData) {
      if (user.id === bookingData.user_a) clearedAt = bookingData.user_a_cleared_at;
      if (user.id === bookingData.user_b) clearedAt = bookingData.user_b_cleared_at;
    }

    let query = supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (clearedAt) {
      query = query.gt('created_at', clearedAt);
    }

    const { data: msgs } = await query;
    if (msgs) {
      const visibleMsgs = msgs.filter(
        (m) => !m.hidden_by || !m.hidden_by.includes(user.id)
      );
      setMessages(visibleMsgs);
    }
  };

  const handleRealtimeEvent = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      setMessages((prev) => {
        if (prev.find((m) => m.id === payload.new.id)) return prev;
        return [...prev, payload.new];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } else if (payload.eventType === 'DELETE') {
      if (payload.old && payload.old.id) {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      }
    } else if (payload.eventType === 'UPDATE') {
      if (userId && payload.new.hidden_by?.includes(userId)) {
        setMessages((prev) => prev.filter((m) => m.id !== payload.new.id));
      }
    }
  };

  const updateTimer = (manualBookingData?: any) => {
    const b = manualBookingData || booking;
    if (b?.chat_started_at) {
      const start = new Date(b.chat_started_at).getTime();
      const now = new Date().getTime();
      const diff = start + 24 * 60 * 60 * 1000 - now;

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

    const { error } = await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: userId,
      content: text,
    });

    if (error) {
      Alert.alert("Error", "Failed to send");
      setNewMessage(text);
    }
  };

  const handleMessageLongPress = (msg: any) => {
    const isMe = msg.sender_id === userId;
    const buttons: AlertButton[] = [
      { text: "Cancel", style: "cancel" },
    ];

    if (isMe) {
      buttons.push({
        text: "Unsend (Everyone)",
        style: "destructive",
        onPress: () => void deleteMessage(msg.id, "everyone"),
      });
    }

    buttons.push({
      text: "Delete (For Me)",
      style: "default",
      onPress: () => void deleteMessage(msg.id, "me", msg.hidden_by),
    });

    Alert.alert("Message Options", isMe ? "Choose an action" : "Manage this message", buttons);
  };

  const deleteMessage = async (msgId: number, type: 'everyone' | 'me', currentHiddenBy?: string[]) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));

    if (type === 'everyone') {
      const { error } = await supabase.from('messages').delete().eq('id', msgId);
      if (error) console.error("Delete failed:", error);
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
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          setMessages([]);
          setShowMenu(false);
          const field = booking.user_a === userId ? 'user_a_cleared_at' : 'user_b_cleared_at';
          await supabase
            .from('bookings')
            .update({ [field]: new Date().toISOString() })
            .eq('id', bookingId);
        },
      },
    ]);
  };

  return (
    <LinearGradient
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]}
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      {/* Decorative Background Elements */}
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>

          <View style={styles.timerBadge}>
            <Ionicons name="time" size={16} color="white" />
            <Text style={styles.timerText}>{timeLeft}</Text>
          </View>

          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
                <TouchableOpacity
                  onLongPress={() => handleMessageLongPress(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                    <Text style={isMe ? styles.myText : styles.theirText}>{item.content}</Text>
                  </View>
                  {isMe && <Text style={styles.seenText}>Sent</Text>}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.neutral.greyLight}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
              disabled={!newMessage.trim()}
            >
              <Ionicons name="send" size={20} color="white" />
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
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  Alert.alert("Reported", "User has been flagged.");
                  setShowMenu(false);
                }}
              >
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  iconBtn: {
    padding: 6,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    backgroundColor: Colors.highlight.warning,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    alignItems: 'center',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  timerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },

  listContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 120,           // ← key fix: prevents last message being hidden under input
  },

  bubble: {
    maxWidth: '80%',
    padding: 13,
    borderRadius: 20,
    marginBottom: 4,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary.navy,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderBottomLeftRadius: 4,
  },
  myText: { color: 'white', fontSize: 16 },
  theirText: { color: Colors.primary.navy, fontSize: 16 },
  seenText: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
    marginRight: 8,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,  // ← extra bottom padding (iOS home indicator)
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(220,220,230,0.6)',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fc',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 10,
    maxHeight: 120,
    fontSize: 16,
    color: Colors.primary.navy,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#a0a0c0',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '82%',
    backgroundColor: 'white',
    borderRadius: 18,
    paddingVertical: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.navy,
  },
  menuTextDestructive: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.highlight.error,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 20,
  },
});