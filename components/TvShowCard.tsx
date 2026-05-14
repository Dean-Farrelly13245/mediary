import { View, Text, Image } from 'react-native'
import React from 'react'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';
import AppPressable from './AppPressable';
import { card, colors, shadow, HIT_SLOP_44 } from '@/lib/theme';

const TvShowCard = ({ id, poster_path, name, vote_average, first_air_date }: TVShow) => {
  const router = useRouter();
  const posterUrl = poster_path
    ? `https://image.tmdb.org/t/p/w500${poster_path}`
    : 'https://placehold.co/600x400/1a1a1a/ffffff.png';

  return (
    <Link href={`/tvshows/${id}`} asChild>
      <AppPressable
        style={[{ width: card.width }, shadow.cardLight]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${name}`}
      >
        <View style={{ borderRadius: 12, overflow: 'hidden' }}>
          <Image
            source={{ uri: posterUrl }}
            style={{
              width: card.width,
              height: card.posterHeight,
              borderRadius: 12,
            }}
            resizeMode="cover"
          />
          <AppPressable
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: '/log',
                params: {
                  tmdbId: id.toString(),
                  mediaType: 'tv',
                  title: name || 'Untitled',
                  posterUrl,
                },
              });
            }}
            hitSlop={HIT_SLOP_44}
            accessibilityRole="button"
            accessibilityLabel={`Log ${name}`}
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
        <Text
          style={{
            color: colors.text,
            fontSize: 13,
            fontWeight: '700',
            marginTop: 6,
            width: card.width,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, width: card.width }}>
          <Ionicons name="star" size={12} color={colors.accent} />
          <Text style={{ color: '#ccc', fontSize: 12, marginLeft: 4 }}>
            {Math.round(vote_average)}
          </Text>
          <Text style={{ color: colors.textDim, fontSize: 12, marginLeft: 6 }}>
            {first_air_date?.split('-')[0]}
          </Text>
        </View>
      </AppPressable>
    </Link>
  )
}

export default TvShowCard
