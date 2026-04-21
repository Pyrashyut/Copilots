// app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfilePhoto } from '../../lib/ProfileContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const CORAL = '#E8755A';
const ORANGE = '#FF9100';

const VIDEO_SECTIONS = [
  { key: 'happy_places', label: 'My Happy Places' },
  { key: 'next_adventure', label: 'Next Adventure' },
  { key: 'travel_style', label: 'Travel Style' },
];

const MATRIX_CATS = [
  { key: 'loved', label: 'Done & Loved', color: '#3B9F16', bg: 'rgba(59,159,22,0.08)', iconBg: '#3B9F16', icon: 'thumbs-up' },
  { key: 'try',   label: 'Want to Try',  color: '#C89B00', bg: 'rgba(238,199,46,0.10)', iconBg: '#EEC72E', icon: 'bookmark' },
  { key: 'nope',  label: 'Not For Me',   color: '#C0392B', bg: 'rgba(224,55,36,0.08)', iconBg: '#E03724', icon: 'thumbs-down' },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setProfilePhotoUrl } = useProfilePhoto();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ trips: 0, matches: 0 });
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, tripsRes, likesRes, likedByRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('bookings')
          .select('id', { count: 'exact', head: true })
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .eq('status', 'completed'),
        supabase.from('swipes').select('likee_id').eq('liker_id', user.id).eq('is_like', true),
        supabase.from('swipes').select('liker_id').eq('likee_id', user.id).eq('is_like', true),
      ]);

      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data);
      if (profileRes.data?.photos?.[0]) {
        setProfilePhotoUrl(profileRes.data.photos[0]);
      }

      const likedIds = new Set((likesRes.data ?? []).map((s: any) => s.likee_id));
      const matchCount = (likedByRes.data ?? []).filter((s: any) => likedIds.has(s.liker_id)).length;
      setStats({ trips: tripsRes.count ?? 0, matches: matchCount });
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProfile(); }, []));

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logoLoader} resizeMode="contain" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const name = profile?.username || 'Traveler';
  const age = profile?.age ? `, ${profile.age}` : '';
  const location = profile?.location_city
    ? `${profile.location_city}${profile.location_country ? ', ' + profile.location_country : ''}`
    : profile?.location || null;
  const bio = profile?.bio || null;
  const photos: string[] = profile?.photos ?? [];
  const loved: string[] = profile?.preferences?.loved ?? [];
  const tryItems: string[] = profile?.preferences?.try ?? [];
  const nope: string[] = profile?.preferences?.dislike ?? [];
  const personalityTags: string[] = profile?.personality_tags ?? [];

  const matrixData = { loved, try: tryItems, nope };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Full-width Banner ── */}
        <View style={styles.bannerWrap}>
          {profile?.banner_url ? (
            <Image source={{ uri: profile.banner_url }} style={styles.banner} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#4A90D9', '#2E6BA8', '#1A4A7A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            />
          )}

          {/* Grid/settings icon — top right */}
          <TouchableOpacity
            style={[styles.bannerBtn, { right: 16, top: insets.top + 12 }]}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Ionicons name="apps-outline" size={20} color="#FFF" />
          </TouchableOpacity>

          {/* Banner upload button — bottom right of banner */}
          <TouchableOpacity
            style={styles.bannerCameraBtn}
            onPress={() => router.push('/profile/edit-banner' as any)}
          >
            <Ionicons name="camera" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── Avatar overlapping banner ── */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            {photos[0] ? (
              <Image
                source={{ uri: photos[0] }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color="#CCCCCC" />
              </View>
            )}
          </View>
        </View>

        {/* ── Name + verified + location ── */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{name}{age}</Text>
            <Ionicons name="checkmark-circle" size={20} color={ORANGE} style={{ marginLeft: 6 }} />
            {location && (
              <>
                <Text style={styles.nameDot}> · </Text>
                <Text style={styles.locationInline}>{location}</Text>
              </>
            )}
          </View>
          {bio && <Text style={styles.bioText}>{bio}</Text>}
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statTop}>
              <Ionicons name="star-outline" size={16} color={ORANGE} />
              <Text style={styles.statValue}>4.8</Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statTop}>
              <Ionicons name="airplane-outline" size={16} color={ORANGE} />
              <Text style={styles.statValue}>{stats.trips}</Text>
            </View>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statTop}>
              <Ionicons name="sync-outline" size={16} color={ORANGE} />
              <Text style={styles.statValue}>{stats.matches}</Text>
            </View>
            <Text style={styles.statLabel}>Match</Text>
          </View>
        </View>

        {/* ── Videos ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Videos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.videoScroll}>
            {VIDEO_SECTIONS.map(v => (
              <TouchableOpacity key={v.key} style={styles.videoCard} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#2C3E50', '#3D5A73']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.playBtn}>
                  <Ionicons name="play" size={18} color="#FFF" />
                </View>
                <Text style={styles.videoLabel} numberOfLines={1}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Experience Matrix ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience Matrix</Text>
          {MATRIX_CATS.map(cat => {
            const items: string[] = matrixData[cat.key as keyof typeof matrixData] ?? [];
            if (items.length === 0) return null;
            return (
              <View key={cat.key} style={[styles.matrixRow, { backgroundColor: cat.bg }]}>
                <View style={[styles.matrixIconBox, { backgroundColor: cat.iconBg }]}>
                  <Ionicons name={cat.icon as any} size={16} color="#FFF" />
                </View>
                <View style={styles.matrixInfo}>
                  <Text style={styles.matrixCatLabel}>{cat.label}</Text>
                  <Text style={[styles.matrixItems, { color: cat.color }]}>
                    {items.slice(0, 4).join(' · ')}
                  </Text>
                </View>
              </View>
            );
          })}
          {loved.length === 0 && tryItems.length === 0 && nope.length === 0 && (
            <TouchableOpacity
              style={styles.matrixEmptyBtn}
              onPress={() => router.push('/onboarding/matrix')}
            >
              <Text style={styles.matrixEmptyText}>Fill in your Experience Matrix →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Personality tags ── */}
        {personalityTags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personality</Text>
            <View style={styles.tagWrap}>
              {personalityTags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Sign Out ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#E03724" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  logoLoader: { width: 160, height: 60, marginBottom: 16 },
  loadingText: { fontSize: 15, color: '#888' },
  scrollContent: { paddingBottom: 40 },

  // Banner — full width, no horizontal margin
  bannerWrap: { width, height: 200, position: 'relative' },
  banner: { width: '100%', height: '100%' },
  bannerBtn: {
    position: 'absolute',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerCameraBtn: {
    position: 'absolute',
    bottom: 10, right: 12,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },

  // Avatar
  avatarRow: {
    paddingHorizontal: 20,
    marginTop: -50,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 100, height: 100,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: '#FFF',
    backgroundColor: '#F0F0F0',
  },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: '#FFF',
    backgroundColor: '#F2F2F2',
    justifyContent: 'center', alignItems: 'center',
  },

  // Info
  infoSection: { paddingHorizontal: 20, gap: 6, marginBottom: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  nameText: { fontSize: 22, fontWeight: '800', color: '#161616' },
  nameDot: { fontSize: 16, color: '#AAA' },
  locationInline: { fontSize: 15, color: '#555', fontWeight: '400' },
  bioText: { fontSize: 14, color: 'rgba(22,22,22,0.65)', lineHeight: 20 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#161616' },
  statLabel: { fontSize: 11, color: '#999', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Sections
  section: { marginHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#161616', marginBottom: 14 },

  // Videos
  videoScroll: { marginLeft: -2 },
  videoCard: {
    width: 125, height: 158,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: '#2C3E50',
  },
  playBtn: {
    position: 'absolute',
    top: '50%', left: '50%',
    marginTop: -20, marginLeft: -20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  videoLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Experience Matrix rows
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  matrixIconBox: {
    width: 36, height: 36, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  matrixInfo: { flex: 1 },
  matrixCatLabel: {
    fontSize: 11, fontWeight: '600', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 3,
  },
  matrixItems: { fontSize: 14, fontWeight: '700' },
  matrixEmptyBtn: {
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: CORAL,
    borderRadius: 12, borderStyle: 'dashed',
  },
  matrixEmptyText: { color: CORAL, fontWeight: '600', fontSize: 14 },

  // Tags
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#F2F2F2', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#E8E8E8',
  },
  tagText: { fontSize: 12, color: '#444', fontWeight: '500' },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 20, marginTop: 32,
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#FFF0F0',
  },
  signOutText: { fontSize: 14, fontWeight: '700', color: '#E03724' },
});
