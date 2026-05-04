import { fetchMovies, fetchTVShows } from "@/services/api";
import { fetchTrendingGames } from "@/services/rawg";
import { getCachedRecommendations, triggerRecommendationRefresh, RecommendationItem } from "@/services/recommendations";
import { recEvents } from "@/services/recEvents";
import useFetch from "@/services/useFetch";
import { Text, View, ActivityIndicator, FlatList, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import MovieCard from "@/components/MovieCard";
import TvShowCard from "@/components/TvShowCard";
import RecommendationRow from "@/components/RecommendationRow";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/supabase";

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
        <View className="px-4" style={{ paddingTop: 16 }}>
          <Text className="text-primary font-bold text-3xl mt-16 self-center">Mediary</Text>
        </View>
      );
    }

    if (section === 'recs_movies') {
      if (tooFewLogs) {
        return (
          <View className="mx-5 mb-6 bg-gray-800 rounded-xl p-4">
            <Text className="text-white font-bold text-base mb-1">Unlock Recommendations</Text>
            <Text className="text-gray-400 text-sm">Log a few more films or games to unlock personalised recommendations for you.</Text>
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
      if (moviesLoading) return <ActivityIndicator size="large" color="#7B3FF2" className="mt-10 self-center" />;
      if (moviesError) return <Text className="text-red-400 px-5">Error: {moviesError?.message}</Text>;
      return (
        <View className="mb-6">
          <Text className="text-lg text-white font-bold mb-2 px-5">Trending Movies</Text>
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
      if (tvLoading) return <ActivityIndicator size="large" color="#7B3FF2" className="mt-10 self-center" />;
      if (tvError) return <Text className="text-red-400 px-5">Error: {tvError?.message}</Text>;
      return (
        <View className="mb-6">
          <Text className="text-lg text-white font-bold mb-2 px-5">Trending TV Shows</Text>
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
      if (gamesLoading) return <ActivityIndicator size="large" color="#7B3FF2" className="mt-10 self-center" />;
      if (gamesError) return <Text className="text-red-400 px-5">Error: {gamesError?.message}</Text>;
      return (
        <View className="mb-6">
          <Text className="text-lg text-white font-bold mb-2 px-5">Trending Video Games</Text>
          <FlatList
            data={games}
            horizontal
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="w-4" />}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
            className="mt-2"
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/games/${item.id}`)} style={{ width: 120 }}>
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: item.background_image }}
                    style={{ width: 120, height: 170, borderRadius: 12 }}
                  />
                  <Pressable
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
                      backgroundColor: '#7B3FF2',
                      borderRadius: 20,
                      width: 32,
                      height: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="add" size={20} color="white" />
                  </Pressable>
                </View>
                <Text numberOfLines={2} style={{ color: "white", fontWeight: "700", marginTop: 6 }}>
                  {item.name}
                </Text>
                <Text style={{ color: "#aaa", fontSize: 12 }}>
                  {item.released ? item.released : "Unknown"}
                </Text>
              </Pressable>
            )}
          />
          <Text style={{ color: "#777", paddingHorizontal: 20 }}>Video game data provided by RAWG.io</Text>
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
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}
