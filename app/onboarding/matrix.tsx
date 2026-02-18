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

const MATRIX_ITEMS = [
  "🤿 Snorkeling", "🧗 Climbing", "🍕 Food Tours", "🪂 Skydiving", 
  "🍣 Cooking", "⛷️ Skiing", "🚗 Road Trips", "🌅 Camping", 
  "🏛️ Museums", "⛵ Sailing", "🐘 Safari", "🌌 Stargazing",
  "🏨 Resorts", "🎒 Backpacking", "🍷 Wine Tasting", "🏄 Surfing"
];

const CATEGORIES = [
  { id: 'loved', label: 'Done & Loved', color: '#3B9F16', icon: 'thumbs-up' },
  { id: 'try', label: 'Want to Try', color: '#EEC72E', icon: 'list' },
  { id: 'dislike', label: 'Not For Me', color: '#E03724', icon: 'thumbs-down' },
];

export default function OnboardingMatrix() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('loved');
  const [preferences, setPreferences] = useState<any>({ loved: [], try: [], dislike: [] });

  const toggleItem = (item: string) => {
    const newPrefs = { ...preferences };
    // Remove from all categories first to prevent duplicates
    CATEGORIES.forEach(cat => {
      newPrefs[cat.id] = (newPrefs[cat.id] || []).filter((i: string) => i !== item);
    });

    // Add to active category
    newPrefs[activeCategory] = [...(newPrefs[activeCategory] || []), item];
    setPreferences(newPrefs);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
            preferences, 
            onboarding_complete: true 
        })
        .eq('id', user.id);

      if (error) throw error;
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
            <Text style={styles.title}>Experience Matrix</Text>
            <Text style={styles.subtitle}>Tap a category, then select activities to help us find your perfect match.</Text>
        </View>

        {/* Category Selector */}
        <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
                <TouchableOpacity 
                    key={cat.id} 
                    style={[styles.catBtn, activeCategory === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                    onPress={() => setActiveCategory(cat.id)}
                >
                    <Ionicons name={cat.icon as any} size={16} color={activeCategory === cat.id ? "#FFF" : "#666"} />
                    <Text style={[styles.catText, activeCategory === cat.id && { color: "#FFF" }]}>{cat.label}</Text>
                </TouchableOpacity>
            ))}
        </View>

        <ScrollView contentContainerStyle={styles.grid}>
            {MATRIX_ITEMS.map(item => {
                const currentCat = CATEGORIES.find(c => preferences[c.id]?.includes(item));
                return (
                    <TouchableOpacity 
                        key={item} 
                        style={[styles.item, currentCat && { backgroundColor: currentCat.color + '20', borderColor: currentCat.color }]}
                        onPress={() => toggleItem(item)}
                    >
                        <Text style={[styles.itemText, currentCat && { color: currentCat.color, fontWeight: '700' }]}>{item}</Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>

        <View style={styles.footer}>
            <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Finish & Explore</Text>}
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#161616' },
  subtitle: { fontSize: 15, color: '#666', marginTop: 8, lineHeight: 22 },
  categoryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  catBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  catText: { fontSize: 11, fontWeight: '700', color: '#666' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, gap: 10 },
  item: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#EEE', backgroundColor: '#F9F9F9' },
  itemText: { fontSize: 14, color: '#333' },
  footer: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
  skipBtn: { paddingVertical: 15 },
  skipText: { color: '#999', fontWeight: '600' },
  primaryBtn: { flex: 1, backgroundColor: '#161616', paddingVertical: 15, borderRadius: 30, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});