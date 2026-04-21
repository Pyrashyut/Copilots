// app/profile/view.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// --- Helper for the Avatar ---
const MediaAvatar = ({ uri }: { uri: string }) => {
  const isVideo = uri?.match(/\.(mp4|mov|qt)$/i);
  
  const player = useVideoPlayer(isVideo ? uri : null, player => {
    player.muted = true;
    player.loop = true;
    player.play();
  });

  return (
    <View style={styles.avatarContainer}>
      {isVideo ? (
        <VideoView
          player={player}
          style={styles.avatar}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <Image 
          source={{ uri: uri || 'https://via.placeholder.com/150' }} 
          style={styles.avatar} 
        />
      )}
    </View>
  );
};
// -----------------------------

export default function ViewProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ trips: 0, likes: 0 });
  const [loading, setLoading] = useState(true);
  const userId = params.userId as string;

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const [profileRes, tripsRes, likesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .or(`user_a.eq.${userId},user_b.eq.${userId}`)
          .eq('status', 'completed'),
        supabase
          .from('swipes')
          .select('id', { count: 'exact', head: true })
          .eq('likee_id', userId)
          .eq('is_like', true),
      ]);
      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data);
      setStats({ trips: tripsRes.count ?? 0, likes: likesRes.count ?? 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (type: 'like' | 'pass') => {
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
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
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
          
          <View style={styles.headerSection}>
            <MediaAvatar uri={profile?.photos?.[0]} />
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{profile?.username || 'Explorer'}{profile?.age ? `, ${profile.age}` : ''}</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FF9100" style={{ marginLeft: 4 }} />
              {(profile?.location_city || profile?.location) && (
                <>
                  <Text style={{ fontSize: 15, color: '#AAA', marginLeft: 4 }}> · </Text>
                  <Text style={styles.locationText}>
                    {profile.location_city
                      ? `${profile.location_city}${profile.location_country ? ', ' + profile.location_country : ''}`
                      : profile.location}
                  </Text>
                </>
              )}
            </View>
            {profile?.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
          </View>

          {/* Stats Bar */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statHeading}>
                <Ionicons name="star" size={16} color="#E8755A" />
                <Text style={styles.statValue}>5.0</Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <View style={styles.statHeading}>
                <Ionicons name="airplane" size={16} color="#E8755A" />
                <Text style={styles.statValue}>{stats.trips}</Text>
              </View>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <View style={styles.statHeading}>
                <Ionicons name="heart" size={16} color="#E8755A" />
                <Text style={styles.statValue}>{stats.likes}</Text>
              </View>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          {/* Travel Gallery */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travel Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile?.photos?.map((photo: string, i: number) => {
                 const isVideo = photo.match(/\.(mp4|mov|qt)$/i);
                 return (
                    <View key={i} style={styles.imageCard}>
                        {isVideo ? (
                             <View style={{flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center'}}>
                                <Ionicons name="videocam" size={30} color="#FFF" />
                                <Text style={{color: 'white', fontSize: 10, marginTop: 4}}>Video</Text>
                             </View>
                        ) : (
                            <Image source={{ uri: photo }} style={styles.imageThumb} resizeMode="cover" />
                        )}
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)']} style={styles.imageOverlay} />
                    </View>
                 );
              })}
            </ScrollView>
          </View>

          {/* Experience Matrix */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience Matrix</Text>
            {[
              { key: 'loved', label: 'Done & Loved', color: '#3B9F16', bg: 'rgba(59,159,22,0.08)',  iconBg: '#3B9F16', icon: 'thumbs-up',   items: (profile?.preferences?.loved ?? []) as string[] },
              { key: 'try',   label: 'Want to Try',  color: '#C89B00', bg: 'rgba(238,199,46,0.10)', iconBg: '#EEC72E', icon: 'bookmark',    items: (profile?.preferences?.try   ?? []) as string[] },
              { key: 'nope',  label: 'Not For Me',   color: '#C0392B', bg: 'rgba(224,55,36,0.08)',  iconBg: '#E03724', icon: 'thumbs-down', items: (profile?.preferences?.dislike ?? []) as string[] },
            ].map(cat => cat.items.length > 0 && (
              <View key={cat.key} style={[styles.matrixRow, { backgroundColor: cat.bg }]}>
                <View style={[styles.matrixIconBox, { backgroundColor: cat.iconBg }]}>
                  <Ionicons name={cat.icon as any} size={16} color="#FFF" />
                </View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixLabel}>{cat.label}</Text>
                  <Text style={[styles.matrixItems, { color: cat.color }]}>
                    {cat.items.slice(0, 4).join(' · ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer Actions */}
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
  
  avatarContainer: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', backgroundColor: '#F2F2F2' },
  avatar: { width: '100%', height: '100%' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameText: { fontSize: 26, fontWeight: '700', color: '#000' },
  locationText: { fontSize: 14, color: '#888' },
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
  
  matrixRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  matrixIconBox: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  matrixInfo: { flex: 1 },
  matrixLabel: {
    fontSize: 11, color: '#999', marginBottom: 3,
    textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5,
  },
  matrixItems: { fontSize: 14, fontWeight: '700' },

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