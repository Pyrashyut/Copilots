import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingStep0() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State for Full Screen View
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 1. Pick Multiple Images (FIXED - Using array of media types)
  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You have reached the 5 photo limit.');
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        // FIX: Pass array of strings directly (new API)
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

  // 2. Upload Loop (Fixed Gray Images using ArrayBuffer)
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
        console.log(`Original URI: ${asset.uri}`);

        // CRITICAL FIX: In React Native, we need to use ArrayBuffer, not Blob
        // Fetch the image and convert to ArrayBuffer
        const response = await fetch(asset.uri);
        const arrayBuffer = await response.arrayBuffer();

        // Upload the ArrayBuffer to Supabase
        const { error: uploadError } = await supabase.storage
          .from('user_photos')
          .upload(fileName, arrayBuffer, { 
            contentType: asset.mimeType || 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error(`Upload error for ${fileName}:`, uploadError);
          throw uploadError;
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('user_photos')
          .getPublicUrl(fileName);

        console.log(`Successfully uploaded: ${publicUrl}`);
        newUrls.push(publicUrl);
      }

      setImages(prev => [...prev, ...newUrls]);
      Alert.alert('Success', `${newUrls.length} photo(s) uploaded successfully!`);

    } catch (error: any) {
      console.error("Upload Error:", error);
      Alert.alert('Upload Failed', error.message || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  // 3. Remove Image
  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // 4. Save and Continue
  const nextStep = async () => {
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
        router.push('/onboarding/step1');
      }
    } catch (e) {
      console.error("Error:", e);
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
            {/* Click image to open modal */}
            <TouchableOpacity onPress={() => setSelectedImage(img)}>
              <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
            </TouchableOpacity>
            
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

      {/* FULL SCREEN IMAGE MODAL */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalSafeArea}>
            <TouchableOpacity 
              style={styles.closeModalBtn} 
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close-circle" size={40} color="white" />
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
  
  removeBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white', zIndex: 10 },
  addBtn: { width: 100, height: 125, borderRadius: 8, backgroundColor: Colors.primary.navy, justifyContent: 'center', alignItems: 'center' },
  
  button: { marginTop: 40, backgroundColor: Colors.primary.coral, padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 50 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // MODAL STYLES
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
    top: 50, // Adjusted down for dynamic island/notches
    right: 20,
    zIndex: 20,
  },
});