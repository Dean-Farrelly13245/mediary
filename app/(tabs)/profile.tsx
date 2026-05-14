import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react';
import { Image, ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { getProfile, getProfileCounts, getRecentActivity, getFollowStats } from '@/services/profile';
import { getMediaLogsByType } from '@/services/mediaLogs';
import AppPressable from '@/components/AppPressable';
import { Skeleton, SkeletonProfileHeader } from '@/components/Skeleton';
import SectionHeader from '@/components/SectionHeader';
import { colors, spacing, radius, shadow } from '@/lib/theme';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);

  const [counts, setCounts] = useState({
    moviesLogged: 0,
    showsLogged: 0,
    gamesLogged: 0,
  });

  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [followCountsLoading, setFollowCountsLoading] = useState(true);

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recentMovies, setRecentMovies] = useState<any[]>([]);
  const [recentTVShows, setRecentTVShows] = useState<any[]>([]);
  const [recentGames, setRecentGames] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user || !user.id) {
        setIsLoading(false);
        return;
      }

      let active = true;

      async function load() {
        try {
          setIsLoading(true);
          setError(null);
          setFollowCountsLoading(true);

          const userId = user!.id;

          const [profile, profileCounts, activity, movies, tvshows, games, follow] = await Promise.all([
            getProfile(userId),
            getProfileCounts(userId),
            getRecentActivity(userId),
            getMediaLogsByType(userId, 'movie', 3),
            getMediaLogsByType(userId, 'tv', 3),
            getMediaLogsByType(userId, 'game', 3),
            getFollowStats(userId),
          ]);

          if (!active) return;

          const name =
            profile?.display_name ||
            profile?.username ||
            user!.email ||
            'User';

          setDisplayName(name);
          setAvatarUrl(profile?.avatar_url || null);
          setBio(profile?.bio || null);

          setCounts({
            moviesLogged: profileCounts.moviesLogged || 0,
            showsLogged: profileCounts.showsLogged || 0,
            gamesLogged: profileCounts.gamesLogged || 0,
          });

          setRecentActivity(activity);
          setRecentMovies(movies);
          setRecentTVShows(tvshows);
          setRecentGames(games);

          setFollowCounts({
            followers: follow.followers || 0,
            following: follow.following || 0,
          });
          setFollowCountsLoading(false);
        } catch (err) {
          console.log('Failed to load profile:', err);
          if (active) {
            setError('Could not load profile. Try again.');
            setFollowCountsLoading(false);
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      }

      load();

      return () => {
        active = false;
      };
    }, [user?.id])
  );

  // Poster card component
  const PosterCard = ({ item, onPress, mediaType }: { item: any; onPress?: () => void; mediaType?: string }) => {
    const posterUrl = item.posterUrl || item.poster_url;
    const rating = item.rating;
    const date = item.loggedAt || item.logged_at || item.created_at;
    const title = item.title || 'Untitled';
    const type = mediaType || item.media_type;

    const badgeColors: Record<string, string> = {
      movie: colors.movie,
      tv: colors.tv,
      game: colors.game,
    };
    const badgeLabels: Record<string, string> = {
      movie: 'MOVIE',
      tv: 'TV',
      game: 'GAME',
    };

    return (
      <AppPressable
        onPress={onPress}
        style={[styles.posterCard, shadow.cardLight]}
      >
        <View style={{ position: 'relative' }}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={styles.posterImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.posterImage, styles.posterPlaceholder]}>
              <Text style={{ fontSize: 32, color: colors.textFaint, fontWeight: '700' }}>
                {title.charAt(0)}
              </Text>
            </View>
          )}

          {badgeColors[type] && (
            <View style={[styles.typeBadge, { backgroundColor: badgeColors[type] }]}>
              <Text style={styles.typeBadgeText}>
                {badgeLabels[type]}
              </Text>
            </View>
          )}
        </View>

        <View style={{ padding: 8 }}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
            {title}
          </Text>

          {rating != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
              <Ionicons name="star" size={11} color={colors.accent} />
              <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '600' }}>
                {rating}
              </Text>
            </View>
          )}

          <Text style={{ color: colors.textDim, fontSize: 10, marginTop: 2 }}>
            {new Date(date).toLocaleDateString()}
          </Text>
        </View>
      </AppPressable>
    );
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-slate-50">Log in to view your profile.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <SkeletonProfileHeader />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Skeleton height={60} width="32%" borderRadius={16} />
            <Skeleton height={60} width="32%" borderRadius={16} />
            <Skeleton height={60} width="32%" borderRadius={16} />
          </View>
          <Skeleton height={20} width="40%" style={{ marginTop: 24, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton width={130} height={180} borderRadius={16} />
            <Skeleton width={130} height={180} borderRadius={16} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-4">
        <Ionicons name="alert-circle-outline" size={48} color={colors.textDim} />
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 12 }}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Top buttons */}
        <View className="mb-4 flex-row justify-end items-center gap-2">
          <AppPressable
            onPress={handleSignOut}
            style={styles.headerBtn}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>Sign out</Text>
          </AppPressable>
          <AppPressable
            onPress={() => router.push('/edit-profile')}
            style={styles.headerIconBtn}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </AppPressable>
        </View>

        {/* Avatar + Name */}
        <View className="items-center mb-6">
          <View style={styles.avatarGlow}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={{ fontSize: 30, color: colors.text, fontWeight: '700' }}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 12 }}>
            {displayName}
          </Text>

          {bio ? (
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 }}>
              {bio}
            </Text>
          ) : (
            <AppPressable onPress={() => router.push('/edit-profile')} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '500' }}>
                Add a bio →
              </Text>
            </AppPressable>
          )}

          {/* Follow counts */}
          <View style={{ flexDirection: 'row', gap: 32, marginTop: 16 }}>
            <AppPressable
              onPress={() => router.push(`/followers/${user.id}`)}
              style={{ alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                {followCountsLoading ? '…' : followCounts.followers}
              </Text>
              <Text style={{ color: colors.textDim, fontSize: 12 }}>Followers</Text>
            </AppPressable>

            <AppPressable
              onPress={() => router.push(`/following/${user.id}`)}
              style={{ alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                {followCountsLoading ? '…' : followCounts.following}
              </Text>
              <Text style={{ color: colors.textDim, fontSize: 12 }}>Following</Text>
            </AppPressable>
          </View>
        </View>

        {/* Stat Counters */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Ionicons name="film" size={18} color={colors.movie} style={{ marginBottom: 4 }} />
            <Text style={styles.statNumber}>{counts.moviesLogged}</Text>
            <Text style={styles.statLabel}>MOVIES</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="tv" size={18} color={colors.tv} style={{ marginBottom: 4 }} />
            <Text style={styles.statNumber}>{counts.showsLogged}</Text>
            <Text style={styles.statLabel}>SHOWS</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="game-controller" size={18} color={colors.game} style={{ marginBottom: 4 }} />
            <Text style={styles.statNumber}>{counts.gamesLogged}</Text>
            <Text style={styles.statLabel}>GAMES</Text>
          </View>
        </View>

        {/* Watchlists link */}
        <AppPressable
          onPress={() => router.push('/watchlists')}
          style={styles.watchlistLink}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="list" size={22} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Watchlists</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
        </AppPressable>

        {/* Recent Activity */}
        <SectionHeader title="Recent Activity" />
        {recentActivity.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons name="time-outline" size={32} color={colors.textFaint} />
            <Text style={styles.emptyText}>Nothing logged yet.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {recentActivity.map((item: any) => (
              <PosterCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/log-detail/${item.id}?source=log`)}
              />
            ))}
          </ScrollView>
        )}

        {/* Movies */}
        <SectionHeader
          title="Movies"
          actionLabel="See all"
          onAction={() => router.push('/movies/logged')}
        />
        {recentMovies.length === 0 ? (
          <Text style={styles.emptyText}>No movies logged yet</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {recentMovies.map((movie) => (
              <PosterCard
                key={movie.id}
                item={movie}
                mediaType="movie"
                onPress={() => router.push(`/log-detail/${movie.id}?source=log`)}
              />
            ))}
          </ScrollView>
        )}

        {/* TV Shows */}
        <SectionHeader
          title="TV Shows"
          actionLabel="See all"
          onAction={() => router.push('/tvshows/logged')}
        />
        {recentTVShows.length === 0 ? (
          <Text style={styles.emptyText}>No TV shows logged yet</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {recentTVShows.map((show) => (
              <PosterCard
                key={show.id}
                item={show}
                mediaType="tv"
                onPress={() => router.push(`/log-detail/${show.id}?source=log`)}
              />
            ))}
          </ScrollView>
        )}

        {/* Games */}
        <SectionHeader
          title="Games"
          actionLabel="See all"
          onAction={() => router.push('/games/logged')}
        />
        {recentGames.length === 0 ? (
          <Text style={styles.emptyText}>No games logged yet</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {recentGames.map((game) => (
              <PosterCard
                key={game.id}
                item={game}
                mediaType="game"
                onPress={() => router.push(`/log-detail/${game.id}?source=log`)}
              />
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerIconBtn: {
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    padding: 8,
  },
  avatarGlow: {
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 2,
    borderColor: colors.primaryMuted,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  watchlistLink: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  posterCard: {
    marginRight: 12,
    width: 130,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  posterImage: {
    width: 130,
    height: 176,
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: spacing.xl,
  },
});
