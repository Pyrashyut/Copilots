import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface Profile {
  id: string;
  username: string;
  photos: string[];
  job_title?: string;
  age?: number;
  location?: string;
  bio?: string;
}

export default function SwipeCard({ profile }: { profile: Profile }) {
  const photoUrl = profile.photos && profile.photos.length > 0 
    ? profile.photos[0] 
    : 'https://via.placeholder.com/400x600';

  return (
    <View style={styles.card}>
      <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      >
        <View style={styles.infoContainer}>
          <Text style={styles.name}>
            {profile.username}
            {profile.age ? `, ${profile.age}` : ''}
          </Text>
          
          {profile.job_title && (
            <View style={styles.row}>
              <Ionicons name="briefcase-outline" size={16} color="#ddd" />
              <Text style={styles.subText}>{profile.job_title}</Text>
            </View>
          )}

          {profile.location && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color="#ddd" />
              <Text style={styles.subText}>{profile.location}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: width * 0.9,
    height: height * 0.65,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    justifyContent: 'flex-end',
    padding: 20,
  },
  infoContainer: {
    marginBottom: 10,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  subText: {
    fontSize: 16,
    color: '#ddd',
  }
});