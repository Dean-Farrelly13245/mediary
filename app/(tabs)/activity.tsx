import AppPressable from "@/components/AppPressable";
import { useAuth } from "@/context/AuthContext";
import { getPostersForActivityEvents, getPostersForInteractions } from "@/services/mediaLogs";
import { getFollowingFeed, getProfilesByIds } from "@/services/social";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

// Normalized activity item type
type ActivityItem = {
  id: string;
  user_id: string;
  type: string;
  media_type: "movie" | "tv" | "game";
  media_title: string;
  rating: number | null;
  review: string | null;
  created_at: string;
  poster_url: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  target_user_id?: string | null;
};

// Helper: get emoji based on type
function getTypeEmoji(type: "movie" | "tv" | "game"): string {
  if (type === "movie") return "🎬";
  if (type === "tv") return "📺";
  return "🎮";
}

// Helper: get type label
function getTypeLabel(type: "movie" | "tv" | "game"): string {
  if (type === "movie") return "Movie";
  if (type === "tv") return "Show";
  return "Game";
}

// Helper: format date like "23 Jan 2026"
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// Helper: get activity type description
function getActivityDescription(item: ActivityItem): string {
  const userName = item.display_name || item.username || "Someone";

  if (item.type === "like") {
    return `${userName} liked your log`;
  } else if (item.type === "comment") {
    return `${userName} commented on your log`;
  } else {
    // Default log activity
    return `${userName} logged a ${getTypeLabel(item.media_type).toLowerCase()}`;
  }
}

// Activity Row Component
function ActivityRow({ item, onPress }: { item: ActivityItem; onPress: () => void }) {
  const emoji = getTypeEmoji(item.media_type);
  const typeLabel = getTypeLabel(item.media_type);
  const ratingText = item.rating ? `${item.rating}/10` : "Not rated";
  const dateText = formatDate(item.created_at);
  const userName = item.display_name || item.username || "Someone";
  const activityDescription = getActivityDescription(item);

  const isInteraction = item.type === "like" || item.type === "comment";

  return (
    <AppPressable
      onPress={onPress}
      className="bg-zinc-900 rounded-xl p-4 mb-3 border border-zinc-800"
    >
      {/* User Avatar and Name */}
      <View className="flex-row items-center mb-3">
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            className="w-8 h-8 rounded-full mr-3"
          />
        ) : (
          <View className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center mr-3">
            <Text className="text-white text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="text-white font-semibold">{userName}</Text>
        <Text className="text-zinc-400 text-sm ml-2">
          {isInteraction ? "interaction" : `logged a ${typeLabel.toLowerCase()}`}
        </Text>
      </View>

      {/* Media Info */}
      <View className="flex-row items-center">
        <View className="mr-4">
          {item.poster_url ? (
            <Image
              source={{ uri: item.poster_url }}
              className="w-12 h-16 rounded"
              resizeMode="cover"
            />
          ) : (
            <View className="w-12 h-16 rounded bg-zinc-800 items-center justify-center">
              <Text className="text-2xl">{emoji}</Text>
            </View>
          )}
        </View>

        <View className="flex-1">
          <Text className="text-white font-bold text-base mb-1" numberOfLines={2}>
            {item.media_title}
          </Text>
          {isInteraction ? (
            <Text className="text-zinc-500 text-sm">
              {item.type === "like" ? "Liked" : "Commented"}
            </Text>
          ) : (
            <Text className="text-zinc-500 text-sm">{ratingText}</Text>
          )}
          <Text className="text-zinc-600 text-xs mt-1">{dateText}</Text>
        </View>
      </View>
    </AppPressable>
  );
}

export default function Activity() {
  const { user } = useAuth();
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchActivity();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActivity();
    setRefreshing(false);
  };

  const fetchActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch activities from followed users
      const events = await getFollowingFeed(user!.id, 50);

      // Get profile info for each user
      const userIds = events.map((event) => event.user_id);
      const profiles = await getProfilesByIds(userIds);

      // Create a map of profiles
      const profileMap = {};
      for (let i = 0; i < profiles.length; i++) {
        profileMap[profiles[i].id] = profiles[i];
      }

      // Get poster URLs from media_logs for events that don't have them
      const eventsNeedingPoster = events.filter((e) => !e.poster_url);
      let posterMap = {};

      if (eventsNeedingPoster.length > 0) {
        // For likes and comments, we need to find posters differently since the activity user_id
        // is the liker/commenter, but the log belongs to someone else
        const regularEvents = eventsNeedingPoster.filter(e => e.type === 'log');
        const interactionEvents = eventsNeedingPoster.filter(e => e.type === 'like' || e.type === 'comment');

        // Get posters for regular log events (existing logic)
        if (regularEvents.length > 0) {
          const regularPosterMap = await getPostersForActivityEvents(
            regularEvents.map((e) => ({
              user_id: e.user_id,
              media_id: e.media_id,
              media_type: e.media_type,
            }))
          );
          posterMap = { ...posterMap, ...regularPosterMap };
        }

        // Get posters for likes/comments by finding ANY log with that media
        if (interactionEvents.length > 0) {
          const interactionPosterMap = await getPostersForInteractions(interactionEvents);
          posterMap = { ...posterMap, ...interactionPosterMap };
        }
      }

      const posterKey = (uid: string, mid: string, mt: string) =>
        `${uid}-${mid}-${mt}`;

      // Normalize to ActivityItem format
      const normalized: ActivityItem[] = events.map((event) => {
        const profile = profileMap[event.user_id];
        let posterUrl = event.poster_url;
        if (!posterUrl) {
          posterUrl =
            posterMap[posterKey(event.user_id, event.media_id, event.media_type)] || null;
        }
        return {
          id: event.id,
          user_id: event.user_id,
          type: event.type,
          media_type: event.media_type as "movie" | "tv" | "game",
          media_title: event.media_title,
          rating: event.rating,
          review: event.review,
          created_at: event.created_at,
          poster_url: posterUrl,
          username: profile?.username || null,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          target_user_id: event.target_user_id || null,
        };
      });

      setActivity(normalized);
    } catch (err: any) {
      console.error("Failed to fetch activity:", err);
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#7B3FF2" />
        <Text className="text-white mt-4">Loading activity...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-5">
        <Text className="text-red-400 text-center text-base">
          Couldn't load activity
        </Text>
        <Text className="text-zinc-500 text-center text-sm mt-2">{error}</Text>
        <AppPressable
          onPress={fetchActivity}
          className="bg-primary rounded-xl px-6 py-3 mt-4"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </AppPressable>
      </View>
    );
  }

  // Empty state
  if (activity.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <View className="px-5 mt-20">
          <Text className="text-white font-bold text-3xl">Activity</Text>
          <Text className="text-zinc-500 text-sm mt-1">Following</Text>
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-zinc-500 text-center text-base">
            No activity yet
          </Text>
          <Text className="text-zinc-600 text-center text-sm mt-2">
            Follow people to see their movie, show, and game logs here!
          </Text>
        </View>
      </View>
    );
  }

  // Main list
  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={activity}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ActivityRow
            item={item}
            onPress={() => {
              // For likes and comments, navigate to the log details using the activity event ID
              router.push(`/log-detail/${item.id}`);
            }}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7B3FF2" />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={
          <View className="px-5 mt-20 mb-5">
            <Text className="text-white font-bold text-3xl">Activity</Text>
            <Text className="text-zinc-500 text-sm mt-1">Following</Text>
          </View>
        }
        className="px-5"
      />
    </View>
  );
}
