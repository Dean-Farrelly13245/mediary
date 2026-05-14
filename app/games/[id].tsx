import { View, Image, Text, ScrollView, StyleSheet, Platform } from "react-native";
import AppPressable from "@/components/AppPressable";
import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useFetch from "@/services/useFetch";
import { fetchGameDetails } from "@/services/rawg";
import { LinearGradient } from "expo-linear-gradient";
import { SkeletonHeroDetail } from "@/components/Skeleton";
import { colors, gradients, shadow, spacing } from "@/lib/theme";

const GameDetails = () => {
  const { id } = useLocalSearchParams();
  const { data: game, loading } = useFetch(() => fetchGameDetails(id as string));

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
            colors={gradients.heroBanner}
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
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{releasedYear}</Text>
              <View className="w-1 h-1 rounded-full bg-gray-500" />
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                {game?.playtime ? `${game.playtime} hrs` : "Playtime N/A"}
              </Text>
            </View>

            {/* Rating badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryMuted, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginTop: 12, alignSelf: 'flex-start' }}>
              <Ionicons name="star" size={14} color={colors.accent} />
              <Text className="text-white text-sm ml-1 font-semibold">
                {rating}/5
              </Text>
              <Text style={{ color: colors.textDim, fontSize: 12, marginLeft: 8 }}>
                {ratingCount} ratings
              </Text>
            </View>
          </View>

          <View style={shadow.card}>
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
          <Text style={{ color: colors.primary, fontWeight: '700', letterSpacing: 1, fontSize: 12, marginBottom: 4, textTransform: 'uppercase' }}>
            Overview
          </Text>
          <Text className="text-white/90 text-base leading-6">
            {game?.description_raw || "No overview available."}
          </Text>

          {/* Genres */}
          <Text style={{ color: colors.primary, fontWeight: '700', letterSpacing: 1, fontSize: 12, marginTop: 24, marginBottom: 4, textTransform: 'uppercase' }}>
            Genres
          </Text>
          <Text style={{ color: colors.text, fontSize: 15 }}>{genres}</Text>

          {/* Platforms */}
          <Text style={{ color: colors.primary, fontWeight: '700', letterSpacing: 1, fontSize: 12, marginTop: 24, marginBottom: 4, textTransform: 'uppercase' }}>
            Platforms
          </Text>
          <Text style={{ color: colors.text, fontSize: 15 }}>{platforms}</Text>

          {/* Publishers */}
          <Text style={{ color: colors.primary, fontWeight: '700', letterSpacing: 1, fontSize: 12, marginTop: 24, marginBottom: 4, textTransform: 'uppercase' }}>
            Publishers
          </Text>
          <Text style={{ color: colors.text, fontSize: 15 }}>{publishers}</Text>

          <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 8 }}>
            Video game data provided by RAWG.io
          </Text>
        </View>
      </ScrollView>

      {/* ===== Floating Log CTA ===== */}
      <View style={styles.floatingCTA}>
        <AppPressable
          onPress={() => router.push({
            pathname: '/log',
            params: {
              tmdbId: (id as string),
              mediaType: 'game',
              title: game?.name || 'Untitled',
              posterUrl: game?.background_image || '',
            },
          })}
          style={[styles.logBtn, shadow.button]}
          accessibilityRole="button"
          accessibilityLabel="Log this game"
        >
          <Ionicons name="game-controller" size={22} color="white" />
          <Text style={styles.logBtnText}>Log This Game</Text>
        </AppPressable>
      </View>
    </View>
  );
};

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
});

export default GameDetails;
