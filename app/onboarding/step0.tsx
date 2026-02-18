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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// --- Helper Component for Video/Image Thumbnails ---
const MediaThumbnail = ({ uri, onRemove }: { uri: string; onRemove: () => void }) => {
  const isVideo = uri.match(/\.(mp4|mov|qt)$/i);
  
  const player = useVideoPlayer(isVideo ? uri : null, player => {
    player.muted = true;
    player.loop = false;
  });

  return (
    <View style={styles.imageWrapper}>
      {isVideo ? (
        <VideoView
          player={player}
          style={styles.thumb}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <Image source={{ uri }} style={styles.thumb} />
      )}

      {isVideo && (
        <View style={styles.videoBadge}>
          <Ionicons name="videocam" size={12} color="#FFF" />
        </View>
      )}

      <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
        <Ionicons name="close" size={14} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};
// ---------------------------------------------------

export default function OnboardingStep0() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickMedia = async () => {
    if (mediaItems.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos or videos.');
      return;
    }
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true, // ENABLED MULTI-SELECT
        selectionLimit: 5 - mediaItems.length,
        quality: 0.5,
        videoMaxDuration: 15,
        // Note: allowsEditing is removed because it is not supported with multiple selection
      });

      if (!result.canceled && result.assets) {
        uploadMultipleFiles(result.assets);
      }
    } catch (e) {
      Alert.alert("Error", "Could not open gallery");
    }
  };

  const uploadMultipleFiles = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setUploading(true);
    const newUrls: string[] = [];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      for (const asset of assets) {
        const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const isVideo = ['mp4', 'mov', 'qt'].includes(fileExt);
        const contentType = isVideo ? `video/${fileExt === 'mov' ? 'quicktime' : 'mp4'}` : 'image/jpeg';
        
        const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;
        
        const response = await fetch(asset.uri);
        const arrayBuffer = await response.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from('user_photos')
          .upload(fileName, arrayBuffer, { contentType });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user_photos')
          .getPublicUrl(fileName);

        newUrls.push(publicUrl);
      }
      setMediaItems(prev => [...prev, ...newUrls]);
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const finishOnboarding = async () => {
    if (!username.trim()) return Alert.alert('Missing Info', 'Please add a username.');
    if (mediaItems.length === 0) return Alert.alert('Missing Info', 'Please add at least 1 photo or video.');

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          photos: mediaItems,
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
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />

              <View style={styles.headingContainer}>
                <Text style={styles.title}>Complete Your Profile</Text>
                <Text style={styles.desc}>Add photos or short videos to show your travel vibe.</Text>
              </View>

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

              <View style={styles.section}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Your Gallery</Text>
                  <Text style={styles.photoCount}>{mediaItems.length}/5</Text>
                </View>

                <View style={styles.photoGrid}>
                  {mediaItems.map((uri, index) => (
                    <MediaThumbnail 
                      key={index} 
                      uri={uri} 
                      onRemove={() => setMediaItems(mediaItems.filter((_, i) => i !== index))} 
                    />
                  ))}

                  {mediaItems.length < 5 && (
                    <TouchableOpacity style={styles.addBtn} onPress={pickMedia} disabled={uploading}>
                      {uploading ? <ActivityIndicator color="#161616" /> : <Ionicons name="add" size={32} color="#161616" />}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={finishOnboarding} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Get Started</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  blurPath: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.5 },
  blurCoral: { top: '20%', left: -100, backgroundColor: 'rgba(255, 122, 73, 0.06)', transform: [{ scaleX: 1.5 }] },
  blurYellow: { top: -50, right: -100, backgroundColor: 'rgba(255, 243, 73, 0.06)' },
  scrollContent: { paddingBottom: 40 },
  content: { paddingHorizontal: 20, alignItems: 'center', gap: 32, paddingTop: 40 },
  logo: { width: 48, height: 48 },
  headingContainer: { width: '100%', gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#161616', letterSpacing: -1 },
  desc: { fontSize: 16, color: '#161616', opacity: 0.6, lineHeight: 22 },
  section: { width: '100%', gap: 12 },
  label: { fontSize: 16, fontWeight: '700', color: '#161616' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoCount: { fontSize: 12, color: '#161616', opacity: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F2', borderRadius: 10, paddingHorizontal: 16, height: 55 },
  input: { flex: 1, fontSize: 16, color: '#161616' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imageWrapper: { position: 'relative' },
  thumb: { width: 100, height: 130, borderRadius: 12, backgroundColor: '#F2F2F2' },
  videoBadge: { position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: 2 },
  removeBtn: { position: 'absolute', top: -5, right: -5, width: 24, height: 24, borderRadius: 12, backgroundColor: '#E03724', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  addBtn: { width: 100, height: 130, borderRadius: 12, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', borderStyle: 'dashed' },
  primaryButton: { width: '100%', height: 55, backgroundColor: '#E8755A', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});