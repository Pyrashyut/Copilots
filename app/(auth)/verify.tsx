// app/(auth)/verify.tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState(['', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const updateCode = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    // Auto-advance to next input
    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const displayEmail = email || 'your email';

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* App Bar */}
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#292D32" />
          </TouchableOpacity>
          <Text style={styles.appBarLabel}>Verify Email</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Logo */}
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Heading */}
          <View style={styles.headingContainer}>
            <Text style={styles.title}>Verify your email.</Text>
            <Text style={styles.desc}>
              Enter the code we've sent to your email{'\n'}
              <Text style={styles.emailHighlight}>{displayEmail}</Text>
            </Text>
          </View>

          {/* 4-digit code boxes */}
          <View style={styles.codeRow}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.codeBox,
                  code[i] ? styles.codeBoxFilled : null,
                ]}
              >
                <TextInput
                  ref={(ref) => { inputRefs.current[i] = ref; }}
                  style={styles.codeText}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={code[i]}
                  onChangeText={(t) => updateCode(t, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  textAlign="center"
                />
              </View>
            ))}
          </View>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive code? </Text>
            <TouchableOpacity onPress={() => Alert.alert('Resent', 'Code has been sent again')}>
              <Text style={styles.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
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
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 28,
    paddingTop: 40,
  },
  logo: { width: 52, height: 52 },
  headingContainer: { width: '100%', gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#161616', letterSpacing: -0.5 },
  desc: { fontSize: 14, color: 'rgba(22,22,22,0.55)', lineHeight: 22 },
  emailHighlight: { color: '#161616', fontWeight: '600' },
  codeRow: { flexDirection: 'row', gap: 12, width: '100%' },
  codeBox: {
    flex: 1,
    height: 56,
    backgroundColor: '#F2F2F2',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxFilled: {
    borderColor: Colors.primary.coral,
    backgroundColor: '#FFF',
  },
  codeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#161616',
    width: '100%',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendLabel: { fontSize: 13, color: 'rgba(22,22,22,0.5)' },
  resendLink: { fontSize: 13, color: Colors.primary.coral, fontWeight: '700' },
  primaryButton: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.primary.coral,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
