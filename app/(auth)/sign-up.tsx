// app/(auth)/sign-up.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    if (!email || !password || !confirmPassword)
      return Alert.alert('Please fill in all fields');
    if (password !== confirmPassword)
      return Alert.alert("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Sign Up Failed', error.message);
      setLoading(false);
    } else {
      router.push('/(auth)/verify');
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* App Bar */}
          <View style={styles.appBar}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#292D32" />
            </TouchableOpacity>
            <Text style={styles.appBarLabel}>Get Started</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              {/* Logo */}
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />

              {/* Login / Sign Up segmented picker */}
              <View style={styles.segmentedPicker}>
                <TouchableOpacity
                  style={styles.segmentOption}
                  onPress={() => router.replace('/(auth)/login')}
                >
                  <Text style={styles.inactiveSegmentText}>Login</Text>
                </TouchableOpacity>
                <View style={[styles.segmentOption, styles.activeSegment]}>
                  <Text style={styles.activeSegmentText}>Sign Up</Text>
                </View>
              </View>

              {/* Heading */}
              <View style={styles.headingContainer}>
                <Text style={styles.title}>Create account</Text>
                <Text style={styles.desc}>Your next adventure starts here</Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor="rgba(22, 22, 22, 0.4)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Ionicons name="mail-outline" size={20} color="#292D32" />
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="rgba(22, 22, 22, 0.4)"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Ionicons name="lock-closed-outline" size={20} color="#292D32" />
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="rgba(22, 22, 22, 0.4)"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <Ionicons name="lock-closed-outline" size={20} color="#292D32" />
                </View>
              </View>

              {/* Primary CTA */}
              <TouchableOpacity style={styles.primaryButton} onPress={signUpWithEmail} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.buttonText}>Create Account</Text>}
              </TouchableOpacity>

              {/* Footer note */}
              <Text style={styles.footerNote}>
                by creating an account, you agree to our's{' '}
                <Text style={styles.footerLink}>Privacy Policy</Text>
                {' '}and{' '}
                <Text style={styles.footerLink}>Terms of Use</Text>
                .
              </Text>

              {/* Social Auth */}
              <View style={styles.socialColumn}>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-google" size={20} color="#000" />
                  <Text style={styles.socialText}>Continue with Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#000', borderColor: '#000' }]}>
                  <Ionicons name="logo-apple" size={20} color="#FFF" />
                  <Text style={[styles.socialText, { color: '#FFF' }]}>Continue with Apple</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(22, 22, 22, 0.04)',
  },
  appBarLabel: { fontSize: 18, fontWeight: '700', color: '#000' },
  scrollContent: { paddingBottom: 40 },
  content: { paddingHorizontal: 16, alignItems: 'center', gap: 20, paddingTop: 24 },
  logo: { width: 52, height: 52 },
  segmentedPicker: {
    flexDirection: 'row',
    backgroundColor: '#F1F1F1',
    padding: 4,
    borderRadius: 10,
    width: '100%',
  },
  segmentOption: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 7,
  },
  activeSegment: { backgroundColor: '#FFF' },
  activeSegmentText: { fontWeight: '700', color: '#181818', fontSize: 15 },
  inactiveSegmentText: { fontWeight: '400', color: '#888', fontSize: 15 },
  headingContainer: { width: '100%', gap: 6 },
  title: { fontSize: 22, fontWeight: '700', color: '#161616', letterSpacing: -0.5 },
  desc: { fontSize: 14, color: 'rgba(22,22,22,0.55)' },
  form: { width: '100%', gap: 14 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 50,
  },
  input: { flex: 1, fontSize: 14, color: '#161616' },
  primaryButton: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.primary.coral,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footerNote: {
    fontSize: 12,
    color: 'rgba(22,22,22,0.5)',
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  footerLink: { color: Colors.primary.coral, fontWeight: '600' },
  socialColumn: { width: '100%', gap: 12 },
  socialButton: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#FFF',
  },
  socialText: { fontWeight: '600', fontSize: 14, color: '#000' },
});
