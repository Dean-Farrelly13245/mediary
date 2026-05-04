import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image } from 'react-native';
import AppPressable from '@/components/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFollowerIds, getProfilesByIds, BasicProfile } from '@/services/social';

export default function FollowersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<BasicProfile[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id) return;

      try {
        setLoading(true);

        const followerIds = await getFollowerIds(id);
        console.log('Follower IDs:', followerIds);

        const profiles = await getProfilesByIds(followerIds);
        console.log('Profiles found:', profiles);

        const map: Record<string, BasicProfile> = {};
        for (let i = 0; i < profiles.length; i++) {
          map[profiles[i].id] = profiles[i];
        }

        const ordered = followerIds.map((uid) => map[uid]).filter(Boolean);
        console.log('Final ordered followers:', ordered);

        if (active) setPeople(ordered);
      } catch (e) {
        console.log('Failed to load followers', e);
        if (active) setPeople([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="px-4 pt-3 pb-2 flex-row items-center gap-3">
        <AppPressable onPress={() => router.back()}>
          <Text style={{ color: '#7B3FF2', fontSize: 22, fontWeight: '700' }}>←</Text>
        </AppPressable>
        <Text className="text-slate-50 text-xl font-bold">Followers</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-50">Loading…</Text>
        </View>
      ) : people.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-400 text-center">No followers yet</Text>
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          renderItem={({ item }) => {
            const username = item.username || 'user';

            return (
              <View className="flex-row items-center bg-slate-900 rounded-2xl px-3 py-3 mb-3">
                {item.avatar_url ? (
                  <Image
                    source={{ uri: item.avatar_url }}
                    className="h-12 w-12 rounded-full mr-3"
                  />
                ) : (
                  <View className="h-12 w-12 rounded-full mr-3 bg-slate-800 items-center justify-center">
                    <Text className="text-slate-200 font-bold">
                      {username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View className="flex-1">
                  <Text className="text-slate-50 font-semibold">@{username}</Text>
                  {!!item.display_name && (
                    <Text className="text-slate-400 text-xs mt-0.5">
                      {item.display_name}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
