import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function MatchesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Copilots</Text>
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No flights booked yet.</Text>
        <Text style={styles.subText}>Go to Discover to find your travel partner.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.trailDust,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.navy,
    marginBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.neutral.grey,
  },
  subText: {
    fontSize: 16,
    color: Colors.neutral.grey,
    marginTop: 10,
  },
});