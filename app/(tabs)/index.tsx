import { fetchMovies, fetchTVShows } from "@/services/api";
import { fetchTrendingGames } from "@/services/rawg";
import { getCachedRecommendations, triggerRecommendationRefresh, RecommendationItem } from "@/services/recommendations";
import { recEvents } from "@/services/recEvents";
import useFetch from "@/services/useFetch";
import { Text, View, FlatList, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import MovieCard from "@/components/MovieCard";
import TvShowCard from "@/components/TvShowCard";
import RecommendationRow from "@/components/RecommendationRow";
import SectionHeader from "@/components/SectionHeader";
import AppPressable from "@/components/AppPressable";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/supabase";
import { card, colors, shadow, spacing } from "@/lib/theme";

const HEADER_TOP = Platform.OS === 'web' ? 20 : Platform.OS === 'ios' ? 56 : 36;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const SECTIONS = [
  'header',
  'recs_movies',
  'trending_movies',
  'recs_tv',
  'trending_tv',
  'recs_games',
  'trending_games',
  'because_of',
] as const;

type Section = typeof SECTIONS[number];

export default function Index() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: movies, loading: moviesLoading, error: moviesError } = useFetch(() => fetchMovies({ query: "" }));
  const { data: tvShows, loading: tvLoading, error: tvError } = useFetch(() => fetchTVShows({ query: "" }));
  const { data: games, loading: gamesLoading, error: gamesError } = useFetch(() => fetchTrendingGames());

  const [movieRecs, setMovieRecs] = useState<RecommendationItem[]>([]);
  const [tvRecs, setTvRecs] = useState<RecommendationItem[]>([]);
  const [gameRecs, setGameRecs] = useState<RecommendationItem[]>([]);
  const [movieRecsLoading, setMovieRecsLoading] = useState(true);
  const [tvRecsLoading, setTvRecsLoading] = useState(true);
  const [gameRecsLoading, setGameRecsLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState<number | null>(null);
  const [highRatedTitle, setHighRatedTitle] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadRecommendations();
    fetchUserStats();
  }, [user]);

  useEffect(() => {
    const handler = () => loadRecommendations();
    recEvents.on(handler);
    return () => recEvents.off(handler);
  }, [user]);

  async function fetchUserStats() {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('media_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTotalLogs(count ?? 0);

      const { data } = await supabase
        .from('media_logs')
        .select('title, rating, logged_at')
        .eq('user_id', user.id)
        .eq('rating', 5)
        .order('logged_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setHighRatedTitle(data[0].title);
      }

      // Get display name for greeting
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) {
        setDisplayName(profile.display_name || profile.username || null);
      }
    } catch (err) {
      console.log('fetchUserStats error', err);
    }
  }

  async function loadRecommendations() {
    if (!user) return;
    try {
      const [movieRes, tvRes, gameRes] = await Promise.all([
        getCachedRecommendations(user.id, 'screen', 'movie'),
        getCachedRecommendations(user.id, 'screen', 'tv'),
        getCachedRecommendations(user.id, 'gaming', 'game'),
      ]);
      setMovieRecs(movieRes ?? []);
      setTvRecs(tvRes ?? []);
      setGameRecs(gameRes ?? []);
    } catch (err) {
      console.log('loadRecommendations error', err);
    }
    setMovieRecsLoading(false);
    setTvRecsLoading(false);
    setGameRecsLoading(false);

    triggerRecommendationRefresh(user.id, 'screen', 'movie').catch(console.error);
    triggerRecommendationRefresh(user.id, 'screen', 'tv').catch(console.error);
    triggerRecommendationRefresh(user.id, 'gaming', 'game').catch(console.error);
  }

  const tooFewLogs = totalLogs !== null && totalLogs < 3;
  const allScreenRecs = [...movieRecs, ...tvRecs];
  const becauseOfItems = highRatedTitle
    ? allScreenRecs.filter((i) => i.because_of === highRatedTitle)
    : [];

  const renderSection = ({ item: section }: { item: Section }) => {
    if (section === 'header') {
      return (
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: HEADER_TOP, paddingBottom: spacing.lg }}>
          {/* Greeting */}
          {displayName ? (
            <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '500' }}>
              {getGreeting()}, {displayName}
            </Text>
          ) : null}
          {/* Brand */}
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 30, marginTop: 4, textAlign: displayName ? 'left' : 'center' }}>
            Mediary
          </Text>
        </View>
      );
    }

    if (section === 'recs_movies') {
      if (tooFewLogs) {
        return (
          <View style={{
            marginHorizontal: spacing.xl,
            marginBottom: spacing.xl,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="sparkles" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 2 }}>
                Unlock Recommendations
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                Log a few more films or games to get personalised picks.
              </Text>
            </View>
          </View>
        );
      }
      return (
        <RecommendationRow
          title="Picked For You — Movies"
          items={movieRecs}
          loading={movieRecsLoading}
          onSeeAll={() => router.push('/recommendations/screen')}
          onItemPress={(item) => router.push(`/movies/${item.external_id}`)}
        />
      );
    }

    if (section === 'trending_movies') {
      if (moviesLoading) return <SkeletonRow />;
      if (moviesError) return <Text className="text-red-400 px-5">Error: {moviesError?.message}</Text>;
      return (
        <View className="mb-6">
          <SectionHeader title="Trending Movies" />
          <FlatList
            data={movies}
            renderItem={({ item }) => <MovieCard {...item} />}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="w-4" />}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
            className="mt-2"
          />
        </View>
      );
    }

    if (section === 'recs_tv') {
      if (tooFewLogs) return null;
      return (
        <RecommendationRow
          title="Picked For You — TV Shows"
          items={tvRecs}
          loading={tvRecsLoading}
          onSeeAll={() => router.push('/recommendations/screen')}
          onItemPress={(item) => router.push(`/tvshows/${item.external_id}`)}
        />
      );
    }

    if (section === 'trending_tv') {
      if (tvLoading) return <SkeletonRow />;
      if (tvError) return <Text className="text-red-400 px-5">Error: {tvError?.message}</Text>;
      return (
        <View className="mb-6">
          <SectionHeader title="Trending TV Shows" />
          <FlatList
            data={tvShows}
            renderItem={({ item }) => <TvShowCard {...item} />}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="w-4" />}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
            className="mt-2"
          />
        </View>
      );
    }

    if (section === 'recs_games') {
      if (tooFewLogs) return null;
      return (
        <RecommendationRow
          title="Picked For You — Games"
          items={gameRecs}
          loading={gameRecsLoading}
          onSeeAll={() => router.push('/recommendations/gaming')}
          onItemPress={(item) => router.push(`/games/${item.external_id}`)}
        />
      );
    }

    if (section === 'trending_games') {
      if (gamesLoading) return <SkeletonRow />;
      if (gamesError) return <Text className="text-red-400 px-5">Error: {gamesError?.message}</Text>;
      return (
        <View className="mb-6">
          <SectionHeader title="Trending Video Games" />
          <FlatList
            data={games}
            horizontal
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="w-4" />}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
            className="mt-2"
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <AppPressable
                onPress={() => router.push(`/games/${item.id}`)}
                style={[{ width: card.width }, shadow.cardLight]}
              >
                <View style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                  <Image
                    source={{ uri: item.background_image }}
                    style={{ width: card.width, height: card.posterHeight, borderRadius: 12 }}
                  />
                  <AppPressable
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push({
                        pathname: '/log',
                        params: {
                          tmdbId: item.id.toString(),
                          mediaType: 'game',
                          title: item.name || 'Untitled',
                          posterUrl: item.background_image || '',
                        },
                      });
                    }}
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      backgroundColor: colors.primary,
                      borderRadius: 20,
                      width: card.logBtnSize,
                      height: card.logBtnSize,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="add" size={20} color="white" />
                  </AppPressable>
                </View>
                <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 6, width: card.width }}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 4 }}>
                  {item.released ? item.released : "Unknown"}
                </Text>
              </AppPressable>
            )}
          />
          <Text style={{ color: colors.textFaint, paddingHorizontal: 20, fontSize: 11, marginTop: 6 }}>Video game data provided by RAWG.io</Text>
        </View>
      );
    }

    if (section === 'because_of') {
      if (!tooFewLogs && highRatedTitle && becauseOfItems.length > 0) {
        return (
          <RecommendationRow
            title={`Because You Liked "${highRatedTitle}"`}
            items={becauseOfItems}
            onItemPress={(item) =>
              router.push(
                item.media_type === 'movie'
                  ? `/movies/${item.external_id}`
                  : item.media_type === 'tv'
                  ? `/tvshows/${item.external_id}`
                  : `/games/${item.external_id}`
              )
            }
          />
        );
      }
      return null;
    }

    return null;
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={SECTIONS as unknown as Section[]}
        keyExtractor={(item) => item}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 100 : 20 }}
      />
    </View>
  );
}

/** Skeleton placeholder row for loading trending sections */
function SkeletonRow() {
  return (
    <View style={{ marginBottom: spacing.xl, paddingLeft: spacing.xl }}>
      <View style={{ width: 140, height: 18, borderRadius: 6, backgroundColor: colors.surfaceLight, marginBottom: spacing.md }} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ width: card.width, height: card.posterHeight, borderRadius: 12, backgroundColor: colors.surfaceLight }} />
        <View style={{ width: card.width, height: card.posterHeight, borderRadius: 12, backgroundColor: colors.surfaceLight }} />
        <View style={{ width: card.width, height: card.posterHeight, borderRadius: 12, backgroundColor: colors.surfaceLight }} />
      </View>
    </View>
  );
}
