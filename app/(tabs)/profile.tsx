// app/(tabs)/profile.tsx
// Changes from original:
// - Profile completion score bar (client-side only, no DB changes)
// - Shows which fields are missing with tap-to-fix shortcuts

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

// ─── Completion score logic ──────────────────────────────────────────
interface CompletionItem {
  key: string;
  label: string;
  icon: string;
  done: boolean;
  action?: () => void;
}

function getCompletionItems(profile: any, router: any): CompletionItem[] {
  return [
    {
      key: 'photos',
      label: 'Add at least 3 photos',
      icon: 'camera',
      done: (profile?.photos?.length ?? 0) >= 3,
      action: () => router.push('/profile/edit'),
    },
    {
      key: 'bio',
      label: 'Write a bio',
      icon: 'create',
      done: !!profile?.bio && profile.bio.trim().length > 0,
      action: () => router.push('/profile/edit'),
    },
    {
      key: 'location',
      label: 'Set your location',
      icon: 'location',
      done: !!profile?.location && profile.location.trim().length > 0,
      action: () => router.push('/profile/edit'),
    },
    {
      key: 'personality_tags',
      label: 'Pick personality tags',
      icon: 'pricetag',
      done: (profile?.personality_tags?.length ?? 0) >= 3,
      action: () => router.push('/onboarding/personality'),
    },
    {
      key: 'preferences',
      label: 'Fill in Experience Matrix',
      icon: 'grid',
      done: Object.keys(profile?.preferences ?? {}).length >= 3,
      action: () => router.push('/profile/edit'),
    },
  ];
}

