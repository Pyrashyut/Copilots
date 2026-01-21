// app/profile/edit.tsx
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text, TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

const TRAVEL_TRAITS = [
  { id: 'planning', left: 'Strict Planner', right: 'Go with Flow' },
  { id: 'budget', left: 'Backpacker', right: 'Luxury' },
  { id: 'morning', left: 'Early Bird', right: 'Night Owl' },
  { id: 'pacing', left: 'Relaxed', right: 'Action Packed' },
];

const EXPERIENCES = [
  'Skydiving',
  'Street Food Tours',
  'Luxury Resorts',
  'Hiking / Trekking',
  'Art Museums',
  'Nightlife / Clubbing'
];

const EXPERIENCE_OPTIONS = ['Love it', 'Want to try', 'Not for me'];

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [age, setAge] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [travelTraits, setTravelTraits] = useState<Record<string, string>>({});
  const [experienceMatrix, setExperienceMatrix] = useState<Record<string, string>>({});
  const [travelStyleExpanded, setTravelStyleExpanded] = useState(false);
  const [experienceMatrixExpanded, setExperienceMatrixExpanded] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

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
        setUsername(data.username || '');
        setBio(data.bio || '');
        setJobTitle(data.job_title || '');
        setLocation(data.location || '');
        setAge(data.age?.toString() || '');
        setImages(data.photos || []);
        setTravelTraits(data.travel_traits || {});
        setExperienceMatrix(data.preferences || {});
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

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
      console.error("Picker Error:", e);
      Alert.alert("Error", "Could not open gallery");
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const resizedImage = await manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const fileExt = 'jpg';
      const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;

      const response = await fetch(resizedImage.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('user_photos')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user_photos')
        .getPublicUrl(fileName);

      setImages(prev => [...prev, publicUrl]);
      Alert.alert('Success! 📸', 'Photo uploaded');
    } catch (error: any) {
      console.error("Upload Error:", error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    if (images.length === 1) {
      Alert.alert('Cannot Remove', 'You must have at least 1 photo');
      return;
    }

    Alert.alert('Remove Photo', 'Delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setImages(prev => prev.filter((_, index) => index !== indexToRemove))
      }
    ]);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    setImages(newImages);
  };

  const selectTrait = (id: string, value: string) => {
    setTravelTraits(prev => ({ ...prev, [id]: value }));
  };

  const setExperienceRating = (item: string, rating: string) => {
    setExperienceMatrix(prev => ({ ...prev, [item]: rating }));
  };

  const saveProfile = async () => {
    if (!username.trim()) {
      Alert.alert('Missing Info', 'Please add a username.');
      return;
    }
    if (images.length === 0) {
      Alert.alert('Missing Info', 'Please add at least 1 photo.');
      return;
    }

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
          preferences: experienceMatrix
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Username Taken', 'Please choose a different username.');
        } else {
          Alert.alert('Save Failed', error.message);
        }
      } else {
        Alert.alert('Saved! ✅', 'Your profile has been updated');
        router.back();
      }
    } catch (e) {
      console.error("Save Error:", e);
    } finally {
      setSaving(false);
    }
  };

  const getTravelTraitsCount = () => {
    return Object.keys(travelTraits).length;
  };

  const getExperienceCount = () => {
    return Object.keys(experienceMatrix).length;
  };

  return (
    <LinearGradient 
      colors={[Colors.primary.navy, Colors.primary.navyLight, '#2A4A5E', Colors.neutral.trailDust]} 
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      {/* Decorative Background Elements */}
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Photos Section */}
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

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeImage(index)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={14} color={Colors.neutral.white} />
                  </TouchableOpacity>

                  {index === 0 && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryText}>Primary</Text>
                    </View>
                  )}

                  {index > 0 && (
                    <TouchableOpacity
                      style={styles.moveLeftBtn}
                      onPress={() => reorderImages(index, index - 1)}
                    >
                      <Ionicons name="arrow-back" size={12} color={Colors.neutral.white} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {images.length < 5 && (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={pickAndCropImage}
                  disabled={uploading}
                  activeOpacity={0.8}
                >
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

            <Text style={styles.helpText}>
              💡 Tap and hold to reorder. First photo is your primary profile picture.
            </Text>
          </View>

          {/* Basic Info */}
          <Text style={styles.sectionHeader}>Basic Information</Text>
          
          <View style={styles.section}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="at" size={20} color={Colors.neutral.grey} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="adventurer_99"
                placeholderTextColor={Colors.neutral.greyLight}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Age</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={20} color={Colors.neutral.grey} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="25"
                placeholderTextColor={Colors.neutral.greyLight}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Job Title</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="briefcase-outline" size={20} color={Colors.neutral.grey} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Product Designer"
                placeholderTextColor={Colors.neutral.greyLight}
                value={jobTitle}
                onChangeText={setJobTitle}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={20} color={Colors.neutral.grey} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="London, UK"
                placeholderTextColor={Colors.neutral.greyLight}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

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

          {/* Travel Style Section - Collapsible */}
          <TouchableOpacity 
            style={styles.collapsibleHeader}
            onPress={() => setTravelStyleExpanded(!travelStyleExpanded)}
            activeOpacity={0.8}
          >
            <View style={styles.collapsibleHeaderLeft}>
              <Ionicons 
                name={travelStyleExpanded ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color={Colors.neutral.white} 
              />
              <View>
                <Text style={styles.sectionHeader}>Travel Style</Text>
                <Text style={styles.collapsibleSubtext}>
                  {getTravelTraitsCount()}/{TRAVEL_TRAITS.length} selected
                </Text>
              </View>
            </View>
            <Ionicons name="airplane" size={20} color={Colors.neutral.white} />
          </TouchableOpacity>

          {travelStyleExpanded && (
            <View style={styles.collapsibleContent}>
              <Text style={styles.sectionSubtext}>How do you prefer to travel?</Text>

              {TRAVEL_TRAITS.map((trait) => (
                <View key={trait.id} style={styles.traitRow}>
                  <TouchableOpacity 
                    style={[styles.traitOption, travelTraits[trait.id] === 'left' && styles.selectedLeft]}
                    onPress={() => selectTrait(trait.id, 'left')}
                  >
                    <Text style={[styles.traitText, travelTraits[trait.id] === 'left' && styles.selectedText]}>
                      {trait.left}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity 
                    style={[styles.traitOption, travelTraits[trait.id] === 'right' && styles.selectedRight]}
                    onPress={() => selectTrait(trait.id, 'right')}
                  >
                    <Text style={[styles.traitText, travelTraits[trait.id] === 'right' && styles.selectedText]}>
                      {trait.right}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Experience Matrix Section - Collapsible */}
          <TouchableOpacity 
            style={styles.collapsibleHeader}
            onPress={() => setExperienceMatrixExpanded(!experienceMatrixExpanded)}
            activeOpacity={0.8}
          >
            <View style={styles.collapsibleHeaderLeft}>
              <Ionicons 
                name={experienceMatrixExpanded ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color={Colors.neutral.white} 
              />
              <View>
                <Text style={styles.sectionHeader}>Experience Matrix</Text>
                <Text style={styles.collapsibleSubtext}>
                  {getExperienceCount()}/{EXPERIENCES.length} rated
                </Text>
              </View>
            </View>
            <Ionicons name="star" size={20} color={Colors.neutral.white} />
          </TouchableOpacity>

          {experienceMatrixExpanded && (
            <View style={styles.collapsibleContent}>
              <Text style={styles.sectionSubtext}>Rate these activities to find your match</Text>

              {EXPERIENCES.map((item) => (
                <View key={item} style={styles.experienceCard}>
                  <Text style={styles.experienceTitle}>{item}</Text>
                  <View style={styles.experienceOptions}>
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.experienceChip,
                          experienceMatrix[item] === opt && styles.selectedExperienceChip
                        ]}
                        onPress={() => setExperienceRating(item, opt)}
                      >
                        <Text style={[
                          styles.experienceChipText,
                          experienceMatrix[item] === opt && styles.selectedExperienceChipText
                        ]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

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

        {/* Full Screen Image Modal */}
        <Modal visible={!!selectedImage} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <SafeAreaView style={styles.modalSafeArea}>
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setSelectedImage(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={40} color={Colors.neutral.white} />
              </TouchableOpacity>

              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Background Decorations
  bgDecoration1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
  },
  bgDecoration2: {
    position: 'absolute',
    bottom: 100,
    left: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255, 217, 61, 0.06)',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: Colors.neutral.white 
  },
  scrollContent: { 
    padding: 24, 
    paddingBottom: 40 
  },
  section: { marginBottom: 20 },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.neutral.white,
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  label: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: Colors.neutral.white, 
    marginBottom: 12 
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: { 
    color: Colors.neutral.white, 
    fontSize: 12, 
    fontWeight: '700' 
  },
  
  photoScroll: { marginBottom: 12 },
  imageWrapper: { position: 'relative', marginRight: 12 },
  thumb: { 
    width: 120, 
    height: 160, 
    borderRadius: 12, 
    backgroundColor: Colors.neutral.border 
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.highlight.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral.white,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: Colors.highlight.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryText: { 
    color: Colors.primary.navy, 
    fontSize: 10, 
    fontWeight: '700' 
  },
  moveLeftBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
  },
  addText: { 
    color: Colors.neutral.white, 
    fontSize: 12, 
    fontWeight: '600', 
    marginTop: 4 
  },
  helpText: { 
    fontSize: 13, 
    color: 'rgba(255, 255, 255, 0.8)', 
    lineHeight: 20 
  },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  inputIcon: { marginRight: 12 },
  input: { 
    flex: 1, 
    paddingVertical: 16, 
    fontSize: 16, 
    color: Colors.primary.navy 
  },
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 8 },
  textArea: { height: 100, textAlignVertical: 'top' },

  // Collapsible sections
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  collapsibleSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  collapsibleContent: {
    marginBottom: 16,
  },

  // Travel Traits
  traitRow: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral.white,
    borderRadius: 50,
    marginBottom: 12,
    height: 56,
    alignItems: 'center',
    padding: 4,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  traitOption: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 46,
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: '#eee',
  },
  traitText: {
    color: Colors.neutral.grey,
    fontWeight: '600',
    fontSize: 14,
  },
  selectedLeft: {
    backgroundColor: Colors.primary.navy,
  },
  selectedRight: {
    backgroundColor: Colors.primary.navy,
  },
  selectedText: {
    color: Colors.neutral.white,
  },

  // Experience Matrix
  experienceCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.navy,
    marginBottom: 12,
  },
  experienceOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  experienceChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutral.trailDust,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    alignItems: 'center',
  },
  selectedExperienceChip: {
    backgroundColor: Colors.primary.navy,
    borderColor: Colors.primary.navy,
  },
  experienceChipText: {
    fontSize: 12,
    color: Colors.neutral.grey,
    fontWeight: '600',
  },
  selectedExperienceChipText: {
    color: Colors.neutral.white,
    fontWeight: 'bold',
  },
  
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 24,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveText: { 
    color: Colors.neutral.white, 
    fontWeight: '700', 
    fontSize: 17 
  },
  
  modalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.95)', 
    justifyContent: 'center' 
  },
  modalSafeArea: { flex: 1, justifyContent: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closeModalBtn: { position: 'absolute', top: 50, right: 20, zIndex: 20 },
});