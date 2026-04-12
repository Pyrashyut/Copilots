// app/(tabs)/index.tsx
// Changes from previous version:
// - Compatibility engine (getMatchData) wired up and passed to SwipeCard
// - Trip tier preferences filter added to filter modal
// - matchData passed to SwipeCard so reasons + score show on card

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import SwipeCard from '../../components/SwipeCard';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────
interface Filters {
  minAge: number;
  maxAge: number;
  locationMode: 'all' | 'same_country' | 'same_city';
  tierPreferences: string[]; // empty = no filter
}

interface MatchData {
  score: number;
  reasons: string[];
}

// ─── Constants ────────────────────────────────────────────────────────
const MIN_AGE = 18;
const MAX_AGE = 60;
const AGE_STEPS = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);

const DEFAULT_FILTERS: Filters = {
  minAge: MIN_AGE,
  maxAge: MAX_AGE,
  locationMode: 'all',
  tierPreferences: [],
};

const TIERS = [
  { id: 'local',         label: '🏙️ Local' },
  { id: 'national',      label: '🚗 National' },
  { id: 'international', label: '✈️ International' },
  { id: 'exotic',        label: '🌴 Exotic' },
];

// ─── Compatibility engine ─────────────────────────────────────────────
function getMatchData(myProfile: any, theirProfile: any): MatchData {
  const reasons: string[] = [];
  let score = 42; // base

  // Layer 1 (40 pts): Experience Matrix overlap
  const myLoved: string[] = myProfile?.preferences?.loved ?? [];
  const theirLoved: string[] = theirProfile?.preferences?.loved ?? [];
  const commonLoved = myLoved.filter((a: string) => theirLoved.includes(a));
  if (commonLoved.length > 0) {
    score += Math.min(40, commonLoved.length * 12);
    commonLoved.slice(0, 2).forEach((a: string) =>
      reasons.push(`Both love ${a}`)
    );
  }

  // Layer 2 (30 pts): Personality tag overlap
  const myTags: string[] = myProfile?.personality_tags ?? [];
  const theirTags: string[] = theirProfile?.personality_tags ?? [];
  const commonTags = myTags.filter((t: string) => theirTags.includes(t));
  if (commonTags.length > 0) {
    score += Math.min(30, commonTags.length * 8);
    commonTags.slice(0, 2).forEach((t: string) =>
      reasons.push(`Both ${t.replace('_', ' ')}`)
    );
  }

  // Layer 3 (20 pts): Trip tier overlap
  const myTiers: string[] = myProfile?.trip_tier_preferences ?? [];
  const theirTiers: string[] = theirProfile?.trip_tier_preferences ?? [];
  const commonTiers = myTiers.filter((t: string) => theirTiers.includes(t));
  if (commonTiers.length > 0) {
    score += Math.min(20, commonTiers.length * 7);
    reasons.push(`Both open to ${commonTiers[0]} trips`);
  }

  // Bonus: same city
  if (
    myProfile?.location_city &&
    myProfile.location_city === theirProfile?.location_city
  ) {
    score += 5;
    reasons.push('Same city');
  }

  // Clamp 42–99
  score = Math.min(99, Math.max(42, score));

  return { score, reasons };
}

