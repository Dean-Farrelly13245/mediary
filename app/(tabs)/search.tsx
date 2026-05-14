import { View, Text, FlatList, Image } from 'react-native'
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
import AppPressable from '@/components/AppPressable';
import { Skeleton, SkeletonListRow } from '@/components/Skeleton';
import { DEBOUNCE_MS, colors, spacing } from '@/lib/theme';

type FilterType = "movie" | "tv" | "game" | "user";

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
      <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 14, textAlign: 'center', marginTop: 48, marginBottom: 2 }}>Explore</Text>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 24, textAlign: 'center', marginBottom: 4 }}>Discover Media</Text>
    </View>
    <View className='my-4'>
      <SearchBar
        placeholder='Search for media...'
        value={searchQuery}
        onChangeText={onChangeText}
      />
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, paddingHorizontal: 20 }}>
      {FILTERS.map(({ key, label }) => (
        <AppPressable
          key={key}
          onPress={() => onFilterChange(key)}
          pressedScale={1}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: filter === key ? colors.primary : 'transparent',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>{label}</Text>
        </AppPressable>
      ))}
    </View>
    {isLoading && (
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
    {!isLoading && searchQuery.trim() && (
      <Text className="text-xl text-white mt-3">
        Search Results for{' '}
        <Text style={{ fontWeight: '700', color: colors.primary }}>{searchQuery}</Text>
      </Text>
    )}
  </View>
);

const search = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>("movie");

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

  const isLoading = filter === "user" ? usersLoading : (moviesLoading || tvLoading || gamesLoading);

  const listHeaderProps: ListHeaderProps = {
    searchQuery,
    filter,
    isLoading,
    onChangeText: setSearchQuery,
    onFilterChange: setFilter,
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {filter === "movie" && (
          <FlatList
            data={movies}
            renderItem={({ item }) => <MovieCard {...item} />}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}
            columnWrapperStyle={{ justifyContent: 'center', gap: 8, marginVertical: 12 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            initialNumToRender={9}
            windowSize={7}
            removeClippedSubviews
            ListHeaderComponent={<ListHeader {...listHeaderProps} />}
            ListEmptyComponent={
              !isLoading && !moviesError ? (
                <View className='mt-10 px-5'>
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="film-outline" size={48} color="#4B5563" />
                    <Text style={{ color: '#9CA3AF', marginTop: 12, textAlign: 'center', fontSize: 15 }}>
                      {searchQuery.trim() ? 'No movies found' : 'Search for movies, shows, games and more'}
                    </Text>
                  </View>
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
            columnWrapperStyle={{ justifyContent: 'center', gap: 8, marginVertical: 12 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            initialNumToRender={9}
            windowSize={7}
            removeClippedSubviews
            ListHeaderComponent={<ListHeader {...listHeaderProps} />}
            ListEmptyComponent={
              !isLoading && !tvError ? (
                <View className='mt-10 px-5'>
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="tv-outline" size={48} color="#4B5563" />
                    <Text style={{ color: '#9CA3AF', marginTop: 12, textAlign: 'center', fontSize: 15 }}>
                      {searchQuery.trim() ? 'No TV shows found' : 'Search for a TV show'}
                    </Text>
                  </View>
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
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="game-controller-outline" size={48} color="#4B5563" />
                    <Text style={{ color: '#9CA3AF', marginTop: 12, textAlign: 'center', fontSize: 15 }}>No games found</Text>
                  </View>
                </View>
              ) : !isLoading ? (
                <View className='mt-10 px-5'>
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="game-controller-outline" size={48} color="#4B5563" />
                    <Text style={{ color: '#9CA3AF', marginTop: 12, textAlign: 'center', fontSize: 15 }}>Search for a game</Text>
                  </View>
                </View>
              ) : null
            }
            ListFooterComponent={
              games?.length ? (
                <Text style={{ color: "#555", marginTop: 16, fontSize: 11 }}>Video game data provided by RAWG.io</Text>
              ) : null
            }
            renderItem={({ item }: any) => (
              <AppPressable
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
              </AppPressable>
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
                <AppPressable
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
                </AppPressable>
              );
            }}
            ListEmptyComponent={
              !isLoading && !usersError ? (
                <View className='mt-10 px-5'>
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={48} color="#4B5563" />
                    <Text style={{ color: '#9CA3AF', marginTop: 12, textAlign: 'center', fontSize: 15 }}>
                      {searchQuery.trim() ? 'No users found' : 'Search for people to follow'}
                    </Text>
                  </View>
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
