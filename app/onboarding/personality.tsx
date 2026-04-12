// app/onboarding/personality.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const MIN_TAGS = 3;
const MAX_TAGS = 6;

interface TagCategory {
  label: string;
  icon: string;
  tags: { id: string; label: string; emoji: string }[];
}

const TAG_CATEGORIES: TagCategory[] = [
  {
    label: 'Travel Vibe',
    icon: 'airplane',
    tags: [
      { id: 'adventurous',   label: 'Adventurous',    emoji: '⛰️' },
      { id: 'spontaneous',   label: 'Spontaneous',    emoji: '⚡' },
      { id: 'planner',       label: 'Planner',         emoji: '📋' },
      { id: 'laid_back',     label: 'Laid Back',       emoji: '🌊' },
      { id: 'luxury',        label: 'Luxury Lover',    emoji: '✨' },
      { id: 'backpacker',    label: 'Backpacker',      emoji: '🎒' },
    ],
  },
  {
    label: 'Interests',
    icon: 'heart',
    tags: [
      { id: 'foodie',        label: 'Foodie',          emoji: '🍜' },
      { id: 'culture',       label: 'Culture Buff',    emoji: '🏛️' },
      { id: 'nature',        label: 'Nature Lover',    emoji: '🌿' },
      { id: 'nightlife',     label: 'Nightlife',       emoji: '🎉' },
      { id: 'photography',   label: 'Photographer',    emoji: '📸' },
      { id: 'music',         label: 'Music Fan',       emoji: '🎵' },
    ],
  },
  {
    label: 'Personality',
    icon: 'person',
    tags: [
      { id: 'introvert',     label: 'Introvert',       emoji: '📚' },
      { id: 'extrovert',     label: 'Extrovert',       emoji: '🎤' },
      { id: 'deep_talker',   label: 'Deep Talker',     emoji: '💬' },
      { id: 'homebody',      label: 'Homebody',        emoji: '🏠' },
      { id: 'fitness',       label: 'Fitness Fanatic', emoji: '💪' },
      { id: 'creative',      label: 'Creative',        emoji: '🎨' },
    ],
  },
  {
    label: 'Life Goals',
    icon: 'star',
    tags: [
      { id: 'nomad',         label: 'Digital Nomad',   emoji: '💻' },
      { id: 'bucket_list',   label: 'Bucket Lister',   emoji: '📝' },
      { id: 'slow_travel',   label: 'Slow Traveller',  emoji: '🐢' },
      { id: 'local_lover',   label: 'Local Explorer',  emoji: '🗺️' },
      { id: 'solo_traveller',label: 'Solo Traveller',  emoji: '🧭' },
      { id: 'family',        label: 'Family Oriented', emoji: '👨‍👩‍👧' },
    ],
  },
];

export default function PersonalityScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_TAGS) {
          Alert.alert('Max tags', `You can select up to ${MAX_TAGS} tags.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size < MIN_TAGS) {
      Alert.alert('Select more', `Please choose at least ${MIN_TAGS} tags.`);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { error } = await supabase
        .from('profiles')
        .update({ personality_tags: Array.from(selected) })
        .eq('id', user.id);

      if (error) throw error;

      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const count = selected.size;

  return (
    <LinearGradient
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]}
      locations={[0, 0.3, 0.6, 1]}
      style={styles.gradient}
    >
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Almost there</Text>
          </View>
          <Text style={styles.header}>Your Travel Personality</Text>
          <Text style={styles.subHeader}>
            Pick {MIN_TAGS}–{MAX_TAGS} tags that describe you. This helps us find your perfect adventure match.
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(count / MAX_TAGS) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {count}/{MAX_TAGS} selected
            {count >= MIN_TAGS && <Text style={styles.progressOk}> ✓</Text>}
          </Text>
        </View>

        {/* Tag categories */}
        {TAG_CATEGORIES.map(cat => (
          <View key={cat.label} style={styles.category}>
            <View style={styles.catHeader}>
              <Ionicons name={cat.icon as any} size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.catLabel}>{cat.label}</Text>
            </View>
            <View style={styles.tagWrap}>
              {cat.tags.map(tag => {
                const isSelected = selected.has(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tag, isSelected && styles.tagSelected]}
                    onPress={() => toggle(tag.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                    <Text style={[styles.tagLabel, isSelected && styles.tagLabelSelected]}>
                      {tag.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={14} color={Colors.primary.navy} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.button, count < MIN_TAGS && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving || count < MIN_TAGS}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={count >= MIN_TAGS ? Colors.gradient.sunset : ['#aaa', '#888']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {saving ? (
              <ActivityIndicator color={Colors.neutral.white} />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {count < MIN_TAGS ? `Select ${MIN_TAGS - count} more` : "Let's Go!"}
                </Text>
                {count >= MIN_TAGS && (
                  <Ionicons name="arrow-forward" size={20} color={Colors.neutral.white} />
                )}
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },

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

  content: { padding: 24, paddingTop: 70, paddingBottom: 40 },

  headerSection: { marginBottom: 24 },
  stepIndicator: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  stepText: { color: Colors.neutral.white, fontSize: 12, fontWeight: '700' },
  header: { fontSize: 30, fontWeight: '800', color: Colors.neutral.white, marginBottom: 8 },
  subHeader: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 22 },

  progressWrap: { marginBottom: 24 },
  progressTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.highlight.gold,
    borderRadius: 3,
  },
  progressLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  progressOk: { color: Colors.highlight.success, fontWeight: '700' },

  category: { marginBottom: 24 },
  catHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 12,
  },
  catLabel: {
    fontSize: 13, fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  tagSelected: {
    backgroundColor: Colors.neutral.white,
    borderColor: Colors.neutral.white,
  },
  tagEmoji: { fontSize: 15 },
  tagLabel: {
    fontSize: 14, fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  tagLabelSelected: { color: Colors.primary.navy },

  button: {
    borderRadius: 14, overflow: 'hidden',
    marginTop: 8, marginBottom: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 18, gap: 8,
  },
  buttonText: { color: Colors.neutral.white, fontWeight: '700', fontSize: 17 },

  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});