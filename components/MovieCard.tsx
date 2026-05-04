import { View, Text, Image } from 'react-native'
import React from 'react'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';
import AppPressable from './AppPressable';
import { HIT_SLOP_44 } from '@/lib/theme';

const MovieCard = ({ id, poster_path, title, vote_average, release_date}: Movie) => {
  const router = useRouter();
  const posterUrl = poster_path ? `https://image.tmdb.org/t/p/w500${poster_path}` : 'https://placehold.co/600x400/1a1a1a/ffffff.png';

  return (
    <Link href={`/movies/${id}`} asChild>
        <AppPressable className="w-[130px] mr-2" accessibilityRole="button" accessibilityLabel={`Open ${title}`}>
            <View>
                <Image
                    source={{ uri: posterUrl }}
                    className="w-full h-52"
                    resizeMode="cover"
                />
                <AppPressable
                    onPress={(e) => {
                        e.stopPropagation();
                        router.push({
                            pathname: '/log',
                            params: {
                                tmdbId: id.toString(),
                                mediaType: 'movie',
                                title: title || 'Untitled',
                                posterUrl,
                            },
                        });
                    }}
                    hitSlop={HIT_SLOP_44}
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${title}`}
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
                </AppPressable>
            </View>
            <Text className='text-sm font-bold text-white mt-2' numberOfLines={1}>{title}</Text>
            <Text className='text-sm font-bold text-white mt-2'><Ionicons name="star" size={12} color="#F6B73C" /> {Math.round(vote_average)} {release_date?.split('-')[0]}</Text>
        </AppPressable>
    </Link>
  )
}

export default MovieCard
