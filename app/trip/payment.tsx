// app/trip/payment.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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

const { width } = Dimensions.get('window');

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bookingId = params.bookingId as string;
  const tierName = params.tierName as string || "Trip Deposit";
  
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  const handlePay = async () => {
    // Basic Validation
    if (cardNumber.length < 16 || expiry.length < 4 || cvc.length < 3 || !name) {
        Alert.alert("Invalid Card", "Please check your card details.");
        return;
    }

    setLoading(true);

    // SIMULATE STRIPE DELAY (2 Seconds)
    setTimeout(async () => {
        try {
            // 1. In a real app, you would fetch a PaymentIntent from your server here.
            // 2. For MVP, we assume success and update the booking.
            
            const { data, error } = await supabase
                .from('bookings')
                .update({ 
                    status: 'active', 
                    chat_started_at: new Date().toISOString() 
                })
                .eq('id', bookingId)
                .select()
                .single();

            if (error) throw error;

            // Success!
            router.replace({ pathname: '/trip/chat', params: { bookingId: bookingId } });
            
        } catch (e: any) {
            Alert.alert("Payment Failed", e.message);
            setLoading(false);
        }
    }, 2000);
  };

  // Formatting Helpers
  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    setCardNumber(cleaned);
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2 && text.length > expiry.length) {
        setExpiry(cleaned.slice(0, 2) + '/' + cleaned.slice(2));
    } else {
        setExpiry(cleaned);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.blurPath, styles.blurCoral]} />
      <View style={[styles.blurPath, styles.blurYellow]} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commitment Deposit</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <View>
                        <Text style={styles.summaryLabel}>PAYMENT FOR</Text>
                        <Text style={styles.summaryValue}>{tierName}</Text>
                        <Text style={styles.escrowText}>Funds held in escrow until trip completion</Text>
                    </View>
                    <View style={styles.priceTag}>
                        <Text style={styles.priceSymbol}>£</Text>
                        <Text style={styles.priceAmount}>20</Text>
                        <Text style={styles.priceDec}>.00</Text>
                    </View>
                </View>

                {/* Visual Credit Card */}
                <LinearGradient 
                    colors={['#161616', '#2A2A2A']} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }}
                    style={styles.creditCard}
                >
                    <View style={styles.cardTop}>
                        <Image source={require('../../assets/images/logo.png')} style={styles.cardChip} resizeMode="contain" />
                        <Text style={styles.bankName}>Frolicr Pay</Text>
                    </View>
                    <Text style={styles.cardNumDisplay}>
                        {cardNumber ? cardNumber.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                    </Text>
                    <View style={styles.cardBottom}>
                        <View>
                            <Text style={styles.cardLabel}>CARD HOLDER</Text>
                            <Text style={styles.cardValue}>{name.toUpperCase() || 'YOUR NAME'}</Text>
                        </View>
                        <View>
                            <Text style={styles.cardLabel}>EXPIRES</Text>
                            <Text style={styles.cardValue}>{expiry || 'MM/YY'}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Input Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Card Name</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Name on Card" 
                            placeholderTextColor="#999"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Card Number</Text>
                        <View style={styles.inputIconWrap}>
                            <Ionicons name="card-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput 
                                style={[styles.input, { paddingLeft: 45 }]} 
                                placeholder="0000 0000 0000 0000" 
                                placeholderTextColor="#999"
                                keyboardType="number-pad"
                                maxLength={19}
                                value={cardNumber}
                                onChangeText={formatCardNumber}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Expiry Date</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="MM/YY" 
                                placeholderTextColor="#999"
                                keyboardType="number-pad"
                                maxLength={5}
                                value={expiry}
                                onChangeText={formatExpiry}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>CVC</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="123" 
                                placeholderTextColor="#999"
                                keyboardType="number-pad"
                                maxLength={3}
                                value={cvc}
                                onChangeText={setCvc}
                                secureTextEntry
                            />
                        </View>
                    </View>
                </View>

                {/* Secure Badge */}
                <View style={styles.secureRow}>
                    <Ionicons name="lock-closed" size={14} color="#3B9F16" />
                    <Text style={styles.secureText}>Payments are secure and encrypted.</Text>
                </View>

            </ScrollView>

            {/* Pay Button */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.payBtn, loading && styles.disabledBtn]} 
                    onPress={handlePay}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.payBtnText}>Pay Deposit</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  blurPath: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.3 },
  blurCoral: { top: '10%', left: -100, backgroundColor: 'rgba(232, 117, 90, 0.1)' },
  blurYellow: { bottom: '10%', right: -100, backgroundColor: 'rgba(212, 175, 55, 0.08)' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#161616' },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F2', borderRadius: 20 },
  
  scrollContent: { padding: 20 },
  
  summaryCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: '#999', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#161616' },
  escrowText: { fontSize: 11, color: '#3B9F16', marginTop: 4, fontWeight: '600' },
  priceTag: { flexDirection: 'row', alignItems: 'flex-start' },
  priceSymbol: { fontSize: 16, fontWeight: '700', color: '#161616', marginTop: 4 },
  priceAmount: { fontSize: 32, fontWeight: '800', color: '#161616' },
  priceDec: { fontSize: 16, fontWeight: '700', color: '#161616', marginTop: 4 },

  // Visual Card
  creditCard: { width: '100%', height: 200, borderRadius: 20, padding: 25, justifyContent: 'space-between', marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardChip: { width: 40, height: 40, tintColor: '#E8755A' }, // Logo as chip
  bankName: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 14 },
  cardNumDisplay: { color: '#FFF', fontSize: 22, fontWeight: '700', letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  cardValue: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 1 },

  // Form
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#161616', opacity: 0.7 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16, color: '#161616', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  inputIconWrap: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 15, zIndex: 1 },
  row: { flexDirection: 'row', gap: 15 },

  secureRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 30, opacity: 0.8 },
  secureText: { fontSize: 12, color: '#666' },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  payBtn: { backgroundColor: '#161616', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
  disabledBtn: { opacity: 0.7 },
  payBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' }
});