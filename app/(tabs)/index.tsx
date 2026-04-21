// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
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
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [discoverTab, setDiscoverTab] = useState<'people' | 'trips'>('people');

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
      // me used locally for compatibility engine and location filter

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
      }

      if (isLike) checkMatch(userId, profile);
    } catch (err) {
      console.error(err);
    }
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
      <View style={styles.center}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logoLoader} resizeMode="contain" />
        <ActivityIndicator size="large" color="#E8755A" />
        <Text style={styles.loadingText}>Finding your copilots...</Text>
      </View>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="airplane-outline" size={56} color="#E8755A" />
        </View>
        <Text style={styles.emptyTitle}>No More Pilots</Text>
        <Text style={styles.emptySubtitle}>
          {filtersActive ? 'Try adjusting your filters' : 'Check back soon!'}
        </Text>
        {filtersActive && (
          <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => setFilters(DEFAULT_FILTERS)}>
            <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const currentProfile = profiles[currentIndex];
  const currentMatchData = matchDataMap[currentProfile?.id];

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        {/* Logo */}
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />

        {/* People / Trips toggle */}
        <View style={styles.discoverToggle}>
          <TouchableOpacity
            style={[styles.toggleOption, discoverTab === 'people' && styles.toggleOptionActive]}
            onPress={() => setDiscoverTab('people')}
          >
            <Text style={[styles.toggleText, discoverTab === 'people' && styles.toggleTextActive]}>
              People
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, discoverTab === 'trips' && styles.toggleOptionActive]}
            onPress={() => setDiscoverTab('trips')}
          >
            <Text style={[styles.toggleText, discoverTab === 'trips' && styles.toggleTextActive]}>
              Trips
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search icon */}
        <TouchableOpacity style={styles.headerIconBtn} onPress={openFilters}>
          <Ionicons name="search-outline" size={20} color="#333" />
          {filtersActive && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>
      </View>

      {/* Active filter chips — People tab only */}
      {discoverTab === 'people' && filtersActive && (
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

      {discoverTab === 'trips' ? (
        /* ── TRIPS TAB ── */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tripsContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.tripsHeading}>Find Your Next Trip</Text>
          <Text style={styles.tripsSubtext}>Browse trips by adventure tier and connect with co-pilots heading the same way.</Text>
          {[
            { id: 'local',         label: 'Local Explorer',   price: '£50–£150',     dur: '4–8 hrs',   icon: 'cafe',    color: Colors.primary.coral },
            { id: 'national',      label: 'Weekend Escape',   price: '£200–£800',    dur: '2–3 days',  icon: 'car',     color: Colors.highlight.gold },
            { id: 'international', label: 'International',    price: '£800–£2,000',  dur: '4–7 days',  icon: 'airplane',color: Colors.secondary.teal },
            { id: 'exotic',        label: 'Exotic Adventure', price: '£2,000+',      dur: '7–14 days', icon: 'sunny',   color: '#9B59B6' },
          ].map(tier => (
            <TouchableOpacity key={tier.id} style={styles.tripTierCard} activeOpacity={0.85} onPress={() => openFilters()}>
              <View style={[styles.tripTierIcon, { backgroundColor: tier.color + '22' }]}>
                <Ionicons name={tier.icon as any} size={26} color={tier.color} />
              </View>
              <View style={styles.tripTierInfo}>
                <Text style={styles.tripTierName}>{tier.label}</Text>
                <Text style={styles.tripTierMeta}>{tier.dur} · {tier.price}</Text>
              </View>
              <View style={[styles.tripTierBadge, { backgroundColor: tier.color }]}>
                <Text style={styles.tripTierBadgeText}>Explore</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={styles.tripsComingSoon}>
            <Ionicons name="construct-outline" size={28} color="rgba(0,0,0,0.3)" />
            <Text style={styles.tripsComingSoonText}>Full trip discovery coming soon</Text>
          </View>
        </ScrollView>
      ) : (
        /* ── PEOPLE TAB ── */
        <View style={styles.cardArea}>
          <SwipeCard
            key={currentProfile.id}
            profile={currentProfile}
            matchData={currentMatchData}
            onSwipeLeft={() => handleSwipe('left')}
            onSwipeRight={() => handleSwipe('right')}
            onTap={viewProfile}
          />
          <Text style={styles.remainingText}>{profiles.length - currentIndex} remaining</Text>
        </View>
      )}
      </SafeAreaView>

      {/* ── FILTER MODAL ── */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter Profiles</Text>

            {/* Age Range */}
            <Text style={styles.filterLabel}>Age Range</Text>
            <View style={styles.ageRangeRow}>
              <View style={styles.ageStepper}>
                <Text style={styles.ageStepperLabel}>Min</Text>
                <View style={styles.ageStepperControls}>
                  <TouchableOpacity
                    style={styles.ageStepBtn}
                    onPress={() => setPendingFilters(f => ({ ...f, minAge: Math.max(MIN_AGE, f.minAge - 1) }))}
                  >
                    <Ionicons name="remove" size={18} color="#161616" />
                  </TouchableOpacity>
                  <Text style={styles.ageStepValue}>{pendingFilters.minAge}</Text>
                  <TouchableOpacity
                    style={styles.ageStepBtn}
                    onPress={() => setPendingFilters(f => ({ ...f, minAge: Math.min(f.maxAge - 1, f.minAge + 1) }))}
                  >
                    <Ionicons name="add" size={18} color="#161616" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.ageStepperDivider} />

              <View style={styles.ageStepper}>
                <Text style={styles.ageStepperLabel}>Max</Text>
                <View style={styles.ageStepperControls}>
                  <TouchableOpacity
                    style={styles.ageStepBtn}
                    onPress={() => setPendingFilters(f => ({ ...f, maxAge: Math.max(f.minAge + 1, f.maxAge - 1) }))}
                  >
                    <Ionicons name="remove" size={18} color="#161616" />
                  </TouchableOpacity>
                  <Text style={styles.ageStepValue}>{pendingFilters.maxAge}</Text>
                  <TouchableOpacity
                    style={styles.ageStepBtn}
                    onPress={() => setPendingFilters(f => ({ ...f, maxAge: Math.min(MAX_AGE, f.maxAge + 1) }))}
                  >
                    <Ionicons name="add" size={18} color="#161616" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

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
                  color={pendingFilters.locationMode === opt.value ? '#FFF' : '#888'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF' },
  logoLoader: { width: 200, height: 80, marginBottom: 20 },
  loadingText: { color: '#888', fontSize: 15 },
  emptyIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(232,117,90,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 28, color: '#161616', fontWeight: '800', marginTop: 8 },
  emptySubtitle: { fontSize: 15, color: '#999', marginTop: 8 },
  clearFiltersBtn: {
    marginTop: 20, backgroundColor: '#E8755A',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20,
  },
  clearFiltersBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  header: {
    paddingTop: 12, paddingBottom: 12, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  logo: { width: 80, height: 30 },
  discoverToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  toggleOption: {
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  toggleOptionActive: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.4)',
  },
  toggleTextActive: {
    color: '#161616',
    fontWeight: '700',
  },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.07)',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  headerIconBtnActive: { backgroundColor: Colors.primary.coral },
  filterActiveDot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.highlight.gold,
    borderWidth: 1, borderColor: '#FFF',
  },

  chipRow: { maxHeight: 36, marginBottom: 4 },
  chipRowContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  chip: {
    backgroundColor: 'rgba(232,117,90,0.12)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(232,117,90,0.3)',
  },
  chipText: { color: Colors.primary.coral, fontSize: 12, fontWeight: '600' },
  chipClear: {
    backgroundColor: 'rgba(255,71,87,0.1)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  chipClearText: { color: Colors.highlight.error, fontSize: 12, fontWeight: '700' },

  cardArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  remainingText: { color: 'rgba(0,0,0,0.3)', fontSize: 12, fontWeight: '500' },

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
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#161616', marginBottom: 24 },

  filterLabel: {
    fontSize: 14, fontWeight: '700', color: '#161616',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  filterSubLabel: { fontSize: 13, color: '#999', marginBottom: 8, marginTop: 2 },

  ageRangeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7F7F7', borderRadius: 16,
    marginBottom: 20, overflow: 'hidden',
  },
  ageStepper: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  ageStepperLabel: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  ageStepperControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ageStepBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  ageStepValue: { fontSize: 28, fontWeight: '800', color: '#E8755A', minWidth: 44, textAlign: 'center' },
  ageStepperDivider: { width: 1, height: 60, backgroundColor: 'rgba(0,0,0,0.08)' },

  locationOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: '#F7F7F7',
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: 10,
  },
  locationOptionSelected: { backgroundColor: '#E8755A', borderColor: '#E8755A' },
  locationOptionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#555' },
  locationOptionTextSelected: { color: '#FFF' },

  // Tier grid
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  tierOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5,
    backgroundColor: '#F7F7F7',
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tierOptionSelected: { backgroundColor: '#E8755A', borderColor: '#E8755A' },
  tierOptionText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tierOptionTextSelected: { color: '#FFF' },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  resetBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.neutral.border, alignItems: 'center',
  },
  resetBtnText: { fontSize: 15, fontWeight: '700', color: Colors.neutral.grey },
  applyBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  applyBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: Colors.neutral.white },

  // Trips tab
  tripsContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  tripsHeading: { fontSize: 24, fontWeight: '800', color: '#161616', marginBottom: 6 },
  tripsSubtext: { fontSize: 14, color: 'rgba(0,0,0,0.5)', lineHeight: 20, marginBottom: 24 },
  tripTierCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F7F7F7',
    borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  tripTierIcon: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  tripTierInfo: { flex: 1 },
  tripTierName: { fontSize: 16, fontWeight: '700', color: '#161616', marginBottom: 3 },
  tripTierMeta: { fontSize: 13, color: 'rgba(0,0,0,0.5)' },
  tripTierBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  tripTierBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  tripsComingSoon: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 20, paddingVertical: 16,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderStyle: 'dashed',
  },
  tripsComingSoonText: { color: 'rgba(0,0,0,0.3)', fontSize: 13, fontWeight: '600' },
});