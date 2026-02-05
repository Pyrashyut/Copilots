// app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    } catch (err) {
      console.error("Profile Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* AppBar */}
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => router.push('/profile/edit' as any)}>
            <Ionicons name="create-outline" size={24} color="#161616" />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => router.push('/settings' as any)}>
            <Ionicons name="settings-outline" size={24} color="#161616" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Image 
              source={{ uri: profile?.photos?.[0] || 'https://via.placeholder.com/150' }} 
              style={styles.avatar} 
            />
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{profile?.username || 'User'}, {profile?.age || '20'}</Text>
              <Ionicons name="checkmark-circle" size={22} color="#FF9100" />
            </View>
            <Text style={styles.locationText}>{profile?.location || 'Add Location'}</Text>
            <Text style={styles.bioText}>{profile?.bio || 'No bio yet.'}</Text>
          </View>

          {/* Stats Detail Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statHeading}>
                <Ionicons name="star" size={16} color="#FF9100" />
                <Text style={styles.statValue}>4.8</Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <View style={styles.statHeading}>
                <Ionicons name="airplane" size={16} color="#FF9100" />
                <Text style={styles.statValue}>0</Text>
              </View>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <View style={styles.statHeading}>
                <Ionicons name="heart" size={16} color="#FF9100" />
                <Text style={styles.statValue}>0</Text>
              </View>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          {/* Travel Gallery Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travel Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile?.photos?.map((photo: string, i: number) => (
                <View key={i} style={styles.imageCard}>
                  <Image source={{ uri: photo }} style={styles.imageThumb} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)']} style={styles.imageOverlay} />
                  <View style={styles.imageTag}>
                    <Text style={styles.imageTagText}>{i + 1}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Experience Matrix Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience Matrix</Text>
            <View style={styles.matrixRow}>
              
              {/* Category 1: Loved */}
              <View style={[styles.matrixCard, styles.matrixLoved]}>
                <View style={[styles.matrixIconBox, { backgroundColor: '#3B9F16' }]}>
                  <Ionicons name="thumbs-up" size={14} color="#FFF" />
                </View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixLabel}>Done & Loved</Text>
                  <Text style={styles.matrixItems}>
                    {profile?.preferences?.loved?.length > 0 ? profile.preferences.loved.join(' • ') : 'None yet'}
                  </Text>
                </View>
              </View>

              {/* Category 2: Want to Try */}
              <View style={[styles.matrixCard, styles.matrixTry]}>
                <View style={[styles.matrixIconBox, { backgroundColor: '#EEC72E' }]}>
                  <Ionicons name="list" size={14} color="#161616" />
                </View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixLabel}>Want to Try</Text>
                  <Text style={styles.matrixItems}>
                    {profile?.preferences?.try?.length > 0 ? profile.preferences.try.join(' • ') : 'None yet'}
                  </Text>
                </View>
              </View>

              {/* Category 3: Not For Me (FIXED: Added this block) */}
              <View style={[styles.matrixCard, styles.matrixDislike]}>
                <View style={[styles.matrixIconBox, { backgroundColor: '#E03724' }]}>
                  <Ionicons name="thumbs-down" size={14} color="#FFF" />
                </View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixLabel}>Not For Me</Text>
                  <Text style={styles.matrixItems}>
                    {profile?.preferences?.dislike?.length > 0 ? profile.preferences.dislike.join(' • ') : 'None yet'}
                  </Text>
                </View>
              </View>

            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  appBarTitle: { fontSize: 18, fontWeight: '700', color: '#161616' },
  scrollContent: { paddingHorizontal: 16 },

  headerSection: { alignItems: 'center', gap: 8, marginBottom: 24, marginTop: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F2F2F2' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { fontSize: 24, fontWeight: '700', color: '#161616' },
  locationText: { fontSize: 14, color: '#161616', opacity: 0.6 },
  bioText: { fontSize: 14, color: '#161616', opacity: 0.8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },

  statsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    paddingHorizontal: 10
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statHeading: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#161616' },
  statLabel: { fontSize: 13, color: '#161616', opacity: 0.5 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.04)' },

  section: { marginTop: 28, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#161616' },

  imageCard: { width: 130, height: 180, borderRadius: 16, marginRight: 10, overflow: 'hidden', backgroundColor: '#F2F2F2' },
  imageThumb: { ...StyleSheet.absoluteFillObject },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  imageTag: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  imageTagText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  matrixRow: { gap: 10 },
  matrixCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  matrixLoved: { backgroundColor: 'rgba(59, 159, 22, 0.08)' },
  matrixTry: { backgroundColor: 'rgba(238, 199, 46, 0.08)' },
  matrixDislike: { backgroundColor: 'rgba(224, 55, 36, 0.08)' },
  matrixIconBox: { width: 34, height: 34, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  matrixInfo: { marginLeft: 15, flex: 1 },
  matrixLabel: { fontSize: 11, opacity: 0.5, marginBottom: 2, textTransform: 'uppercase', fontWeight: '600' },
  matrixItems: { fontSize: 13, fontWeight: '700', color: '#161616' },
});