// app/trip/itinerary.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Image,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

const MOCK_ITINERARY = {
  title: "Hidden Jazz & Cocktails",
  location: "Soho, London",
  meeting_point: "Ronnie Scott's Entrance",
  coords: { lat: 51.5128, lng: -0.1306 },
  image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1000&auto=format&fit=crop",
  schedule: [
    { time: "19:00", title: "The Meeting", desc: "Meet under the neon sign. Look for the red scarf." },
    { time: "19:15", title: "Icebreaker Drink", desc: "Reserved table at The Little Scarlet Door." },
    { time: "20:30", title: "Main Event", desc: "Live Saxophone performance & Tapas." },
    { time: "22:00", title: "The Walk", desc: "Stroll through Chinatown lanterns." }
  ],
  packing: ["Smart Casual", "Comfortable Shoes", "ID Required"],
  weather: "12°C • Cloudy"
};

export default function ItineraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // DEFAULT TO REVEALED for MVP/Demo purposes since it's an Active Trip
  const [revealed, setRevealed] = useState(true);

  const openMaps = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${MOCK_ITINERARY.coords.lat},${MOCK_ITINERARY.coords.lng}`;
    const label = MOCK_ITINERARY.meeting_point;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    if (url) Linking.openURL(url);
  };

  if (!revealed) {
    return (
      <View style={styles.container}>
        <Image 
            source={{ uri: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop" }} 
            style={styles.bgImage} 
            blurRadius={10} 
        />
        <LinearGradient colors={['rgba(0,0,0,0.6)', '#161616']} style={styles.lockOverlay}>
            <View style={styles.lockContent}>
                <View style={styles.lockIconCircle}>
                    <Ionicons name="lock-closed" size={40} color="#E8755A" />
                </View>
                <Text style={styles.lockTitle}>Top Secret</Text>
                <Text style={styles.lockDesc}>
                    Your itinerary is being curated by our experts. Details will unlock 48 hours before your date.
                </Text>
                
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* HERO IMAGE */}
        <View style={styles.heroContainer}>
            <Image source={{ uri: MOCK_ITINERARY.image }} style={styles.heroImage} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.heroOverlay}>
                <TouchableOpacity onPress={() => router.back()} style={styles.heroBack}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <View style={styles.tagRow}>
                        <View style={styles.tag}><Text style={styles.tagText}>Tier: Local</Text></View>
                        <View style={styles.tag}><Text style={styles.tagText}>{MOCK_ITINERARY.weather}</Text></View>
                    </View>
                    <Text style={styles.heroTitle}>{MOCK_ITINERARY.title}</Text>
                    <Text style={styles.heroLoc}><Ionicons name="location" size={16} color="#E8755A" /> {MOCK_ITINERARY.location}</Text>
                </View>
            </LinearGradient>
        </View>

        {/* MEETING POINT CARD */}
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>📍 Meeting Point</Text>
            <View style={styles.mapCard}>
                <View style={styles.mapText}>
                    <Text style={styles.meetTitle}>{MOCK_ITINERARY.meeting_point}</Text>
                    <Text style={styles.meetDesc}>Check-in required upon arrival.</Text>
                </View>
                <TouchableOpacity style={styles.dirBtn} onPress={openMaps}>
                    <Ionicons name="navigate" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>

        {/* TIMELINE */}
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>📅 The Plan</Text>
            <View style={styles.timeline}>
                {MOCK_ITINERARY.schedule.map((item, index) => (
                    <View key={index} style={styles.timelineItem}>
                        <View style={styles.timeColumn}>
                            <Text style={styles.timeText}>{item.time}</Text>
                            {index !== MOCK_ITINERARY.schedule.length - 1 && <View style={styles.line} />}
                        </View>
                        <View style={styles.eventContent}>
                            <Text style={styles.eventTitle}>{item.title}</Text>
                            <Text style={styles.eventDesc}>{item.desc}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>

        {/* PACKING LIST */}
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>🎒 Packing List</Text>
            <View style={styles.packingRow}>
                {MOCK_ITINERARY.packing.map((item, i) => (
                    <View key={i} style={styles.packItem}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#3B9F16" />
                        <Text style={styles.packText}>{item}</Text>
                    </View>
                ))}
            </View>
        </View>

        {/* SAFETY */}
        <TouchableOpacity style={styles.sosBtn}>
            <Ionicons name="shield-checkmark" size={20} color="#161616" />
            <Text style={styles.sosText}>Safety Center & Support</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  
  bgImage: { width: width, height: '100%' },
  lockOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 30 },
  lockContent: { alignItems: 'center', gap: 20 },
  lockIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(232, 117, 90, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8755A' },
  lockTitle: { fontSize: 28, fontWeight: '700', color: '#FFF', letterSpacing: 1 },
  lockDesc: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 24 },
  backBtn: { marginTop: 10 },
  backText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  heroContainer: { height: 350, width: width },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 20, paddingBottom: 30 },
  heroBack: { marginTop: 40, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  tagRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  tag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tagText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#FFF', lineHeight: 36, marginBottom: 5 },
  heroLoc: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  card: { padding: 20, borderBottomWidth: 8, borderBottomColor: '#F9F9F9' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#161616', marginBottom: 15 },
  
  mapCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F2', padding: 15, borderRadius: 16 },
  mapText: { flex: 1 },
  meetTitle: { fontSize: 16, fontWeight: '700', color: '#161616' },
  meetDesc: { fontSize: 13, color: '#666', marginTop: 4 },
  dirBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8755A', justifyContent: 'center', alignItems: 'center' },

  timeline: { paddingLeft: 10 },
  timelineItem: { flexDirection: 'row', marginBottom: 5 },
  timeColumn: { alignItems: 'center', width: 50, marginRight: 15 },
  timeText: { fontSize: 13, fontWeight: '700', color: '#E8755A' },
  line: { width: 2, flex: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 5 },
  eventContent: { flex: 1, paddingBottom: 25 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: '#161616', marginBottom: 4 },
  eventDesc: { fontSize: 14, color: '#666', lineHeight: 20 },

  packingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  packItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59, 159, 22, 0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  packText: { fontSize: 13, fontWeight: '600', color: '#3B9F16' },

  sosBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, margin: 20, padding: 15, borderRadius: 12, backgroundColor: '#F2F2F2', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  sosText: { fontWeight: '700', color: '#161616' }
});