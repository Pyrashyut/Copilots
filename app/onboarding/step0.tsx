import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base-64';

export default function OnboardingStep0() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Pick Multiple Images
  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You have reached the 5 photo limit.');
      return;
    }

    try {
      // We use MediaTypeOptions to fix the TS Error. 
      // Ignore the "Deprecated" warning in terminal for now.
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: false, // Required false for multi-select
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        await uploadMultipleImages(result.assets);
      }
    } catch (e) {
      console.error("Picker Error:", e);
      Alert.alert("Error", "Could not open gallery");
    }
  };

  // 2. Upload Loop
  const uploadMultipleImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setUploading(true);
    const newUrls: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      for (const asset of assets) {
        const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;
        
        console.log(`Uploading ${fileName}...`);
        
        // Decode
        const arrayBuffer = decode(asset.base64!);
        
        // Upload
        const { error: uploadError } = await supabase.storage
          .from('user_photos')
          .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        // Get URL
        const { data: { publicUrl } } = supabase.storage
          .from('user_photos')
          .getPublicUrl(fileName);

        newUrls.push(publicUrl);
      }

      setImages(prev => [...prev, ...newUrls]);

    } catch (error: any) {
      console.error("Upload Error:", error);
      Alert.alert('Upload Failed', 'Some photos could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  // 3. Remove Image
  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // 4. Save and Continue (With Debug Logs)
  const nextStep = async () => {
    console.log("--> Next button clicked.");

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

      console.log("--> Saving profile for user:", user.id);
      console.log("--> Data:", { username: username.trim(), photosCount: images.length });

      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: username.trim(), 
          photos: images 
        })
        .eq('id', user.id);

      if (error) {
        console.error("--> Supabase Error:", error);
        if (error.code === '23505') {
          Alert.alert('Username Taken', 'Please choose a different username.');
        } else {
          Alert.alert('Save Failed', error.message);
        }
      } else {
        console.log("--> Save success! Navigating to step1...");
        router.push('/onboarding/step1');
      }
    } catch (e) {
      console.error("--> Unexpected Catch Error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Identity</Text>
      <Text style={styles.subHeader}>Choose a username and add your best travel photos.</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput 
        style={styles.input} 
        placeholder="adventurer_99" 
        placeholderTextColor="#999"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Photos ({images.length}/5)</Text>
      <View style={styles.photoGrid}>
        {images.map((img, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri: img }} style={styles.thumb} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}
        
        {images.length < 5 && (
          <TouchableOpacity style={styles.addBtn} onPress={pickImages} disabled={uploading}>
            {uploading ? <ActivityIndicator color="white" /> : <Ionicons name="add" size={30} color="white" />}
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={nextStep} disabled={saving || uploading}>
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Next: Pilot License</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: Colors.neutral.trailDust },
  header: { fontSize: 28, fontWeight: 'bold', color: Colors.primary.navy },
  subHeader: { fontSize: 14, color: Colors.neutral.grey, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: Colors.primary.navy, marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: Colors.neutral.white, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  imageWrapper: { position: 'relative' },
  thumb: { width: 100, height: 125, borderRadius: 8, backgroundColor: '#ddd' },
  removeBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  addBtn: { width: 100, height: 125, borderRadius: 8, backgroundColor: Colors.primary.navy, justifyContent: 'center', alignItems: 'center' },
  button: { marginTop: 40, backgroundColor: Colors.primary.coral, padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 50 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});