function getScoreColor(pct: number): string {
  if (pct >= 80) return Colors.highlight.success;
  if (pct >= 50) return Colors.highlight.gold;
  return Colors.highlight.error;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCompletion, setShowCompletion] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProfile(); }, []));

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.neutral.trailDust]}
        locations={[0, 0.5, 1]}
        style={styles.center}
      >
        <Image source={require('../../assets/images/logo.png')} style={styles.logoLoader} resizeMode="contain" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </LinearGradient>
    );
  }

  const completionItems = getCompletionItems(profile, router);
  const doneCount = completionItems.filter(i => i.done).length;
  const completionPct = Math.round((doneCount / completionItems.length) * 100);
  const scoreColor = getScoreColor(completionPct);
  const isComplete = completionPct === 100;

  return (
    <LinearGradient
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]}
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Your journey profile</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.neutral.white} />
          </TouchableOpacity>
        </View>

        {/* ── Profile Completion Card ── */}
        {!isComplete && showCompletion && (
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <View>
                <Text style={styles.completionTitle}>Profile Strength</Text>
                <Text style={styles.completionSubtitle}>
                  {completionPct < 50
                    ? 'Add more info to get better matches'
                    : completionPct < 80
                    ? 'Almost there — a few more steps'
                    : 'Nearly perfect!'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCompletion(false)}>
                <Ionicons name="close" size={20} color={Colors.neutral.grey} />
              </TouchableOpacity>
            </View>

            {/* Score bar */}
            <View style={styles.scoreBarRow}>
              <View style={styles.scoreTrack}>
                <View style={[styles.scoreFill, { width: `${completionPct}%`, backgroundColor: scoreColor }]} />
              </View>
              <Text style={[styles.scoreLabel, { color: scoreColor }]}>{completionPct}%</Text>
            </View>

            {/* Incomplete items */}
            {completionItems.filter(i => !i.done).map(item => (
              <TouchableOpacity
                key={item.key}
                style={styles.completionItem}
                onPress={item.action}
                activeOpacity={0.8}
              >
                <View style={styles.completionItemIcon}>
                  <Ionicons name={item.icon as any} size={16} color={Colors.neutral.grey} />
                </View>
                <Text style={styles.completionItemText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.neutral.greyLight} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <LinearGradient colors={Colors.gradient.sunset} style={styles.avatarGradient}>
              <View style={styles.avatarInner}>
                {profile?.photos && profile.photos.length > 0 ? (
                  <Image source={{ uri: profile.photos[0] }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={48} color={Colors.neutral.greyLight} />
                  </View>
                )}
              </View>
            </LinearGradient>
            <TouchableOpacity
              style={styles.editPhotoButton}
              onPress={() => router.push('/profile/edit-pfp')}
            >
              <Ionicons name="camera" size={16} color={Colors.neutral.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{profile?.username || 'Traveler'}</Text>

          {/* Inline completion badge when done */}
          {isComplete && (
            <View style={styles.completeBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.highlight.success} />
              <Text style={styles.completeBadgeText}>Profile complete</Text>
            </View>
          )}

          {profile?.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={Colors.neutral.grey} />
              <Text style={styles.location}>{profile.location}</Text>
            </View>
          )}

          {/* Personality tags */}
          {profile?.personality_tags && profile.personality_tags.length > 0 && (
            <View style={styles.tagRow}>
              {profile.personality_tags.slice(0, 4).map((tag: string) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.replace('_', ' ')}</Text>
                </View>
              ))}
              {profile.personality_tags.length > 4 && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>+{profile.personality_tags.length - 4}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { icon: 'heart', color: Colors.highlight.error, value: '0', label: 'Matches' },
            { icon: 'airplane', color: Colors.secondary.teal, value: '0', label: 'Trips' },
            { icon: 'star', color: Colors.highlight.gold, value: '5.0', label: 'Rating' },
          ].map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <View style={styles.statIconCircle}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* About */}
        {profile?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          </View>
        )}

        {/* Details */}
        {(profile?.job_title || profile?.age) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.sectionCard}>
              {profile.job_title && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconCircle}>
                    <Ionicons name="briefcase" size={16} color={Colors.primary.navy} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Job Title</Text>
                    <Text style={styles.detailValue}>{profile.job_title}</Text>
                  </View>
                </View>
              )}
              {profile.age && (
                <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.detailIconCircle}>
                    <Ionicons name="calendar" size={16} color={Colors.primary.navy} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Age</Text>
                    <Text style={styles.detailValue}>{profile.age} years old</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/profile/edit')}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={20} color={Colors.primary.navy} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
            <LinearGradient
              colors={['#FF4757', '#FF6B6B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.neutral.white} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoLoader: { width: 200, height: 80, marginBottom: 20 },
  loadingText: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },

  bgDecoration1: {
    position: 'absolute', top: -100, right: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
  },
  bgDecoration2: {
    position: 'absolute', bottom: 100, left: -150,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: 'rgba(255, 217, 61, 0.06)',
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 70, paddingBottom: 40 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.neutral.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  settingsButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },

  // ── Completion Card ──
  completionCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 20, padding: 16,
    marginBottom: 20,
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 5,
  },
  completionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  completionTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary.navy },
  completionSubtitle: { fontSize: 12, color: Colors.neutral.grey, marginTop: 2 },

  scoreBarRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 14,
  },
  scoreTrack: {
    flex: 1, height: 8,
    backgroundColor: Colors.neutral.border, borderRadius: 4, overflow: 'hidden',
  },
  scoreFill: { height: '100%', borderRadius: 4 },
  scoreLabel: { fontSize: 14, fontWeight: '800', minWidth: 36, textAlign: 'right' },

  completionItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: Colors.neutral.border,
  },
  completionItemIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.neutral.trailDust,
    justifyContent: 'center', alignItems: 'center',
  },
  completionItemText: { flex: 1, fontSize: 13, color: Colors.neutral.greyDark, fontWeight: '500' },

  // ── Profile Card ──
  profileCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 24, padding: 24,
    alignItems: 'center', marginBottom: 20,
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  avatarSection: { position: 'relative', marginBottom: 16 },
  avatarGradient: { width: 120, height: 120, borderRadius: 60, padding: 4 },
  avatarInner: {
    width: '100%', height: '100%',
    borderRadius: 56, overflow: 'hidden',
    backgroundColor: Colors.neutral.trailDust,
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  editPhotoButton: {
    position: 'absolute', bottom: 0, right: 0,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary.navy,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.neutral.white,
  },
  name: { fontSize: 26, fontWeight: '800', color: Colors.primary.navy, marginBottom: 6 },
  completeBadge: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, marginBottom: 6,
    backgroundColor: Colors.highlight.success + '18',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  completeBadgeText: { fontSize: 12, color: Colors.highlight.success, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  location: { fontSize: 16, color: Colors.neutral.grey },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  tag: {
    backgroundColor: Colors.neutral.trailDust,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.neutral.border,
  },
  tagText: { fontSize: 12, color: Colors.neutral.greyDark, fontWeight: '500' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: Colors.neutral.white,
    borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  statIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.neutral.trailDust,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  statNumber: { fontSize: 24, fontWeight: '800', color: Colors.primary.navy },
  statLabel: { fontSize: 12, color: Colors.neutral.grey, marginTop: 2 },

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.neutral.white,
    marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: Colors.neutral.white, borderRadius: 16, padding: 16,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  bioText: { fontSize: 15, color: Colors.neutral.greyDark, lineHeight: 22 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border,
  },
  detailIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.neutral.trailDust,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: Colors.neutral.grey, marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: '600', color: Colors.primary.navy },

  // Buttons
  actionButtons: { gap: 12 },
  editButton: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: Colors.neutral.white,
    paddingVertical: 16, borderRadius: 16,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  editButtonText: { fontSize: 16, fontWeight: '700', color: Colors.primary.navy },
  logoutButton: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
  },
  logoutGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 16,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: Colors.neutral.white },
});