// app/(tabs)/settings.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProfile(); }, []));

  const toggleVisibility = async (val: boolean) => {
    setProfile({ ...profile, is_visible: val });
    await supabase.from('profiles').update({ is_visible: val }).eq('id', profile.id);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        } 
      }
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#E8755A" /></View>;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionLabel}>Account Settings</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.item} onPress={() => router.push('/profile/edit' as any)}>
              <View style={styles.itemLeft}>
                <Ionicons name="person-outline" size={20} color="#161616" />
                <Text style={styles.itemLabel}>Edit Profile Information</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
            
            <View style={[styles.item, { borderBottomWidth: 0 }]}>
              <View style={styles.itemLeft}>
                <Ionicons name="eye-outline" size={20} color="#161616" />
                <Text style={styles.itemLabel}>Visible in Discovery</Text>
              </View>
              <Switch 
                value={profile?.is_visible} 
                onValueChange={toggleVisibility} 
                trackColor={{ true: '#E8755A' }} 
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Security & Privacy</Text>
          <View style={styles.card}>
             <TouchableOpacity style={[styles.item, { borderBottomWidth: 0 }]}>
              <View style={styles.itemLeft}>
                <Ionicons name="notifications-outline" size={20} color="#161616" />
                <Text style={styles.itemLabel}>Notification Preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          </View>

          {/* SIGN OUT BUTTON */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#E03724" />
            <Text style={styles.logoutText}>Sign Out of Frolicr</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Version 1.0.0 (January 2026)</Text>
          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', opacity: 0.4, letterSpacing: 1, marginBottom: 12, marginTop: 24 },
  card: { backgroundColor: '#F9F9F9', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemLabel: { fontSize: 16, fontWeight: '500', color: '#161616' },
  logoutBtn: { 
    marginTop: 40, 
    padding: 18, 
    backgroundColor: 'rgba(224, 55, 36, 0.08)', 
    borderRadius: 15, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 10 
  },
  logoutText: { color: '#E03724', fontWeight: '700', fontSize: 16 },
  version: { textAlign: 'center', marginTop: 30, opacity: 0.2, fontSize: 12 }
});