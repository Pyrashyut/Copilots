// app/profile/edit.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationPicker, LocationValue } from '../../components/LocationPicker';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');
const GENDERS = ["Man", "Woman", "Non-binary"];

const MediaThumbnail = ({ uri, index, onRemove, onMakeMain, onPress }: {
  uri: string; index: number; onRemove: () => void; onMakeMain: () => void; onPress: () => void;
}) => {
  const isVideo = uri.match(/\.(mp4|mov|qt)$/i);
  const player = useVideoPlayer(isVideo ? uri : null, (p) => { p.muted = true; p.loop = false; });
  return (
    <View style={styles.photoWrapper}>
      <TouchableOpacity onPress={onPress} style={styles.mediaContainer}>
        {isVideo ? (
          <>
            <VideoView player={player} style={styles.media} contentFit="cover" nativeControls={false} />
            <View style={styles.videoBadge}><Ionicons name="play" size={12} color="#FFF" /></View>
          </>
        ) : (
          <Image source={{ uri }} style={styles.media} />
        )}
      </TouchableOpacity>
      <View style={styles.controlsRow}>
        <TouchableOpacity style={[styles.controlBtn, index === 0 ? styles.activeMainBtn : styles.inactiveBtn]} onPress={onMakeMain}>
          <Ionicons name={index === 0 ? "star" : "star-outline"} size={14} color={index === 0 ? "#FFF" : "#333"} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, styles.removeBtn]} onPress={onRemove}>
          <Ionicons name="trash-outline" size={14} color="#FFF" />
        </TouchableOpacity>
      </View>
      {index === 0 && <View style={styles.mainLabelBadge}><Text style={styles.mainLabelText}>MAIN</Text></View>}
    </View>
  );
};

