import { View, Text, FlatList, Image, ActivityIndicator, Pressable, TextInput } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import SearchBar from '@/components/SearchBar';
import { useRouter } from "expo-router";
import MovieCard from '@/components/MovieCard';
import TvShowCard from '@/components/TvShowCard';
import { fetchMovies, fetchTVShows } from "@/services/api";
import { searchGames } from "@/services/rawg";
import { searchUsers } from "@/services/users";
import useFetch from "@/services/useFetch";
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { parseSmartSearch } from '@/lib/smartSearch';
import { fetchSmartResults } from '@/lib/smartSearchQuery';
import type { SmartSearchResult } from '@/lib/smartSearchQuery';
import AppPressable from '@/components/AppPressable';
import { Skeleton, SkeletonListRow } from '@/components/Skeleton';
import { DEBOUNCE_MS, HIT_SLOP_44 } from '@/lib/theme';

type FilterType = "movie" | "tv" | "game" | "user" | "smart";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'game', label: 'Games' },
  { key: 'user', label: 'Users' },
];

type ListHeaderProps = {
  searchQuery: string;
  filter: FilterType;
  isLoading: boolean;
  onChangeText: (text: string) => void;
  onFilterChange: (key: FilterType) => void;
};

const ListHeader = ({ searchQuery, filter, isLoading, onChangeText, onFilterChange }: ListHeaderProps) => (
  <View>
    <View style={{ paddingTop: 16 }}>
      <Text style={{ color: '#7B3FF2', fontWeight: '700', fontSize: 24, textAlign: 'center', marginTop: 48, marginBottom: 4 }}>Mediary</Text>
    </View>
    {filter !== 'smart' && (
      <View className='my-4'>
        <SearchBar
          placeholder='Search for media...'
          value={searchQuery}
          onChangeText={onChangeText}
        />
      </View>
    )}
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 6, paddingRight: 20 }}>
      {FILTERS.map(({ key, label }) => (
        <Pressable
          key={key}
          onPress={() => onFilterChange(key)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#7B3FF2',
            backgroundColor: filter === key ? '#7B3FF2' : 'transparent',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>{label}</Text>
        </Pressable>
      ))}
    </View>
    <Pressable
      onPress={() => onFilterChange('smart')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#F6B73C',
        backgroundColor: filter === 'smart' ? '#F6B73C' : 'transparent',
        marginBottom: 10,
      }}
    >
      <Ionicons name="sparkles" size={14} color={filter === 'smart' ? '#0E0E1C' : '#F6B73C'} />
      <Text style={{ color: filter === 'smart' ? '#0E0E1C' : 'white', fontWeight: '600' }}>
        Smart Search
      </Text>
    </Pressable>
    {filter !== 'smart' && isLoading && (
      <View style={{ marginTop: 12 }}>
        {filter === 'user' || filter === 'game' ? (
          <View>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
            <Skeleton width={110} height={165} borderRadius={12} />
            <Skeleton width={110} height={165} borderRadius={12} />
            <Skeleton width={110} height={165} borderRadius={12} />
          </View>
        )}
      </View>
    )}
    {filter !== 'smart' && !isLoading && searchQuery.trim() && (
      <Text className="text-xl text-white mt-3">
        Search Results for{' '}
        <Text className="font-bold text-[#7B3FF2]">{searchQuery}</Text>
      </Text>
    )}
  </View>
);

const BADGE_COLORS: Record<string, string> = {
  movie: '#3b82f6',
  tv: '#7B3FF2',
  game: '#22c55e',
};

const BADGE_LABELS: Record<string, string> = {
  movie: 'MOVIE',
  tv: 'TV',
  game: 'GAME',
};

