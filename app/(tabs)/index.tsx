import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function DiscoverScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Discover</Text>
      <Text style={styles.subText}>Finding potential copilots...</Text>
      {/* We will build the Swipe Deck here next */}
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
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary.navy,
  },
  subText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.neutral.grey,
  }
});