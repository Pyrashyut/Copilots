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
  const [cropImage, setCropImage] = useState<string | null>(null);

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

      // Resize image
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
          photos: images
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

  return (
    <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary.navy} />
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
          <View style={styles.section}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="at" size={20} color={Colors.neutral.grey} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="adventurer_99"
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
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  backButton: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary.navy },
  scrollContent: { padding: 24, paddingBottom: 40 },
  section: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '700', color: Colors.primary.navy, marginBottom: 12 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: Colors.primary.navy,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { color: Colors.neutral.white, fontSize: 12, fontWeight: '700' },
  
  photoScroll: { marginBottom: 12 },
  imageWrapper: { position: 'relative', marginRight: 12 },
  thumb: { width: 120, height: 160, borderRadius: 12, backgroundColor: Colors.neutral.border },
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
  primaryText: { color: Colors.primary.navy, fontSize: 10, fontWeight: '700' },
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
    backgroundColor: Colors.primary.navy,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary.navyLight,
    borderStyle: 'dashed',
  },
  addText: { color: Colors.neutral.white, fontSize: 12, fontWeight: '600', marginTop: 4 },
  helpText: { fontSize: 13, color: Colors.neutral.grey, lineHeight: 20 },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.neutral.border,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: Colors.primary.navy },
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 8 },
  textArea: { height: 100, textAlignVertical: 'top' },
  
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  saveGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveText: { color: Colors.neutral.white, fontWeight: '700', fontSize: 17 },
  
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  modalSafeArea: { flex: 1, justifyContent: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closeModalBtn: { position: 'absolute', top: 50, right: 20, zIndex: 20 },
});