// app/trip/selection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const TIERS = [
  {
    id: 'local',
    name: 'Local Explorer',
    price: '£50 - £150',
    tag: 'First Date Vibes',
    desc: 'Curated local experiences perfect for getting to know each other. 4-8 hours of adventure.',
    icon: 'cafe',
    color: ['#4FACFE', '#00F2FE'] as const,
    features: ['4-8 hours', 'Local spots', 'Low commitment'],
  },
  {
    id: 'national',
    name: 'Weekend Escape',
    price: '£200 - £800',
    tag: 'Mini Adventure',
    desc: '2-3 day trips exploring your country. Boutique stays and unique experiences await.',
    icon: 'car',
    color: ['#6BCF7F', '#38D98D'] as const,
    features: ['2-3 days', 'Domestic travel', 'Boutique stays'],
  },
  {
    id: 'international',
    name: 'International Journey',
    price: '£800 - £2,000',
    tag: 'Passport Required',
    desc: '4-7 days exploring a new country together. Full itinerary with flights and accommodation.',
    icon: 'airplane',
    color: ['#FA709A', '#FEE140'] as const,
    features: ['4-7 days', 'Flights included', 'Full itinerary'],
  },
  {
    id: 'exotic',
    name: 'Exotic Adventure',
    price: '£2,000+',
    tag: 'Bucket List Dream',
    desc: '7-14 days in paradise. Premium everything for once-in-a-lifetime memories.',
    icon: 'beach',
    color: ['#667EEA', '#764BA2'] as const,
    features: ['7-14 days', 'Premium luxury', 'Unforgettable'],
  }
] as const;

export default function TripSelection() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (tierId: string, tierName: string, price: string) => {
    setSelected(tierId);
    Alert.alert(
      "Adventure Selected! ✈️",
      `You've chosen the ${tierName} tier (${price}).\n\nIn the full app, this will unlock a 5-minute chat to coordinate your trip!`,
      [
        { text: "Maybe Later", style: "cancel", onPress: () => setSelected(null) },
        { 
          text: "Unlock Chat", 
          style: "default",
          onPress: () => {
            Alert.alert("Coming Soon!", "Payment processing will be added in the next version.");
            setSelected(null);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerSubtitle}>Plan with</Text>
            <Text style={styles.headerTitle}>{params.name}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <Text style={styles.pageTitle}>Choose Your Adventure</Text>
          <Text style={styles.subHeader}>
            Select a tier to unlock your connection. The booking fee is split equally between you both.
          </Text>
        </View>

        <View style={styles.grid}>
          {TIERS.map((tier, index) => (
            <TouchableOpacity 
              key={tier.id} 
              activeOpacity={0.95}
              onPress={() => handleSelect(tier.id, tier.name, tier.price)}
              style={[
                styles.cardWrapper,
                selected === tier.id && styles.selectedCard,
              ]}
            >
              <LinearGradient
                colors={tier.color}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                {/* Icon Badge */}
                <View style={styles.iconBadge}>
                  <Ionicons name={tier.icon as any} size={24} color={Colors.neutral.white} />
                </View>

                {/* Header */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.tierName}>{tier.name}</Text>
                    <Text style={styles.tag}>{tier.tag}</Text>
                  </View>
                  <Text style={styles.price}>{tier.price}</Text>
                </View>

                {/* Description */}
                <Text style={styles.desc}>{tier.desc}</Text>

                {/* Features */}
                <View style={styles.features}>
                  {tier.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Select Button */}
                <View style={styles.selectButton}>
                  <Text style={styles.btnText}>Select Adventure</Text>
                  <Ionicons name="arrow-forward" color={Colors.primary.navy} size={18} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={Colors.secondary.teal} />
          <Text style={styles.infoText}>
            After selecting a tier, you'll unlock a 5-minute chat window to coordinate details before committing.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.neutral.trailDust,
  },
  safeArea: {
    backgroundColor: Colors.primary.navy,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.primary.navy,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.neutral.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  introSection: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary.navy,
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 15,
    color: Colors.neutral.grey,
    lineHeight: 22,
  },
  grid: {
    gap: 16,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  selectedCard: {
    transform: [{ scale: 0.98 }],
  },
  card: {
    borderRadius: 20,
    padding: 20,
    minHeight: 240,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 56,
  },
  tierName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.neutral.white,
    marginBottom: 4,
  },
  tag: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.neutral.white,
  },
  desc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 20,
    marginBottom: 16,
  },
  features: {
    gap: 8,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  selectButton: {
    backgroundColor: Colors.neutral.white,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: Colors.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: Colors.primary.navy,
    fontWeight: '700',
    fontSize: 15,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.neutral.white,
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary.teal,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.neutral.greyDark,
    lineHeight: 20,
  },
});