const search = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>("movie");

  const [smartQuery, setSmartQuery] = useState('');
  const [smartResults, setSmartResults] = useState<SmartSearchResult[]>([]);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartError, setSmartError] = useState<string | null>(null);
  const [smartSearched, setSmartSearched] = useState(false);

  const resetSmartState = useCallback(() => {
    setSmartQuery('');
    setSmartResults([]);
    setSmartError(null);
    setSmartSearched(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (filter === 'smart') {
        resetSmartState();
      }
    }, [filter])
  );

  const {
    data: movies,
    loading: moviesLoading,
    error: moviesError,
    refetch: loadMovies,
    reset: resetMovies,
  } = useFetch(() => fetchMovies({ query: searchQuery }), false);

  const {
    data: tvShows,
    loading: tvLoading,
    error: tvError,
    refetch: loadTV,
    reset: resetTV,
  } = useFetch(() => fetchTVShows({ query: searchQuery }), false);

  const {
    data: games,
    loading: gamesLoading,
    error: gamesError,
    refetch: loadGames,
    reset: resetGames,
  } = useFetch(() => searchGames({ query: searchQuery }), false);

  const {
    data: users,
    loading: usersLoading,
    error: usersError,
    refetch: loadUsers,
    reset: resetUsers,
  } = useFetch(() => searchUsers(searchQuery), false);

  useEffect(() => {
    if (filter === 'smart') return;

    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim()) {
        if (filter === "movie") await loadMovies();
        if (filter === "tv") await loadTV();
        if (filter === "game") await loadGames();
        if (filter === "user") await loadUsers();
      } else {
        resetMovies();
        resetTV();
        resetGames();
        resetUsers();
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filter]);

  const runSmartSearch = async () => {
    if (!smartQuery.trim()) return;
    setSmartLoading(true);
    setSmartError(null);
    setSmartResults([]);
    setSmartSearched(true);
    try {
      const filters = await parseSmartSearch(smartQuery);
      const results = await fetchSmartResults(filters);
      if (results.length === 0) {
        setSmartError("Couldn't find anything for that — try rephrasing");
      } else {
        setSmartResults(results);
      }
    } catch (err: any) {
      setSmartError(err?.message || "Something went wrong — try rephrasing");
    } finally {
      setSmartLoading(false);
    }
  };

  const isLoading = filter === "user" ? usersLoading : (moviesLoading || tvLoading || gamesLoading);

  const listHeaderProps: ListHeaderProps = {
    searchQuery,
    filter,
    isLoading,
    onChangeText: setSearchQuery,
    onFilterChange: (key: FilterType) => {
      if (key !== 'smart' && filter === 'smart') {
        resetSmartState();
      }
      setFilter(key);
    },
  };

  const navigateToDetail = (item: SmartSearchResult) => {
    if (item.media_type === 'movie') {
      router.push(`/movies/${item.id}`);
    } else if (item.media_type === 'tv') {
      router.push(`/tvshows/${item.id}`);
    } else if (item.media_type === 'game') {
      router.push(`/games/${item.id}`);
    }
  };

  return (
    <View className="flex-1 mt-5 bg-background">
      <View className='flex-1 mt-5 ms-5'>
        {filter === "movie" && (
          <FlatList
            data={movies}
            renderItem={({ item }) => <MovieCard {...item} />}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}
            columnWrapperStyle={{ justifyContent: 'center', gap: 16, marginVertical: 16 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            initialNumToRender={9}
            windowSize={7}
            removeClippedSubviews
            ListHeaderComponent={<ListHeader {...listHeaderProps} />}
            ListEmptyComponent={
              !isLoading && !moviesError ? (
                <View className='mt-10 px-5'>
                  <Text className='text-center text-white'>
                    {searchQuery.trim() ? 'No movies found' : 'Search for a Movie'}
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {filter === "tv" && (
          <FlatList
            data={tvShows}
            renderItem={({ item }) => <TvShowCard {...item} />}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}
            columnWrapperStyle={{ justifyContent: 'center', gap: 16, marginVertical: 16 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            initialNumToRender={9}
            windowSize={7}
            removeClippedSubviews
            ListHeaderComponent={<ListHeader {...listHeaderProps} />}
            ListEmptyComponent={
              !isLoading && !tvError ? (
                <View className='mt-10 px-5'>
                  <Text className='text-center text-white'>
                    {searchQuery.trim() ? 'No TV shows found' : 'Search for a TV show'}
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {filter === "game" && (
          <FlatList
            data={games || []}
            keyExtractor={(item: any) => item.id.toString()}
            contentContainerStyle={{ paddingRight: 20, paddingBottom: 100 }}
            ListHeaderComponent={<ListHeader {...listHeaderProps} />}
            ListEmptyComponent={
              !isLoading && searchQuery.trim() ? (
                <View className='mt-10 px-5'>
                  <Text className='text-center text-white'>No games found</Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              games?.length ? (
                <Text style={{ color: "#777", marginTop: 16 }}>Video game data provided by RAWG.io</Text>
              ) : null
            }
            renderItem={({ item }: any) => (
              <Pressable
                onPress={() => router.push(`/games/${item.id}`)}
                style={{ flexDirection: "row", gap: 12, alignItems: "center", marginTop: 14 }}
              >
                <Image
                  source={{ uri: item.background_image }}
                  style={{ width: 55, height: 70, borderRadius: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "white", fontWeight: "700" }}>{item.name}</Text>
                  <Text style={{ color: "#aaa", fontSize: 12 }}>
                    {item.released ? item.released.split("-")[0] : "Unknown"}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}

        {filter === "user" && (
          <FlatList
            data={users || []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingRight: 20, paddingBottom: 100 }}
            ListHeaderComponent={<ListHeader {...listHeaderProps} />}
            renderItem={({ item }) => {
              const name = item.display_name || item.username || 'user';
              return (
                <Pressable
                  onPress={() => router.push(`/user/${item.id}`)}
                  style={{ flexDirection: "row", gap: 12, alignItems: "center", marginTop: 14 }}
                >
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                    />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#333", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "white", fontWeight: "700" }}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "white", fontWeight: "700" }}>{name}</Text>
                    {item.username ? (
                      <Text style={{ color: "#aaa", fontSize: 12 }}>@{item.username}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              !isLoading && !usersError ? (
                <View className='mt-10 px-5'>
                  <Text className='text-center text-white'>
                    {searchQuery.trim() ? 'No users found' : 'Search for a user'}
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {filter === "smart" && (
          <FlatList
            data={smartResults}
            keyExtractor={(item) => `${item.media_type}-${item.id}`}
            numColumns={3}
            columnWrapperStyle={{ justifyContent: 'center', gap: 16, marginVertical: 16 }}
            contentContainerStyle={{ paddingBottom: 100, paddingRight: 16 }}
            ListHeaderComponent={
              <View>
                <ListHeader {...listHeaderProps} />

                <View className="flex-row items-center mt-2 mb-2" style={{ paddingRight: 20 }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 12 }}>
                    <Ionicons name="search" size={18} color="#71717a" />
                    <TextInput
                      style={{ flex: 1, color: 'white', paddingVertical: 12, marginLeft: 8, fontSize: 15 }}
                      placeholder="Ask anything..."
                      placeholderTextColor="#71717a"
                      value={smartQuery}
                      onChangeText={setSmartQuery}
                      onSubmitEditing={runSmartSearch}
                      returnKeyType="search"
                      multiline={false}
                    />
                    {(smartQuery.length > 0 || smartSearched) && (
                      <Pressable onPress={resetSmartState} hitSlop={8}>
                        <Ionicons name="close-circle" size={18} color="#71717a" />
                      </Pressable>
                    )}
                  </View>
                  <Pressable
                    onPress={runSmartSearch}
                    disabled={smartLoading || !smartQuery.trim()}
                    style={{
                      marginLeft: 10,
                      backgroundColor: !smartQuery.trim() ? '#27272a' : '#7B3FF2',
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    {smartLoading ? (
                      <ActivityIndicator size={20} color="white" />
                    ) : (
                      <Ionicons name="arrow-forward" size={20} color="white" />
                    )}
                  </Pressable>
                </View>

                <Text style={{ color: '#71717a', fontSize: 12, marginBottom: 12, paddingRight: 20 }}>
                  Try "best horror movies from 2018" or "top rated open world games"
                </Text>

                {smartLoading && (
                  <View className="items-center my-6">
                    <ActivityIndicator size="large" color="#7B3FF2" />
                    <Text style={{ color: '#94a3b8', marginTop: 8, fontSize: 13 }}>Thinking...</Text>
                  </View>
                )}

                {smartError && (
                  <View className="items-center my-6 px-5">
                    <Ionicons name="search-outline" size={36} color="#64748b" />
                    <Text style={{ color: '#94a3b8', marginTop: 8, textAlign: 'center', fontSize: 14 }}>
                      {smartError}
                    </Text>
                  </View>
                )}

                {!smartLoading && !smartError && !smartSearched && (
                  <View className="items-center my-10 px-5">
                    <Text style={{ color: '#94a3b8', textAlign: 'center', fontSize: 14 }}>
                      Describe what you're looking for in plain English
                    </Text>
                  </View>
                )}
              </View>
            }
            initialNumToRender={9}
            windowSize={7}
            removeClippedSubviews
            renderItem={({ item }) => (
              <AppPressable
                onPress={() => navigateToDetail(item)}
                style={{ width: 110 }}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.title}`}
              >
                <View style={{ position: 'relative' }}>
                  {item.poster ? (
                    <Image
                      source={{ uri: item.poster }}
                      style={{ width: 110, height: 165, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: 110, height: 165, borderRadius: 12,
                      backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#64748b', fontSize: 10 }}>No image</Text>
                    </View>
                  )}
                  <View style={{
                    position: 'absolute', top: 6, left: 6,
                    backgroundColor: BADGE_COLORS[item.media_type] || '#7B3FF2',
                    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                  }}>
                    <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>
                      {BADGE_LABELS[item.media_type] || 'MEDIA'}
                    </Text>
                  </View>
                  <AppPressable
                    onPress={() => {
                      router.push({
                        pathname: '/log',
                        params: {
                          tmdbId: item.id.toString(),
                          mediaType: item.media_type,
                          title: item.title || 'Untitled',
                          posterUrl: item.poster,
                        },
                      });
                    }}
                    hitSlop={HIT_SLOP_44}
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${item.title}`}
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      backgroundColor: '#7B3FF2',
                      borderRadius: 20,
                      width: 32,
                      height: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="add" size={18} color="white" />
                  </AppPressable>
                </View>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginTop: 6 }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                  <Ionicons name="star" size={11} color="#F6B73C" />{' '}
                  {item.rating ?? '—'} {item.year ?? ''}
                </Text>
              </AppPressable>
            )}
            ListEmptyComponent={
              !smartLoading && smartSearched && !smartError ? (
                <View className='mt-10 px-5'>
                  <Text className='text-center text-white'>No results</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}

export default search
