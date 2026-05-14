import React, { useEffect, useState } from "react";
import AppPressable from "@/components/AppPressable";
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/supabase";
import { deleteMediaLog, updateMediaLog } from "@/services/mediaLogs";
import { useToast } from "@/context/ToastContext";
import {
  getLikeCount,
  isLogLikedByMe,
  toggleLike,
  getComments,
  addComment,
  deleteComment,
  Comment,
} from "@/services/likesComments";

type LogDetails = {
  id: number;
  user_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv" | "game";
  title: string | null;
  poster_url: string | null;
  rating: number | null;
  note: string | null;
  logged_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function getTypeEmoji(type: "movie" | "tv" | "game"): string {
  if (type === "movie") return "🎬";
  if (type === "tv") return "📺";
  return "🎮";
}

function getTypeLabel(type: "movie" | "tv" | "game"): string {
  if (type === "movie") return "Movie";
  if (type === "tv") return "TV Show";
  return "Game";
}

export default function LogDetailsScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [log, setLog] = useState<LogDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [deletingLog, setDeletingLog] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRating, setEditRating] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (id) {
      loadLogDetails();
    }
  }, [id, source]);

  useEffect(() => {
    if (log && user) {
      loadLikesAndComments();
    }
  }, [log, user]);

  const loadLogDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (source === "log") {
        const { data: mediaLog, error: logError } = await supabase
          .from("media_logs")
          .select("*")
          .eq("id", id)
          .single();

        if (logError || !mediaLog) {
          throw new Error("Log not found");
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", mediaLog.user_id)
          .maybeSingle();

        setLog({
          id: mediaLog.id,
          user_id: mediaLog.user_id,
          tmdb_id: mediaLog.tmdb_id,
          media_type: mediaLog.media_type as "movie" | "tv" | "game",
          title: mediaLog.title,
          poster_url: mediaLog.poster_url,
          rating: mediaLog.rating,
          note: mediaLog.note,
          logged_at: mediaLog.logged_at,
          username: profile?.username || null,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
        });
        return;
      }

      const { data: activity, error: activityError } = await supabase
        .from("activity_events")
        .select("*")
        .eq("id", id)
        .single();

      if (activityError || !activity) {
        throw new Error("Log not found");
      }

      const logOwnerId =
        activity.type === "log"
          ? activity.user_id
          : activity.target_user_id || activity.user_id;

      const { data: mediaLogs, error: logError } = await supabase
        .from("media_logs")
        .select("*")
        .eq("user_id", logOwnerId)
        .eq("media_type", activity.media_type)
        .eq("tmdb_id", parseInt(activity.media_id))
        .order("created_at", { ascending: false });

      if (logError) {
        throw new Error(`Database error: ${logError.message}`);
      }

      if (!mediaLogs || mediaLogs.length === 0) {
        const fakeLog = {
          id: -1,
          user_id: logOwnerId,
          tmdb_id: parseInt(activity.media_id),
          media_type: activity.media_type as "movie" | "tv" | "game",
          title: activity.media_title,
          poster_url: activity.poster_url,
          rating: activity.rating,
          note: activity.review,
          logged_at: activity.created_at,
        };
        setLog(fakeLog);
        return;
      }

      const mediaLog = mediaLogs[0];

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", logOwnerId)
        .maybeSingle();

      setLog({
        id: mediaLog.id,
        user_id: mediaLog.user_id,
        tmdb_id: mediaLog.tmdb_id,
        media_type: mediaLog.media_type as "movie" | "tv" | "game",
        title: mediaLog.title,
        poster_url: mediaLog.poster_url,
        rating: mediaLog.rating,
        note: mediaLog.note,
        logged_at: mediaLog.logged_at,
        username: profile?.username || null,
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
      });
    } catch (err: any) {
      console.error("Failed to load log details:", err);
      setError(err?.message || "Failed to load log details");
    } finally {
      setLoading(false);
    }
  };

  const loadLikesAndComments = async () => {
    if (!log || !user) return;

    try {
      const [likeCountResult, isLikedResult, commentsResult] = await Promise.all([
        getLikeCount(log.id),
        isLogLikedByMe(log.id, user.id),
        getComments(log.id),
      ]);

      setLikeCount(likeCountResult);
      setIsLiked(isLikedResult);
      setComments(commentsResult);
    } catch (err) {
      console.error("Failed to load likes and comments:", err);
    }
  };

  const handleLike = async () => {
    if (!log || !user || liking) return;

    try {
      setLiking(true);
      const newIsLiked = await toggleLike(log.id, user.id);
      setIsLiked(newIsLiked);
      setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle like");
    } finally {
      setLiking(false);
    }
  };

  const handlePostComment = async () => {
    if (!log || !user || !commentText.trim() || postingComment || log.id <= 0) return;

    try {
      setPostingComment(true);
      const newComment = await addComment(log.id, user.id, commentText);
      setComments(prev => [newComment, ...prev]);
      setCommentText("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    const doDelete = async () => {
      try {
        await deleteComment(commentId, user.id);
        setComments(prev => prev.filter(c => c.id !== commentId));
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete comment");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this comment?')) doDelete();
    } else {
      Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleDeleteLog = () => {
    if (!user || !log || log.id <= 0 || log.user_id !== user.id || deletingLog) return;

    const doDelete = async () => {
      try {
        setDeletingLog(true);
        await deleteMediaLog(user.id, {
          id: log.id,
          tmdb_id: log.tmdb_id,
          media_type: log.media_type,
        });
        router.back();
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete log");
      } finally {
        setDeletingLog(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete Log? This will delete your log, likes, and comments on it.')) doDelete();
    } else {
      Alert.alert("Delete Log", "This will delete your log, likes, and comments on it.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const openEditLog = () => {
    if (!log) return;
    setEditRating(log.rating == null ? "" : String(log.rating));
    setEditDate((log.logged_at || new Date().toISOString()).slice(0, 10));
    setEditNote(log.note || "");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!user || !log || savingEdit) return;

    const trimmedRating = editRating.trim();
    const parsedRating = trimmedRating ? Number(trimmedRating) : null;
    if (parsedRating != null && (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 10)) {
      toast.error("Rating must be between 0 and 10.");
      return;
    }

    const parsedDate = new Date(`${editDate.trim()}T12:00:00.000Z`);
    if (!editDate.trim() || Number.isNaN(parsedDate.getTime())) {
      toast.error("Use YYYY-MM-DD for the log date.");
      return;
    }

    try {
      setSavingEdit(true);
      const updated = await updateMediaLog(
        user.id,
        {
          id: log.id,
          tmdb_id: log.tmdb_id,
          media_type: log.media_type,
        },
        {
          rating: parsedRating,
          note: editNote.trim() || null,
          logged_at: parsedDate.toISOString(),
        }
      );

      setLog((prev) =>
        prev
          ? {
              ...prev,
              rating: updated.rating,
              note: updated.note,
              logged_at: updated.logged_at,
            }
          : prev
      );
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update log");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#7B3FF2" />
        <Text className="text-white mt-4">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error || !log) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center px-5">
        <Text className="text-red-400 text-center">{error || "Log not found"}</Text>
        <AppPressable
          onPress={() => router.back()}
          className="bg-primary rounded-xl px-6 py-3 mt-4"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </AppPressable>
      </SafeAreaView>
    );
  }

  const emoji = getTypeEmoji(log.media_type);
  const typeLabel = getTypeLabel(log.media_type);
  const ratingText = log.rating ? `${log.rating}/10` : "Not rated";
  const dateText = formatDate(log.logged_at);
  const userName = log.display_name || log.username || "Someone";
  const isOwnLog = !!user && log.user_id === user.id && log.id > 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-5 pb-3 border-b border-slate-800">
          <AppPressable
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <Ionicons name="arrow-back" size={24} color="#e5e7eb" />
            <Text className="text-slate-200 ml-2 font-semibold">Back</Text>
          </AppPressable>

          <Text className="text-white font-bold text-2xl">Log Details</Text>
        </View>

        {/* Log Content */}
        <View className="p-5">
          {/* User Info */}
          <View className="flex-row items-center mb-4">
            {log.avatar_url ? (
              <Image
                source={{ uri: log.avatar_url }}
                className="w-10 h-10 rounded-full mr-3"
              />
            ) : (
              <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center mr-3">
                <Text className="text-white text-sm font-bold">
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text className="text-white font-semibold">{userName}</Text>
              <Text className="text-slate-400 text-sm">
                logged a {typeLabel.toLowerCase()} • {dateText}
              </Text>
            </View>
          </View>

          {/* Media Info */}
          <View className="flex-row items-start mb-4">
            <View className="mr-4">
              {log.poster_url ? (
                <Image
                  source={{ uri: log.poster_url }}
                  className="w-20 h-28 rounded"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-20 h-28 rounded bg-slate-800 items-center justify-center">
                  <Text className="text-3xl">{emoji}</Text>
                </View>
              )}
            </View>

            <View className="flex-1">
              <Text className="text-white font-bold text-lg mb-1" numberOfLines={2}>
                {log.title || "Untitled"}
              </Text>
              <Text className="text-slate-400 text-sm mb-2">{typeLabel}</Text>
              <Text className="text-yellow-400 text-sm">{ratingText}</Text>
              {log.note && (
                <Text className="text-slate-300 text-sm mt-2 leading-5">
                  {log.note}
                </Text>
              )}
            </View>
          </View>

          {/* Like Button */}
          {user ? (
            log.id > 0 ? (
              <AppPressable
                onPress={handleLike}
                disabled={liking}
                className="flex-row items-center bg-slate-900 rounded-xl px-4 py-3 mb-6"
              >
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={24}
                  color={isLiked ? "#ef4444" : "#9ca3af"}
                />
                <Text className="text-white ml-2 font-semibold">
                  {liking ? "..." : `${likeCount} ${likeCount === 1 ? "Like" : "Likes"}`}
                </Text>
              </AppPressable>
            ) : (
              <View className="bg-slate-800 rounded-xl px-4 py-3 mb-6">
                <Text className="text-slate-500 text-sm text-center">
                  Likes unavailable for this log
                </Text>
              </View>
            )
          ) : (
            <View className="bg-slate-800 rounded-xl px-4 py-3 mb-6">
              <Text className="text-slate-500 text-sm text-center">
                Sign in to interact
              </Text>
            </View>
          )}

          {isOwnLog && (
            <View className="flex-row gap-3 mb-6">
              <AppPressable
                onPress={openEditLog}
                disabled={deletingLog}
                className="flex-1 flex-row items-center justify-center bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
                accessibilityRole="button"
                accessibilityLabel="Edit this log"
              >
                <Ionicons name="create-outline" size={20} color="#e5e7eb" />
                <Text className="text-slate-100 ml-2 font-semibold">Edit Log</Text>
              </AppPressable>

              <AppPressable
                onPress={handleDeleteLog}
                disabled={deletingLog}
                className="flex-1 flex-row items-center justify-center bg-red-950/70 border border-red-800 rounded-xl px-4 py-3"
                accessibilityRole="button"
                accessibilityLabel="Delete this log"
              >
                {deletingLog ? (
                  <ActivityIndicator color="#fecaca" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#fecaca" />
                    <Text className="text-red-100 ml-2 font-semibold">Delete</Text>
                  </>
                )}
              </AppPressable>
            </View>
          )}

          {/* Comments Section */}
          <View className="mb-6">
            <Text className="text-white font-bold text-lg mb-4">Comments</Text>

            {/* Comment Input */}
            {user ? (
              log.id > 0 ? (
                <View className="mb-4">
                  <TextInput
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="Write a comment..."
                    placeholderTextColor="#6b7280"
                    className="bg-slate-900 rounded-xl px-4 py-3 text-white mb-2"
                    multiline
                    maxLength={300}
                  />
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-500 text-sm">
                      {commentText.length}/300
                    </Text>
                    <AppPressable
                      onPress={handlePostComment}
                      disabled={!commentText.trim() || postingComment}
                      className={`px-4 py-2 rounded-xl ${
                        commentText.trim() && !postingComment
                          ? "bg-primary"
                          : "bg-slate-700"
                      }`}
                    >
                      <Text
                        className={`font-semibold ${
                          commentText.trim() && !postingComment
                            ? "text-white"
                            : "text-slate-500"
                        }`}
                      >
                        {postingComment ? "Posting..." : "Post"}
                      </Text>
                    </AppPressable>
                  </View>
                </View>
              ) : (
                <View className="bg-slate-800 rounded-xl px-4 py-3 mb-4">
                  <Text className="text-slate-500 text-sm text-center">
                    Comments unavailable for this log
                  </Text>
                </View>
              )
            ) : (
              <View className="bg-slate-800 rounded-xl px-4 py-3 mb-4">
                <Text className="text-slate-500 text-sm text-center">
                  Sign in to comment
                </Text>
              </View>
            )}

            {/* Comments List */}
            {comments.length === 0 ? (
              <Text className="text-slate-500 text-center py-8">
                No comments yet
              </Text>
            ) : (
              comments.map((comment) => {
                const commentUserName = comment.display_name || comment.username || "User";
                const isOwnComment = user && comment.user_id === user.id;

                return (
                  <View key={comment.id} className="bg-slate-900 rounded-xl p-4 mb-3">
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-row items-center flex-1">
                        {comment.avatar_url ? (
                          <Image
                            source={{ uri: comment.avatar_url }}
                            className="w-6 h-6 rounded-full mr-2"
                          />
                        ) : (
                          <View className="w-6 h-6 rounded-full bg-slate-800 items-center justify-center mr-2">
                            <Text className="text-white text-xs font-bold">
                              {commentUserName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text className="text-white font-semibold text-sm">
                          {commentUserName}
                        </Text>
                      </View>

                      {isOwnComment && (
                        <AppPressable
                          onPress={() => handleDeleteComment(comment.id)}
                          className="p-1"
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </AppPressable>
                      )}
                    </View>

                    <Text className="text-slate-200 text-sm leading-5 mb-2">
                      {comment.text}
                    </Text>

                    <Text className="text-slate-500 text-xs">
                      {formatDate(comment.created_at)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-slate-950 rounded-t-3xl p-5 border-t border-slate-800">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-lg">Edit Log</Text>
              <AppPressable onPress={() => setEditOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color="#e5e7eb" />
              </AppPressable>
            </View>

            <Text className="text-slate-400 text-xs mb-1">Rating /10</Text>
            <TextInput
              value={editRating}
              onChangeText={setEditRating}
              keyboardType="decimal-pad"
              placeholder="8"
              placeholderTextColor="#64748b"
              className="bg-slate-900 rounded-xl px-4 py-3 text-white mb-3"
            />

            <Text className="text-slate-400 text-xs mb-1">Date</Text>
            <TextInput
              value={editDate}
              onChangeText={setEditDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748b"
              className="bg-slate-900 rounded-xl px-4 py-3 text-white mb-3"
            />

            <Text className="text-slate-400 text-xs mb-1">Comment</Text>
            <TextInput
              value={editNote}
              onChangeText={setEditNote}
              placeholder="What did you think?"
              placeholderTextColor="#64748b"
              multiline
              textAlignVertical="top"
              className="bg-slate-900 rounded-xl px-4 py-3 text-white mb-4 min-h-[90px]"
            />

            <AppPressable
              onPress={handleSaveEdit}
              disabled={savingEdit}
              className="bg-primary rounded-xl py-3 items-center"
            >
              {savingEdit ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Save Changes</Text>
              )}
            </AppPressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
