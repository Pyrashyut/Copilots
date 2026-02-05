// app/(auth)/verify.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

export default function Verify() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '']);

  const updateCode = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#292D32" />
          </TouchableOpacity>
          <Text style={styles.appBarLabel}>Verify</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          
          <View style={styles.headingContainer}>
            <Text style={styles.title}>Verification</Text>
            <Text style={styles.desc}>We've sent a code to your email. Please enter it below.</Text>
          </View>

          <View style={styles.codeRow}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.codeBox}>
                <TextInput
                  style={styles.codeText}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={code[i]}
                  onChangeText={(t) => updateCode(t, i)}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={() => Alert.alert("Resent", "Code has been sent again")}>
            <Text style={styles.resendText}>Resend Code</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => router.replace('/onboarding/step0')}
          >
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  blurPath: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.5 },
  blurCoral: { top: '20%', left: -50, backgroundColor: 'rgba(255, 122, 73, 0.08)', transform: [{ scaleX: 1.5 }] },
  blurYellow: { top: -50, right: -50, backgroundColor: 'rgba(255, 243, 73, 0.08)' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(22, 22, 22, 0.04)' },
  appBarLabel: { fontSize: 21, fontWeight: '700', color: '#000' },
  content: { paddingHorizontal: 16, alignItems: 'center', gap: 32, paddingTop: 40 },
  logo: { width: 48, height: 48 },
  headingContainer: { width: '100%', gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#161616', letterSpacing: -1 },
  desc: { fontSize: 16, color: '#161616', opacity: 0.6, lineHeight: 24 },
  codeRow: { flexDirection: 'row', gap: 8, width: '100%' },
  codeBox: { flex: 1, height: 55, backgroundColor: '#F2F2F2', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  codeText: { fontSize: 24, fontWeight: '700', color: '#161616' },
  resendText: { fontWeight: '700', fontSize: 14, color: '#161616' },
  primaryButton: { width: '100%', height: 55, backgroundColor: '#E8755A', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});