const FullScreenViewer = ({ visible, uri, onClose }: { visible: boolean; uri: string | null; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const isVideo = uri ? !!uri.match(/\.(mp4|mov|qt)$/i) : false;
  const player = useVideoPlayer(isVideo ? uri : null, p => { p.loop = true; });
  useEffect(() => {
    if (visible && isVideo) player.play();
    else player.pause();
  }, [visible, isVideo, player]);
  if (!visible || !uri) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.fsContainer}>
        <TouchableOpacity style={[styles.fsCloseBtn, { top: insets.top + 10 }]} onPress={onClose}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        {isVideo
          ? <VideoView player={player} style={styles.fsMedia} contentFit="contain" nativeControls />
          : <Image source={{ uri }} style={styles.fsMedia} resizeMode="contain" />}
      </View>
    </Modal>
  );
};

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [username, setUsername] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [locationValue, setLocationValue] = useState<LocationValue | null>(null);
  const [images, setImages] = useState<string[]>([]);

  const [fullScreenMedia, setFullScreenMedia] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setUsername(data.username || '');
        setBirthday(data.birthday || '');
        setGender(data.gender || '');
        setBio(data.bio || '');
        setImages(data.photos || []);
        // Restore location value from DB
        if (data.location_mode) {
          setLocationValue({
            mode: data.location_mode,
            city: data.location_city || undefined,
            country: data.location_country || undefined,
            display: data.location || 'Set your location',
          });
        }
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const pickMedia = async () => {
    if (images.length >= 5) return Alert.alert("Max 5 items allowed");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.5 });
    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      await supabase.storage.from('user_photos').upload(fileName, arrayBuffer);
      const { data: { publicUrl } } = supabase.storage.from('user_photos').getPublicUrl(fileName);
      setImages([...images, publicUrl]);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) return Alert.alert('Required', 'Please enter a display name.');

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let age = null;
      if (birthday) {
        const birthDate = new Date(birthday);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      }

      const { error } = await supabase.from('profiles').update({
        username: username.trim(),
        birthday: birthday || null,
        gender,
        age,
        bio: bio.trim(),
        photos: images,
        // Location fields
        location: locationValue?.display || null,
        location_mode: locationValue?.mode || null,
        location_city: locationValue?.city || null,
        location_country: locationValue?.country || null,
      }).eq('id', user.id);

      if (error) throw error;
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#161616" />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#E8755A" />
              : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={24}
          showsVerticalScrollIndicator={false}
        >

          {/* Gallery */}
          <Text style={styles.sectionLabel}>Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {images.map((img, i) => (
              <MediaThumbnail
                key={i} uri={img} index={i}
                onPress={() => setFullScreenMedia(img)}
                onRemove={() => setImages(images.filter((_, idx) => idx !== i))}
                onMakeMain={() => setImages([images[i], ...images.filter((_, idx) => idx !== i)])}
              />
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addBtn} onPress={pickMedia} disabled={uploading}>
                {uploading
                  ? <ActivityIndicator color="#CCC" />
                  : <><Ionicons name="add" size={30} color="#CCC" /><Text style={styles.addBtnText}>Add</Text></>}
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Basic Info */}
          <Text style={styles.sectionLabel}>Basic Info</Text>
          <View style={styles.form}>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Your name"
                placeholderTextColor="#BBB"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                multiline
                placeholder="Tell potential travel companions about yourself..."
                placeholderTextColor="#BBB"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Birthday (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={birthday}
                onChangeText={setBirthday}
                placeholder="e.g. 1995-06-15"
                placeholderTextColor="#BBB"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.pillRow}>
                {GENDERS.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.pill, gender === g && styles.activePill]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.pillText, gender === g && styles.activeText]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>

          {/* Location */}
          <Text style={styles.sectionLabel}>Location</Text>
          <View style={styles.form}>
            <LocationPicker
              value={locationValue}
              onChange={setLocationValue}
              accentColor="#E8755A"
            />
            {locationValue && (
              <View style={styles.locationHint}>
                <Ionicons
                  name={
                    locationValue.mode === 'remote_anywhere' ? 'earth' :
                    locationValue.mode === 'remote_country' ? 'flag' : 'location'
                  }
                  size={14}
                  color={
                    locationValue.mode === 'remote_anywhere' ? '#2A9D8F' :
                    locationValue.mode === 'remote_country' ? '#D4AF37' : '#E8755A'
                  }
                />
                <Text style={styles.locationHintText}>
                  {locationValue.mode === 'remote_anywhere'
                    ? 'Matching globally with all users'
                    : locationValue.mode === 'remote_country'
                    ? `Matching nationally within ${locationValue.country}`
                    : `Matching locally in ${locationValue.city}, ${locationValue.country}`}
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: 50 }} />
        </KeyboardAwareScrollView>
      </SafeAreaView>
      <FullScreenViewer visible={!!fullScreenMedia} uri={fullScreenMedia} onClose={() => setFullScreenMedia(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  appBarTitle: { fontSize: 18, fontWeight: '700', color: '#161616' },
  saveText: { color: '#E8755A', fontWeight: '700', fontSize: 16 },
  scrollContent: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', opacity: 0.4, letterSpacing: 1, marginTop: 28, marginBottom: 14 },
  photoScroll: { flexDirection: 'row', marginBottom: 8, height: 160 },
  photoWrapper: { position: 'relative', marginRight: 12, width: 100 },
  mediaContainer: { width: 100, height: 130, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  media: { width: '100%', height: '100%', backgroundColor: '#F2F2F2' },
  videoBadge: { position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: 2 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  controlBtn: { width: 48, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  activeMainBtn: { backgroundColor: '#E8755A' },
  inactiveBtn: { backgroundColor: '#F2F2F2' },
  removeBtn: { backgroundColor: '#E03724' },
  mainLabelBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: '#E8755A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  mainLabelText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  addBtn: { width: 100, height: 130, borderRadius: 12, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD', gap: 4 },
  addBtnText: { fontSize: 11, fontWeight: '600', color: '#BBB' },
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#161616', opacity: 0.6 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 15, color: '#161616' },
  textArea: { height: 100, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, paddingVertical: 12, backgroundColor: '#F2F2F2', borderRadius: 12, alignItems: 'center' },
  activePill: { backgroundColor: '#E8755A' },
  pillText: { fontWeight: '700', color: '#666', fontSize: 14 },
  activeText: { color: '#FFF' },
  locationHint: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  locationHintText: { fontSize: 13, color: '#999', fontWeight: '500', flex: 1 },
  fsContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fsMedia: { width, height },
  fsCloseBtn: { position: 'absolute', right: 20, zIndex: 50, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
});