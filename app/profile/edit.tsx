// app/profile/edit.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

// The list of items from your Product Map concepts
const MATRIX_ITEMS = [
  "🤿 Snorkeling", "🧗 Climbing", "🍕 Food Tours", "🪂 Skydiving", 
  "🍣 Cooking", "⛷️ Skiing", "🚗 Road Trips", "🌅 Camping", 
  "🏛️ Museums", "⛵ Sailing", "🐘 Safari", "🌌 Stargazing",
  "🏨 Resorts", "🎒 Backpacking", "🍷 Wine Tasting", "🏄 Surfing"
];

const CATEGORIES = [
  { id: 'loved', label: 'Done & Loved', color: '#3B9F16', icon: 'thumbs-up' },
  { id: 'try', label: 'Want to Try', color: '#EEC72E', icon: 'list' },
  { id: 'dislike', label: 'Not For Me', color: '#E03724', icon: 'thumbs-down' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile State
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  
  // Matrix State
  const [preferences, setPreferences] = useState<any>({ loved: [], try: [], dislike: [] });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setUsername(data.username || '');
        setAge(data.age?.toString() || '');
        setBio(data.bio || '');
        setLocation(data.location || '');
        setImages(data.photos || []);
        // Preferences usually stored as { loved: [...], try: [...], dislike: [...] }
        setPreferences(data.preferences || { loved: [], try: [], dislike: [] });
      }
    } finally { setLoading(false); }
  };

  const pickImage = async () => {
    if (images.length >= 5) return Alert.alert("Max 5 photos allowed");
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.5,
    });
    if (!result.canceled) setImages([...images, result.assets[0].uri]);
  };

  const toggleItem = (item: string) => {
    if (!activeCategory) return;
    const newPrefs = { ...preferences };
    
    const currentList = [...(newPrefs[activeCategory] || [])];
    
    if (currentList.includes(item)) {
      newPrefs[activeCategory] = currentList.filter(i => i !== item);
    } else {
      // Logic: An item can only be in ONE category. 
      // Remove from others before adding to the active one.
      CATEGORIES.forEach(cat => {
        newPrefs[cat.id] = (newPrefs[cat.id] || []).filter((i: string) => i !== item);
      });
      newPrefs[activeCategory] = [...(newPrefs[activeCategory] || []), item];
    }
    setPreferences(newPrefs);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('profiles').update({
        username, 
        age: age ? parseInt(age) : null, 
        bio, 
        location, 
        photos: images, 
        preferences
      }).eq('id', user.id);
      
      if (error) throw error;
      
      Alert.alert("Success", "Profile updated successfully");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>;

  return (
    <View style={styles.container}>
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.iconBtn}>
            {saving ? <ActivityIndicator size="small" color="#E8755A" /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionLabel}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {images.map((img, i) => (
              <View key={i} style={styles.photoWrapper}>
                <Image source={{ uri: img }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => setImages(images.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addBtn} onPress={pickImage}>
                <Ionicons name="add" size={30} color="#CCC" />
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.form}>
            <View style={styles.inputGroup}><Text style={styles.label}>Name</Text><TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Display Name" /></View>
            <View style={styles.inputGroup}><Text style={styles.label}>Age</Text><TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="e.g. 25" /></View>
            <View style={styles.inputGroup}><Text style={styles.label}>Location</Text><TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. London, UK" /></View>
            <View style={styles.inputGroup}><Text style={styles.label}>Bio</Text><TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline numberOfLines={4} placeholder="Your travel story..." /></View>
          </View>

          <Text style={styles.sectionLabel}>Experience Matrix</Text>
          <View style={styles.matrixContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.matrixCard, { backgroundColor: cat.color + '10' }]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <View style={[styles.matrixIcon, { backgroundColor: cat.color }]}>
                  <Ionicons name={cat.icon as any} size={14} color="#FFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.matrixTitle}>{cat.label}</Text>
                  <Text style={styles.matrixItems} numberOfLines={1}>
                    {(preferences[cat.id] || []).length > 0 ? preferences[cat.id].join(' • ') : 'None selected'}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={cat.color} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>

      {/* MATRIX SELECTOR MODAL */}
      <Modal visible={activeCategory !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {CATEGORIES.find(c => c.id === activeCategory)?.label}
              </Text>
              <TouchableOpacity onPress={() => setActiveCategory(null)}>
                <Ionicons name="close-circle" size={30} color="#161616" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalGrid}>
              {MATRIX_ITEMS.map((item) => {
                const isSelected = preferences[activeCategory!]?.includes(item);
                return (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.gridItem, isSelected && { backgroundColor: '#161616' }]} 
                    onPress={() => toggleItem(item)}
                  >
                    <Text style={[styles.gridText, isSelected && { color: '#FFF' }]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setActiveCategory(null)}>
              <Text style={styles.doneBtnText}>Save Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  blurPath: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.4 },
  blurCoral: { top: '15%', left: -80, backgroundColor: 'rgba(255, 122, 73, 0.08)' },
  blurYellow: { top: -50, right: -50, backgroundColor: 'rgba(255, 243, 73, 0.08)' },
  
  // FIXED: Added missing header style
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    height: 60 
  },
  
  appBarTitle: { fontSize: 18, fontWeight: '700', color: '#161616' },
  iconBtn: { width: 60, height: 40, justifyContent: 'center', alignItems: 'center' },
  saveText: { color: '#E8755A', fontSize: 16, fontWeight: '700' },
  
  scrollContent: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', opacity: 0.4, letterSpacing: 1, marginBottom: 15, marginTop: 25 },
  
  photoScroll: { flexDirection: 'row', marginBottom: 10 },
  photoWrapper: { position: 'relative', marginRight: 12 },
  photoThumb: { width: 100, height: 130, borderRadius: 12, backgroundColor: '#F2F2F2' },
  removeBtn: { position: 'absolute', top: -5, right: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: '#E03724', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  addBtn: { width: 100, height: 130, borderRadius: 12, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD' },
  
  form: { marginTop: 10, gap: 15 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', opacity: 0.5 },
  input: { backgroundColor: '#F2F2F2', borderRadius: 10, padding: 16, fontSize: 15, color: '#161616' },
  textArea: { height: 80, textAlignVertical: 'top' },
  
  matrixContainer: { gap: 10 },
  matrixCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  matrixIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  matrixTitle: { fontSize: 14, fontWeight: '700', color: '#161616' },
  matrixItems: { fontSize: 12, opacity: 0.5, marginTop: 2 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, height: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#161616' },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 20 },
  gridItem: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F2F2F2', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  gridText: { fontSize: 14, fontWeight: '600', color: '#161616' },
  doneBtn: { backgroundColor: '#161616', padding: 18, borderRadius: 100, alignItems: 'center', marginTop: 10 },
  doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});