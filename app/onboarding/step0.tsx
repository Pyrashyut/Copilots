// app/onboarding/step0.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function OnboardingStep0() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
        uploadMultipleImages(result.assets);
      }
    } catch (e) {
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
          .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user_photos')
          .getPublicUrl(fileName);

        newUrls.push(publicUrl);
      }
      setImages(prev => [...prev, ...newUrls]);
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const finishOnboarding = async () => {
    if (!username.trim()) return Alert.alert('Missing Info', 'Please add a username.');
    if (images.length === 0) return Alert.alert('Missing Info', 'Please add at least 1 photo.');

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          photos: images,
          onboarding_complete: true
        })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        router.replace('/(tabs)');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Figma Blur Backgrounds */}
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            {/* Logo */}
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />

            {/* Heading */}
            <View style={styles.headingContainer}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.desc}>Add your details so others can get to know you.</Text>
            </View>

            {/* Username Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. wanderlust_king"
                  placeholderTextColor="rgba(22, 22, 22, 0.4)"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
                <Ionicons name="at" size={20} color="#292D32" />
              </View>
            </View>

            {/* Photo Section */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Your Photos</Text>
                <Text style={styles.photoCount}>{images.length}/5</Text>
              </View>

              <View style={styles.photoGrid}>
                {images.map((img, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri: img }} style={styles.thumb} />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => setImages(images.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close" size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.length < 5 && (
                  <TouchableOpacity style={styles.addBtn} onPress={pickImages} disabled={uploading}>
                    {uploading ? <ActivityIndicator color="#161616" /> : <Ionicons name="add" size={32} color="#161616" />}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity style={styles.primaryButton} onPress={finishOnboarding} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Get Started</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FEFEFE' 
  },
  blurPath: { 
    position: 'absolute', 
    width: 400, 
    height: 400, 
    borderRadius: 200, 
    opacity: 0.5 
  },
  blurCoral: { 
    top: '20%', 
    left: -100, 
    backgroundColor: 'rgba(255, 122, 73, 0.06)', 
    transform: [{ scaleX: 1.5 }] 
  },
  blurYellow: { 
    top: -50, 
    right: -100, 
    backgroundColor: 'rgba(255, 243, 73, 0.06)' 
  },
  scrollContent: { 
    paddingBottom: 40 
  },
  content: { 
    paddingHorizontal: 20, 
    alignItems: 'center', 
    gap: 32, 
    paddingTop: 40 
  },
  logo: { 
    width: 48, 
    height: 48 
  },
  headingContainer: { 
    width: '100%', 
    gap: 8 
  },
  title: { 
    fontFamily: 'DM Sans',
    fontSize: 24, 
    fontWeight: '700', 
    color: '#161616', 
    letterSpacing: -1 
  },
  desc: { 
    fontFamily: 'DM Sans',
    fontSize: 16, 
    color: '#161616', 
    opacity: 0.6, 
    lineHeight: 22 
  },
  section: { 
    width: '100%', 
    gap: 12 
  },
  label: { 
    fontFamily: 'DM Sans',
    fontSize: 16, 
    fontWeight: '700', 
    color: '#161616' 
  },
  labelRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  photoCount: { 
    fontSize: 12, 
    color: '#161616', 
    opacity: 0.5 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F2F2F2', 
    borderRadius: 10, 
    paddingHorizontal: 16, 
    height: 55 
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#161616',
    fontFamily: 'DM Sans'
  },
  photoGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12 
  },
  imageWrapper: { 
    position: 'relative' 
  },
  thumb: { 
    width: 100, 
    height: 130, 
    borderRadius: 12, 
    backgroundColor: '#F2F2F2' 
  },
  removeBtn: { 
    position: 'absolute', 
    top: -5, 
    right: -5, 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#E03724', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF'
  },
  addBtn: { 
    width: 100, 
    height: 130, 
    borderRadius: 12, 
    backgroundColor: '#F2F2F2', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.05)',
    borderStyle: 'dashed'
  },
  primaryButton: { 
    width: '100%', 
    height: 55, 
    backgroundColor: '#E8755A', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 20
  },
  buttonText: { 
    color: '#FFF', 
    fontSize: 18, 
    fontWeight: '700',
    fontFamily: 'DM Sans'
  },
});