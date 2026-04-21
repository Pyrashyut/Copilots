// app/profile/edit.tsx
// Changes from original:
// - Trip tier preferences section (multi-select, saved to trip_tier_preferences[])
// - Availability windows section (pick months/timeframes, saved to availability JSONB)
// Everything else identical to original.

import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const CORAL = '#E8755A';

// ─── Constants ────────────────────────────────────────────────────────
const TRAVEL_TRAITS = [
  { id: 'planning', left: 'Strict Planner',  right: 'Go with Flow' },
  { id: 'budget',   left: 'Backpacker',       right: 'Luxury' },
  { id: 'morning',  left: 'Early Bird',        right: 'Night Owl' },
  { id: 'pacing',   left: 'Relaxed',           right: 'Action Packed' },
];

const EXPERIENCES = [
  'Snorkeling', 'Climbing', 'Food Tours', 'Skydiving',
  'Cooking', 'Skiing', 'Road Trips', 'Camping',
  'Resorts', 'Backpacking', 'Wine Tasting', 'Surfing',
];

const EXPERIENCE_OPTIONS = ['Done & Loved', 'Want to Try', 'Not For Me'];

const TRIP_TIERS = [
  { id: 'local',         label: 'Local Explorer',   desc: '4–8 hrs · £50–150',       icon: 'cafe' },
  { id: 'national',      label: 'Weekend Escape',   desc: '2–3 days · £200–800',     icon: 'car' },
  { id: 'international', label: 'International',    desc: '4–7 days · £800–2,000',   icon: 'airplane' },
  { id: 'exotic',        label: 'Exotic Adventure', desc: '7–14 days · £2,000–4,000',icon: 'sunny' },
];

