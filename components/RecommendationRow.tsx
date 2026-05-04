import { View, Text, FlatList, Pressable, Animated, Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import RecommendationCard from './RecommendationCard';
import { RecommendationItem } from '@/services/recommendations';

const CARD_WIDTH = Platform.OS === 'web' ? 140 : 130;
const POSTER_HEIGHT = Platform.OS === 'web' ? 210 : 208;

interface RecommendationRowProps {
  title: string;
  subtitle?: string;
  items: RecommendationItem[];
  onSeeAll?: () => void;
  onItemPress: (item: RecommendationItem) => void;
  loading?: boolean;
}

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity,
        width: CARD_WIDTH,
        height: POSTER_HEIGHT,
        borderRadius: 12,
        backgroundColor: '#374151',
        marginRight: 12,
      }}
    />
  );
}

export default function RecommendationRow({
  title,
  subtitle,
  items,
  onSeeAll,
  onItemPress,
  loading,
}: RecommendationRowProps) {
  if (!loading && items.length === 0) return null;

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between px-5 mb-1">
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text className="text-white text-lg font-bold" numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text>
          ) : null}
        </View>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll}>
            <Text className="text-purple-400 text-sm font-semibold">See All →</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-row pl-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={items}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => `${item.external_id}_${item.media_type}`}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }) => (
            <RecommendationCard item={item} onPress={() => onItemPress(item)} />
          )}
        />
      )}
    </View>
  );
}
