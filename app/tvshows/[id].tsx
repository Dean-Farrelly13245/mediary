import { View, Image, Text, ScrollView, ActivityIndicator, Modal, Pressable, StyleSheet } from 'react-native';
import AppPressable from '@/components/AppPressable';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useFetch from '@/services/useFetch';
import { fetchTVDetails, fetchPersonDetails, TMDB_CONFIG } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';

const TVDetails = () => {
  const { id } = useLocalSearchParams();
  const { data: show, loading } = useFetch(() => fetchTVDetails(id as string));

  const [activeTab, setActiveTab] = useState('overview');
  const [cast, setCast] = useState([]);
  const [castLoading, setCastLoading] = useState(false);

  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personLoading, setPersonLoading] = useState(false);
  const [personModalVisible, setPersonModalVisible] = useState(false);

  useEffect(() => {
    if (activeTab === 'cast' && cast.length === 0 && id) {
      setCastLoading(true);
      fetch(`${TMDB_CONFIG.BASE_URL}/tv/${id}/credits`, {
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
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#7B3FF2" />
      </View>
    );
  }

  const creator =
    show?.created_by?.length > 0
      ? show.created_by.map((c) => c.name).join(', ')
      : 'N/A';

  const tabs = ['overview', 'cast', 'info'];

  return (
    <View className="bg-background flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ===== Hero Backdrop ===== */}
        <View className="relative w-full h-[280px]">
          <Image
            source={{
              uri: show?.backdrop_path
                ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
                : `https://image.tmdb.org/t/p/w500${show?.poster_path}`,
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(20,10,40,0.6)', 'rgba(10,10,20,0.95)']}
            className="absolute bottom-0 left-0 right-0 h-[160px]"
            pointerEvents="none"
          />
          <AppPressable
            onPress={() => router.back()}
            className="absolute top-12 left-5 bg-black/50 rounded-full p-2"
            hitSlop={12}
            style={styles.floatingBackButton}
          >
            <Ionicons name="chevron-back" size={26} color="white" />
          </AppPressable>
        </View>

        {/* ===== Poster + Title Row ===== */}
        <View className="flex-row px-5 -mt-16">
          <View className="shadow-lg shadow-black/50">
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w342${show?.poster_path}` }}
              className="w-[100px] h-[150px] rounded-xl border border-[#7B3FF250]"
              resizeMode="cover"
            />
          </View>
          <View className="flex-1 ml-4 justify-end">
            <Text className="text-white font-extrabold text-2xl leading-tight">
              {show?.name}
            </Text>
            <View className="flex-row items-center gap-x-2 mt-1">
              <Text className="text-gray-300 text-sm">
                {show?.first_air_date?.split('-')[0]}
              </Text>
              <View className="w-1 h-1 rounded-full bg-gray-500" />
              <Text className="text-gray-300 text-sm">
                {show?.number_of_seasons} season{show?.number_of_seasons > 1 ? 's' : ''}
              </Text>
            </View>
            <AppPressable
              onPress={() => show?.created_by?.[0] && openPersonModal(show.created_by[0].id)}
              disabled={!show?.created_by?.length}
            >
              <Text className="text-gray-400 text-xs mt-1">
                Created by <Text className="text-[#7B3FF2] font-semibold">{creator}</Text>
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
              style={activeTab === tab ? { borderBottomWidth: 2, borderBottomColor: '#7B3FF2' } : {}}
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
              {show?.tagline ? (
                <Text className="text-gray-400 italic text-sm mb-3">"{show.tagline}"</Text>
              ) : null}

              <Text className="text-white/90 text-base leading-6">
                {show?.overview || 'No overview available.'}
              </Text>

              <View className="flex-row flex-wrap gap-2 mt-4">
                {show?.genres?.map((g) => (
                  <View key={g.id} className="bg-[#7B3FF220] px-3 py-1 rounded-full">
                    <Text className="text-[#7B3FF2] text-xs font-semibold">{g.name}</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row items-center mt-4">
                <Ionicons name="star" size={14} color="#F6B73C" />
                <Text className="text-white text-sm ml-1 font-semibold">
                  {Math.round(show?.vote_average ?? 0)}/10
                </Text>
                <Text className="text-gray-400 text-xs ml-2">
                  ({show?.vote_count} votes)
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'cast' && (
            <View>
              {castLoading ? (
                <ActivityIndicator size="small" color="#7B3FF2" className="mt-4" />
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
                      <Text className="text-gray-400 text-xs">{person.character}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#555" />
                  </AppPressable>
                ))
              )}
            </View>
          )}

          {activeTab === 'info' && (
            <View>
              <AppPressable onPress={() => show?.created_by?.[0] && openPersonModal(show.created_by[0].id)} disabled={!show?.created_by?.length}>
                <InfoRow label="Creators" value={creator} tappable={!!show?.created_by?.length} />
              </AppPressable>
              <InfoRow
                label="Seasons"
                value={show?.number_of_seasons?.toString() || 'N/A'}
              />
              <InfoRow
                label="Episodes"
                value={show?.number_of_episodes?.toString() || 'N/A'}
              />
              <InfoRow label="First Air Date" value={show?.first_air_date || 'N/A'} />
              <InfoRow label="Status" value={show?.status || 'N/A'} />
              <InfoRow
                label="Original Language"
                value={show?.original_language?.toUpperCase() || 'N/A'}
              />
              <InfoRow
                label="Networks"
                value={show?.networks?.map((n) => n.name).join(', ') || 'N/A'}
              />
              <InfoRow
                label="Production Companies"
                value={show?.production_companies?.map((c) => c.name).join(', ') || 'N/A'}
              />
            </View>
          )}
        </View>
      </ScrollView>

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
              <Ionicons name="close-circle" size={28} color="#7B3FF2" />
            </Pressable>

            {personLoading ? (
              <ActivityIndicator size="large" color="#7B3FF2" className="mt-10" />
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
                    <Text className="text-gray-400 text-sm mt-1">
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
                  <Text className="text-gray-500 text-sm text-center">
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
                      <Text className="text-[#7B3FF2] font-bold uppercase tracking-wide text-xs mb-3">
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
                            <Text className="text-gray-500 text-[10px]">
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

const InfoRow = ({ label, value, tappable }) => (
  <View className="flex-row py-3 border-b border-gray-800/50">
    <Text className="text-gray-400 text-sm w-[140px]">{label}</Text>
    <Text className={`text-sm flex-1 ${tappable ? 'text-[#7B3FF2] font-semibold' : 'text-white'}`}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  floatingBackButton: {
    zIndex: 20,
    elevation: 20,
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
    backgroundColor: '#1a1a2e',
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

export default TVDetails;
