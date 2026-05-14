import { View, Text, FlatList, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import RecommendationCard from './RecommendationCard';
import AppPressable from './AppPressable';
import { RecommendationItem } from '@/services/recommendations';
import { card, colors, spacing } from '@/lib/theme';

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
        width: card.width,
        height: card.posterHeight,
        borderRadius: 12,
        backgroundColor: colors.surfaceLight,
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
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text className="text-white text-lg font-bold" numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
        {onSeeAll ? (
          <AppPressable onPress={onSeeAll} hitSlop={8}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>See All →</Text>
          </AppPressable>
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
