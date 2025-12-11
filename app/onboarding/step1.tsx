import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';

export default function OnboardingStep1() {
  const router = useRouter();
  const [job, setJob] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  async function nextStep() {
    if (!job || !location || !bio) {
      Alert.alert('Missing Info', 'Please fill out your Pilot License details.');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ job_title: job, location, bio })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        router.push('/onboarding/step2');
      }
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Where are you based?</Text>
      <TextInput 
        style={styles.input} 
        placeholder="London, UK" 
        placeholderTextColor="#999"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>What do you do?</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Product Designer" 
        placeholderTextColor="#999"
        value={job}
        onChangeText={setJob}
      />

      <Text style={styles.label}>Your Flight Log (Bio)</Text>
      <TextInput 
        style={[styles.input, styles.textArea]} 
        placeholder="I love sunsets and sushi..." 
        placeholderTextColor="#999"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={styles.button} onPress={nextStep} disabled={loading}>
        <Text style={styles.buttonText}>Next: Travel Style</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.neutral.trailDust, // Using the "Neutral" beige from PDF
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.navy,
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.neutral.white,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: 30,
    backgroundColor: Colors.primary.navy,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.neutral.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});