const AVAILABILITY_OPTIONS = [
  { id: 'this_weekend',   label: 'This Weekend' },
  { id: 'next_2_weeks',   label: 'Next 2 Weeks' },
  { id: 'this_month',     label: 'This Month' },
  { id: 'next_3_months',  label: 'Next 3 Months' },
  { id: 'next_6_months',  label: 'Next 6 Months' },
  { id: 'flexible',       label: 'Flexible / Anytime' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  // Basic fields
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [age, setAge] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Preference fields
  const [travelTraits, setTravelTraits] = useState<Record<string, string>>({});
  const [experienceMatrix, setExperienceMatrix] = useState<Record<string, string>>({});
  const [tripTierPrefs, setTripTierPrefs] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);

  // UI state
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [travelStyleExpanded, setTravelStyleExpanded] = useState(false);
  const [experienceMatrixExpanded, setExperienceMatrixExpanded] = useState(false);
  const [tiersExpanded, setTiersExpanded] = useState(false);
  const [availabilityExpanded, setAvailabilityExpanded] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setUsername(data.username ?? '');
        setBio(data.bio ?? '');
        setJobTitle(data.job_title ?? '');
        setLocation(data.location ?? '');
        setAge(data.age?.toString() ?? '');
        setImages(data.photos ?? []);
        setTravelTraits(data.travel_traits ?? {});
        setExperienceMatrix(data.preferences ?? {});
        setTripTierPrefs(data.trip_tier_preferences ?? []);
        setAvailability(data.availability ?? []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  // ─── Photo helpers ────────────────────────────────────────────────
  const pickAndCropImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const resized = await manipulateAsync(uri, [{ resize: { width: 800 } }], {
        compress: 0.7, format: SaveFormat.JPEG,
      });

      const fileName = `${user.id}/${Date.now()}_${Math.random()}.jpg`;
      const response = await fetch(resized.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('user_photos')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('user_photos').getPublicUrl(fileName);
      setImages(prev => [...prev, publicUrl]);
      Alert.alert('Success! 📸', 'Photo uploaded');
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    if (images.length === 1) {
      Alert.alert('Cannot Remove', 'You must have at least 1 photo');
      return;
    }
    Alert.alert('Remove Photo', 'Delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => setImages(prev => prev.filter((_, i) => i !== index)),
      },
    ]);
  };

  const reorderImages = (from: number, to: number) => {
    const next = [...images];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    setImages(next);
  };

  // ─── Tier preferences ─────────────────────────────────────────────
  const toggleTier = (id: string) => {
    setTripTierPrefs(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // ─── Availability ─────────────────────────────────────────────────
  const toggleAvailability = (id: string) => {
    setAvailability(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // ─── Save ─────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!username.trim()) { Alert.alert('Missing Info', 'Please add a username.'); return; }
    if (images.length === 0) { Alert.alert('Missing Info', 'Please add at least 1 photo.'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          bio: bio.trim(),
          job_title: jobTitle.trim(),
          location: location.trim(),
          age: age ? parseInt(age) : null,
          photos: images,
          travel_traits: travelTraits,
          preferences: experienceMatrix,
          trip_tier_preferences: tripTierPrefs,
          availability,
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') Alert.alert('Username Taken', 'Please choose a different username.');
        else Alert.alert('Save Failed', error.message);
      } else {
        Alert.alert('Saved! ✅', 'Your profile has been updated');
        router.back();
      }
    } catch (e) {
      console.error('Save Error:', e);
    } finally {
      setSaving(false);
    }
  };

  // ─── Collapsible section header ────────────────────────────────────
  const CollapsibleHeader = ({
    expanded, onPress, title, subtitle, icon,
  }: {
    expanded: boolean; onPress: () => void;
    title: string; subtitle: string; icon: string;
  }) => (
    <TouchableOpacity
      style={styles.collapsibleHeader}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.collapsibleHeaderLeft}>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={24}
          color="#E8755A"
        />
        <View>
          <Text style={styles.sectionHeader}>{title}</Text>
          <Text style={styles.collapsibleSubtext}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name={icon as any} size={20} color="#E8755A" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#161616" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* ── Photos ── */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Your Photos</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{images.length}/5</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {images.map((img, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <TouchableOpacity onPress={() => setSelectedImage(img)} activeOpacity={0.9}>
                    <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                    <Ionicons name="close" size={14} color={Colors.neutral.white} />
                  </TouchableOpacity>
                  {index === 0 && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryText}>Primary</Text>
                    </View>
                  )}
                  {index > 0 && (
                    <TouchableOpacity style={styles.moveLeftBtn} onPress={() => reorderImages(index, index - 1)}>
                      <Ionicons name="arrow-back" size={12} color={Colors.neutral.white} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity style={styles.addBtn} onPress={pickAndCropImage} disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator color={Colors.neutral.white} />
                  ) : (
                    <>
                      <Ionicons name="add" size={32} color={Colors.neutral.white} />
                      <Text style={styles.addText}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
            <Text style={styles.helpText}>💡 First photo is your primary profile picture.</Text>
          </View>

          {/* ── Basic Info ── */}
          <Text style={styles.sectionHeader}>Basic Information</Text>

          {[
            { label: 'Username', value: username, setter: setUsername, icon: 'at', placeholder: 'adventurer_99', capitalize: 'none' as const },
            { label: 'Age', value: age, setter: setAge, icon: 'calendar-outline', placeholder: '25', keyboard: 'number-pad' as const },
            { label: 'Job Title', value: jobTitle, setter: setJobTitle, icon: 'briefcase-outline', placeholder: 'Product Designer' },
            { label: 'Location', value: location, setter: setLocation, icon: 'location-outline', placeholder: 'London, UK' },
          ].map(field => (
            <View key={field.label} style={styles.section}>
              <Text style={styles.label}>{field.label}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name={field.icon as any} size={20} color={Colors.neutral.grey} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.neutral.greyLight}
                  value={field.value}
                  onChangeText={field.setter}
                  autoCapitalize={field.capitalize ?? 'words'}
                  keyboardType={(field as any).keyboard ?? 'default'}
                />
              </View>
            </View>
          ))}

          <View style={styles.section}>
            <Text style={styles.label}>Bio</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell others about yourself..."
                placeholderTextColor={Colors.neutral.greyLight}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* ── Trip Tier Preferences ── */}
          <CollapsibleHeader
            expanded={tiersExpanded}
            onPress={() => setTiersExpanded(!tiersExpanded)}
            title="Trip Tier Preferences"
            subtitle={tripTierPrefs.length === 0 ? 'Not set' : `${tripTierPrefs.length} selected`}
            icon="airplane"
          />
          {tiersExpanded && (
            <View style={styles.collapsibleContent}>
              <Text style={styles.sectionSubtext}>
                Which trip types are you open to? This shows on your card and filters discovery.
              </Text>
              {TRIP_TIERS.map(tier => {
                const selected = tripTierPrefs.includes(tier.id);
                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[styles.tierRow, selected && styles.tierRowSelected]}
                    onPress={() => toggleTier(tier.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.tierIcon, selected && styles.tierIconSelected]}>
                      <Ionicons name={tier.icon as any} size={18} color={selected ? '#FFF' : CORAL} />
                    </View>
                    <View style={styles.tierInfo}>
                      <Text style={[styles.tierLabel, selected && styles.tierLabelSelected]}>{tier.label}</Text>
                      <Text style={[styles.tierDesc, selected && styles.tierDescSelected]}>{tier.desc}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={Colors.neutral.white} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Availability ── */}
          <CollapsibleHeader
            expanded={availabilityExpanded}
            onPress={() => setAvailabilityExpanded(!availabilityExpanded)}
            title="Availability"
            subtitle={availability.length === 0 ? 'Not set' : `${availability.length} window${availability.length > 1 ? 's' : ''} selected`}
            icon="calendar"
          />
          {availabilityExpanded && (
            <View style={styles.collapsibleContent}>
              <Text style={styles.sectionSubtext}>
                When can you travel? Select all that apply.
              </Text>
              <View style={styles.availabilityGrid}>
                {AVAILABILITY_OPTIONS.map(opt => {
                  const selected = availability.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.availabilityChip, selected && styles.availabilityChipSelected]}
                      onPress={() => toggleAvailability(opt.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={selected ? Colors.neutral.white : Colors.neutral.grey}
                      />
                      <Text style={[styles.availabilityChipText, selected && styles.availabilityChipTextSelected]}>
                        {opt.label}
                      </Text>
                      {selected && <Ionicons name="checkmark" size={12} color={Colors.neutral.white} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Travel Style ── */}
          <CollapsibleHeader
            expanded={travelStyleExpanded}
            onPress={() => setTravelStyleExpanded(!travelStyleExpanded)}
            title="Travel Style"
            subtitle={`${Object.keys(travelTraits).length}/${TRAVEL_TRAITS.length} set`}
            icon="compass"
          />
          {travelStyleExpanded && (
            <View style={styles.collapsibleContent}>
              <Text style={styles.sectionSubtext}>How do you prefer to travel?</Text>
              {TRAVEL_TRAITS.map(trait => (
                <View key={trait.id} style={styles.traitRow}>
                  <TouchableOpacity
                    style={[styles.traitOption, travelTraits[trait.id] === 'left' && styles.selectedLeft]}
                    onPress={() => setTravelTraits(prev => ({ ...prev, [trait.id]: 'left' }))}
                  >
                    <Text style={[styles.traitText, travelTraits[trait.id] === 'left' && styles.selectedText]}>
                      {trait.left}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.traitDivider} />
                  <TouchableOpacity
                    style={[styles.traitOption, travelTraits[trait.id] === 'right' && styles.selectedRight]}
                    onPress={() => setTravelTraits(prev => ({ ...prev, [trait.id]: 'right' }))}
                  >
                    <Text style={[styles.traitText, travelTraits[trait.id] === 'right' && styles.selectedText]}>
                      {trait.right}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* ── Experience Matrix ── */}
          <CollapsibleHeader
            expanded={experienceMatrixExpanded}
            onPress={() => setExperienceMatrixExpanded(!experienceMatrixExpanded)}
            title="Experience Matrix"
            subtitle={`${Object.keys(experienceMatrix).length}/${EXPERIENCES.length} rated`}
            icon="star"
          />
          {experienceMatrixExpanded && (
            <View style={styles.collapsibleContent}>
              <Text style={styles.sectionSubtext}>Rate these activities to find your match</Text>
              {EXPERIENCES.map(item => (
                <View key={item} style={styles.experienceCard}>
                  <Text style={styles.experienceTitle}>{item}</Text>
                  <View style={styles.experienceOptions}>
                    {EXPERIENCE_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.experienceChip,
                          experienceMatrix[item] === opt && styles.selectedExperienceChip,
                        ]}
                        onPress={() => setExperienceMatrix(prev => ({ ...prev, [item]: opt }))}
                      >
                        <Text style={[
                          styles.experienceChipText,
                          experienceMatrix[item] === opt && styles.selectedExperienceChipText,
                        ]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Save ── */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveProfile}
            disabled={saving || uploading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.gradient.sunset}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              {saving ? (
                <ActivityIndicator color={Colors.neutral.white} />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Full-screen image preview */}
        <Modal visible={!!selectedImage} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <SafeAreaView style={styles.modalSafeArea}>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedImage(null)}>
                <Ionicons name="close-circle" size={40} color={Colors.neutral.white} />
              </TouchableOpacity>
              {selectedImage && (
                <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
              )}
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  bgDecoration1: {
    position: 'absolute', top: -100, right: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(232,117,90,0.06)',
  },
  bgDecoration2: {
    position: 'absolute', bottom: 100, left: -150,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: 'rgba(255,145,0,0.05)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#161616' },
  scrollContent: { padding: 24, paddingBottom: 40 },

  section: { marginBottom: 20 },
  sectionHeader: { fontSize: 17, fontWeight: '800', color: '#161616', marginBottom: 4 },
  sectionSubtext: { fontSize: 14, color: '#999', marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '700', color: '#161616', marginBottom: 12 },
  labelRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  countBadge: {
    backgroundColor: 'rgba(232,117,90,0.12)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { color: CORAL, fontSize: 12, fontWeight: '700' },

  photoScroll: { marginBottom: 12 },
  imageWrapper: { position: 'relative', marginRight: 12 },
  thumb: { width: 120, height: 160, borderRadius: 12, backgroundColor: '#F0F0F0' },
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E03724',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  primaryBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: '#D8AF45',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  primaryText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  moveLeftBtn: {
    position: 'absolute', bottom: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    width: 120, height: 160, borderRadius: 12,
    backgroundColor: 'rgba(232,117,90,0.08)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: CORAL, borderStyle: 'dashed',
  },
  addText: { color: CORAL, fontSize: 12, fontWeight: '600', marginTop: 4 },
  helpText: { fontSize: 13, color: '#999', lineHeight: 20 },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#161616' },
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 8 },
  textArea: { height: 100, textAlignVertical: 'top' },

  // Collapsible
  collapsibleHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16, borderRadius: 12, marginTop: 24, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(232,117,90,0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  collapsibleHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  collapsibleSubtext: { fontSize: 12, color: '#999', marginTop: 2 },
  collapsibleContent: { marginBottom: 16 },

  // Trip tiers
  tierRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  tierRowSelected: { backgroundColor: CORAL, borderColor: CORAL },
  tierIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(232,117,90,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  tierIconSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tierInfo: { flex: 1 },
  tierLabel: { fontSize: 15, fontWeight: '700', color: '#161616' },
  tierLabelSelected: { color: '#FFF' },
  tierDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  tierDescSelected: { color: 'rgba(255,255,255,0.8)' },

  // Availability
  availabilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  availabilityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 24, borderWidth: 1.5,
    backgroundColor: '#FFF',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  availabilityChipSelected: { backgroundColor: CORAL, borderColor: CORAL },
  availabilityChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  availabilityChipTextSelected: { color: '#FFF' },

  // Travel traits
  traitRow: {
    flexDirection: 'row', backgroundColor: '#FFF',
    borderRadius: 50, marginBottom: 12, height: 56,
    alignItems: 'center', padding: 4,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  traitOption: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 46 },
  traitDivider: { width: 1, height: '60%', backgroundColor: '#eee' },
  traitText: { color: '#999', fontWeight: '600', fontSize: 14 },
  selectedLeft:  { backgroundColor: CORAL },
  selectedRight: { backgroundColor: CORAL },
  selectedText:  { color: '#FFF' },

  // Experience matrix
  experienceCard: {
    backgroundColor: '#FFF', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  experienceTitle: { fontSize: 16, fontWeight: '600', color: '#161616', marginBottom: 12 },
  experienceOptions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  experienceChip: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 20,
    backgroundColor: '#F7F7F7',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)', alignItems: 'center',
  },
  selectedExperienceChip: { backgroundColor: CORAL, borderColor: CORAL },
  experienceChipText: { fontSize: 11, color: '#888', fontWeight: '600' },
  selectedExperienceChipText: { color: '#FFF', fontWeight: '700' },

  // Save
  saveButton: {
    borderRadius: 12, overflow: 'hidden', marginTop: 24,
    shadowColor: CORAL,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveGradient: { paddingVertical: 18, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 17 },

  // Image modal
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  modalSafeArea: { flex: 1, justifyContent: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closeModalBtn: { position: 'absolute', top: 50, right: 20, zIndex: 20 },
});