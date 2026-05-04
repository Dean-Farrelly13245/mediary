import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { getProfile, getProfileCounts, getRecentActivity, getFollowStats } from '@/services/profile';
import { getMediaLogsByType } from '@/services/mediaLogs';
import AppPressable from '@/components/AppPressable';
import { Skeleton, SkeletonProfileHeader } from '@/components/Skeleton';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);

  const [counts, setCounts] = useState({
    moviesLogged: 0,
    showsLogged: 0,
    gamesLogged: 0,
  });

  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [followCountsLoading, setFollowCountsLoading] = useState(true);

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recentMovies, setRecentMovies] = useState<any[]>([]);
  const [recentTVShows, setRecentTVShows] = useState<any[]>([]);
  const [recentGames, setRecentGames] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user || !user.id) {
        setIsLoading(false);
        return;
      }

      let active = true;

      async function load() {
        try {
          setIsLoading(true);
          setError(null);
          setFollowCountsLoading(true);

          const userId = user!.id;

          const [profile, profileCounts, activity, movies, tvshows, games, follow] = await Promise.all([
            getProfile(userId),
            getProfileCounts(userId),
            getRecentActivity(userId),
            getMediaLogsByType(userId, 'movie', 3),
            getMediaLogsByType(userId, 'tv', 3),
            getMediaLogsByType(userId, 'game', 3),
            getFollowStats(userId),
          ]);

          if (!active) return;

          const name =
            profile?.display_name ||
            profile?.username ||
            user!.email ||
            'User';

          setDisplayName(name);
          setAvatarUrl(profile?.avatar_url || null);
          setBio(profile?.bio || null);

          setCounts({
            moviesLogged: profileCounts.moviesLogged || 0,
            showsLogged: profileCounts.showsLogged || 0,
            gamesLogged: profileCounts.gamesLogged || 0,
          });

          setRecentActivity(activity);
          setRecentMovies(movies);
          setRecentTVShows(tvshows);
          setRecentGames(games);

          setFollowCounts({
            followers: follow.followers || 0,
            following: follow.following || 0,
          });
          setFollowCountsLoading(false);
        } catch (err) {
          console.log('Failed to load profile:', err);
          if (active) {
            setError('Could not load profile. Try again.');
            setFollowCountsLoading(false);
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      }

      load();

      return () => {
        active = false;
      };
    }, [user?.id])
  );

  const PosterCard = ({ item, onPress, mediaType }: { item: any; onPress?: () => void; mediaType?: string }) => {
    const posterUrl = item.posterUrl || item.poster_url;
    const rating = item.rating;
    const date = item.loggedAt || item.logged_at || item.created_at;
    const title = item.title || 'Untitled';
    const type = mediaType || item.media_type;

    const getBadgeInfo = () => {
      if (type === 'movie') return { text: 'MOVIE', color: 'bg-blue-600' };
      if (type === 'tv') return { text: 'TV', color: 'bg-purple-600' };
      if (type === 'game') return { text: 'GAME', color: 'bg-green-600' };
      return null;
    };

    const badgeInfo = getBadgeInfo();

    return (
      <AppPressable
        onPress={onPress}
        className="mr-3 w-36 rounded-2xl overflow-hidden bg-slate-900"
      >
        <View className="relative">
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              className="h-44 w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-44 w-full items-center justify-center bg-slate-800">
              <Text className="text-3xl text-slate-500 font-bold">
                {title.charAt(0)}
              </Text>
            </View>
          )}

          {badgeInfo && (
            <View className="absolute top-2 right-2">
              <View className={`${badgeInfo.color} px-2 py-0.5 rounded-md`}>
                <Text className="text-white text-[10px] font-bold">
                  {badgeInfo.text}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View className="p-2">
          <Text
            className="text-sm text-slate-50 font-semibold"
            numberOfLines={1}
          >
            {title}
          </Text>

          {rating != null && (
            <Text className="text-xs text-yellow-400">
              {rating} ★
            </Text>
          )}

          <Text className="text-[11px] text-slate-400">
            {new Date(date).toLocaleDateString()}
          </Text>
        </View>
      </AppPressable>
    );
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-950">
        <Text className="text-slate-50">Log in to view your profile.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950">
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <SkeletonProfileHeader />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Skeleton height={60} width="32%" borderRadius={16} />
            <Skeleton height={60} width="32%" borderRadius={16} />
            <Skeleton height={60} width="32%" borderRadius={16} />
          </View>
          <Skeleton height={20} width="40%" style={{ marginTop: 24, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton width={140} height={180} borderRadius={16} />
            <Skeleton width={140} height={180} borderRadius={16} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-950 px-4">
        <Text className="text-slate-50 text-center">{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="mb-4 flex-row justify-end items-center gap-2">
          <AppPressable
            onPress={handleSignOut}
            className="rounded-full bg-slate-900 px-3 py-2"
          >
            <Text className="text-slate-200 text-sm font-medium">Sign out</Text>
          </AppPressable>
          <AppPressable
            onPress={() => router.push('/edit-profile')}
            className="rounded-full bg-slate-900 p-2"
          >
            <Ionicons name="settings-outline" size={20} color="#e5e7eb" />
          </AppPressable>
        </View>

        <View className="items-center mb-6">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="h-24 w-24 rounded-full mb-3"
            />
          ) : (
            <View className="h-24 w-24 rounded-full bg-slate-900 items-center justify-center mb-3">
              <Text className="text-3xl text-slate-100 font-bold">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <Text className="text-lg text-slate-50 font-bold">{displayName}</Text>

          {bio ? (
            <Text className="text-sm text-slate-300 text-center mt-2 px-6">
              {bio}
            </Text>
          ) : (
            <Text className="text-xs text-slate-500 text-center mt-2 px-6">
              No bio yet.
            </Text>
          )}

          <View className="flex-row gap-6 mt-4">
            <AppPressable
              onPress={() => router.push(`/followers/${user.id}`)}
              className="items-center"
            >
              <Text className="text-slate-50 font-bold text-base">
                {followCountsLoading ? '…' : followCounts.followers}
              </Text>
              <Text className="text-slate-400 text-xs">Followers</Text>
            </AppPressable>

            <AppPressable
              onPress={() => router.push(`/following/${user.id}`)}
              className="items-center"
            >
              <Text className="text-slate-50 font-bold text-base">
                {followCountsLoading ? '…' : followCounts.following}
              </Text>
              <Text className="text-slate-400 text-xs">Following</Text>
            </AppPressable>
          </View>
        </View>

        <View className="flex-row gap-2 mb-6">
          <View className="flex-1 bg-slate-900 rounded-2xl px-3 py-3 items-center">
            <Text className="text-xl text-slate-50 font-bold">
              {counts.moviesLogged}
            </Text>
            <Text className="text-xs text-slate-400">MOVIES</Text>
          </View>

          <View className="flex-1 bg-slate-900 rounded-2xl px-3 py-3 items-center">
            <Text className="text-xl text-slate-50 font-bold">
              {counts.showsLogged}
            </Text>
            <Text className="text-xs text-slate-400">SHOWS</Text>
          </View>

          <View className="flex-1 bg-slate-900 rounded-2xl px-3 py-3 items-center">
            <Text className="text-xl text-slate-50 font-bold">
              {counts.gamesLogged}
            </Text>
            <Text className="text-xs text-slate-400">GAMES</Text>
          </View>
        </View>

        <AppPressable
          onPress={() => router.push('/watchlists')}
          className="bg-slate-900 rounded-2xl px-4 py-3 mb-6 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="list" size={22} color="#7B3FF2" />
            <Text className="text-slate-50 font-semibold text-base">Watchlists</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </AppPressable>

        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-slate-50 font-bold text-base">Recent Activity</Text>
        </View>

        {recentActivity.length === 0 ? (
          <Text className="text-slate-400 text-sm mb-6">
            Nothing logged yet.
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            {recentActivity.map((item: any) => (
              <PosterCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/log-detail/${item.id}?source=log`)}
              />
            ))}
          </ScrollView>
        )}

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-50 font-semibold">Movies</Text>
            <AppPressable onPress={() => router.push('/movies/logged')}>
              <Text className="text-primary text-sm">See all</Text>
            </AppPressable>
          </View>

          {recentMovies.length === 0 ? (
            <Text className="text-slate-400 text-sm">No movies logged yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentMovies.map((movie) => (
                <PosterCard
                  key={movie.id}
                  item={movie}
                  mediaType="movie"
                  onPress={() => router.push(`/log-detail/${movie.id}?source=log`)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-50 font-semibold">TV Shows</Text>
            <AppPressable onPress={() => router.push('/tvshows/logged')}>
              <Text className="text-primary text-sm">See all</Text>
            </AppPressable>
          </View>

          {recentTVShows.length === 0 ? (
            <Text className="text-slate-400 text-sm">No TV shows logged yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentTVShows.map((show) => (
                <PosterCard
                  key={show.id}
                  item={show}
                  mediaType="tv"
                  onPress={() => router.push(`/log-detail/${show.id}?source=log`)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-50 font-semibold">Games</Text>
            <AppPressable onPress={() => router.push('/games/logged')}>
              <Text className="text-primary text-sm">See all</Text>
            </AppPressable>
          </View>

          {recentGames.length === 0 ? (
            <Text className="text-slate-400 text-sm">No games logged yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentGames.map((game) => (
                <PosterCard
                  key={game.id}
                  item={game}
                  mediaType="game"
                  onPress={() => router.push(`/log-detail/${game.id}?source=log`)}
                />
              ))}
            </ScrollView>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
