// app/onboarding/step0.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

export default function OnboardingStep0() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length,
        quality: 0.5,
      });

      if (!result.canceled) {
        await uploadMultipleImages(result.assets);
      }
    } catch (e) {
      console.error("Picker Error:", e);
      Alert.alert("Error", "Could not open gallery");
    }
  };

  const uploadMultipleImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setUploading(true);
    const newUrls: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      for (const asset of assets) {
        const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;

        const response = await fetch(asset.uri);
        const arrayBuffer = await response.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from('user_photos')
          .upload(fileName, arrayBuffer, {
            contentType: asset.mimeType || 'image/jpeg',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user_photos')
          .getPublicUrl(fileName);

        newUrls.push(publicUrl);
      }

      setImages(prev => [...prev, ...newUrls]);
      Alert.alert('Success! 📸', `${newUrls.length} photo(s) uploaded`);
    } catch (error: any) {
      console.error("Upload Error:", error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const finishOnboarding = async () => {
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
      if (!user) {
        Alert.alert("Error", "You are not logged in.");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          photos: images,
          onboarding_complete: true
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Username Taken', 'Please choose a different username.');
        } else {
          Alert.alert('Save Failed', error.message);
        }
      } else {
        // Refresh session first
        await supabase.auth.refreshSession();
        
        // Show success message with reminder to complete profile
        Alert.alert(
          '🎉 Welcome Aboard!', 
          'Your account is ready! Would you like to complete your profile now to get better matches?',
          [
            { 
              text: 'Complete Profile Now', 
              onPress: () => {
                // Use push instead of replace to ensure navigation works
                router.push('/profile/edit');
              }
            },
            { 
              text: 'Maybe Later', 
              onPress: () => {
                router.replace('/(tabs)');
              },
              style: 'cancel'
            }
          ]
        );
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Final Step</Text>
          </View>
          <Text style={styles.header}>Complete Your Profile</Text>
          <Text style={styles.subHeader}>
            Add a username and photos to get started. You can add more details later in your profile settings.
          </Text>
        </View>

        {/* Username Input */}
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
            {username.length > 0 && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.highlight.success} />
            )}
          </View>
        </View>

        {/* Photos Section */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Your Photos</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{images.length}/5</Text>
            </View>
          </View>

          <View style={styles.photoGrid}>
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
              </View>
            ))}

            {images.length < 5 && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={pickImages}
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
          </View>

          {images.length === 0 && (
            <Text style={styles.helpText}>
              💡 Tip: Add at least 3 photos to increase your match rate!
            </Text>
          )}
        </View>

        {/* Finish Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={finishOnboarding}
          disabled={saving || uploading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={Colors.gradient.sunset}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {saving ? (
              <ActivityIndicator color={Colors.neutral.white} />
            ) : (
              <>
                <Text style={styles.buttonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.neutral.white} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          ℹ️ You can add more details like bio, location, and preferences in your profile settings anytime.
        </Text>
      </ScrollView>

      {/* Full Screen Image Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 32,
  },
  stepIndicator: {
    backgroundColor: Colors.primary.navy,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  stepText: {
    color: Colors.neutral.white,
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary.navy,
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 15,
    color: Colors.neutral.grey,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.navy,
    marginBottom: 12,
  },
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
  countText: {
    color: Colors.neutral.white,
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.neutral.border,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.primary.navy,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
  },
  thumb: {
    width: 105,
    height: 140,
    borderRadius: 12,
    backgroundColor: Colors.neutral.border,
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
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    fontWeight: '700',
  },
  addBtn: {
    width: 105,
    height: 140,
    borderRadius: 12,
    backgroundColor: Colors.primary.navy,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary.navyLight,
    borderStyle: 'dashed',
  },
  addText: {
    color: Colors.neutral.white,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  helpText: {
    fontSize: 13,
    color: Colors.neutral.grey,
    marginTop: 12,
    lineHeight: 20,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
    marginBottom: 16,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  buttonText: {
    color: Colors.neutral.white,
    fontWeight: '700',
    fontSize: 17,
  },
  footerText: {
    fontSize: 13,
    color: Colors.neutral.grey,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSafeArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 20,
  },
});