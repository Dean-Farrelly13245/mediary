import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, ScrollView } from 'react-native';
import AppPressable from '@/components/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { getProfile, getProfileCounts, getRecentActivity } from '@/services/profile';
import { getMediaLogsByType } from '@/services/mediaLogs';
import { getFollowCounts, isFollowing, followUser, unfollowUser } from '@/services/social';
import type { Profile } from '@/services/profile';

export default function UserProfileScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [following, setFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [counts, setCounts] = useState({ moviesLogged: 0, showsLogged: 0, gamesLogged: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recentMovies, setRecentMovies] = useState<any[]>([]);
  const [recentTVShows, setRecentTVShows] = useState<any[]>([]);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [p, profileCounts, activity, movies, tvshows, games, countsData, isF] = await Promise.all([
          getProfile(id),
          getFollowCounts(id),
          getRecentActivity(id),
          getMediaLogsByType(id, 'movie', 3),
          getMediaLogsByType(id, 'tv', 3),
          getMediaLogsByType(id, 'game', 3),
          getProfileCounts(id),
          user?.id ? isFollowing(user.id, id) : Promise.resolve(false),
        ]);
        if (!active) return;
        setProfile(p || null);
        setFollowCounts(profileCounts);
        setFollowing(!!isF);
        setCounts({
          moviesLogged: countsData.moviesLogged ?? 0,
          showsLogged: countsData.showsLogged ?? 0,
          gamesLogged: countsData.gamesLogged ?? 0,
        });
        setRecentActivity(activity);
        setRecentMovies(movies);
        setRecentTVShows(tvshows);
        setRecentGames(games);
      } catch (e) {
        console.log('Failed to load user profile', e);
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [id, user?.id]);

  const handleFollowPress = async () => {
    if (!user?.id || !id || user.id === id) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(user.id, id);
        setFollowing(false);
        setFollowCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      } else {
        await followUser(user.id, id);
        setFollowing(true);
        setFollowCounts((c) => ({ ...c, followers: c.followers + 1 }));
      }
    } catch (e) {
      console.log('Follow/unfollow failed', e);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-slate-50">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-slate-50">User not found</Text>
      </SafeAreaView>
    );
  }

  const displayName = profile.display_name || profile.username || 'User';
  const isSelf = user?.id === id;

  const PosterCard = ({ item, mediaType }: { item: any; mediaType?: string }) => {
    const posterUrl = item.posterUrl || item.poster_url;
    const rating = item.rating;
    const date = item.loggedAt || item.logged_at || item.created_at;
    const title = item.title || 'Untitled';
    const type = mediaType || item.media_type;
    let badgeText = '';
    let badgeColor = '';
    if (type === 'movie') { badgeText = 'MOVIE'; badgeColor = 'bg-blue-600'; }
    else if (type === 'tv') { badgeText = 'TV'; badgeColor = 'bg-purple-600'; }
    else if (type === 'game') { badgeText = 'GAME'; badgeColor = 'bg-green-600'; }
    return (
      <AppPressable className="mr-3 w-36 rounded-2xl overflow-hidden bg-slate-900">
        <View className="relative">
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} className="h-44 w-full" resizeMode="cover" />
          ) : (
            <View className="h-44 w-full items-center justify-center bg-slate-800">
              <Text className="text-3xl text-slate-500 font-bold">{title.charAt(0)}</Text>
            </View>
          )}
          {badgeText ? (
            <View className="absolute top-2 right-2">
              <View className={`${badgeColor} px-2 py-0.5 rounded-md`}>
                <Text className="text-white text-[10px] font-bold">{badgeText}</Text>
              </View>
            </View>
          ) : null}
        </View>
        <View className="p-2">
          <Text className="text-sm text-slate-50 font-semibold" numberOfLines={1}>{title}</Text>
          {rating != null ? <Text className="text-xs text-yellow-400">{rating} ★</Text> : null}
          <Text className="text-[11px] text-slate-400">{new Date(date).toLocaleDateString()}</Text>
        </View>
      </AppPressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="items-center mb-6">
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
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
          {profile.username ? (
            <Text className="text-slate-400 text-sm">@{profile.username}</Text>
          ) : null}
          {profile.bio ? (
            <Text className="text-sm text-slate-300 text-center mt-2 px-6">{profile.bio}</Text>
          ) : null}

          <View className="flex-row gap-6 mt-4">
            <AppPressable
              onPress={() => router.push(`/followers/${id}`)}
              className="items-center"
            >
              <Text className="text-slate-50 font-bold text-base">{followCounts.followers}</Text>
              <Text className="text-slate-400 text-xs">Followers</Text>
            </AppPressable>
            <AppPressable
              onPress={() => router.push(`/following/${id}`)}
              className="items-center"
            >
              <Text className="text-slate-50 font-bold text-base">{followCounts.following}</Text>
              <Text className="text-slate-400 text-xs">Following</Text>
            </AppPressable>
          </View>

          {!isSelf && user?.id ? (
            <AppPressable
              onPress={handleFollowPress}
              disabled={followLoading}
              className="mt-4 bg-[#7B3FF2] rounded-xl py-2 px-6"
            >
              <Text className="text-white font-semibold">
                {followLoading ? '…' : following ? 'Unfollow' : 'Follow'}
              </Text>
            </AppPressable>
          ) : null}
        </View>

        <View className="flex-row gap-2 mb-6">
          <View className="flex-1 bg-slate-900 rounded-2xl px-3 py-3 items-center">
            <Text className="text-xl text-slate-50 font-bold">{counts.moviesLogged}</Text>
            <Text className="text-xs text-slate-400">MOVIES</Text>
          </View>
          <View className="flex-1 bg-slate-900 rounded-2xl px-3 py-3 items-center">
            <Text className="text-xl text-slate-50 font-bold">{counts.showsLogged}</Text>
            <Text className="text-xs text-slate-400">SHOWS</Text>
          </View>
          <View className="flex-1 bg-slate-900 rounded-2xl px-3 py-3 items-center">
            <Text className="text-xl text-slate-50 font-bold">{counts.gamesLogged}</Text>
            <Text className="text-xs text-slate-400">GAMES</Text>
          </View>
        </View>

        <Text className="text-slate-50 font-semibold mb-2">Recent Activity</Text>
        {recentActivity.length === 0 ? (
          <Text className="text-slate-400 text-sm mb-6">Nothing logged yet.</Text>
        ) : (
          <FlatList
            data={recentActivity}
            horizontal
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }) => <PosterCard item={item} />}
            showsHorizontalScrollIndicator={false}
            className="mb-6"
          />
        )}

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-50 font-semibold">Movies</Text>
            {isSelf ? (
              <AppPressable onPress={() => router.push('/movies/logged')}>
                <Text className="text-primary text-sm">See all</Text>
              </AppPressable>
            ) : null}
          </View>
          {recentMovies.length === 0 ? (
            <Text className="text-slate-400 text-sm">No movies logged yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentMovies.map((movie) => (
                <PosterCard key={movie.id} item={movie} mediaType="movie" />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-50 font-semibold">TV Shows</Text>
            {isSelf ? (
              <AppPressable onPress={() => router.push('/tvshows/logged')}>
                <Text className="text-primary text-sm">See all</Text>
              </AppPressable>
            ) : null}
          </View>
          {recentTVShows.length === 0 ? (
            <Text className="text-slate-400 text-sm">No TV shows logged yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentTVShows.map((show) => (
                <PosterCard key={show.id} item={show} mediaType="tv" />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-50 font-semibold">Games</Text>
            {isSelf ? (
              <AppPressable onPress={() => router.push('/games/logged')}>
                <Text className="text-primary text-sm">See all</Text>
              </AppPressable>
            ) : null}
          </View>
          {recentGames.length === 0 ? (
            <Text className="text-slate-400 text-sm">No games logged yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentGames.map((game) => (
                <PosterCard key={game.id} item={game} mediaType="game" />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
