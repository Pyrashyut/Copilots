// app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

// --- HELPER: Video Avatar ---
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
        <VideoView player={player} style={styles.avatar} contentFit="cover" nativeControls={false} />
      ) : (
        <Image source={{ uri: uri || 'https://via.placeholder.com/150' }} style={styles.avatar} />
      )}
    </View>
  );
};

// --- HELPER: Gallery Item ---
const GalleryItem = ({ uri, index, onPress }: { uri: string; index: number; onPress: () => void }) => {
    const isVideo = uri.match(/\.(mp4|mov|qt)$/i);
    const player = useVideoPlayer(isVideo ? uri : null, player => {
        player.muted = true;
        player.loop = false;
        player.pause();
    });

    return (
        <TouchableOpacity style={styles.imageCard} onPress={onPress} activeOpacity={0.8}>
            {isVideo ? (
                <View style={styles.mediaContainer}>
                    <VideoView player={player} style={styles.imageThumb} contentFit="cover" nativeControls={false} />
                    <View style={styles.playOverlay}>
                        <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.8)" />
                    </View>
                </View>
            ) : (
                <Image source={{ uri }} style={styles.imageThumb} resizeMode="cover" />
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)']} style={styles.imageOverlay} />
        </TouchableOpacity>
    );
};

// --- HELPER: Full Screen Viewer (FIXED HOOKS) ---
const FullScreenViewer = ({ visible, uri, onClose }: { visible: boolean; uri: string | null; onClose: () => void }) => {
    const insets = useSafeAreaInsets();
    const isVideo = uri ? !!uri.match(/\.(mp4|mov|qt)$/i) : false;
    const player = useVideoPlayer(isVideo ? uri : null, player => {
        player.loop = true;
    });

    useEffect(() => {
        if (visible && isVideo) {
            player.play();
        } else {
            player.pause();
        }
    }, [visible, isVideo, player]);

    if (!visible || !uri) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.fsContainer}>
                <TouchableOpacity style={[styles.fsCloseBtn, { top: insets.top + 10 }]} onPress={onClose}>
                    <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                {isVideo ? (
                    <VideoView player={player} style={styles.fsMedia} contentFit="contain" nativeControls />
                ) : (
                    <Image source={{ uri }} style={styles.fsMedia} resizeMode="contain" />
                )}
            </View>
        </Modal>
    );
};

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [avgRating, setAvgRating] = useState<string>('0.0');
  const [loading, setLoading] = useState(true);
  const [fullScreenMedia, setFullScreenMedia] = useState<string | null>(null);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      const { data: ratingData } = await supabase.from('ratings').select('score').eq('ratee_id', user.id);
      if (ratingData && ratingData.length > 0) {
        const sum = ratingData.reduce((acc, curr) => acc + curr.score, 0);
        setAvgRating((sum / ratingData.length).toFixed(1));
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchProfileData(); }, []));

  // --- LOGIC: Check if Experience Matrix is filled ---
  const isMatrixEmpty = !profile?.preferences || 
    ((profile.preferences.loved?.length || 0) === 0 && 
     (profile.preferences.try?.length || 0) === 0 && 
     (profile.preferences.dislike?.length || 0) === 0);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* AppBar */}
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => router.push('/profile/edit')}>
            <Ionicons name="create-outline" size={24} color="#161616" />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
            <Ionicons name="settings-outline" size={24} color="#161616" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* MATRIX COMPLETION NUDGE */}
          {isMatrixEmpty && (
            <TouchableOpacity 
                style={styles.nudgeCard} 
                onPress={() => router.push('/profile/edit')}
            >
                <LinearGradient 
                    colors={['#E8755A', '#CA573D']} 
                    start={{x:0, y:0}} end={{x:1, y:0}} 
                    style={styles.nudgeGradient}
                >
                    <View style={{flex: 1}}>
                        <Text style={styles.nudgeTitle}>Find Better Matches</Text>
                        <Text style={styles.nudgeDesc}>Complete your Experience Matrix to see compatibility scores.</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={32} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={styles.headerSection}>
            <TouchableOpacity onPress={() => setFullScreenMedia(profile?.photos?.[0])}>
                <MediaAvatar uri={profile?.photos?.[0]} />
            </TouchableOpacity>

            {/* DIRECT EDIT BUTTON */}
            <TouchableOpacity style={styles.manageBtn} onPress={() => router.push('/profile/edit')}>
                <Ionicons name="images-outline" size={14} color="#FFF" />
                <Text style={styles.manageBtnText}>Manage Photos</Text>
            </TouchableOpacity>
            
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
              <View style={styles.statHeading}><Ionicons name="star" size={16} color="#FF9100" /><Text style={styles.statValue}>{avgRating}</Text></View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <View style={styles.statHeading}><Ionicons name="airplane" size={16} color="#FF9100" /><Text style={styles.statValue}>0</Text></View>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <View style={styles.statHeading}><Ionicons name="heart" size={16} color="#FF9100" /><Text style={styles.statValue}>0</Text></View>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          {/* Travel Gallery */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travel Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile?.photos?.map((photo: string, i: number) => (
                 <GalleryItem 
                    key={i} 
                    uri={photo} 
                    index={i} 
                    onPress={() => setFullScreenMedia(photo)} 
                 />
              ))}
              {(!profile?.photos || profile.photos.length === 0) && (
                <Text style={styles.emptyText}>No photos added yet.</Text>
              )}
            </ScrollView>
          </View>

          {/* Experience Matrix Display */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience Matrix</Text>
            <View style={styles.matrixRow}>
              <View style={[styles.matrixCard, styles.matrixLoved]}>
                <View style={[styles.matrixIconBox, { backgroundColor: '#3B9F16' }]}><Ionicons name="thumbs-up" size={14} color="#FFF" /></View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixLabel}>Done & Loved</Text>
                  <Text style={styles.matrixItems}>{profile?.preferences?.loved?.length > 0 ? profile.preferences.loved.join(' • ') : 'None yet'}</Text>
                </View>
              </View>
              <View style={[styles.matrixCard, styles.matrixTry]}>
                <View style={[styles.matrixIconBox, { backgroundColor: '#EEC72E' }]}><Ionicons name="list" size={14} color="#161616" /></View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixLabel}>Want to Try</Text>
                  <Text style={styles.matrixItems}>{profile?.preferences?.try?.length > 0 ? profile.preferences.try.join(' • ') : 'None yet'}</Text>
                </View>
              </View>
              <View style={[styles.matrixCard, styles.matrixDislike]}>
                <View style={[styles.matrixIconBox, { backgroundColor: '#E03724' }]}><Ionicons name="thumbs-down" size={14} color="#FFF" /></View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixLabel}>Not For Me</Text>
                  <Text style={styles.matrixItems}>{profile?.preferences?.dislike?.length > 0 ? profile.preferences.dislike.join(' • ') : 'None yet'}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      <FullScreenViewer visible={!!fullScreenMedia} uri={fullScreenMedia} onClose={() => setFullScreenMedia(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  appBarTitle: { fontSize: 18, fontWeight: '700', color: '#161616' },
  scrollContent: { paddingHorizontal: 16 },

  // Nudge Card Styles
  nudgeCard: { marginHorizontal: 0, marginTop: 10, borderRadius: 16, overflow: 'hidden', elevation: 4 },
  nudgeGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  nudgeTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  nudgeDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2, fontWeight: '500' },

  headerSection: { alignItems: 'center', gap: 8, marginBottom: 24, marginTop: 10 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', backgroundColor: '#F2F2F2' },
  avatar: { width: '100%', height: '100%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  nameText: { fontSize: 24, fontWeight: '700', color: '#161616' },
  locationText: { fontSize: 14, color: '#161616', opacity: 0.6 },
  bioText: { fontSize: 14, color: '#161616', opacity: 0.8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#161616', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  manageBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, backgroundColor: '#F9F9F9', borderRadius: 20, paddingHorizontal: 10 },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statHeading: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#161616' },
  statLabel: { fontSize: 13, color: '#161616', opacity: 0.5 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.04)' },
  section: { marginTop: 28, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#161616' },
  
  imageCard: { width: 130, height: 180, borderRadius: 16, marginRight: 10, overflow: 'hidden', backgroundColor: '#F2F2F2' },
  mediaContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  imageThumb: { width: '100%', height: '100%', backgroundColor: '#000' },
  playOverlay: { position: 'absolute', zIndex: 10 },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  emptyText: { color: '#000', opacity: 0.3, fontSize: 14, padding: 20 },
  
  matrixRow: { gap: 10 },
  matrixCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  matrixLoved: { backgroundColor: 'rgba(59, 159, 22, 0.08)' },
  matrixTry: { backgroundColor: 'rgba(238, 199, 46, 0.08)' },
  matrixDislike: { backgroundColor: 'rgba(224, 55, 36, 0.08)' },
  matrixIconBox: { width: 34, height: 34, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  matrixInfo: { marginLeft: 15, flex: 1 },
  matrixLabel: { fontSize: 11, opacity: 0.5, marginBottom: 2, textTransform: 'uppercase', fontWeight: '600' },
  matrixItems: { fontSize: 13, fontWeight: '700', color: '#161616' },

  fsContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fsMedia: { width: width, height: height },
  fsCloseBtn: { position: 'absolute', right: 20, zIndex: 50, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }
});