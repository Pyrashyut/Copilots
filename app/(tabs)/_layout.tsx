// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// --- HELPER: Tab Icon Component (Handles Video/Image) ---
const ProfileTabIcon = ({ focused, color, uri }: { focused: boolean; color: string; uri: string | null }) => {
  const isVideo = uri?.match(/\.(mp4|mov|qt)$/i);
  
  // Use hook safely; pass null if not video
  const player = useVideoPlayer(isVideo ? uri : null, player => {
    player.muted = true;
    player.loop = true;
    player.play();
  });

  return (
    <View style={{
      borderWidth: focused ? 2 : 0,
      borderColor: '#E8755A',
      borderRadius: 15,
      padding: 2,
      overflow: 'hidden'
    }}>
      {uri ? (
        isVideo ? (
            <VideoView 
                player={player} 
                style={{ width: 24, height: 24, borderRadius: 12 }} 
                contentFit="cover" 
                nativeControls={false}
            />
        ) : (
            <Image 
                source={{ uri }} 
                style={{ width: 24, height: 24, borderRadius: 12 }} 
            />
        )
      ) : (
        <Ionicons name="person-circle" size={26} color={color} />
      )}
    </View>
  );
};
// --------------------------------------------------------

export default function TabLayout() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileIcon();
  }, []);

  const fetchProfileIcon = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('photos').eq('id', user.id).single();
      if (data?.photos && data.photos.length > 0) {
        setAvatarUrl(data.photos[0]);
      }
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E8755A',
        tabBarInactiveTintColor: '#8E8E8E',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.05)',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'People', tabBarIcon: ({ color }) => <Ionicons name="compass" size={26} color={color} /> }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarIcon: ({ color }) => <Ionicons name="heart" size={26} color={color} /> }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: ({ color }) => <Ionicons name="airplane" size={26} color={color} /> }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarIcon: ({ color }) => <Ionicons name="chatbubble" size={26} color={color} /> }} />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <ProfileTabIcon focused={focused} color={color} uri={avatarUrl} />
          ),
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}