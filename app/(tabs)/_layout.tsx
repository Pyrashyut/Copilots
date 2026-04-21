// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfilePhoto } from '../../lib/ProfileContext';

const CORAL = '#E8755A';
const INACTIVE = '#AAAAAA';

function TabIcon({ name, focused, size = 22 }: { name: any; focused: boolean; size?: number }) {
  if (focused) {
    return (
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: CORAL,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={name} size={size} color="#FFF" />
      </View>
    );
  }
  return <Ionicons name={name} size={size} color={INACTIVE} />;
}

function ProfileTabIcon({ focused }: { focused: boolean }) {
  const { profilePhotoUrl } = useProfilePhoto();

  if (focused) {
    return (
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: CORAL,
        justifyContent: 'center', alignItems: 'center',
      }}>
        {profilePhotoUrl ? (
          <Image
            source={{ uri: profilePhotoUrl }}
            style={{ width: 36, height: 36, borderRadius: 18 }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person-circle" size={24} color="#FFF" />
        )}
      </View>
    );
  }

  return profilePhotoUrl ? (
    <Image
      source={{ uri: profilePhotoUrl }}
      style={{ width: 28, height: 28, borderRadius: 14, opacity: 0.7 }}
      resizeMode="cover"
    />
  ) : (
    <Ionicons name="person-circle-outline" size={24} color={INACTIVE} />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.07,
          shadowRadius: 10,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'aperture' : 'aperture-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'heart' : 'heart-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ href: null }}
      />
    </Tabs>
  );
}
