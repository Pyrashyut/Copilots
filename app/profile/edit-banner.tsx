// app/profile/edit-banner.tsx
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const CORAL = '#E8755A';

export default function EditBannerScreen() {
  const router = useRouter();
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('banner_url').eq('id', user.id).single();
      if (data?.banner_url) setCurrentBannerUrl(data.banner_url);
    })();
  }, []);

  const pickBanner = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 7],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setPreview(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open gallery.');
    }
  };

  const saveBanner = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const resized = await manipulateAsync(preview, [{ resize: { width: 1200 } }], {
        compress: 0.8,
        format: SaveFormat.JPEG,
      });

      const fileName = `${user.id}/banner_${Date.now()}.jpg`;
      const response = await fetch(resized.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('user_photos')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('user_photos').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert('Done!', 'Banner updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = preview ?? currentBannerUrl;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#161616" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Banner</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          {/* Banner preview */}
          <TouchableOpacity style={styles.bannerPreview} onPress={pickBanner} activeOpacity={0.85}>
            {displayUrl ? (
              <Image source={{ uri: displayUrl }} style={styles.bannerImg} resizeMode="cover" />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.5)" />
                <Text style={styles.placeholderText}>Tap to choose a banner</Text>
              </View>
            )}
            <View style={styles.editOverlay}>
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={16} color="#FFF" />
                <Text style={styles.editBadgeText}>Change Banner</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Best size: wide landscape photo (16:7 ratio). Shown at the top of your profile.
          </Text>

          <TouchableOpacity style={styles.pickBtn} onPress={pickBanner}>
            <Ionicons name="images-outline" size={20} color={CORAL} />
            <Text style={styles.pickBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>

          {preview && (
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={saveBanner}
              disabled={uploading}
              activeOpacity={0.85}
            >
              {uploading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Banner</Text>
              )}
            </TouchableOpacity>
          )}

          {currentBannerUrl && !preview && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => {
                Alert.alert('Remove Banner?', 'Your banner will be reset to the default gradient.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      await supabase.from('profiles').update({ banner_url: null }).eq('id', user.id);
                      setCurrentBannerUrl(null);
                    },
                  },
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#E03724" />
              <Text style={styles.removeBtnText}>Remove Banner</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 56,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#161616' },
  body: { flex: 1, padding: 20, gap: 16 },

  bannerPreview: {
    width: '100%', height: 170,
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#2E6BA8',
  },
  bannerImg: { width: '100%', height: '100%' },
  bannerPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10,
    backgroundColor: '#3A5A8A',
  },
  placeholderText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },
  editOverlay: {
    position: 'absolute', bottom: 12, right: 12,
  },
  editBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  editBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  hint: { fontSize: 13, color: '#999', lineHeight: 18 },

  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: CORAL,
    justifyContent: 'center',
  },
  pickBtnText: { fontSize: 15, fontWeight: '700', color: CORAL },

  saveBtn: {
    backgroundColor: CORAL,
    padding: 18, borderRadius: 30,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  removeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12,
  },
  removeBtnText: { color: '#E03724', fontSize: 14, fontWeight: '600' },
});
