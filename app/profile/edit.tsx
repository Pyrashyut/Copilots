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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');
const GENDERS = ["Man", "Woman", "Non-binary"];

const MATRIX_ITEMS = ["🤿 Snorkeling", "🧗 Climbing", "🍕 Food Tours", "🪂 Skydiving", "🍣 Cooking", "⛷️ Skiing", "🚗 Road Trips", "🌅 Camping", "🏨 Resorts", "🎒 Backpacking", "🍷 Wine Tasting", "🏄 Surfing"];
const CATEGORIES = [
  { id: 'loved', label: 'Done & Loved', color: '#3B9F16', icon: 'thumbs-up' },
  { id: 'try', label: 'Want to Try', color: '#EEC72E', icon: 'list' },
  { id: 'dislike', label: 'Not For Me', color: '#E03724', icon: 'thumbs-down' },
];

const MediaThumbnail = ({ uri, index, onRemove, onMakeMain, onPress }: { uri: string, index: number, onRemove: () => void, onMakeMain: () => void, onPress: () => void }) => {
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

const FullScreenViewer = ({ visible, uri, onClose }: { visible: boolean, uri: string | null, onClose: () => void }) => {
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
                {isVideo ? <VideoView player={player} style={styles.fsMedia} contentFit="contain" nativeControls /> : <Image source={{ uri }} style={styles.fsMedia} resizeMode="contain" />}
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
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<any>({ loved: [], try: [], dislike: [] });
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
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
        setLocation(data.location || '');
        setImages(data.photos || []);
        setPreferences(data.preferences || { loved: [], try: [], dislike: [] });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const pickMedia = async () => {
    if (images.length >= 5) return Alert.alert("Max 5 items allowed");
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.5 });
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
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const age = birthday ? new Date().getFullYear() - new Date(birthday).getFullYear() : null;
    await supabase.from('profiles').update({ username, birthday, gender, age, bio, location, photos: images, preferences }).eq('id', user.id);
    setSaving(false);
    router.back();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} /></TouchableOpacity>
            <Text style={styles.appBarTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#E8755A" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                {images.map((img: string, i: number) => (
                    <MediaThumbnail key={i} uri={img} index={i} onPress={() => setFullScreenMedia(img)} onRemove={() => setImages(images.filter((_, idx) => idx !== i))} onMakeMain={() => setImages([images[i], ...images.filter((_, idx) => idx !== i)])} />
                ))}
                {images.length < 5 && (
                    <TouchableOpacity style={styles.addBtn} onPress={pickMedia} disabled={uploading}>
                        {uploading ? <ActivityIndicator color="#CCC" /> : <Ionicons name="add" size={30} color="#CCC" />}
                    </TouchableOpacity>
                )}
            </ScrollView>

            <View style={styles.form}>
                <View style={styles.inputGroup}><Text style={styles.label}>Name</Text><TextInput style={styles.input} value={username} onChangeText={setUsername} /></View>
                <View style={styles.inputGroup}><Text style={styles.label}>Birthday (YYYY-MM-DD)</Text><TextInput style={styles.input} value={birthday} onChangeText={setBirthday} /></View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Gender</Text>
                    <View style={{flexDirection: 'row', gap: 10}}>
                        {GENDERS.map(g => (
                            <TouchableOpacity key={g} style={[styles.pill, gender === g && styles.activePill]} onPress={() => setGender(g)}>
                                <Text style={[styles.pillText, gender === g && styles.activeText]}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={styles.inputGroup}><Text style={styles.label}>Bio</Text><TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline /></View>
            </View>
        </ScrollView>
      </SafeAreaView>
      <FullScreenViewer visible={!!fullScreenMedia} uri={fullScreenMedia} onClose={() => setFullScreenMedia(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  appBarTitle: { fontSize: 18, fontWeight: '700' },
  saveText: { color: '#E8755A', fontWeight: '700', fontSize: 16 },
  scrollContent: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', opacity: 0.4, letterSpacing: 1, marginTop: 25, marginBottom: 15 },
  photoScroll: { flexDirection: 'row', marginBottom: 20, height: 160 },
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
  addBtn: { width: 100, height: 130, borderRadius: 12, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD' },
  form: { gap: 15 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', opacity: 0.5 },
  input: { backgroundColor: '#F2F2F2', borderRadius: 10, padding: 16, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  pill: { padding: 10, backgroundColor: '#F2F2F2', borderRadius: 20 },
  activePill: { backgroundColor: '#E8755A' },
  pillText: { fontWeight: '700', color: '#666' },
  activeText: { color: '#FFF' },
  fsContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fsMedia: { width: width, height: height },
  fsCloseBtn: { position: 'absolute', right: 20, zIndex: 50, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }
});