import AppPressable from "@/components/AppPressable";
import { useAuth } from "@/context/AuthContext";
import { getMediaLogsByType } from "@/services/mediaLogs";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type LogItem = {
  id: number;
  title: string;
  rating: number | null;
  logged_at: string;
  poster_url: string | null;
};

// Helper: format date like "23 Jan 2026"
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// Log Row Component
function LogRow({ item, onPress }: { item: LogItem; onPress: () => void }) {
  const ratingText = item.rating ? `${item.rating}/10` : "Not rated";
  const dateText = formatDate(item.logged_at);

  return (
    <AppPressable
      onPress={onPress}
      className="bg-zinc-900 rounded-xl p-4 mb-3 flex-row items-center border border-zinc-800"
    >
      {/* Poster */}
      <View className="mr-4">
        {item.poster_url ? (
          <Image
            source={{ uri: item.poster_url }}
            className="w-16 h-24 rounded-lg"
          />
        ) : (
          <View className="w-16 h-24 rounded-lg bg-zinc-800 items-center justify-center">
            <Text className="text-4xl">📺</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text className="text-white font-bold text-base mb-1" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="text-zinc-500 text-sm">{ratingText}</Text>
        <Text className="text-zinc-600 text-xs mt-1">{dateText}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#64748b" />
    </AppPressable>
  );
}

export default function AllTVShows() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getMediaLogsByType(user!.id, "tv", 200);

      const normalized: LogItem[] = data.map((log) => ({
        id: log.id,
        title: log.title || "Untitled",
        rating: log.rating,
        logged_at: log.logged_at || log.created_at,
        poster_url: log.poster_url,
      }));

      setLogs(normalized);
    } catch (err: any) {
      console.error("Failed to fetch TV shows:", err);
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
        <Text className="text-white mt-4">Loading TV shows...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-5">
        <Text className="text-red-400 text-center text-base">
          Couldn't load TV shows
        </Text>
        <Text className="text-zinc-500 text-center text-sm mt-2">{error}</Text>
        <AppPressable
          onPress={fetchLogs}
          className="bg-primary rounded-xl px-6 py-3 mt-4"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </AppPressable>
      </View>
    );
  }

  // Empty state
  if (logs.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <View className="px-5 mt-20 flex-row items-center mb-5">
          <AppPressable onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </AppPressable>
          <Text className="text-white font-bold text-3xl">All TV Shows</Text>
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-zinc-500 text-center text-base">
            No TV shows logged yet
          </Text>
          <Text className="text-zinc-600 text-center text-sm mt-2">
            Start logging TV shows to see them here!
          </Text>
        </View>
      </View>
    );
  }

  // Main list
  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <LogRow
            item={item}
            onPress={() => router.push(`/log-detail/${item.id}?source=log`)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={
          <View className="px-5 mt-20 flex-row items-center mb-5">
            <AppPressable onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </AppPressable>
            <Text className="text-white font-bold text-3xl">All TV Shows</Text>
          </View>
        }
        className="px-5"
      />
    </View>
  );
}
