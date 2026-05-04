import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#0E0E1C',
          borderTopWidth: 1,
          borderTopColor: '#2633A0', 
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          ...(Platform.OS === 'web' ? {
            position: 'sticky' as any,
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
          } : {}),
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={28}
              color={focused ? '#7B3FF2' : '#B8BBD9'}
            />
          ),
        }}
      />

      {/* Search */}
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={28}
              color={focused ? '#7B3FF2' : '#B8BBD9'}
            />
          ),
        }}
      />

      {/* Log (+) */}
      <Tabs.Screen
        name="log"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="add"
              size={34}
              color={focused ? '#F6B73C' : '#B8BBD9'}
            />
          ),
        }}
      />

      {/* Activity */}
      <Tabs.Screen
        name="activity"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={28}
              color={focused ? '#7B3FF2' : '#B8BBD9'}
            />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={28}
              color={focused ? '#7B3FF2' : '#B8BBD9'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
