// app/(tabs)/settings.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [likedUsers, setLikedUsers] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showLikedModal, setShowLikedModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setIsVisible(profileData.is_visible ?? true);
      }

      // Fetch blocked users
      const { data: blocks } = await supabase
        .from('blocks')
        .select(`
          blocked_id,
          blocked_profile:profiles!blocks_blocked_id_fkey(username, photos)
        `)
        .eq('blocker_id', user.id);

      setBlockedUsers(blocks || []);

      // Fetch liked users
      const { data: likes } = await supabase
        .from('swipes')
        .select(`
          likee_id,
          likee_profile:profiles!swipes_likee_id_fkey(username, photos)
        `)
        .eq('liker_id', user.id)
        .eq('is_like', true);

      setLikedUsers(likes || []);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (value: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ is_visible: value })
        .eq('id', user.id);

      if (!error) {
        setIsVisible(value);
        Alert.alert('Updated', value ? 'You are now visible to others' : 'You are now hidden from discovery');
      }
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleUnblock = async (blockedId: string, username: string) => {
    Alert.alert('Unblock User', `Unblock ${username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await supabase
            .from('blocks')
            .delete()
            .eq('blocker_id', user.id)
            .eq('blocked_id', blockedId);

          fetchData();
        }
      }
    ]);
  };

  const handleUnlike = async (likeeId: string, username: string) => {
    Alert.alert('Remove Like', `Remove ${username} from liked?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await supabase
            .from('swipes')
            .delete()
            .eq('liker_id', user.id)
            .eq('likee_id', likeeId);

          fetchData();
        }
      }
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        }
      }
    ]);
  };

  return (
    <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/profile/edit')}
            activeOpacity={0.8}
          >
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="person-outline" size={20} color={Colors.primary.navy} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Edit Profile</Text>
                <Text style={styles.cardSubtitle}>Update your photos and info</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral.grey} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="eye-outline" size={20} color={Colors.primary.navy} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Visible to Others</Text>
                <Text style={styles.cardSubtitle}>
                  {isVisible ? 'Others can see your profile' : 'Hidden from discovery'}
                </Text>
              </View>
              <Switch
                value={isVisible}
                onValueChange={toggleVisibility}
                trackColor={{ false: Colors.neutral.greyLight, true: Colors.secondary.teal }}
                thumbColor={Colors.neutral.white}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => setShowBlockedModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="ban-outline" size={20} color={Colors.highlight.error} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Blocked Users</Text>
                <Text style={styles.cardSubtitle}>{blockedUsers.length} blocked</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral.grey} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          
          <TouchableOpacity 
            style={styles.card}
            onPress={() => setShowLikedModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="heart-outline" size={20} color={Colors.highlight.error} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>People You Liked</Text>
                <Text style={styles.cardSubtitle}>{likedUsers.length} liked</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral.grey} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.card}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 71, 87, 0.1)' }]}>
                <Ionicons name="log-out-outline" size={20} color={Colors.highlight.error} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: Colors.highlight.error }]}>Sign Out</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Blocked Users Modal */}
      <Modal visible={showBlockedModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Blocked Users</Text>
              <TouchableOpacity onPress={() => setShowBlockedModal(false)}>
                <Ionicons name="close" size={28} color={Colors.primary.navy} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {blockedUsers.length === 0 ? (
                <Text style={styles.emptyText}>No blocked users</Text>
              ) : (
                blockedUsers.map((block) => (
                  <View key={block.blocked_id} style={styles.userCard}>
                    <Image 
                      source={{ uri: block.blocked_profile?.photos?.[0] || 'https://via.placeholder.com/50' }}
                      style={styles.userAvatar}
                    />
                    <Text style={styles.userName}>{block.blocked_profile?.username}</Text>
                    <TouchableOpacity
                      style={styles.unblockBtn}
                      onPress={() => handleUnblock(block.blocked_id, block.blocked_profile?.username)}
                    >
                      <Text style={styles.unblockText}>Unblock</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Liked Users Modal */}
      <Modal visible={showLikedModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>People You Liked</Text>
              <TouchableOpacity onPress={() => setShowLikedModal(false)}>
                <Ionicons name="close" size={28} color={Colors.primary.navy} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {likedUsers.length === 0 ? (
                <Text style={styles.emptyText}>No likes yet</Text>
              ) : (
                likedUsers.map((like) => (
                  <View key={like.likee_id} style={styles.userCard}>
                    <TouchableOpacity 
                      onPress={() => {
                        setShowLikedModal(false);
                        router.push({ pathname: '/profile/view', params: { userId: like.likee_id } });
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    >
                      <Image 
                        source={{ uri: like.likee_profile?.photos?.[0] || 'https://via.placeholder.com/50' }}
                        style={styles.userAvatar}
                      />
                      <Text style={styles.userName}>{like.likee_profile?.username}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.unlikeBtn}
                      onPress={() => handleUnlike(like.likee_id, like.likee_profile?.username)}
                    >
                      <Ionicons name="heart-dislike" size={20} color={Colors.neutral.white} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: Colors.primary.navy },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.neutral.grey, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral.trailDust,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.primary.navy, marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: Colors.neutral.grey },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: Colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.primary.navy },
  modalContent: { padding: 20 },
  emptyText: { textAlign: 'center', color: Colors.neutral.grey, fontSize: 15, paddingVertical: 40 },
  
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.trailDust,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.neutral.border, marginRight: 12 },
  userName: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.primary.navy },
  unblockBtn: {
    backgroundColor: Colors.secondary.teal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unblockText: { color: Colors.neutral.white, fontWeight: '600', fontSize: 14 },
  unlikeBtn: {
    backgroundColor: Colors.highlight.error,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});