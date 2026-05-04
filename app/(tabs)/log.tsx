import AppPressable from "@/components/AppPressable";
import SearchBar from "@/components/SearchBar";
import { searchAllMedia } from "@/services/api";
import { createMediaLog } from "@/services/mediaLogs";
import useFetch from "@/services/useFetch";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { searchGames } from "@/services/rawg";

type Params = {
  tmdbId?: string;
  mediaType?: "movie" | "tv" | "game";
  title?: string;
  posterUrl?: string;
};

type MediaItem = {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path?: string | null;
};

type FilterType = "movie" | "tv" | "game";

const STATUS_OPTIONS = {
  movie: ["watched", "watching", "watchlist", "dropped"],
  tv: ["watched", "watching", "watchlist", "dropped"],
  game: ["played", "playing", "backlog", "dropped"],
} as const;

function LogForm({ params }: { params: Params }) {
  const router = useRouter();
  const { user } = useAuth();

  const [score, setScore] = useState("");

  const rawId = params.tmdbId || "";
  const type = (params.mediaType || "movie") as "movie" | "tv" | "game";
  const displayTitle = params.title || "Untitled";
  const poster = params.posterUrl;

  const [statusChoice, setStatusChoice] = useState<string>(
    type === "game" ? "played" : "watched"
  );

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const saveToLog = async () => {
    if (!user) {
      Alert.alert("You're not logged in.");
      return;
    }

    if (!rawId) {
      Alert.alert("Missing ID");
      return;
    }

    const tmdbId = Number(rawId);
    if (isNaN(tmdbId)) {
      Alert.alert("Invalid ID format");
      return;
    }

    let ratingParsed: number | undefined = undefined;
    if (score.trim().length > 0) {
      const num = Number(score.trim());
      if (isNaN(num) || num < 0 || num > 10) {
        Alert.alert("Rating error", "Score must be between 0 and 10.");
        return;
      }
      ratingParsed = num;
    }

    try {
      setSubmitting(true);

      await createMediaLog(user.id, {
        tmdb_id: tmdbId,
        media_type: type,
        status: statusChoice,
        rating: ratingParsed ?? null,
        note: notes.trim() ? notes.trim() : null,
        title: displayTitle,
        poster_url: poster || null,
      });

      Alert.alert("Success", "Your log was saved!");
      router.replace("/log");
    } catch (err: any) {
      console.error("Logging failed:", err);
      Alert.alert("Failed", err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <AppPressable
          onPress={() => router.replace("/log")}
          className="flex-row items-center mt-14 mb-2"
        >
          <Ionicons name="arrow-back" size={24} color="#e5e7eb" />
          <Text className="text-slate-200 ml-2 font-semibold">Back</Text>
        </AppPressable>

        <Text className="text-primary font-bold text-2xl mt-4 self-center">
          Log {type === "movie" ? "Movie" : type === "tv" ? "TV Show" : "Game"}
        </Text>

        {/* Poster and Title */}
        <View className="items-center mt-6 mb-6">
          {poster ? (
            <Image
              source={{ uri: poster }}
              className="w-32 h-48 rounded-2xl mb-3"
            />
          ) : null}
          <Text className="text-white text-lg font-semibold text-center">
            {displayTitle}
          </Text>
        </View>

        {/* Rating */}
        <View className="mb-4">
          <Text className="text-white font-semibold mb-2">
            Rating (0–10, optional)
          </Text>
          <TextInput
            className="border border-zinc-700 rounded-xl px-4 py-3 text-white"
            placeholder="e.g. 8.5"
            placeholderTextColor="#71717a"
            keyboardType="numeric"
            value={score}
            onChangeText={setScore}
          />
        </View>

        {/* Status  */}
        <View className="mb-4">
          <Text className="text-white font-semibold mb-2">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUS_OPTIONS[type].map((status) => {
              const active = status === statusChoice;
              return (
                <AppPressable
                  key={status}
                  onPress={() => setStatusChoice(status)}
                  className={`px-4 py-2 rounded-full border ${
                    active
                      ? "bg-primary border-primary"
                      : "bg-zinc-900 border-zinc-700"
                  }`}
                >
                  <Text
                    className={
                      active ? "text-white font-semibold" : "text-zinc-200"
                    }
                  >
                    {status[0].toUpperCase() + status.slice(1)}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View className="mb-8">
          <Text className="text-white font-semibold mb-2">Note (optional)</Text>
          <TextInput
            className="border border-zinc-700 rounded-xl px-4 py-3 text-white min-h-[120px]"
            placeholder="Thoughts, fav scenes, why you dropped it..."
            placeholderTextColor="#71717a"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Save Button */}
        <AppPressable
          disabled={submitting}
          onPress={saveToLog}
          className={`rounded-xl py-3 items-center ${
            submitting ? "bg-zinc-700" : "bg-primary"
          }`}
        >
          <Text className="text-white font-semibold text-base">
            {submitting ? "Saving..." : "Save Log"}
          </Text>
        </AppPressable>
      </ScrollView>
    </View>
  );
}

export default function Log() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const [queryText, setQueryText] = useState("");
  const [filter, setFilter] = useState<FilterType>("movie");

  // TMDB
  const {
    data: foundItems,
    loading: isLoading,
    error: loadErr,
    refetch: runSearch,
    reset: resetTmdb,
  } = useFetch<MediaItem[]>(() => searchAllMedia({ query: queryText }), false);

  // RAWG
  const {
    data: foundGames,
    loading: gamesLoading,
    error: gamesErr,
    refetch: runGameSearch,
    reset: resetGames,
  } = useFetch<any[]>(() => searchGames({ query: queryText }), false);

  useEffect(() => {
    const debounceId = setTimeout(() => {
      if (queryText.trim()) {
        if (filter === "game") {
          runGameSearch();
          resetTmdb();
        } else {
          runSearch();
          resetGames();
        }
      } else {
        resetTmdb();
        resetGames();
      }
    }, 500);
    return () => clearTimeout(debounceId);
  }, [queryText, filter]);

  const isMediaSelected = !!params.tmdbId;

  if (isMediaSelected) {
    return <LogForm params={params} />;
  }

  const anyLoading = isLoading || gamesLoading;

  return (
    <View className="flex-1 mt-5 bg-background">
      <ScrollView>
        <View className="flex-1 mt-5 ms-5">
          {/* TMDB */}
          {filter !== "game" && (
            <FlatList
              data={foundItems?.filter((item) => item.media_type === filter)}
              keyExtractor={(item) => `${item.media_type}-${item.id}`}
              scrollEnabled={false}
              numColumns={3}
              columnWrapperStyle={{
                justifyContent: "center",
                gap: 16,
                marginVertical: 16,
              }}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                const name = item.media_type === "tv" ? item.name : item.title;
                const posterUrl = item.poster_path
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : "";

                return (
                  <AppPressable
                    className="items-center"
                    onPress={() =>
                      router.push({
                        pathname: "/log",
                        params: {
                          tmdbId: item.id.toString(),
                          mediaType: item.media_type,
                          title: name || "Untitled",
                          posterUrl,
                        },
                      })
                    }
                  >
                    {posterUrl ? (
                      <Image
                        source={{ uri: posterUrl }}
                        className="w-24 h-36 rounded-xl mb-2"
                      />
                    ) : (
                      <View className="w-24 h-36 rounded-xl mb-2 bg-zinc-800 items-center justify-center">
                        <Text className="text-zinc-400 text-xs text-center px-1">
                          No image
                        </Text>
                      </View>
                    )}
                    <Text
                      className="text-white text-xs text-center"
                      numberOfLines={2}
                    >
                      {name}
                    </Text>
                  </AppPressable>
                );
              }}
              ListHeaderComponent={
                <>
                  <View style={{ paddingTop: 16 }}>
                    <Text style={{ color: '#7B3FF2', fontWeight: '700', fontSize: 24, textAlign: 'center', marginTop: 48, marginBottom: 4 }}>Log Media</Text>
                  </View>

                  <View className="my-4">
                    <SearchBar
                      placeholder="Search for media to log..."
                      value={queryText}
                      onChangeText={(txt) => setQueryText(txt)}
                    />
                  </View>

                  {/* Filter  */}
                  <View className="flex-row gap-2 mt-1 mb-2">
                    {(["movie", "tv", "game"] as FilterType[]).map((t) => {
                      const active = filter === t;
                      return (
                        <AppPressable
                          key={t}
                          onPress={() => setFilter(t)}
                          className={`px-4 py-2 rounded-full border ${
                            active
                              ? "bg-primary border-primary"
                              : "bg-zinc-900 border-zinc-700"
                          }`}
                        >
                          <Text
                            className={
                              active
                                ? "text-white font-semibold"
                                : "text-zinc-300"
                            }
                          >
                            {t === "movie"
                              ? "Movies"
                              : t === "tv"
                              ? "TV Shows"
                              : "Games"}
                          </Text>
                        </AppPressable>
                      );
                    })}
                  </View>

                  {anyLoading && (
                    <ActivityIndicator
                      size="large"
                      color="white"
                      className="my-3"
                    />
                  )}

                  {!anyLoading && queryText.trim() && (
                    <Text className="text-xl text-white mt-3">
                      Search Results for{" "}
                      <Text className="font-bold text-[#7B3FF2]">
                        {queryText}
                      </Text>
                    </Text>
                  )}

                  {loadErr && (
                    <Text className="text-red-400 mt-3">
                      Error: {loadErr.message}
                    </Text>
                  )}

                  {gamesErr && (
                    <Text className="text-red-400 mt-3">
                      Error: {gamesErr.message}
                    </Text>
                  )}
                </>
              }
              ListEmptyComponent={
                !anyLoading && !loadErr && !gamesErr ? (
                  <View className="mt-10 px-5">
                    <Text className="text-center text-white">
                      {queryText.trim()
                        ? filter === "movie"
                          ? "No movies found"
                          : "No TV shows found"
                        : "Search for a Movie, TV Show or Game to log"}
                    </Text>
                  </View>
                ) : null
              }
            />
          )}

          {/*GAMES */}
          {filter === "game" && (
            <View>
              <View style={{ paddingTop: 16 }}>
                <Text style={{ color: '#7B3FF2', fontWeight: '700', fontSize: 24, textAlign: 'center', marginTop: 48, marginBottom: 4 }}>Log Media</Text>
              </View>

              <View className="my-4">
                <SearchBar
                  placeholder="Search for media to log..."
                  value={queryText}
                  onChangeText={(txt) => setQueryText(txt)}
                />
              </View>

              <View className="flex-row gap-2 mt-1 mb-2">
                {(["movie", "tv", "game"] as FilterType[]).map((t) => {
                  const active = filter === t;
                  return (
                    <AppPressable
                      key={t}
                      onPress={() => setFilter(t)}
                      className={`px-4 py-2 rounded-full border ${
                        active
                          ? "bg-primary border-primary"
                          : "bg-zinc-900 border-zinc-700"
                      }`}
                    >
                      <Text
                        className={
                          active ? "text-white font-semibold" : "text-zinc-300"
                        }
                      >
                        {t === "movie" ? "Movies" : t === "tv" ? "TV Shows" : "Games"}
                      </Text>
                    </AppPressable>
                  );
                })}
              </View>

              {anyLoading && (
                <ActivityIndicator size="large" color="white" className="my-3" />
              )}

              {!anyLoading && queryText.trim() && (
                <Text className="text-xl text-white mt-3">
                  Search Results for{" "}
                  <Text className="font-bold text-[#7B3FF2]">{queryText}</Text>
                </Text>
              )}

              {!!foundGames?.length && (
                <View className="px-1 pb-24">
                  <View
                    className="flex-row flex-wrap justify-center"
                    style={{ gap: 16 }}
                  >
                    {foundGames.slice(0, 24).map((g: any) => {
                      const img = g.background_image || "";
                      const title = g.name || "Untitled";

                      return (
                        <AppPressable
                          key={g.id}
                          className="items-center"
                          onPress={() =>
                            router.push({
                              pathname: "/log",
                              params: {
                                tmdbId: g.id.toString(),
                                mediaType: "game",
                                title: title,
                                posterUrl: img,
                              },
                            })
                          }
                          style={{ width: 96 }}
                        >
                          {img ? (
                            <Image
                              source={{ uri: img }}
                              className="w-24 h-36 rounded-xl mb-2"
                            />
                          ) : (
                            <View className="w-24 h-36 rounded-xl mb-2 bg-zinc-800 items-center justify-center">
                              <Text className="text-zinc-400 text-xs text-center px-1">
                                No image
                              </Text>
                            </View>
                          )}

                          <Text
                            className="text-white text-xs text-center"
                            numberOfLines={2}
                          >
                            {title}
                          </Text>
                        </AppPressable>
                      );
                    })}
                  </View>

                  <Text className="text-xs text-gray-500 mt-4 text-center">
                    Video game data provided by RAWG.io
                  </Text>
                </View>
              )}

              {!anyLoading && !gamesErr && queryText.trim() && (!foundGames || foundGames.length === 0) && (
                <View className="mt-10 px-5 pb-24">
                  <Text className="text-center text-white">No games found</Text>
                </View>
              )}

              {!anyLoading && !gamesErr && !queryText.trim() && (
                <View className="mt-10 px-5 pb-24">
                  <Text className="text-center text-white">
                    Search for a Movie, TV Show or Game to log
                  </Text>
                </View>
              )}

              {gamesErr && (
                <Text className="text-red-400 mt-3 px-5">
                  Error: {gamesErr.message}
                </Text>
              )}
            </View>
          )}
          {/* Create Watchlist */}
          <View className="px-4 mb-6">
            <View className="h-px bg-zinc-800 my-3" />
            <AppPressable
              onPress={() => router.push('/create-watchlist')}
              className="flex-row items-center bg-zinc-900 rounded-xl px-4 py-3"
            >
              <Ionicons name="list" size={22} color="#7B3FF2" />
              <Text className="text-white font-semibold ml-3">Create Watchlist</Text>
            </AppPressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
