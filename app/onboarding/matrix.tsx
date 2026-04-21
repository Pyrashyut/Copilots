// app/onboarding/matrix.tsx
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

const ITEMS = [
  '🤿 Snorkeling','🧗 Climbing','🍕 Food Tours','🪂 Skydiving',
  '🍣 Cooking','⛷️ Skiing','🚗 Road Trips','🌅 Camping',
  '🏨 Resorts','🎒 Backpacking','🍷 Wine Tasting','🏄 Surfing',
];

const CATS = [
  { id: 'loved',   label: 'Done & Loved', color: '#2E9E52', iconBg: '#EBF8EF', icon: 'thumbs-up'   },
  { id: 'try',     label: 'Want to Try',  color: '#D4A017', iconBg: '#FDF8E6', icon: 'bookmark'    },
  { id: 'dislike', label: 'Not For Me',   color: '#E03724', iconBg: '#FEECEB', icon: 'thumbs-down' },
] as const;

type CatId = 'loved' | 'try' | 'dislike';
type Prefs = Record<CatId, string[]>;

export default function OnboardingMatrix() {
  const router = useRouter();
  const [activeCat, setActiveCat] = useState<CatId>('loved');
  const [prefs, setPrefs] = useState<Prefs>({ loved: [], try: [], dislike: [] });
  const [saving, setSaving] = useState(false);

  const total = prefs.loved.length + prefs.try.length + prefs.dislike.length;

  const toggleItem = (item: string) => {
    const next = { ...prefs };
    (Object.keys(next) as CatId[]).forEach(k => { next[k] = next[k].filter(i => i !== item); });
    next[activeCat] = [...next[activeCat], item];
    setPrefs(next);
  };

  const handleFinish = async () => {
    if (total < 5) return Alert.alert('Hold on!', 'Categorize at least 5 activities.');
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ preferences: prefs, onboarding_complete: true }).eq('id', user.id);
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = CATS.find(c => c.id === activeCat)!;

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Progress */}
        <View style={s.topBar}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.min(100, (total / 5) * 100)}%` }]} />
          </View>
          <Text style={s.stepLabel}>Step 4 of 4</Text>
        </View>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#161616" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        <View style={s.content}>
          <Text style={s.title}>Experience Matrix</Text>
          <Text style={s.subtitle}>
            Select a category, then tap activities to sort them.
          </Text>

          {/* Category selector */}
          <View style={s.catRow}>
            {CATS.map(c => {
              const active = activeCat === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catBtn, active && { backgroundColor: c.color, borderColor: c.color }]}
                  onPress={() => setActiveCat(c.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.catIcon, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : c.iconBg }]}>
                    <Ionicons name={c.icon as any} size={13} color={active ? '#FFF' : c.color} />
                  </View>
                  <Text style={[s.catText, active && { color: '#FFF' }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Hint */}
          <Text style={s.hint}>
            Tapping an activity will mark it as{' '}
            <Text style={{ color: activeMeta.color, fontWeight: '700' }}>
              {activeMeta.label}
            </Text>
          </Text>

          <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
            {ITEMS.map(item => {
              const cat = CATS.find(c => prefs[c.id].includes(item));
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    s.chip,
                    cat && { backgroundColor: cat.color + '18', borderColor: cat.color + '60' },
                  ]}
                  onPress={() => toggleItem(item)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.chipText, cat && { color: cat.color, fontWeight: '800' }]}>
                    {item}
                  </Text>
                  {cat && (
                    <Ionicons name={cat.icon as any} size={12} color={cat.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.tally}>{total} / 5 minimum sorted</Text>
          <TouchableOpacity style={s.cta} onPress={handleFinish} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.ctaText}>Finish & Start Exploring 🎉</Text>}
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
  content: { flex: 1, paddingHorizontal: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: '800', color: '#161616' },
  subtitle: { fontSize: 15, color: '#999' },
  catRow: { flexDirection: 'row', gap: 8 },
  catBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 14,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#F5F5F5',
  },
  catIcon: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  catText: { fontSize: 11, fontWeight: '800', color: '#666' },
  hint: { fontSize: 13, color: '#AAA' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#EBEBEB', backgroundColor: '#F9F9F9',
  },
  chipText: { fontSize: 14, color: '#444', fontWeight: '600' },
  footer: { padding: 24, paddingTop: 10, gap: 10 },
  tally: { textAlign: 'center', fontSize: 13, color: '#BBB', fontWeight: '600' },
  cta: { backgroundColor: ACCENT, padding: 18, borderRadius: 30, alignItems: 'center' },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});