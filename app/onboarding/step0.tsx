// app/onboarding/step0.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BirthdayPicker, BirthdayValue } from '../../components/BirthdayPicker';
import { LocationPicker, LocationValue } from '../../components/LocationPicker';
import { supabase } from '../../lib/supabase';

const GENDERS = ['Man', 'Woman', 'Non-binary'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ACCENT = '#E8755A';

const MediaThumbnail = ({ uri, onRemove }: { uri: string; onRemove: () => void }) => {
  const isVideo = /\.(mp4|mov|qt)$/i.test(uri);
  const player = useVideoPlayer(isVideo ? uri : null, (p) => { p.muted = true; p.loop = false; });
  return (
    <View style={s.thumbWrap}>
      {isVideo
        ? <VideoView player={player} style={s.thumb} contentFit="cover" nativeControls={false} />
        : <Image source={{ uri }} style={s.thumb} />}
      <TouchableOpacity style={s.removeBtn} onPress={onRemove}>
        <Ionicons name="close" size={12} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

export default function OnboardingStep0() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState<BirthdayValue | null>(null);
  const [locationValue, setLocationValue] = useState<LocationValue | null>(null);
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickMedia = async () => {
    if (mediaItems.length >= 5) return Alert.alert('Limit Reached', 'Max 5 items.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - mediaItems.length,
      quality: 0.5,
    });
    if (!result.canceled && result.assets) {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      for (const asset of result.assets) {
        const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${user.id}/${Date.now()}_${Math.random()}.${ext}`;
        const buf = await (await fetch(asset.uri)).arrayBuffer();
        await supabase.storage.from('user_photos').upload(fileName, buf);
        const { data: { publicUrl } } = supabase.storage.from('user_photos').getPublicUrl(fileName);
        setMediaItems(p => [...p, publicUrl]);
      }
      setUploading(false);
    }
  };

  const handleNext = async () => {
    if (!username.trim()) return Alert.alert('Missing Info', 'Please enter a username.');
    if (!birthday) return Alert.alert('Missing Info', 'Please select your birthday.');
    if (!birthday.valid) return Alert.alert('Age Restriction', 'You must be at least 18 to use this app.');
    if (!gender) return Alert.alert('Missing Info', 'Please select a gender.');
    if (!locationValue) return Alert.alert('Missing Info', 'Please set your location preference.');
    if (mediaItems.length === 0) return Alert.alert('Missing Info', 'Add at least one photo or video.');

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const birthdayString = `${birthday.year}-${(MONTHS.indexOf(birthday.month) + 1).toString().padStart(2, '0')}-${birthday.day}`;
      const { error } = await supabase.from('profiles').update({
        username: username.trim(),
        birthday: birthdayString,
        gender,
        age: birthday.age,
        photos: mediaItems,
        location: locationValue.display,
        location_mode: locationValue.mode,
        location_city: locationValue.city || null,
        location_country: locationValue.country || null,
      }).eq('id', user.id);
      if (error) throw error;
      router.push('/onboarding/personality');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Progress: 5 fields now
  const progress = [
    !!username.trim(),
    !!birthday?.valid,
    !!gender,
    !!locationValue,
    mediaItems.length > 0,
  ].filter(Boolean).length / 5;

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Progress Bar */}
        <View style={s.topBar}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={s.stepLabel}>Step 1 of 4</Text>
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={24}
          showsVerticalScrollIndicator={false}
        >
            <Text style={s.title}>Basic Details</Text>
            <Text style={s.subtitle}>Let's set up your profile.</Text>

            {/* Username */}
            <View style={s.field}>
              <Text style={s.label}>Username</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Wanderlust_123"
                placeholderTextColor="#BBB"
                value={username}
                onChangeText={setUsername}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            {/* Birthday */}
            <View style={s.field}>
              <Text style={s.label}>Birthday</Text>
              <BirthdayPicker accentColor={ACCENT} onChange={setBirthday} />
            </View>

            {/* Gender */}
            <View style={s.field}>
              <Text style={s.label}>Gender</Text>
              <View style={s.genderRow}>
                {GENDERS.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[s.pill, gender === g && s.pillActive]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.pillText, gender === g && s.pillTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location — now uses 3-mode picker */}
            <View style={s.field}>
              <Text style={s.label}>Location</Text>
              <LocationPicker
                value={locationValue}
                onChange={setLocationValue}
                accentColor={ACCENT}
              />
            </View>

            {/* Media */}
            <View style={s.field}>
              <View style={s.labelRow}>
                <Text style={s.label}>Photos & Videos</Text>
                <Text style={s.labelCount}>{mediaItems.length}/5</Text>
              </View>
              <View style={s.grid}>
                {mediaItems.map((uri, i) => (
                  <MediaThumbnail
                    key={i}
                    uri={uri}
                    onRemove={() => setMediaItems(mediaItems.filter((_, j) => j !== i))}
                  />
                ))}
                {mediaItems.length < 5 && (
                  <TouchableOpacity style={s.addBtn} onPress={pickMedia} activeOpacity={0.7}>
                    {uploading
                      ? <ActivityIndicator color={ACCENT} />
                      : <><Ionicons name="add" size={26} color={ACCENT} /><Text style={s.addText}>Add</Text></>}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity style={s.cta} onPress={handleNext} disabled={saving} activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.ctaText}>Continue →</Text>}
            </TouchableOpacity>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  topBar: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 12, gap: 6 },
  progressTrack: { height: 3, backgroundColor: '#EDEDED', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: ACCENT, borderRadius: 4 },
  stepLabel: { fontSize: 11, fontWeight: '600', color: '#BBB', letterSpacing: 0.5 },
  scroll: { paddingHorizontal: 24, paddingBottom: 48, gap: 28 },
  title: { fontSize: 30, fontWeight: '800', color: '#161616', marginTop: 8 },
  subtitle: { fontSize: 15, color: '#999', marginTop: 2 },
  field: { gap: 10 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: '#999' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelCount: { fontSize: 12, fontWeight: '700', color: ACCENT },
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: '#161616',
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: '#F5F5F5', alignItems: 'center' },
  pillActive: { backgroundColor: ACCENT },
  pillText: { fontWeight: '700', fontSize: 14, color: '#888' },
  pillTextActive: { color: '#FFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 96, height: 128, borderRadius: 14, backgroundColor: '#EEE' },
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#E03724', borderRadius: 10, padding: 4, zIndex: 10,
  },
  addBtn: {
    width: 96, height: 128, borderRadius: 14,
    backgroundColor: '#FFF5F2', borderStyle: 'dashed', borderWidth: 1.5, borderColor: ACCENT + '60',
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  addText: { fontSize: 11, fontWeight: '700', color: ACCENT },
  cta: { backgroundColor: '#161616', padding: 18, borderRadius: 30, alignItems: 'center', marginTop: 4 },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});