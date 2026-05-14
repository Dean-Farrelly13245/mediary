import { View, Image, Text, ScrollView, Modal, Pressable, StyleSheet, Platform } from 'react-native';
import AppPressable from '@/components/AppPressable';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useFetch from '@/services/useFetch';
import { fetchMovieDetails, fetchPersonDetails, TMDB_CONFIG } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonHeroDetail } from '@/components/Skeleton';
import { colors, gradients, shadow, spacing } from '@/lib/theme';

const MovieDetails = () => {
  const { id } = useLocalSearchParams();
  const { data: movie, loading } = useFetch(() => fetchMovieDetails(id as string));

  const [activeTab, setActiveTab] = useState('overview');
  const [cast, setCast] = useState([]);
  const [castLoading, setCastLoading] = useState(false);

  // Person modal state
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personLoading, setPersonLoading] = useState(false);
  const [personModalVisible, setPersonModalVisible] = useState(false);

  // Fetch credits when Cast tab is selected
  useEffect(() => {
    if (activeTab === 'cast' && cast.length === 0 && id) {
      setCastLoading(true);
      fetch(`${TMDB_CONFIG.BASE_URL}/movie/${id}/credits`, {
        headers: TMDB_CONFIG.headers,
      })
        .then((res) => res.json())
        .then((data) => setCast(data.cast || []))
        .catch((err) => console.log(err))
        .finally(() => setCastLoading(false));
    }
  }, [activeTab]);

  const openPersonModal = async (personId) => {
    setPersonModalVisible(true);
    setPersonLoading(true);
    try {
      const person = await fetchPersonDetails(personId);
      setSelectedPerson(person);
    } catch (err) {
      console.log(err);
    } finally {
      setPersonLoading(false);
    }
  };

  const closePersonModal = () => {
    setPersonModalVisible(false);
    setSelectedPerson(null);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <AppPressable
          onPress={() => router.back()}
          className="absolute left-4 bg-black/60 rounded-full p-2 border border-white/10"
          hitSlop={16}
          style={[styles.floatingBackButton, { top: Platform.OS === 'web' ? 24 : 54 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </AppPressable>
        <SkeletonHeroDetail />
      </View>
    );
  }

  const directorObj = movie?.credits?.crew?.find((p) => p.job === 'Director');
  const director = directorObj?.name || 'N/A';
  const tabs = ['overview', 'cast', 'info'];

  return (
    <View className="bg-background flex-1">
      {/* ===== Floating Back Button ===== */}
      <AppPressable
        onPress={() => router.back()}
        className="absolute left-4 bg-black/60 rounded-full p-2 border border-white/10"
        hitSlop={16}
        style={[styles.floatingBackButton, { top: Platform.OS === 'web' ? 24 : 54 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </AppPressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ===== Hero Backdrop ===== */}
        <View style={{ position: 'relative', width: '100%', height: 280, overflow: 'hidden' }}>
          <Image
            source={{
              uri: movie?.backdrop_path
                ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
                : `https://image.tmdb.org/t/p/w500${movie?.poster_path}`,
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <LinearGradient
            colors={gradients.heroBanner}
            className="absolute bottom-0 left-0 right-0 h-[160px]"
            pointerEvents="none"
          />
        </View>

        {/* ===== Poster + Title Row ===== */}
        <View className="flex-row px-5 -mt-16">
          <View style={shadow.card}>
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w342${movie?.poster_path}` }}
              className="w-[100px] h-[150px] rounded-xl border border-[#7B3FF250]"
              resizeMode="cover"
            />
          </View>
          <View className="flex-1 ml-4 justify-end">
            <Text className="text-white font-extrabold text-2xl leading-tight">
              {movie?.title}
            </Text>
            <View className="flex-row items-center gap-x-2 mt-1">
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                {movie?.release_date?.split('-')[0]}
              </Text>
              <View className="w-1 h-1 rounded-full bg-gray-500" />
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{movie?.runtime} mins</Text>
            </View>
            <AppPressable
              onPress={() => directorObj && openPersonModal(directorObj.id)}
              disabled={!directorObj}
            >
              <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 4 }}>
                Directed by <Text style={{ color: colors.primary, fontWeight: '600' }}>{director}</Text>
              </Text>
            </AppPressable>
          </View>
        </View>

        {/* ===== Tab Bar ===== */}
        <View className="flex-row border-b border-gray-800 mt-5 mx-5">
          {tabs.map((tab) => (
            <AppPressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="mr-6 pb-2"
              pressedScale={1}
              style={activeTab === tab ? { borderBottomWidth: 2, borderBottomColor: colors.primary } : {}}
            >
              <Text
                className={`text-sm font-semibold capitalize ${
                  activeTab === tab ? 'text-[#7B3FF2]' : 'text-gray-500'
                }`}
              >
                {tab}
              </Text>
            </AppPressable>
          ))}
        </View>

        {/* ===== Tab Content ===== */}
        <View className="px-5 mt-4">
          {activeTab === 'overview' && (
            <View>
              {movie?.tagline ? (
                <Text className="text-gray-400 italic text-sm mb-3">"{movie.tagline}"</Text>
              ) : null}

              <Text className="text-white/90 text-base leading-6">
                {movie?.overview || 'No overview available.'}
              </Text>

              {/* Genre pills */}
              <View className="flex-row flex-wrap gap-2 mt-4">
                {movie?.genres?.map((g) => (
                  <View key={g.id} style={{ backgroundColor: colors.primaryMuted, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{g.name}</Text>
                  </View>
                ))}
              </View>

              {/* Rating */}
              <View className="flex-row items-center mt-4">
                <Ionicons name="star" size={14} color={colors.accent} />
                <Text className="text-white text-sm ml-1 font-semibold">
                  {Math.round(movie?.vote_average ?? 0)}/10
                </Text>
                <Text style={{ color: colors.textDim, fontSize: 12, marginLeft: 8 }}>
                  ({movie?.vote_count} votes)
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'cast' && (
            <View>
              {castLoading ? (
                <View style={{ gap: 12, marginTop: 8 }}>
                  {[1,2,3,4,5].map(i => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceLight }} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={{ height: 14, width: '60%', borderRadius: 4, backgroundColor: colors.surfaceLight }} />
                        <View style={{ height: 10, width: '40%', borderRadius: 4, backgroundColor: colors.surfaceLight }} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                cast.slice(0, 30).map((person) => (
                  <AppPressable
                    key={person.id}
                    onPress={() => openPersonModal(person.id)}
                    className="flex-row items-center py-3 border-b border-gray-800/50"
                  >
                    <Image
                      source={{
                        uri: person.profile_path
                          ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
                          : 'https://via.placeholder.com/50x50.png?text=?',
                      }}
                      className="w-[44px] h-[44px] rounded-full bg-gray-700"
                      resizeMode="cover"
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-white text-sm font-semibold">{person.name}</Text>
                      <Text style={{ color: colors.textDim, fontSize: 12 }}>{person.character}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                  </AppPressable>
                ))
              )}
            </View>
          )}

          {activeTab === 'info' && (
            <View>
              <AppPressable onPress={() => directorObj && openPersonModal(directorObj.id)} disabled={!directorObj}>
                <InfoRow label="Director" value={director} tappable={!!directorObj} />
              </AppPressable>
              <InfoRow label="Runtime" value={movie?.runtime ? `${movie.runtime} minutes` : 'N/A'} />
              <InfoRow label="Release Date" value={movie?.release_date || 'N/A'} />
              <InfoRow label="Status" value={movie?.status || 'N/A'} />
              <InfoRow
                label="Original Language"
                value={movie?.original_language?.toUpperCase() || 'N/A'}
              />
              <InfoRow
                label="Budget"
                value={movie?.budget ? `$${movie.budget.toLocaleString()}` : 'N/A'}
              />
              <InfoRow
                label="Revenue"
                value={movie?.revenue ? `$${movie.revenue.toLocaleString()}` : 'N/A'}
              />
              <InfoRow
                label="Production Companies"
                value={movie?.production_companies?.map((c) => c.name).join(', ') || 'N/A'}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* ===== Floating Log CTA ===== */}
      <View style={styles.floatingCTA}>
        <AppPressable
          onPress={() => router.push({
            pathname: '/log',
            params: {
              tmdbId: (id as string),
              mediaType: 'movie',
              title: movie?.title || 'Untitled',
              posterUrl: movie?.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
            },
          })}
          style={[styles.logBtn, shadow.button]}
          accessibilityRole="button"
          accessibilityLabel="Log this movie"
        >
          <Ionicons name="add-circle" size={22} color="white" />
          <Text style={styles.logBtnText}>Log This Movie</Text>
        </AppPressable>
      </View>

      {/* ===== Person Modal ===== */}
      <Modal
        visible={personModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closePersonModal}
      >
        <View style={styles.personModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closePersonModal}
            accessibilityRole="button"
            accessibilityLabel="Close person details"
          />
          <View style={styles.personModalSheet}>
            <Pressable
              onPress={closePersonModal}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close person details"
              style={styles.personModalCloseButton}
            >
              <Ionicons name="close-circle" size={28} color={colors.primary} />
            </Pressable>

            {personLoading ? (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <View style={{ width: 120, height: 160, borderRadius: 12, backgroundColor: colors.surfaceLight }} />
                <View style={{ width: 140, height: 20, borderRadius: 6, backgroundColor: colors.surfaceLight, marginTop: 12 }} />
              </View>
            ) : selectedPerson ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="items-center mb-4">
                  <Image
                    source={{
                      uri: selectedPerson.profile_path
                        ? `https://image.tmdb.org/t/p/w342${selectedPerson.profile_path}`
                        : 'https://via.placeholder.com/150x200.png?text=?',
                    }}
                    className="w-[120px] h-[160px] rounded-xl"
                    resizeMode="cover"
                  />
                  <Text className="text-white font-bold text-xl mt-3">
                    {selectedPerson.name}
                  </Text>
                  {selectedPerson.birthday && (
                    <Text style={{ color: colors.textDim, fontSize: 14, marginTop: 4 }}>
                      Born: {selectedPerson.birthday}
                      {selectedPerson.place_of_birth
                        ? ` in ${selectedPerson.place_of_birth}`
                        : ''}
                    </Text>
                  )}
                </View>
                {selectedPerson.biography ? (
                  <Text className="text-white/80 text-sm leading-5">
                    {selectedPerson.biography}
                  </Text>
                ) : (
                  <Text style={{ color: colors.textDim, fontSize: 14, textAlign: 'center' }}>
                    No biography available.
                  </Text>
                )}

                {/* Known For / Filmography */}
                {selectedPerson.combined_credits && (() => {
                  const allCredits = [
                    ...(selectedPerson.combined_credits.cast || []),
                    ...(selectedPerson.combined_credits.crew || []).filter((c) => c.job === 'Director'),
                  ];
                  const seen = new Set();
                  const unique = allCredits.filter((c) => {
                    if (seen.has(c.id) || !c.poster_path) return false;
                    seen.add(c.id);
                    return true;
                  });
                  const sorted = unique.sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 20);

                  if (sorted.length === 0) return null;

                  return (
                    <View className="mt-5">
                      <Text style={{ color: colors.primary, fontWeight: '700', letterSpacing: 1, fontSize: 12, marginBottom: 12, textTransform: 'uppercase' }}>
                        Known For
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {sorted.map((credit) => (
                          <AppPressable
                            key={`${credit.media_type}-${credit.id}`}
                            className="mr-3 w-[90px]"
                            onPress={() => {
                              closePersonModal();
                              if (credit.media_type === 'movie') {
                                router.push(`/movies/${credit.id}`);
                              } else {
                                router.push(`/tvshows/${credit.id}`);
                              }
                            }}
                          >
                            <Image
                              source={{ uri: `https://image.tmdb.org/t/p/w185${credit.poster_path}` }}
                              className="w-[90px] h-[130px] rounded-lg"
                              resizeMode="cover"
                            />
                            <Text className="text-white text-xs mt-1" numberOfLines={2}>
                              {credit.title || credit.name}
                            </Text>
                            <Text style={{ color: colors.textDim, fontSize: 10 }}>
                              {credit.character ? credit.character : credit.job || ''}
                            </Text>
                          </AppPressable>
                        ))}
                      </ScrollView>
                    </View>
                  );
                })()}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Simple row for the Info tab
const InfoRow = ({ label, value, tappable }: { label: string; value: string; tappable?: boolean }) => (
  <View className="flex-row py-3 border-b border-gray-800/50">
    <Text style={{ color: colors.textDim, fontSize: 14, width: 140 }}>{label}</Text>
    <Text style={{ fontSize: 14, flex: 1, color: tappable ? colors.primary : colors.text, fontWeight: tappable ? '600' : '400' }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  floatingBackButton: {
    zIndex: 100,
    elevation: 100,
  },
  floatingCTA: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 50,
    elevation: 50,
  },
  logBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  personModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  personModalSheet: {
    maxHeight: '80%',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    zIndex: 2,
    elevation: 2,
  },
  personModalCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
});

export default MovieDetails;
