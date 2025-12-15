import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';

const EXPERIENCES = [
  'Skydiving',
  'Street Food Tours',
  'Luxury Resorts',
  'Hiking / Trekking',
  'Art Museums',
  'Nightlife / Clubbing'
];

const OPTIONS = ['Love it', 'Want to try', 'Not for me'];

export default function OnboardingStep3() {
  const router = useRouter();
  const [matrix, setMatrix] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setRating = (item: string, rating: string) => {
    setMatrix(prev => ({ ...prev, [item]: rating }));
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      console.log("Updating profile...");
      const { error } = await supabase
        .from('profiles')
        .update({ 
          preferences: matrix,
          onboarding_complete: true 
        })
        .eq('id', user.id);

      if (error) throw error;

      console.log("Profile updated. Refreshing session...");
      
      // 1. Refresh Session (Triggers Layout listener)
      await supabase.auth.refreshSession();

      // 2. Explicitly tell user and navigate
      // We use replace to force a URL change which triggers the new Layout logic
      console.log("Navigating to tabs...");
      router.replace('/(tabs)');

    } catch (error: any) {
      console.error("Step 3 Error:", error);
      Alert.alert('Error', error.message);
    } finally {
      
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Experience Matrix</Text>
      <Text style={styles.subHeader}>Rate these activities to find your match.</Text>

      {EXPERIENCES.map((item) => (
        <View key={item} style={styles.card}>
          <Text style={styles.itemTitle}>{item}</Text>
          <View style={styles.optionsRow}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  matrix[item] === opt && styles.selectedChip
                ]}
                onPress={() => setRating(item, opt)}
              >
                <Text style={[
                  styles.chipText,
                  matrix[item] === opt && styles.selectedChipText
                ]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={finishOnboarding} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Launch Copilots</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.neutral.trailDust,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.navy,
    marginBottom: 5,
  },
  subHeader: {
    fontSize: 14,
    color: Colors.neutral.grey,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.navy,
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedChip: {
    backgroundColor: Colors.primary.navy,
    borderColor: Colors.primary.navy,
  },
  chipText: {
    fontSize: 12,
    color: '#666',
  },
  selectedChipText: {
    color: 'white',
    fontWeight: 'bold',
  },
  footer: {
    paddingBottom: 50,
    marginTop: 10,
  },
  button: {
    backgroundColor: Colors.highlight.gold,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    color: Colors.primary.navy,
    fontWeight: 'bold',
    fontSize: 18,
  },
});
