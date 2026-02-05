// app/(auth)/sign-up.tsx
import { Ionicons } from '@expo/vector-icons';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    if (password !== confirmPassword) return Alert.alert("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Sign Up Failed', error.message);
      setLoading(false);
    } else {
      router.push('/(auth)/verify'); // Send to our new Verify page
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#292D32" />
          </TouchableOpacity>
          <Text style={styles.appBarLabel}>Sign Up</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />

            <View style={styles.segmentedPicker}>
              <TouchableOpacity style={styles.segmentOption} onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.inactiveSegmentText}>Sign In</Text>
              </TouchableOpacity>
              <View style={[styles.segmentOption, styles.activeSegment]}>
                <Text style={styles.activeSegmentText}>Sign Up</Text>
              </View>
            </View>

            <View style={styles.headingContainer}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.desc}>Start Your Journey</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="rgba(22, 22, 22, 0.4)" value={email} onChangeText={setEmail} autoCapitalize="none" />
                <Ionicons name="mail-outline" size={20} color="#292D32" />
              </View>
              <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholder="Password" placeholderTextColor="rgba(22, 22, 22, 0.4)" secureTextEntry value={password} onChangeText={setPassword} />
                <Ionicons name="lock-closed-outline" size={20} color="#292D32" />
              </View>
              <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="rgba(22, 22, 22, 0.4)" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
                <Ionicons name="lock-closed-outline" size={20} color="#292D32" />
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={signUpWithEmail} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Create Account</Text>}
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              By creating an account you agree to our Terms of Service and Privacy Policy.
            </Text>

            <View style={styles.divider} />

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={20} color="#000" />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#000' }]}>
                <Ionicons name="logo-apple" size={20} color="#FFF" />
                <Text style={[styles.socialText, { color: '#FFF' }]}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Copy styles from Login.tsx and add:
const styles = StyleSheet.create({
  // ... all styles from Login.tsx ...
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  blurPath: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.5 },
  blurCoral: { top: '20%', left: -50, backgroundColor: 'rgba(255, 122, 73, 0.08)', transform: [{ scaleX: 1.5 }] },
  blurYellow: { top: -50, right: -50, backgroundColor: 'rgba(255, 243, 73, 0.08)' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(22, 22, 22, 0.04)' },
  appBarLabel: { fontSize: 21, fontWeight: '700', color: '#000', fontFamily: 'DM Sans' },
  scrollContent: { paddingBottom: 40 },
  content: { paddingHorizontal: 16, alignItems: 'center', gap: 24, paddingTop: 24 },
  logo: { width: 48, height: 48 },
  segmentedPicker: { flexDirection: 'row', backgroundColor: '#F1F1F1', padding: 4, borderRadius: 9, width: '100%' },
  segmentOption: { flex: 1, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 7 },
  activeSegment: { backgroundColor: '#FFF' },
  activeSegmentText: { fontWeight: '700', color: '#181818', fontSize: 16 },
  inactiveSegmentText: { fontWeight: '400', color: '#000', fontSize: 16 },
  headingContainer: { width: '100%', gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#161616', letterSpacing: -1 },
  desc: { fontSize: 16, color: '#161616', opacity: 0.6 },
  form: { width: '100%', gap: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F2', borderRadius: 10, paddingHorizontal: 16, height: 48 },
  input: { flex: 1, fontSize: 14, color: '#161616' },
  primaryButton: { width: '100%', height: 55, backgroundColor: '#E8755A', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  divider: { width: '100%', height: 1, backgroundColor: '#E7E7E7', marginVertical: 8 },
  socialRow: { flexDirection: 'row', gap: 16, width: '100%' },
  socialButton: { flex: 1, height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', backgroundColor: '#FFF' },
  socialText: { fontWeight: '700', fontSize: 14, color: '#000' },
  footerNote: { fontSize: 12, color: '#222831', opacity: 0.7, textAlign: 'center', paddingHorizontal: 20 },
});