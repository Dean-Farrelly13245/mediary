import { View, Image, Text, ScrollView, ActivityIndicator, StyleSheet, Platform } from "react-native";
import AppPressable from "@/components/AppPressable";
import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useFetch from "@/services/useFetch";
import { fetchGameDetails } from "@/services/rawg";
import { LinearGradient } from "expo-linear-gradient";

const GameDetails = () => {
  const { id } = useLocalSearchParams();
  const { data: game, loading } = useFetch(() => fetchGameDetails(id as string));

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#7B3FF2" />
      </View>
    );
  }

  const title = game?.name;
  const releasedYear = game?.released ? game.released.split("-")[0] : "N/A";
  const rating = game?.rating ? Math.round(game.rating) : 0;
  const ratingCount = game?.ratings_count ?? 0;

  const genres =
    game?.genres && game.genres.length > 0
      ? game.genres.map((g) => g.name).join(" • ")
      : "N/A";

  const platforms =
    game?.platforms && game.platforms.length > 0
      ? game.platforms
          .map((p) => p?.platform?.name)
          .filter(Boolean)
          .slice(0, 4)
          .join(" • ")
      : "N/A";

  const publishers =
    game?.publishers && game.publishers.length > 0
      ? game.publishers.map((p) => p.name).slice(0, 3).join(" • ")
      : "N/A";

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
        {/* ===== Banner ===== */}
        <View className="relative w-full h-[320px]">
          <Image
            source={{
              uri: game?.background_image
                ? game.background_image
                : "https://via.placeholder.com/1280x720.png?text=No+Image",
            }}
            className="w-full h-full"
            resizeMode="cover"
          />

          <LinearGradient
            colors={[
              "rgba(0,0,0,0.05)",
              "rgba(20,10,40,0.6)",
              "rgba(10,10,20,0.95)",
            ]}
            className="absolute bottom-0 left-0 right-0 h-[160px]"
            pointerEvents="none"
          />
        </View>

        {/* ===== Game Info Section ===== */}
        <View className="flex-row justify-between items-start px-5 -mt-16">
          <View className="flex-1 pr-4">
            <Text className="text-white font-extrabold text-3xl leading-tight">
              {title}
            </Text>

            <View className="flex-row items-center gap-x-2 mt-2">
              <Text className="text-gray-300 text-sm">{releasedYear}</Text>
              <View className="w-1 h-1 rounded-full bg-gray-500" />
              <Text className="text-gray-300 text-sm">
                {game?.playtime ? `${game.playtime} hrs` : "Playtime N/A"}
              </Text>
            </View>

            {/* Rating badge */}
            <View className="flex-row items-center bg-[#7B3FF220] px-3 py-1 rounded-full mt-3">
              <Ionicons name="star" size={14} color="#F6B73C" />
              <Text className="text-white text-sm ml-1 font-semibold">
                {rating}/5
              </Text>
              <Text className="text-gray-400 text-xs ml-2">
                {ratingCount} ratings
              </Text>
            </View>
          </View>

          <View className="shadow-lg shadow-black/50">
            <Image
              source={{
                uri: game?.background_image
                  ? game.background_image
                  : "https://via.placeholder.com/500x750.png?text=No+Cover",
              }}
              className="w-[110px] h-[160px] rounded-xl border border-[#7B3FF250]"
              resizeMode="cover"
            />
          </View>
        </View>

        <View className="px-5 mt-6">
          <Text className="text-[#7B3FF2] font-bold uppercase tracking-wide text-sm mb-1">
            Overview
          </Text>
          <Text className="text-white/90 text-base leading-6">
            {game?.description_raw || "No overview available."}
          </Text>

          {/* Genres */}
          <Text className="text-[#7B3FF2] font-bold uppercase tracking-wide text-sm mt-6 mb-1">
            Genres
          </Text>
          <Text className="text-white text-base">{genres}</Text>

          {/* Platforms */}
          <Text className="text-[#7B3FF2] font-bold uppercase tracking-wide text-sm mt-6 mb-1">
            Platforms
          </Text>
          <Text className="text-white text-base">{platforms}</Text>

          {/* Publishers */}
          <Text className="text-[#7B3FF2] font-bold uppercase tracking-wide text-sm mt-6 mb-1">
            Publishers
          </Text>
          <Text className="text-white text-base">{publishers}</Text>

          <Text className="text-xs text-gray-500 mt-2">
            Video game data provided by RAWG.io
          </Text>
        </View>

        <AppPressable
          onPress={() => router.back()}
          className="absolute bottom-6 left-5 right-5 bg-[#7B3FF2] rounded-2xl py-3.5 flex-row items-center justify-center shadow-md shadow-[#7B3FF260]"
          hitSlop={8}
          style={styles.bottomBackButton}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
          <Text className="text-white font-semibold text-base ml-2">
            Go Back
          </Text>
        </AppPressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingBackButton: {
    zIndex: 100,
    elevation: 100,
  },
  bottomBackButton: {
    zIndex: 20,
    elevation: 20,
  },
});

export default GameDetails;
