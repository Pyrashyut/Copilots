// app/profile/edit-pfp.tsx
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');
const IMAGE_SIZE = width - 48;

export default function EditProfilePictureScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentPfp, setCurrentPfp] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    fetchCurrentPfp();
  }, []);

  const fetchCurrentPfp = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('photos')
        .eq('id', user.id)
        .single();

      if (data?.photos && data.photos.length > 0) {
        setCurrentPfp(data.photos[0]);
        setSelectedImage(data.photos[0]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        // Reset transform values
        scale.value = 1;
        savedScale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    } catch (e) {
      console.error("Picker Error:", e);
      Alert.alert("Error", "Could not open gallery");
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const resetTransform = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const saveProfilePicture = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Resize and crop to square
      const resizedImage = await manipulateAsync(
        selectedImage,
        [{ resize: { width: 800, height: 800 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      const fileName = `${user.id}/pfp_${Date.now()}.jpg`;
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

      // Get current photos
      const { data: profileData } = await supabase
        .from('profiles')
        .select('photos')
        .eq('id', user.id)
        .single();

      let updatedPhotos = [publicUrl];
      if (profileData?.photos && profileData.photos.length > 0) {
        // Replace first photo, keep others
        updatedPhotos = [publicUrl, ...profileData.photos.slice(1)];
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photos: updatedPhotos })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert('Success! ✅', 'Profile picture updated', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error("Upload Error:", error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient colors={[Colors.neutral.trailDust, Colors.neutral.white]} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.primary.navy} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile Picture</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.content}>
            <Text style={styles.instructions}>
              {selectedImage ? 'Pinch to zoom, drag to reposition' : 'Select a photo to get started'}
            </Text>

            <View style={styles.imageContainer}>
              {selectedImage ? (
                <View style={styles.cropArea}>
                  <GestureDetector gesture={composed}>
                    <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                      <Image 
                        source={{ uri: selectedImage }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                    </Animated.View>
                  </GestureDetector>
                  
                  <View style={styles.cropOverlay}>
                    <View style={styles.cropCircle} />
                  </View>
                </View>
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons name="camera" size={64} color={Colors.neutral.greyLight} />
                  <Text style={styles.placeholderText}>No image selected</Text>
                </View>
              )}
            </View>

            <View style={styles.controls}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={24} color={Colors.primary.navy} />
                <Text style={styles.controlText}>Choose Photo</Text>
              </TouchableOpacity>

              {selectedImage && (
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={resetTransform}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={24} color={Colors.primary.navy} />
                  <Text style={styles.controlText}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, !selectedImage && styles.disabledButton]}
              onPress={saveProfilePicture}
              disabled={uploading || !selectedImage}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={Colors.gradient.sunset}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                {uploading ? (
                  <ActivityIndicator color={Colors.neutral.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color={Colors.neutral.white} />
                    <Text style={styles.saveText}>Save Profile Picture</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </GestureHandlerRootView>
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
  content: { flex: 1, padding: 24 },
  instructions: {
    fontSize: 15,
    color: Colors.neutral.grey,
    textAlign: 'center',
    marginBottom: 24,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    alignSelf: 'center',
    marginBottom: 32,
  },
  cropArea: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: IMAGE_SIZE / 2,
    backgroundColor: Colors.neutral.border,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cropOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  cropCircle: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.neutral.white,
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: IMAGE_SIZE / 2,
    backgroundColor: Colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.neutral.greyLight,
    marginTop: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  controlButton: {
    backgroundColor: Colors.neutral.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.neutral.border,
  },
  controlText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.navy,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  saveText: {
    color: Colors.neutral.white,
    fontWeight: '700',
    fontSize: 17,
  },
});