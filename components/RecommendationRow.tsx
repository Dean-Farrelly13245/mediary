import { View, Text, FlatList, Pressable, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import RecommendationCard from './RecommendationCard';
import { RecommendationItem } from '@/services/recommendations';

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
      style={{ opacity }}
      className="w-[130px] h-52 rounded-xl bg-gray-700 mr-3"
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
        <View>
          <Text className="text-white text-lg font-bold">{title}</Text>
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
          ItemSeparatorComponent={() => <View className="w-3" />}
          renderItem={({ item }) => (
            <RecommendationCard item={item} onPress={() => onItemPress(item)} />
          )}
        />
      )}
    </View>
  );
}
