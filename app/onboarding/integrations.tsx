// app/onboarding/integrations.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#E8755A';

const INTEGRATIONS = [
  {
    id: 'spotify',
    icon: 'musical-notes' as const,
    iconColor: '#1DB954',
    iconBg: '#F0FBF4',
    title: 'Sync Music Taste',
    sub: 'Connect Spotify to show your vibe',
  },
  {
    id: 'instagram',
    icon: 'logo-instagram' as const,
    iconColor: '#E1306C',
    iconBg: '#FEF0F5',
    title: 'Sync Travel Photos',
    sub: 'Pull photos from Instagram',
  },
];

export default function IntegrationsOnboarding() {
  const router = useRouter();
  const [connected, setConnected] = useState<string[]>([]);

  const toggle = (id: string) => {
    Alert.alert('Simulated', `${id} connected!`);
    setConnected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Progress */}
        <View style={s.topBar}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: '75%' }]} />
          </View>
          <Text style={s.stepLabel}>Step 3 of 4</Text>
        </View>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#161616" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        <View style={s.content}>
          <Text style={s.title}>Social Sync</Text>
          <Text style={s.subtitle}>Connect apps to refine your matching algorithm.</Text>

          <View style={s.cards}>
            {INTEGRATIONS.map(item => {
              const isOn = connected.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.card, isOn && s.cardActive]}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.iconWrap, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={26} color={item.iconColor} />
                  </View>
                  <View style={s.cardText}>
                    <Text style={s.cardTitle}>{item.title}</Text>
                    <Text style={s.cardSub}>{item.sub}</Text>
                  </View>
                  <View style={[s.toggle, isOn && s.toggleOn]}>
                    {isOn && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.skip}>You can always connect these later in settings.</Text>
        </View>

        <View style={s.footer}>
          <TouchableOpacity
            style={s.cta}
            onPress={() => router.push('/onboarding/matrix')}
            activeOpacity={0.85}
          >
            <Text style={s.ctaText}>Continue →</Text>
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
  content: { flex: 1, paddingHorizontal: 24, gap: 16 },
  title: { fontSize: 30, fontWeight: '800', color: '#161616' },
  subtitle: { fontSize: 15, color: '#999' },
  cards: { gap: 12, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, backgroundColor: '#F7F7F7', borderRadius: 18,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  cardActive: { borderColor: ACCENT + '50', backgroundColor: '#FFF5F2' },
  iconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#161616' },
  cardSub: { fontSize: 13, color: '#999', marginTop: 2 },
  toggle: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center', alignItems: 'center',
  },
  toggleOn: { backgroundColor: ACCENT },
  skip: { fontSize: 13, color: '#CCC', textAlign: 'center', marginTop: 4 },
  footer: { padding: 24, paddingTop: 8 },
  cta: { backgroundColor: '#161616', padding: 18, borderRadius: 30, alignItems: 'center' },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});