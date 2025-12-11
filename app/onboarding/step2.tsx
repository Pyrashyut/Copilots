import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';

const TRAITS = [
  { id: 'planning', left: 'Strict Planner', right: 'Go with Flow' },
  { id: 'budget', left: 'Backpacker', right: 'Luxury' },
  { id: 'morning', left: 'Early Bird', right: 'Night Owl' },
  { id: 'pacing', left: 'Relaxed', right: 'Action Packed' },
];

export default function OnboardingStep2() {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>({});

  const selectTrait = (id: string, value: string) => {
    setSelections(prev => ({ ...prev, [id]: value }));
  };

  const nextStep = () => {
    // In a real app, save 'selections' to Supabase here
    // For prototype speed, we'll pass to next step or just save at the end
    router.push('/onboarding/step3');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>What kind of traveler are you?</Text>

      {TRAITS.map((trait) => (
        <View key={trait.id} style={styles.row}>
          <TouchableOpacity 
            style={[styles.option, selections[trait.id] === 'left' && styles.selectedLeft]}
            onPress={() => selectTrait(trait.id, 'left')}
          >
            <Text style={[styles.text, selections[trait.id] === 'left' && styles.selectedText]}>
              {trait.left}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={[styles.option, selections[trait.id] === 'right' && styles.selectedRight]}
            onPress={() => selectTrait(trait.id, 'right')}
          >
            <Text style={[styles.text, selections[trait.id] === 'right' && styles.selectedText]}>
              {trait.right}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={nextStep}>
        <Text style={styles.buttonText}>Next: The Experience Matrix</Text>
      </TouchableOpacity>
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
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary.navy,
    marginBottom: 30,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral.white,
    borderRadius: 50,
    marginBottom: 20,
    height: 60,
    alignItems: 'center',
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  option: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 46,
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: '#eee',
  },
  text: {
    color: Colors.neutral.grey,
    fontWeight: '600',
  },
  selectedLeft: {
    backgroundColor: Colors.primary.navy,
  },
  selectedRight: {
    backgroundColor: Colors.primary.navy,
  },
  selectedText: {
    color: Colors.neutral.white,
  },
  button: {
    marginTop: 20,
    backgroundColor: Colors.primary.coral,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});