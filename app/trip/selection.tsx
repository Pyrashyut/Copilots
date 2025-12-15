import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const TIERS = [
  {
    id: 'local',
    name: 'Local',
    price: '£50 - £150',
    tag: 'First Date, Elevated',
    desc: 'Curated local experiences. 4-8 hours. Perfect for the cautious.',
    color: ['#4FACFE', '#00F2FE'],
  },
  {
    id: 'national',
    name: 'National',
    price: '£200 - £800',
    tag: 'Weekend Wanderers',
    desc: '2-3 day trips within the country. Boutique stays & unique vibes.',
    color: ['#43E97B', '#38F9D7'],
  },
  {
    id: 'international',
    name: 'International',
    price: '£800 - £2,000',
    tag: 'Passport Required',
    desc: '4-7 days. Full itinerary, flights, and accommodation included.',
    color: ['#FA709A', '#FEE140'],
  },
  {
    id: 'exotic',
    name: 'Exotic',
    price: '£2,000+',
    tag: 'Once in a Lifetime',
    desc: '7-14 days. Bucket-list destinations. Premium everything.',
    color: ['#667EEA', '#764BA2'],
  }
];

export default function TripSelection() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (tierId: string) => {
    setSelected(tierId);
    Alert.alert(
      "Tier Selected",
      "In the real app, this would trigger the Booking Fee flow to unlock the 5-minute chat bridge.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Pay Booking Fee", onPress: () => console.log("Unlock Chat") }
      ]
    );
  };

  return (
    <View style={styles.mainContainer}>
      {/* Custom Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan with {params.name}</Text>
          <View style={{ width: 24 }} /> {/* Spacer for centering */}
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Choose Your Adventure</Text>
        <Text style={styles.subHeader}>
          Select a tier to unlock the connection. The booking fee is split between you.
        </Text>

        <View style={styles.grid}>
          {TIERS.map((tier) => (
            <TouchableOpacity 
              key={tier.id} 
              activeOpacity={0.9}
              onPress={() => handleSelect(tier.id)}
            >
              <LinearGradient
                colors={tier.color as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.price}>{tier.price}</Text>
                </View>
                <Text style={styles.tag}>{tier.tag}</Text>
                <Text style={styles.desc}>{tier.desc}</Text>
                
                <View style={styles.button}>
                  <Text style={styles.btnText}>Select</Text>
                  <Ionicons name="arrow-forward" color={Colors.primary.navy} size={18} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
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
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: Colors.primary.navy,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.primary.navy,
    marginTop: 10,
  },
  subHeader: {
    fontSize: 15,
    color: Colors.neutral.grey,
    marginTop: 5,
    marginBottom: 20,
    lineHeight: 22,
  },
  grid: {
    gap: 15,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    minHeight: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  tierName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    opacity: 0.9,
  },
  tag: {
    fontSize: 14,
    color: 'white',
    fontStyle: 'italic',
    marginBottom: 10,
    opacity: 0.9,
  },
  desc: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
    marginBottom: 15,
  },
  button: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  btnText: {
    color: Colors.primary.navy,
    fontWeight: 'bold',
    fontSize: 14,
  }
});