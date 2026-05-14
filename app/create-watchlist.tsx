import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { searchAllMedia } from '@/services/api';
import { searchGames } from '@/services/rawg';
import type { WatchlistItem } from '@/lib/watchlistQuery';
import { supabase } from '@/services/supabase';
import AppPressable from '@/components/AppPressable';
import ScreenHeader from '@/components/ScreenHeader';
import { useToast } from '@/context/ToastContext';
import { DEBOUNCE_MS, HIT_SLOP_44 } from '@/lib/theme';

export default function CreateWatchlistScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WatchlistItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'movie' | 'tv' | 'game'>('movie');

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [addedFlash, setAddedFlash] = useState<string | null>(null);

  // Debounced search — cancels previous request and ignores stale responses.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      runSearch(searchQuery);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchFilter]);

  const runSearch = async (query: string) => {
    if (!query.trim()) return;
    const seq = ++searchSeqRef.current;
    setSearchLoading(true);
    try {
      let mapped: WatchlistItem[] = [];
      if (searchFilter === 'game') {
        const results = await searchGames({ query });
        mapped = (results || []).map((g: any) => ({
          id: g.id,
          title: g.name,
          poster: g.background_image || '',
          media_type: 'game' as const,
          year: g.released ? parseInt(g.released.substring(0, 4), 10) : null,
        }));
      } else {
        const results = await searchAllMedia({ query });
        mapped = (results || [])
          .filter((r: any) => r.media_type === searchFilter)
          .map((r: any) => {
            const dateStr = r.media_type === 'movie' ? r.release_date : r.first_air_date;
            return {
              id: r.id,
              title: r.media_type === 'tv' ? r.name : r.title,
              poster: r.poster_path
                ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
                : '',
              media_type: r.media_type,
              year: dateStr ? parseInt(dateStr.substring(0, 4), 10) : null,
            };
          });
      }
      // Drop result if a newer search has started.
      if (seq !== searchSeqRef.current) return;
      setSearchResults(mapped);
    } catch {
      if (seq === searchSeqRef.current) setSearchResults([]);
    } finally {
      if (seq === searchSeqRef.current) setSearchLoading(false);
    }
  };

  const isItemAdded = (id: number, media_type: string) =>
    items.some((i) => i.id === id && i.media_type === media_type);

  const addItem = (item: WatchlistItem) => {
    if (isItemAdded(item.id, item.media_type)) return;
    setItems((prev) => [...prev, item]);

    const key = `${item.media_type}-${item.id}`;
    setAddedFlash(key);
    setTimeout(() => setAddedFlash(null), 800);
  };

  const removeItem = (id: number, media_type: string) => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.media_type === media_type)));
  };

  const saveWatchlist = async () => {
    if (!user) {
      toast.error('Not logged in');
      return;
    }
    if (items.length === 0) {
      toast.info('Add at least one item');
      return;
    }
    if (!listName.trim()) {
      toast.info('Enter a name for your watchlist');
      return;
    }

    setSaving(true);
    try {
      const { data: created, error } = await supabase
        .from('watchlists')
        .insert({
          user_id: user.id,
          name: listName.trim(),
          description: description.trim() || null,
          items: items.map((i) => ({
            id: i.id,
            title: i.title,
            poster: i.poster,
            media_type: i.media_type,
            year: i.year,
          })),
        })
        .select()
        .single();

      if (error) throw error;

      if (created?.id) {
        await supabase.from('watchlist_members').insert({
          watchlist_id: created.id,
          user_id: user.id,
          role: 'owner',
        });
      }

      toast.success('Watchlist created');
      router.push('/watchlists');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const canSave = items.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['left', 'right', 'bottom']}>
      <ScreenHeader title="Create Watchlist" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: canSave ? 120 : 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-slate-300 font-semibold text-base mb-3">
            Search & Add Media
          </Text>

          <View className="flex-row gap-2 mb-3">
            {(['movie', 'tv', 'game'] as const).map((t) => {
              const active = searchFilter === t;
              return (
                <AppPressable
                  key={t}
                  onPress={() => {
                    setSearchFilter(t);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  className={`px-4 py-2 rounded-full border ${
                    active ? 'bg-primary border-primary' : 'bg-zinc-900 border-zinc-700'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter: ${t}`}
                >
                  <Text className={active ? 'text-white font-semibold' : 'text-zinc-300'}>
                    {t === 'movie' ? 'Movies' : t === 'tv' ? 'TV Shows' : 'Games'}
                  </Text>
                </AppPressable>
              );
            })}
          </View>

          <View className="flex-row items-center bg-slate-900 rounded-xl px-3 mb-3">
            <Ionicons name="search" size={20} color="#71717a" />
            <TextInput
              className="flex-1 text-white py-3 ml-2"
              placeholder="Search media..."
              placeholderTextColor="#71717a"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>

          {searchLoading && <ActivityIndicator color="#7B3FF2" className="my-2" />}

          {!searchLoading && searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <View className="items-center py-4">
              <Ionicons name="search-outline" size={28} color="#64748b" />
              <Text className="text-slate-400 text-sm mt-2">
                No results for "{searchQuery.trim()}"
              </Text>
            </View>
          )}

          {searchResults.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              keyboardShouldPersistTaps="handled"
            >
              {searchResults.slice(0, 20).map((item) => {
                const key = `${item.media_type}-${item.id}`;
                const alreadyAdded = isItemAdded(item.id, item.media_type);
                const justAdded = addedFlash === key;

                return (
                  <AppPressable
                    key={key}
                    onPress={() => addItem(item)}
                    disabled={alreadyAdded}
                    className="mr-3 items-center"
                    style={{ width: 80, opacity: alreadyAdded ? 0.4 : 1 }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      alreadyAdded ? `${item.title} already added` : `Add ${item.title}`
                    }
                    accessibilityState={{ disabled: alreadyAdded }}
                  >
                    <View className="relative">
                      {item.poster ? (
                        <Image
                          source={{ uri: item.poster }}
                          className="w-20 h-28 rounded-xl mb-1"
                        />
                      ) : (
                        <View className="w-20 h-28 rounded-xl mb-1 bg-slate-800 items-center justify-center">
                          <Ionicons name="image-outline" size={20} color="#64748b" />
                        </View>
                      )}
                      {alreadyAdded && (
                        <View className="absolute top-1 right-1 bg-green-600 rounded-full p-0.5">
                          <Ionicons name="checkmark" size={12} color="white" />
                        </View>
                      )}
                      {justAdded && !alreadyAdded && (
                        <View className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                          <Ionicons name="add" size={12} color="white" />
                        </View>
                      )}
                    </View>
                    <Text className="text-white text-[10px] text-center" numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.year && (
                      <Text className="text-slate-500 text-[9px]">{item.year}</Text>
                    )}
                  </AppPressable>
                );
              })}
            </ScrollView>
          )}

          {items.length > 0 && (
            <>
              <View className="h-px bg-zinc-800 my-4" />

              <Text className="text-slate-300 font-semibold text-base mb-3">
                Preview ({items.length} items)
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                keyboardShouldPersistTaps="handled"
              >
                {items.map((item) => (
                  <View
                    key={`${item.media_type}-${item.id}`}
                    className="mr-3 items-center"
                    style={{ width: 100 }}
                  >
                    {item.poster ? (
                      <Image
                        source={{ uri: item.poster }}
                        className="w-24 h-36 rounded-xl mb-1"
                      />
                    ) : (
                      <View className="w-24 h-36 rounded-xl mb-1 bg-slate-800 items-center justify-center">
                        <Ionicons name="image-outline" size={24} color="#64748b" />
                      </View>
                    )}
                    <Text className="text-white text-xs text-center" numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.year && (
                      <Text className="text-slate-500 text-[10px]">{item.year}</Text>
                    )}
                    <AppPressable
                      onPress={() => removeItem(item.id, item.media_type)}
                      hitSlop={HIT_SLOP_44}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.title}`}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </AppPressable>
                  </View>
                ))}
              </ScrollView>

              <Text className="text-slate-300 font-semibold mb-2">Watchlist Name</Text>
              <TextInput
                className="border border-zinc-700 rounded-xl px-4 py-3 text-white mb-3"
                placeholder="Name your watchlist..."
                placeholderTextColor="#71717a"
                value={listName}
                onChangeText={setListName}
              />

              <Text className="text-slate-300 font-semibold mb-2">
                Description (optional)
              </Text>
              <TextInput
                className="border border-zinc-700 rounded-xl px-4 py-3 text-white mb-4 min-h-[60px]"
                placeholder="What's this list about?"
                placeholderTextColor="#71717a"
                multiline
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </>
          )}

          {items.length === 0 && !searchQuery.trim() && (
            <View className="items-center mt-8 px-5">
              <Ionicons name="list-outline" size={48} color="#4B5563" />
              <Text style={{ color: '#9CA3AF', marginTop: 12, textAlign: 'center', fontSize: 15 }}>
                Search for movies, shows, or games and add them to your watchlist
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Sticky save bar — only when items exist */}
        {canSave && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: 16,
              backgroundColor: 'rgba(2,6,23,0.95)',
              borderTopWidth: 1,
              borderTopColor: '#1e293b',
            }}
          >
            <AppPressable
              onPress={saveWatchlist}
              disabled={saving}
              className={`rounded-xl py-4 items-center ${
                saving ? 'bg-zinc-700' : 'bg-primary'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Save watchlist"
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Save Watchlist ({items.length})
                </Text>
              )}
            </AppPressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
