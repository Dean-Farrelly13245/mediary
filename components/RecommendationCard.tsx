import { View, Text, Image, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RecommendationItem } from '@/services/recommendations';

interface RecommendationCardProps {
  item: RecommendationItem;
  onPress: () => void;
}

const badgeColors: Record<string, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

const CARD_WIDTH = Platform.OS === 'web' ? 140 : 130;
const POSTER_HEIGHT = Platform.OS === 'web' ? 210 : 208;

export default function RecommendationCard({ item, onPress }: RecommendationCardProps) {
  const badgeColor = badgeColors[item.match_color] || '#22c55e';
  const displayGenres = (item.genres || []).slice(0, 2);

  return (
    <Pressable onPress={onPress} style={{ width: CARD_WIDTH }}>
      <View style={{ width: CARD_WIDTH, height: POSTER_HEIGHT, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
        <Image
          source={{
            uri: item.poster_url || 'https://placehold.co/130x208/1a1a1a/ffffff.png',
          }}
          style={{ width: CARD_WIDTH, height: POSTER_HEIGHT }}
          resizeMode="cover"
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          className="absolute bottom-0 left-0 right-0 h-16"
        />

        <View
          className="absolute top-2 right-2 px-2 py-1 rounded-full"
          style={{ backgroundColor: badgeColor }}
        >
          <Text className="text-white text-xs font-bold">
            {item.match_score}%
          </Text>
        </View>
      </View>

      <Text
        style={{ color: 'white', fontSize: 13, fontWeight: '700', marginTop: 6, width: CARD_WIDTH }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.title}
      </Text>

      <View className="flex-row flex-wrap gap-1 mt-1">
        {displayGenres.map((g) => (
          <View key={g} className="bg-purple-900/60 px-2 py-0.5 rounded-full">
            <Text className="text-purple-200 text-xs">{g}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
