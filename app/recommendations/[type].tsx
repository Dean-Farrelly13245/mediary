import { View, Text, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { getCachedRecommendations, RecommendationItem } from '@/services/recommendations';
import RecommendationCard from '@/components/RecommendationCard';
import { useAuth } from '@/context/AuthContext';
import AppPressable from '@/components/AppPressable';

export default function RecommendationsScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { user } = useAuth();

  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  const profileType = type === 'gaming' ? 'gaming' : 'screen';
  const headerTitle = type === 'gaming' ? 'For You — Games' : 'For You — Movies & TV';

  useEffect(() => {
    if (!user) return;
    loadRecs();
  }, [user]);

  async function loadRecs() {
    try {
      const data = await getCachedRecommendations(user!.id, profileType);
      setItems(data ?? []);
    } catch (err) {
      console.log('loadRecs error', err);
    }
    setLoading(false);
  }

  const allGenres = Array.from(
    new Set(items.flatMap((i) => i.genres))
  );

  const filtered = activeGenre
    ? items.filter((i) => i.genres.includes(activeGenre))
    : items;

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#7B3FF2" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-5 mt-14 mb-4">
        <AppPressable onPress={() => router.back()} className="mr-4">
          <Text className="text-purple-400 text-base">← Back</Text>
        </AppPressable>
        <Text className="text-white text-xl font-bold">{headerTitle}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 mb-4"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: 'center' }}
      >
        <AppPressable
          onPress={() => setActiveGenre(null)}
          className={`px-4 py-1.5 rounded-full border ${
            !activeGenre ? 'bg-purple-600 border-purple-600' : 'border-gray-600'
          }`}
        >
          <Text className={`text-sm font-medium ${!activeGenre ? 'text-white' : 'text-gray-400'}`}>
            All
          </Text>
        </AppPressable>

        {allGenres.map((g) => (
          <AppPressable
            key={g}
            onPress={() => setActiveGenre(g)}
            className={`px-4 py-1.5 rounded-full border ${
              activeGenre === g ? 'bg-purple-600 border-purple-600' : 'border-gray-600'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeGenre === g ? 'text-white' : 'text-gray-400'
              }`}
            >
              {g}
            </Text>
          </AppPressable>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 text-base">No recommendations yet.</Text>
          <Text className="text-gray-600 text-sm mt-2">Log more media to unlock them.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(item) => `${item.external_id}_${item.media_type}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
          renderItem={({ item }) => (
            <RecommendationCard
              item={item}
              onPress={() => {
                if (item.media_type === 'movie') {
                  router.push(`/movies/${item.external_id}`);
                } else if (item.media_type === 'tv') {
                  router.push(`/tvshows/${item.external_id}`);
                } else {
                  router.push(`/games/${item.external_id}`);
                }
              }}
            />
          )}
        />
      )}
    </View>
  );
}
