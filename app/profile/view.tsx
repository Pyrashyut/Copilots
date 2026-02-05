// app/profile/view.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function ViewProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const userId = params.userId as string;

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (type: 'like' | 'pass') => {
    // Note: You can add actual DB logic for liking here later
    Alert.alert(
      type === 'like' ? "Liked! ❤️" : "Passed", 
      `You ${type === 'like' ? 'liked' : 'passed on'} ${profile?.username || 'this user'}.`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>
  );

  return (
    <View style={styles.container}>
      {/* Figma Blur Backgrounds */}
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* AppBar */}
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Explorer Profile</Text>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="flag-outline" size={22} color="#000" />
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
              <Text style={styles.nameText}>{profile?.username || 'Explorer'}, {profile?.age || '24'}</Text>
              <Ionicons name="checkmark-circle" size={22} color="#FF9100" />
            </View>
            <Text style={styles.locationText}>{profile?.location || 'London, UK'}</Text>
            <Text style={styles.bioText}>{profile?.bio || "Adventurer at heart. Looking for someone to explore hidden gems with."}</Text>
          </View>

          {/* Stats Bar (FIXED: Changed div to View) */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statHeading}>
                <Ionicons name="star" size={16} color="#FF9100" />
                <Text style={styles.statValue}>4.9</Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statBox}>
              <View style={styles.statHeading}>
                <Ionicons name="airplane" size={16} color="#FF9100" />
                <Text style={styles.statValue}>8</Text>
              </View>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statBox}>
              <View style={styles.statHeading}>
                <Ionicons name="heart" size={16} color="#FF9100" />
                <Text style={styles.statValue}>128</Text>
              </View>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          {/* Travel Gallery */}
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

          {/* Experience Matrix */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience Matrix</Text>
            <View style={styles.matrixRow}>
              {/* Loved */}
              <View style={[styles.matrixCard, styles.matrixLoved]}>
                <View style={[styles.matrixIconBox, { backgroundColor: '#3B9F16' }]}>
                  <Ionicons name="thumbs-up" size={14} color="#FFF" />
                </View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixLabel}>Done & Loved</Text>
                  <Text style={styles.matrixItems}>🧗 Climbing • 🍕 Food Tours</Text>
                </View>
              </View>

              {/* Want to Try */}
              <View style={[styles.matrixCard, styles.matrixTry]}>
                <View style={[styles.matrixIconBox, { backgroundColor: '#EEC72E' }]}>
                  <Ionicons name="list" size={14} color="#000" />
                </View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixLabel}>Want to Try</Text>
                  <Text style={styles.matrixItems}>🛶 Kayaking • 🌌 Stargazing</Text>
                </View>
              </View>

              {/* Not For Me */}
              <View style={[styles.matrixCard, styles.matrixDislike]}>
                <View style={[styles.matrixIconBox, { backgroundColor: '#E03724' }]}>
                  <Ionicons name="thumbs-down" size={14} color="#FFF" />
                </View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixLabel}>Not For Me</Text>
                  <Text style={styles.matrixItems}>🏨 All-Inclusive Resorts</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom spacer for fixed buttons */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Floating Action Buttons */}
        <View style={styles.footerActions}>
          <TouchableOpacity 
            style={styles.passBtn} 
            onPress={() => handleAction('pass')}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.likeBtn} 
            onPress={() => handleAction('like')}
            activeOpacity={0.9}
          >
            <LinearGradient 
              colors={['#E8755A', '#CA573D']} 
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 0}}
              style={styles.likeGradient}
            >
              <Ionicons name="heart" size={28} color="#FFF" />
              <Text style={styles.likeBtnText}>Connect</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  blurPath: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.4 },
  blurCoral: { top: '15%', left: -80, backgroundColor: 'rgba(255, 122, 73, 0.08)' },
  blurYellow: { top: -50, right: -50, backgroundColor: 'rgba(255, 243, 73, 0.08)' },

  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  appBarTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 10 },
  headerSection: { alignItems: 'center', gap: 8, marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F2F2F2' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { fontSize: 26, fontWeight: '700', color: '#000' },
  locationText: { fontSize: 15, color: '#000', opacity: 0.6 },
  bioText: { fontSize: 15, color: '#000', opacity: 0.8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },

  statsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#F7F7F7', 
    borderRadius: 20, 
    paddingVertical: 18, 
    paddingHorizontal: 10 
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#000' },
  statLabel: { fontSize: 12, color: '#000', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.08)' },

  section: { marginTop: 32, gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#000' },

  imageCard: { width: 150, height: 210, borderRadius: 20, marginRight: 12, overflow: 'hidden', backgroundColor: '#F2F2F2' },
  imageThumb: { ...StyleSheet.absoluteFillObject },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  imageTag: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  imageTagText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  matrixRow: { gap: 12 },
  matrixCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  matrixLoved: { backgroundColor: 'rgba(59, 159, 22, 0.08)' },
  matrixTry: { backgroundColor: 'rgba(238, 199, 46, 0.08)' },
  matrixDislike: { backgroundColor: 'rgba(224, 55, 36, 0.08)' },
  matrixIconBox: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  matrixInfo: { marginLeft: 15, flex: 1 },
  matrixLabel: { fontSize: 11, color: '#000', opacity: 0.5, marginBottom: 2, textTransform: 'uppercase', fontWeight: '600' },
  matrixItems: { fontSize: 14, fontWeight: '700', color: '#161616' },

  footerActions: { 
    position: 'absolute', 
    bottom: 30, 
    left: 20, 
    right: 20, 
    flexDirection: 'row', 
    gap: 12 
  },
  passBtn: { 
    width: 64, 
    height: 64, 
    backgroundColor: '#161616', 
    borderRadius: 32, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  likeBtn: { 
    flex: 1, 
    height: 64, 
    borderRadius: 32, 
    overflow: 'hidden',
    shadowColor: '#E8755A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  likeGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  likeBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' }
});