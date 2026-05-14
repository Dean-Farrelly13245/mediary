import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

const TAB_BAR_HEIGHT = Platform.OS === 'web' ? 56 : 65;
const BOTTOM_PAD = Platform.OS === 'ios' ? 20 : 8;

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#0E0E1C',
          borderTopWidth: 1,
          borderTopColor: '#1E1E35',
          height: TAB_BAR_HEIGHT,
          paddingBottom: BOTTOM_PAD,
          paddingTop: 8,
          ...(Platform.OS === 'web' ? {
            position: 'fixed' as any,
            bottom: 0,
            left: '50%',
            // @ts-ignore – web-only
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 430,
            zIndex: 100,
          } : {}),
        },
        tabBarActiveTintColor: '#7B3FF2',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={26}
              color={focused ? '#7B3FF2' : '#6B7280'}
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
              size={26}
              color={focused ? '#7B3FF2' : '#6B7280'}
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
              name="add-circle"
              size={34}
              color={focused ? '#F6B73C' : '#6B7280'}
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
              size={26}
              color={focused ? '#7B3FF2' : '#6B7280'}
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
              size={26}
              color={focused ? '#7B3FF2' : '#6B7280'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
