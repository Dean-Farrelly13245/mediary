import React, { useState, useCallback } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import AppPressable from '@/components/AppPressable';
import ScreenHeader from '@/components/ScreenHeader';
import { SkeletonWatchlistCard } from '@/components/Skeleton';

type MemberLite = {
  user_id: string;
  avatar_url: string | null;
};

export default function WatchlistsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [membersByList, setMembersByList] = useState<Record<string, MemberLite[]>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;

      (async () => {
        setLoading(true);

        const { data: memberRows } = await supabase
          .from('watchlist_members')
          .select('watchlist_id')
          .eq('user_id', user.id);

        const ids = (memberRows || []).map((r: any) => r.watchlist_id);

        let lists: any[] = [];
        if (ids.length > 0) {
          const { data } = await supabase
            .from('watchlists')
            .select('*')
            .in('id', ids)
            .order('created_at', { ascending: false });
          lists = data || [];
        } else {
          const { data } = await supabase
            .from('watchlists')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          lists = data || [];
        }

        const map: Record<string, MemberLite[]> = {};
        if (lists.length > 0) {
          const listIds = lists.map((l) => l.id);
          const { data: allMembers } = await supabase
            .from('watchlist_members')
            .select('watchlist_id, user_id')
            .in('watchlist_id', listIds);

          const userIds = Array.from(
            new Set((allMembers || []).map((m: any) => m.user_id))
          );

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, avatar_url')
            .in('id', userIds);

          (allMembers || []).forEach((m: any) => {
            const p = profiles?.find((pr: any) => pr.id === m.user_id);
            if (!map[m.watchlist_id]) map[m.watchlist_id] = [];
            map[m.watchlist_id].push({
              user_id: m.user_id,
              avatar_url: p?.avatar_url ?? null,
            });
          });
        }

        if (active) {
          setWatchlists(lists);
          setMembersByList(map);
          setLoading(false);
        }
      })();

      return () => { active = false; };
    }, [user?.id])
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['left', 'right', 'bottom']}>
      <ScreenHeader title="My Watchlists" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <View>
            <SkeletonWatchlistCard />
            <SkeletonWatchlistCard />
            <SkeletonWatchlistCard />
          </View>
        ) : watchlists.length === 0 ? (
          <View className="items-center mt-10">
            <Ionicons name="list-outline" size={48} color="#64748b" />
            <Text className="text-slate-400 text-center mt-3 mb-4">
              No watchlists yet. Create one to start tracking what to watch.
            </Text>
            <AppPressable
              onPress={() => router.push('/create-watchlist')}
              className="bg-primary rounded-xl px-6 py-3"
              accessibilityRole="button"
              accessibilityLabel="Create watchlist"
            >
              <Text className="text-white font-semibold">Create Watchlist</Text>
            </AppPressable>
          </View>
        ) : (
          watchlists.map((wl) => {
            const itemCount = Array.isArray(wl.items) ? wl.items.length : 0;
            const firstPoster = wl.items?.[0]?.poster;
            const wlMembers = membersByList[wl.id] || [];
            const isShared = wlMembers.length > 1;

            return (
              <AppPressable
                key={wl.id}
                onPress={() => router.push(`/watchlist-detail/${wl.id}`)}
                className="bg-slate-900 rounded-2xl mb-3 overflow-hidden flex-row"
                accessibilityRole="button"
                accessibilityLabel={`Open watchlist ${wl.name}`}
              >
                {firstPoster ? (
                  <Image
                    source={{ uri: firstPoster }}
                    className="w-20 h-28"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-20 h-28 bg-slate-800 items-center justify-center">
                    <Ionicons name="list" size={28} color="#64748b" />
                  </View>
                )}
                <View className="flex-1 p-3 justify-center">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="text-white font-semibold text-base flex-1"
                      numberOfLines={1}
                    >
                      {wl.name}
                    </Text>
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        isShared ? 'bg-primary/20' : 'bg-slate-800'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-semibold ${
                          isShared ? 'text-primary' : 'text-slate-400'
                        }`}
                        style={isShared ? { color: '#7B3FF2' } : undefined}
                      >
                        {isShared ? 'Shared' : 'Solo'}
                      </Text>
                    </View>
                  </View>
                  {wl.description ? (
                    <Text className="text-slate-400 text-xs mt-1" numberOfLines={2}>
                      {wl.description}
                    </Text>
                  ) : null}
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-slate-500 text-xs">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </Text>
                    {isShared && (
                      <View className="flex-row items-center">
                        {wlMembers.slice(0, 4).map((m, idx) => (
                          <View
                            key={m.user_id}
                            style={{ marginLeft: idx === 0 ? 0 : -6 }}
                            className="border-2 border-slate-900 rounded-full"
                          >
                            {m.avatar_url ? (
                              <Image
                                source={{ uri: m.avatar_url }}
                                className="w-5 h-5 rounded-full"
                              />
                            ) : (
                              <View className="w-5 h-5 rounded-full bg-slate-800 items-center justify-center">
                                <Ionicons name="person" size={10} color="#94a3b8" />
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                <View className="justify-center pr-3">
                  <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </View>
              </AppPressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