// ─── Component ────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [matchDataMap, setMatchDataMap] = useState<Record<string, MatchData>>({});
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [superLikeFlash, setSuperLikeFlash] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const lastSwipeRef = useRef<{ profile: any; swipeId?: string } | null>(null);
  const currentUserRef = useRef<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, [filters]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      currentUserRef.current = user.id;

      // Fetch my own profile for compatibility engine + location filter
      const { data: me } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setMyProfile(me);

      const { data: swipes } = await supabase
        .from('swipes')
        .select('likee_id')
        .eq('liker_id', user.id);

      const { data: blockedByMe } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      const { data: blockedMe } = await supabase
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', user.id);

      const excludeIds = [
        ...(swipes?.map(s => s.likee_id) ?? []),
        ...(blockedByMe?.map(b => b.blocked_id) ?? []),
        ...(blockedMe?.map(b => b.blocker_id) ?? []),
        user.id,
      ];

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_visible', true)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(100);

      // Age filter
      if (filters.minAge > MIN_AGE) query = query.gte('age', filters.minAge);
      if (filters.maxAge < MAX_AGE) query = query.lte('age', filters.maxAge);

      // Location filter
      if (filters.locationMode === 'same_country' && me?.location_country) {
        query = query.or(
          `location_country.eq.${me.location_country},location_mode.eq.remote_anywhere`
        );
      } else if (filters.locationMode === 'same_city' && me?.location_city) {
        query = query.eq('location_city', me.location_city);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data ?? [];

      // Trip tier filter (client-side — overlap check)
      if (filters.tierPreferences.length > 0) {
        results = results.filter(p => {
          const theirTiers: string[] = p.trip_tier_preferences ?? [];
          return filters.tierPreferences.some(t => theirTiers.includes(t));
        });
      }

      // Compute compatibility for each profile
      const mdMap: Record<string, MatchData> = {};
      results.forEach(p => {
        mdMap[p.id] = getMatchData(me, p);
      });

      // Sort by score descending
      results.sort((a, b) => (mdMap[b.id]?.score ?? 0) - (mdMap[a.id]?.score ?? 0));

      setProfiles(results);
      setMatchDataMap(mdMap);
      setCurrentIndex(0);
      setCanUndo(false);
      lastSwipeRef.current = null;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Swipe ────────────────────────────────────────────────────────
  const handleSwipe = async (direction: 'left' | 'right') => {
    if (currentIndex >= profiles.length) return;
    const profile = profiles[currentIndex];
    const isLike = direction === 'right';

    setCurrentIndex(i => i + 1);
    setCanUndo(false);
    lastSwipeRef.current = { profile };

    try {
      const userId = currentUserRef.current;
      if (!userId) return;

      const { data, error } = await supabase
        .from('swipes')
        .insert({ liker_id: userId, likee_id: profile.id, is_like: isLike, is_super_like: false })
        .select('id')
        .single();

      if (!error && data) {
        lastSwipeRef.current = { profile, swipeId: data.id };
        setCanUndo(true);
      }

      if (isLike) checkMatch(userId, profile);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Super Like ───────────────────────────────────────────────────
  const handleSuperLike = async () => {
    if (currentIndex >= profiles.length) return;
    const profile = profiles[currentIndex];

    setSuperLikeFlash(true);
    setTimeout(() => setSuperLikeFlash(false), 600);
    setCurrentIndex(i => i + 1);
    setCanUndo(false);
    lastSwipeRef.current = { profile };

    try {
      const userId = currentUserRef.current;
      if (!userId) return;

      const { data, error } = await supabase
        .from('swipes')
        .insert({ liker_id: userId, likee_id: profile.id, is_like: true, is_super_like: true })
        .select('id')
        .single();

      if (!error && data) {
        lastSwipeRef.current = { profile, swipeId: data.id };
        setCanUndo(true);
      }

      checkMatch(userId, profile);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Undo ─────────────────────────────────────────────────────────
  const handleUndo = async () => {
    if (!canUndo || !lastSwipeRef.current) return;
    const { profile, swipeId } = lastSwipeRef.current;

    if (swipeId) {
      await supabase.from('swipes').delete().eq('id', swipeId);
    }

    setCurrentIndex(i => Math.max(0, i - 1));
    setProfiles(prev => {
      const updated = [...prev];
      updated[currentIndex - 1] = profile;
      return updated;
    });

    lastSwipeRef.current = null;
    setCanUndo(false);
  };

  // ─── Match check ──────────────────────────────────────────────────
  const checkMatch = async (userId: string, profile: any) => {
    const { data: isMatch } = await supabase.rpc('check_match', {
      current_user_id: userId,
      target_user_id: profile.id,
    });
    if (isMatch) {
      Alert.alert("✈️ IT'S A MATCH!", `You and ${profile.username} both want to explore together!`);
    }
  };

  const viewProfile = () => {
    if (currentIndex >= profiles.length) return;
    router.push({ pathname: '/profile/view', params: { userId: profiles[currentIndex].id } });
  };

  // ─── Filter helpers ───────────────────────────────────────────────
  const openFilters = () => { setPendingFilters(filters); setShowFilters(true); };
  const applyFilters = () => { setFilters(pendingFilters); setShowFilters(false); };
  const resetFilters = () => { setPendingFilters(DEFAULT_FILTERS); };

  const toggleTierPref = (id: string) => {
    setPendingFilters(f => {
      const has = f.tierPreferences.includes(id);
      return {
        ...f,
        tierPreferences: has
          ? f.tierPreferences.filter(t => t !== id)
          : [...f.tierPreferences, id],
      };
    });
  };

  const filtersActive =
    filters.minAge !== DEFAULT_FILTERS.minAge ||
    filters.maxAge !== DEFAULT_FILTERS.maxAge ||
    filters.locationMode !== DEFAULT_FILTERS.locationMode ||
    filters.tierPreferences.length > 0;

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient
        colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.neutral.trailDust]}
        style={styles.center}
      >
        <Image source={require('../../assets/images/logo.png')} style={styles.logoLoader} resizeMode="contain" />
        <ActivityIndicator size="large" color={Colors.highlight.gold} />
        <Text style={styles.loadingText}>Finding your copilots...</Text>
      </LinearGradient>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <LinearGradient
        colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.neutral.trailDust]}
        style={styles.center}
      >
        <Ionicons name="airplane-outline" size={64} color="rgba(255,255,255,0.4)" />
        <Text style={styles.emptyTitle}>No More Pilots</Text>
        <Text style={styles.emptySubtitle}>
          {filtersActive ? 'Try adjusting your filters' : 'Check back soon!'}
        </Text>
        {filtersActive && (
          <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => setFilters(DEFAULT_FILTERS)}>
            <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  }

  const currentProfile = profiles[currentIndex];
  const currentMatchData = matchDataMap[currentProfile?.id];

  return (
    <LinearGradient
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]}
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      {/* Super like flash */}
      {superLikeFlash && (
        <View style={styles.superLikeOverlay} pointerEvents="none">
          <Ionicons name="star" size={80} color={Colors.highlight.gold} />
        </View>
      )}

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>Find your travel companion</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, !canUndo && styles.headerIconBtnDisabled]}
            onPress={handleUndo}
            disabled={!canUndo}
          >
            <Ionicons name="arrow-undo" size={18} color={canUndo ? Colors.neutral.white : 'rgba(255,255,255,0.3)'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, filtersActive && styles.headerIconBtnActive]}
            onPress={openFilters}
          >
            <Ionicons name="options" size={18} color={Colors.neutral.white} />
            {filtersActive && <View style={styles.filterActiveDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Active filter chips */}
      {filtersActive && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.chipRow} contentContainerStyle={styles.chipRowContent}
        >
          {(filters.minAge !== MIN_AGE || filters.maxAge !== MAX_AGE) && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Age {filters.minAge}–{filters.maxAge}</Text>
            </View>
          )}
          {filters.locationMode !== 'all' && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {filters.locationMode === 'same_country' ? 'Same Country' : 'Same City'}
              </Text>
            </View>
          )}
          {filters.tierPreferences.map(t => (
            <View key={t} style={styles.chip}>
              <Text style={styles.chipText}>{TIERS.find(x => x.id === t)?.label ?? t}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.chipClear} onPress={() => setFilters(DEFAULT_FILTERS)}>
            <Text style={styles.chipClearText}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── CARD ── */}
      <View style={styles.cardArea}>
        <SwipeCard profile={currentProfile} matchData={currentMatchData} />
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={viewProfile} />
      </View>

      {/* ── ACTIONS ── */}
      <View style={styles.actionsContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => handleSwipe('left')}>
            <View style={[styles.actionButton, styles.pass]}>
              <Ionicons name="close" size={34} color={Colors.highlight.error} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSuperLike}>
            <View style={[styles.actionButton, styles.superLike]}>
              <Ionicons name="star" size={28} color={Colors.neutral.white} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={viewProfile}>
            <View style={[styles.actionButton, styles.info]}>
              <Ionicons name="information" size={26} color={Colors.neutral.white} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleSwipe('right')}>
            <View style={[styles.actionButton, styles.like]}>
              <Ionicons name="heart" size={34} color={Colors.neutral.white} />
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.remainingText}>{profiles.length - currentIndex} profiles remaining</Text>
      </View>

      {/* ── FILTER MODAL ── */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter Profiles</Text>

            {/* Age Range */}
            <Text style={styles.filterLabel}>Age Range</Text>
            <View style={styles.ageDisplay}>
              <Text style={styles.ageValue}>{pendingFilters.minAge}</Text>
              <Text style={styles.ageSeparator}>to</Text>
              <Text style={styles.ageValue}>{pendingFilters.maxAge}</Text>
            </View>

            <Text style={styles.filterSubLabel}>Minimum age</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ageScroll}>
              {AGE_STEPS.filter(a => a <= pendingFilters.maxAge).map(age => (
                <TouchableOpacity
                  key={`min_${age}`}
                  style={[styles.ageChip, pendingFilters.minAge === age && styles.ageChipSelected]}
                  onPress={() => setPendingFilters(f => ({ ...f, minAge: age }))}
                >
                  <Text style={[styles.ageChipText, pendingFilters.minAge === age && styles.ageChipTextSelected]}>
                    {age}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.filterSubLabel}>Maximum age</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ageScroll}>
              {AGE_STEPS.filter(a => a >= pendingFilters.minAge).map(age => (
                <TouchableOpacity
                  key={`max_${age}`}
                  style={[styles.ageChip, pendingFilters.maxAge === age && styles.ageChipSelected]}
                  onPress={() => setPendingFilters(f => ({ ...f, maxAge: age }))}
                >
                  <Text style={[styles.ageChipText, pendingFilters.maxAge === age && styles.ageChipTextSelected]}>
                    {age}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Location */}
            <Text style={[styles.filterLabel, { marginTop: 20 }]}>Location</Text>
            {(
              [
                { value: 'all',          label: 'Everyone',     icon: 'globe-outline' },
                { value: 'same_country', label: 'Same Country', icon: 'flag-outline' },
                { value: 'same_city',    label: 'Same City',    icon: 'location-outline' },
              ] as const
            ).map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.locationOption,
                  pendingFilters.locationMode === opt.value && styles.locationOptionSelected,
                ]}
                onPress={() => setPendingFilters(f => ({ ...f, locationMode: opt.value }))}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={pendingFilters.locationMode === opt.value ? Colors.neutral.white : Colors.primary.navy}
                />
                <Text style={[
                  styles.locationOptionText,
                  pendingFilters.locationMode === opt.value && styles.locationOptionTextSelected,
                ]}>
                  {opt.label}
                </Text>
                {pendingFilters.locationMode === opt.value && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.neutral.white} />
                )}
              </TouchableOpacity>
            ))}

            {/* Trip Tier Preferences */}
            <Text style={[styles.filterLabel, { marginTop: 20 }]}>Trip Tiers</Text>
            <Text style={styles.filterSubLabel}>Only show people open to these tiers</Text>
            <View style={styles.tierGrid}>
              {TIERS.map(tier => {
                const selected = pendingFilters.tierPreferences.includes(tier.id);
                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[styles.tierOption, selected && styles.tierOptionSelected]}
                    onPress={() => toggleTierPref(tier.id)}
                  >
                    <Text style={[styles.tierOptionText, selected && styles.tierOptionTextSelected]}>
                      {tier.label}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={14} color={Colors.neutral.white} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <LinearGradient
                  colors={Colors.gradient.sunset}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyBtnGradient}
                >
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  logoLoader: { width: 200, height: 80, marginBottom: 20 },
  loadingText: { color: Colors.neutral.white, fontSize: 15 },
  emptyTitle: { fontSize: 28, color: Colors.neutral.white, fontWeight: '800', marginTop: 16 },
  emptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  clearFiltersBtn: {
    marginTop: 20, backgroundColor: Colors.neutral.white,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20,
  },
  clearFiltersBtnText: { color: Colors.primary.navy, fontWeight: '700', fontSize: 15 },

  superLikeOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 99,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,217,61,0.2)',
  },

  header: {
    height: 110, paddingTop: 50, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  logo: { width: 80, height: 30, tintColor: Colors.neutral.white },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.neutral.white },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  headerIconBtnDisabled: { opacity: 0.4 },
  headerIconBtnActive: { backgroundColor: Colors.secondary.teal },
  filterActiveDot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.highlight.gold,
    borderWidth: 1, borderColor: Colors.primary.navy,
  },

  chipRow: { maxHeight: 36, marginBottom: 4 },
  chipRowContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  chipText: { color: Colors.neutral.white, fontSize: 12, fontWeight: '600' },
  chipClear: {
    backgroundColor: 'rgba(255,71,87,0.25)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  chipClearText: { color: Colors.highlight.error, fontSize: 12, fontWeight: '700' },

  cardArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  actionsContainer: { paddingBottom: 28, alignItems: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 10 },
  actionButton: { justifyContent: 'center', alignItems: 'center', borderRadius: 100 },
  pass:      { width: 64, height: 64, backgroundColor: Colors.neutral.white },
  superLike: { width: 54, height: 54, backgroundColor: Colors.highlight.gold },
  info:      { width: 54, height: 54, backgroundColor: Colors.secondary.teal },
  like:      { width: 64, height: 64, backgroundColor: Colors.highlight.success },
  remainingText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  // Filter modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.neutral.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.neutral.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: Colors.primary.navy, marginBottom: 24 },

  filterLabel: {
    fontSize: 14, fontWeight: '700', color: Colors.primary.navy,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  filterSubLabel: { fontSize: 13, color: Colors.neutral.grey, marginBottom: 8, marginTop: 2 },

  ageDisplay: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  ageValue: { fontSize: 32, fontWeight: '800', color: Colors.primary.navy },
  ageSeparator: { fontSize: 16, color: Colors.neutral.grey },

  ageScroll: { marginBottom: 8 },
  ageChip: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.neutral.trailDust,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, borderWidth: 1.5, borderColor: Colors.neutral.border,
  },
  ageChipSelected: { backgroundColor: Colors.primary.navy, borderColor: Colors.primary.navy },
  ageChipText: { fontSize: 13, fontWeight: '600', color: Colors.neutral.grey },
  ageChipTextSelected: { color: Colors.neutral.white },

  locationOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: Colors.neutral.trailDust,
    borderWidth: 1.5, borderColor: Colors.neutral.border,
    marginBottom: 10,
  },
  locationOptionSelected: { backgroundColor: Colors.primary.navy, borderColor: Colors.primary.navy },
  locationOptionText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.primary.navy },
  locationOptionTextSelected: { color: Colors.neutral.white },

  // Tier grid
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  tierOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5,
    backgroundColor: Colors.neutral.trailDust,
    borderColor: Colors.neutral.border,
  },
  tierOptionSelected: { backgroundColor: Colors.primary.navy, borderColor: Colors.primary.navy },
  tierOptionText: { fontSize: 13, fontWeight: '600', color: Colors.primary.navy },
  tierOptionTextSelected: { color: Colors.neutral.white },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  resetBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.neutral.border, alignItems: 'center',
  },
  resetBtnText: { fontSize: 15, fontWeight: '700', color: Colors.neutral.grey },
  applyBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  applyBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: Colors.neutral.white },
});