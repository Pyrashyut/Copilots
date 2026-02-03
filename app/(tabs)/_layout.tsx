// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary.navy,
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: Colors.neutral.white,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "compass" : "compass-outline"} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches', // Changed from "Frolicr" to "Matches" per PDF usually, or keep Frolicr if preferred
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "heart" : "heart-outline"} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "airplane" : "airplane-outline"} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* HIDE SETTINGS from the tab bar, but keep it accessible via router push */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}