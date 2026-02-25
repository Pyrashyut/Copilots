// app/onboarding/personality.tsx
import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const ACCENT = '#E8755A';

const TAGS = [
  { label: 'Extroverted',       emoji: '🎉' },
  { label: 'Chill',             emoji: '😌' },
  { label: 'Adrenaline Junkie', emoji: '⚡' },
  { label: 'Night Owl',         emoji: '🦉' },
  { label: 'History Buff',      emoji: '🏛️' },
  { label: 'Foodie',            emoji: '🍜' },
  { label: 'Luxury Traveler',   emoji: '🛎️' },
  { label: 'Backpacker',        emoji: '🎒' },
  { label: 'Spontaneous',       emoji: '🎲' },
  { label: 'Structured',        emoji: '📋' },
  { label: 'Nature Lover',      emoji: '🌿' },
  { label: 'Urban Explorer',    emoji: '🏙️' },
];

export default function PersonalityOnboarding() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (label: string) => {
    if (selected.includes(label)) {
      setSelected(selected.filter(t => t !== label));
    } else if (selected.length < 5) {
      setSelected([...selected, label]);
    }
  };

  const handleNext = async () => {
    if (selected.length < 3) return Alert.alert('Required', 'Select at least 3 tags.');
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ personality_tags: selected }).eq('id', user.id);
      router.push('/onboarding/integrations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Progress */}
        <View style={s.topBar}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: '50%' }]} />
          </View>
          <Text style={s.stepLabel}>Step 2 of 4</Text>
        </View>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#161616" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Travel Vibe</Text>
          <Text style={s.subtitle}>Pick 3–5 tags that describe you best.</Text>

          {/* counter */}
          <View style={s.counter}>
            {[1,2,3,4,5].map(n => (
              <View
                key={n}
                style={[s.dot, n <= selected.length && { backgroundColor: ACCENT }]}
              />
            ))}
            <Text style={s.counterText}>{selected.length} / 5</Text>
          </View>

          <View style={s.tagGrid}>
            {TAGS.map(({ label, emoji }) => {
              const active = selected.includes(label);
              return (
                <TouchableOpacity
                  key={label}
                  style={[s.tag, active && s.tagActive]}
                  onPress={() => toggle(label)}
                  activeOpacity={0.75}
                >
                  <Text style={s.tagEmoji}>{emoji}</Text>
                  <Text style={[s.tagText, active && s.tagTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity style={s.cta} onPress={handleNext} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.ctaText}>Continue →</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  topBar: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 4, gap: 6 },
  progressTrack: { height: 3, backgroundColor: '#EDEDED', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: ACCENT, borderRadius: 4 },
  stepLabel: { fontSize: 11, fontWeight: '600', color: '#BBB', letterSpacing: 0.5 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 2 },
  backText: { fontSize: 15, fontWeight: '700', color: '#161616' },
  scroll: { paddingHorizontal: 24, paddingBottom: 32, gap: 20 },
  title: { fontSize: 30, fontWeight: '800', color: '#161616' },
  subtitle: { fontSize: 15, color: '#999' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8E8E8' },
  counterText: { fontSize: 12, fontWeight: '700', color: '#BBB', marginLeft: 4 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, backgroundColor: '#F5F5F5',
  },
  tagActive: { backgroundColor: ACCENT },
  tagEmoji: { fontSize: 15 },
  tagText: { fontWeight: '700', color: '#555', fontSize: 14 },
  tagTextActive: { color: '#FFF' },
  footer: { padding: 24, paddingTop: 8 },
  cta: { backgroundColor: '#161616', padding: 18, borderRadius: 30, alignItems: 'center' },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});