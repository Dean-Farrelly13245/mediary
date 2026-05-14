import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import AppPressable from '@/components/AppPressable';
import ScreenHeader from '@/components/ScreenHeader';
import { SkeletonListRow } from '@/components/Skeleton';
import { useToast } from '@/context/ToastContext';
import { HIT_SLOP_44, iconSize } from '@/lib/theme';

type Friend = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Member = {
  user_id: string;
  role: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type StatusRow = {
  item_id: string;
  user_id: string;
  watched: boolean;
};

export default function WatchlistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [watchlist, setWatchlist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [members, setMembers] = useState<Member[]>([]);
  const [statuses, setStatuses] = useState<StatusRow[]>([]);

  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [recentlyUpdatedKey, setRecentlyUpdatedKey] = useState<string | null>(null);

  const isOwner = watchlist && user && watchlist.user_id === user.id;
  const isCollaborative = members.length > 1;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('watchlists')
        .select('*')
        .eq('id', id)
        .single();

      setWatchlist(data);
      if (data) {
        setEditName(data.name);
        setEditDesc(data.description || '');
      }
      setLoading(false);
    })();
  }, [id]);

  const loadMembers = async () => {
    const { data: m } = await supabase
      .from('watchlist_members')
      .select('user_id, role')
      .eq('watchlist_id', id);

    if (!m || m.length === 0) {
      setMembers([]);
      return;
    }

    const ids = m.map((x: any) => x.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ids);

    const merged: Member[] = m.map((row: any) => {
      const p = profiles?.find((pr: any) => pr.id === row.user_id);
      return {
        user_id: row.user_id,
        role: row.role,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });
    setMembers(merged);
  };

  const loadStatuses = async () => {
    const { data } = await supabase
      .from('watchlist_item_status')
      .select('item_id, user_id, watched')
      .eq('watchlist_id', id);
    setStatuses((data || []) as StatusRow[]);
  };

  useEffect(() => {
    if (!id) return;
    loadMembers();
    loadStatuses();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`watchlist_status_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlist_item_status',
          filter: `watchlist_id=eq.${id}`,
        },
        (payload: any) => {
          loadStatuses();
          // Briefly highlight the row that changed (external update feedback).
          const key = payload?.new?.item_id ?? payload?.old?.item_id;
          if (key) {
            setRecentlyUpdatedKey(key);
            setTimeout(() => setRecentlyUpdatedKey(null), 1200);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Load mutual friends (people who follow each other) when the picker opens
  useEffect(() => {
    if (!friendsOpen || !user) return;
    (async () => {
      setFriendsLoading(true);
      try {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = (following || []).map((r: any) => r.following_id as string);
        if (followingIds.length === 0) { setFriends([]); return; }

        const { data: mutual } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', user.id)
          .in('follower_id', followingIds);

        const mutualIds = (mutual || []).map((r: any) => r.follower_id as string);
        const memberIds = new Set(members.map((m) => m.user_id));
        const eligible = mutualIds.filter((uid) => !memberIds.has(uid));

        if (eligible.length === 0) { setFriends([]); return; }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', eligible);

        setFriends((profiles || []) as Friend[]);
      } finally {
        setFriendsLoading(false);
      }
    })();
  }, [friendsOpen, user, members]);

  const addFriend = async (target: Friend) => {
    if (!user || !watchlist) return;
    const { error } = await supabase.from('watchlist_members').insert({
      watchlist_id: id,
      user_id: target.id,
      role: 'member',
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${target.username || target.display_name || 'friend'}`);
    setFriendsOpen(false);
    loadMembers();
  };

  const doDelete = async () => {
    const { error } = await supabase.from('watchlists').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Watchlist deleted');
    router.back();
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete Watchlist? This cannot be undone.')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Watchlist', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const saveEdits = async () => {
    if (!editName.trim()) {
      toast.info('Name is required');
      return;
    }
    // Optimistic update.
    const prev = watchlist;
    const nextName = editName.trim();
    const nextDesc = editDesc.trim() || null;
    setWatchlist((p: any) => ({ ...p, name: nextName, description: nextDesc }));
    setEditing(false);

    const { error } = await supabase
      .from('watchlists')
      .update({ name: nextName, description: nextDesc })
      .eq('id', id);

    if (error) {
      setWatchlist(prev);
      setEditing(true);
      toast.error(error.message);
      return;
    }
    toast.success('Saved');
  };

  const removeItemFromList = async (itemId: number, mediaType: string) => {
    // Optimistic remove — rollback on failure.
    const prevItems = watchlist.items;
    const updated = prevItems.filter(
      (i: any) => !(i.id === itemId && i.media_type === mediaType)
    );
    setWatchlist((p: any) => ({ ...p, items: updated }));

    const { error } = await supabase
      .from('watchlists')
      .update({ items: updated })
      .eq('id', id);

    if (error) {
      setWatchlist((p: any) => ({ ...p, items: prevItems }));
      toast.error('Failed to remove item');
    }
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const prevItems = watchlist.items;
    const arr = [...prevItems];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];

    // Optimistic reorder
    setWatchlist((p: any) => ({ ...p, items: arr }));

    const { error } = await supabase
      .from('watchlists')
      .update({ items: arr })
      .eq('id', id);

    if (error) {
      setWatchlist((p: any) => ({ ...p, items: prevItems }));
      toast.error('Failed to reorder');
    }
  };

  const navigateToDetail = (item: any) => {
    if (item.media_type === 'movie') {
      router.push(`/movies/${item.id}`);
    } else if (item.media_type === 'tv') {
      router.push(`/tvshows/${item.id}`);
    } else if (item.media_type === 'game') {
      router.push(`/games/${item.id}`);
    }
  };

  const itemKey = (item: any) => `${item.media_type}-${item.id}`;

  const toggleWatched = async (item: any) => {
    if (!user) return;
    const key = itemKey(item);
    const existing = statuses.find(
      (s) => s.item_id === key && s.user_id === user.id
    );
    const next = !existing?.watched;

    // Optimistic
    setStatuses((prev) => {
      const without = prev.filter(
        (s) => !(s.item_id === key && s.user_id === user.id)
      );
      return [...without, { item_id: key, user_id: user.id, watched: next }];
    });

    const { error } = await supabase.from('watchlist_item_status').upsert(
      {
        watchlist_id: id,
        item_id: key,
        user_id: user.id,
        watched: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'watchlist_id,item_id,user_id' }
    );

    if (error) {
      // Rollback
      setStatuses((prev) => {
        const without = prev.filter(
          (s) => !(s.item_id === key && s.user_id === user.id)
        );
        return existing ? [...without, existing] : without;
      });
      toast.error('Failed to update');
    }
  };

  const statusForItem = (item: any) => {
    const key = itemKey(item);
    const map = new Map<string, boolean>();
    statuses
      .filter((s) => s.item_id === key)
      .forEach((s) => map.set(s.user_id, s.watched));
    return map;
  };

  const renderStatusLabel = (item: any) => {
    if (!user) return null;
    const map = statusForItem(item);
    const others = members.filter((m) => m.user_id !== user.id);
    const meWatched = map.get(user.id) === true;
    const watchedOthers = others.filter((o) => map.get(o.user_id) === true);

    if (members.length === 2) {
      const other = others[0];
      const otherWatched = watchedOthers.length === 1;
      if (meWatched && otherWatched) {
        return <Text className="text-green-400 text-xs font-semibold">Both watched ✓</Text>;
      }
      if (meWatched && !otherWatched) {
        return <Text className="text-slate-300 text-xs">You watched this</Text>;
      }
      if (!meWatched && otherWatched) {
        return (
          <Text className="text-slate-300 text-xs">
            {other?.username || other?.display_name || 'They'} watched this
          </Text>
        );
      }
      return null;
    }

    const totalWatched = (meWatched ? 1 : 0) + watchedOthers.length;
    if (totalWatched === members.length) {
      return <Text className="text-green-400 text-xs font-semibold">All watched ✓</Text>;
    }
    if (totalWatched === 0) return null;
    return (
      <Text className="text-slate-300 text-xs">
        {totalWatched} / {members.length} watched
      </Text>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950" edges={['left', 'right', 'bottom']}>
        <ScreenHeader title="Watchlist" />
        <View style={{ padding: 16 }}>
          <SkeletonListRow />
          <SkeletonListRow />
          <SkeletonListRow />
          <SkeletonListRow />
        </View>
      </SafeAreaView>
    );
  }

  if (!watchlist) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950" edges={['left', 'right', 'bottom']}>
        <ScreenHeader title="Watchlist" />
        <View className="flex-1 items-center justify-center">
          <Ionicons name="alert-circle-outline" size={48} color="#64748b" />
          <Text className="text-slate-400 mt-3">Watchlist not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const items = Array.isArray(watchlist.items) ? watchlist.items : [];

  const headerRight = (
    <View className="flex-row gap-3">
      {isOwner && (
        <AppPressable
          onPress={() => setFriendsOpen(true)}
          hitSlop={HIT_SLOP_44}
          accessibilityRole="button"
          accessibilityLabel="Add a friend to watchlist"
        >
          <Ionicons name="person-add-outline" size={iconSize.lg} color="#7B3FF2" />
        </AppPressable>
      )}
      {isOwner && (
        <AppPressable
          onPress={() => setEditing(!editing)}
          hitSlop={HIT_SLOP_44}
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Cancel edit' : 'Edit watchlist'}
        >
          <Ionicons
            name={editing ? 'close' : 'create-outline'}
            size={iconSize.lg}
            color="#7B3FF2"
          />
        </AppPressable>
      )}
      {isOwner && (
        <AppPressable
          onPress={handleDelete}
          hitSlop={HIT_SLOP_44}
          accessibilityRole="button"
          accessibilityLabel="Delete watchlist"
        >
          <Ionicons name="trash-outline" size={iconSize.lg} color="#ef4444" />
        </AppPressable>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['left', 'right', 'bottom']}>
      <ScreenHeader title="Watchlist" rightAction={headerRight} />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {editing ? (
          <View className="mb-4">
            <Text className="text-slate-300 font-semibold mb-1">Name</Text>
            <TextInput
              className="border border-zinc-700 rounded-xl px-4 py-3 text-white mb-3"
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor="#71717a"
            />
            <Text className="text-slate-300 font-semibold mb-1">Description</Text>
            <TextInput
              className="border border-zinc-700 rounded-xl px-4 py-3 text-white mb-3 min-h-[60px]"
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#71717a"
            />
            <AppPressable
              onPress={saveEdits}
              className="bg-primary rounded-xl py-3 items-center"
              accessibilityRole="button"
              accessibilityLabel="Save changes"
            >
              <Text className="text-white font-semibold">Save Changes</Text>
            </AppPressable>
          </View>
        ) : (
          <>
            <Text className="text-2xl font-bold text-white mb-1">{watchlist.name}</Text>
            {watchlist.description ? (
              <Text className="text-slate-400 text-sm mb-2">{watchlist.description}</Text>
            ) : null}
            {isCollaborative && (
              <View className="flex-row items-center mb-4">
                {members.slice(0, 5).map((m, idx) => (
                  <View
                    key={m.user_id}
                    style={{ marginLeft: idx === 0 ? 0 : -8 }}
                    className="border-2 border-slate-950 rounded-full"
                  >
                    {m.avatar_url ? (
                      <Image
                        source={{ uri: m.avatar_url }}
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      <View className="w-7 h-7 rounded-full bg-slate-800 items-center justify-center">
                        <Ionicons name="person" size={14} color="#94a3b8" />
                      </View>
                    )}
                  </View>
                ))}
                <Text className="text-slate-400 text-xs ml-2">
                  {members.length} collaborators
                </Text>
              </View>
            )}
          </>
        )}

        {items.length === 0 && !editing && (
          <View className="items-center py-10">
            <Ionicons name="film-outline" size={48} color="#64748b" />
            <Text className="text-slate-400 mt-3">This watchlist is empty.</Text>
          </View>
        )}

        {items.map((item: any, index: number) => {
          const map = statusForItem(item);
          const key = itemKey(item);
          const highlighted = recentlyUpdatedKey === key;
          return (
            <View
              key={`${item.media_type}-${item.id}-${index}`}
              className="rounded-2xl mb-2 overflow-hidden"
              style={{
                backgroundColor: highlighted ? '#2a1b4d' : '#0f172a',
              }}
            >
              <View className="flex-row">
                <AppPressable
                  onPress={() => navigateToDetail(item)}
                  className="flex-row flex-1"
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.title}`}
                >
                  {item.poster ? (
                    <Image
                      source={{ uri: item.poster }}
                      className="w-16 h-24"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-16 h-24 bg-slate-800 items-center justify-center">
                      <Ionicons name="image-outline" size={20} color="#64748b" />
                    </View>
                  )}
                  <View className="flex-1 p-3 justify-center">
                    <Text className="text-white font-semibold" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      {item.year && (
                        <Text className="text-slate-400 text-xs">{item.year}</Text>
                      )}
                      <Text className="text-slate-500 text-xs">
                        {item.media_type === 'movie'
                          ? 'Movie'
                          : item.media_type === 'tv'
                            ? 'TV Show'
                            : 'Game'}
                      </Text>
                    </View>
                  </View>
                </AppPressable>

                {editing && (
                  <View className="justify-center items-center pr-2 gap-1">
                    <AppPressable
                      onPress={() => moveItem(index, 'up')}
                      hitSlop={HIT_SLOP_44}
                      accessibilityRole="button"
                      accessibilityLabel="Move up"
                    >
                      <Ionicons name="chevron-up" size={20} color="#7B3FF2" />
                    </AppPressable>
                    <AppPressable
                      onPress={() => removeItemFromList(item.id, item.media_type)}
                      hitSlop={HIT_SLOP_44}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.title}`}
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </AppPressable>
                    <AppPressable
                      onPress={() => moveItem(index, 'down')}
                      hitSlop={HIT_SLOP_44}
                      accessibilityRole="button"
                      accessibilityLabel="Move down"
                    >
                      <Ionicons name="chevron-down" size={20} color="#7B3FF2" />
                    </AppPressable>
                  </View>
                )}

                {!editing && (
                  <View className="justify-center pr-3">
                    <Ionicons name="chevron-forward" size={18} color="#64748b" />
                  </View>
                )}
              </View>

              {isCollaborative && !editing && (
                <View className="flex-row items-center px-3 pb-3 pt-1 gap-3 border-t border-slate-800">
                  <View className="flex-row items-center gap-2">
                    {members.map((m) => {
                      const watched = map.get(m.user_id) === true;
                      const isMe = user && m.user_id === user.id;
                      const content = (
                        <View className="flex-row items-center gap-1">
                          <View
                            style={{
                              opacity: watched ? 1 : 0.4,
                              borderWidth: watched ? 2 : 0,
                              borderColor: '#7B3FF2',
                              borderRadius: 999,
                            }}
                          >
                            {m.avatar_url ? (
                              <Image
                                source={{ uri: m.avatar_url }}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <View className="w-6 h-6 rounded-full bg-slate-800 items-center justify-center">
                                <Ionicons name="person" size={12} color="#94a3b8" />
                              </View>
                            )}
                          </View>
                          <Ionicons
                            name={watched ? 'eye' : 'eye-outline'}
                            size={16}
                            color={watched ? '#7B3FF2' : '#64748b'}
                          />
                        </View>
                      );
                      return isMe ? (
                        <AppPressable
                          key={m.user_id}
                          onPress={() => toggleWatched(item)}
                          hitSlop={HIT_SLOP_44}
                          accessibilityRole="button"
                          accessibilityLabel={
                            watched ? 'Mark as not watched' : 'Mark as watched'
                          }
                          accessibilityState={{ selected: watched }}
                        >
                          {content}
                        </AppPressable>
                      ) : (
                        <View key={m.user_id}>{content}</View>
                      );
                    })}
                  </View>
                  <View className="flex-1 items-end">{renderStatusLabel(item)}</View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={friendsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFriendsOpen(false)}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-slate-950 rounded-t-3xl p-5 max-h-[80%] border-t border-slate-800">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white font-bold text-lg">Add a Friend</Text>
              <AppPressable
                onPress={() => setFriendsOpen(false)}
                hitSlop={HIT_SLOP_44}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color="#e5e7eb" />
              </AppPressable>
            </View>

            {friendsLoading ? (
              <ActivityIndicator color="#7B3FF2" style={{ marginVertical: 24 }} />
            ) : friends.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="people-outline" size={40} color="#64748b" />
                <Text className="text-slate-400 text-sm mt-3 text-center">
                  No mutual friends to add.{'\n'}Follow someone and have them follow you back.
                </Text>
              </View>
            ) : (
              <ScrollView>
                {friends.map((f) => (
                  <AppPressable
                    key={f.id}
                    onPress={() => addFriend(f)}
                    className="flex-row items-center bg-slate-900 rounded-2xl p-3 mb-2"
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${f.username || 'friend'}`}
                  >
                    {f.avatar_url ? (
                      <Image source={{ uri: f.avatar_url }} className="w-10 h-10 rounded-full" />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                        <Ionicons name="person" size={18} color="#94a3b8" />
                      </View>
                    )}
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-semibold">
                        {f.username || f.display_name || 'User'}
                      </Text>
                      {f.display_name && f.username && (
                        <Text className="text-slate-400 text-xs">{f.display_name}</Text>
                      )}
                    </View>
                    <Ionicons name="add-circle" size={22} color="#7B3FF2" />
                  </AppPressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
