import { View, Text, Button, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to Copilots</Text>
      <Text style={styles.subtext}>You are logged in!</Text>
      <Button title="Sign Out" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    marginBottom: 20,
  },
  subtext: {
    fontSize: 16,
    marginBottom: 20,
    color: 'gray'
  }
});