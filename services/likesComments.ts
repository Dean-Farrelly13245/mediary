import { sendNotification } from "./sendNotification";
import { supabase } from "./supabase";

export type Like = {
  id: string;
  log_id: number;
  user_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  log_id: number;
  user_id: string;
  text: string;
  created_at: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export async function getLikeCount(logId: number): Promise<number> {
  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("log_id", logId);

  if (error) {
    console.error("Failed to get like count:", error);
    return 0;
  }

  return count || 0;
}

export async function isLogLikedByMe(logId: number, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("log_id", logId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to check if log is liked:", error);
    return false;
  }

  return !!data;
}

export async function toggleLike(logId: number, userId: string): Promise<boolean> {
  const isLiked = await isLogLikedByMe(logId, userId);

  if (isLiked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("log_id", logId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to unlike:", error);
      throw new Error("Failed to unlike");
    }

    return false;
  } else {
    const { error } = await supabase
      .from("likes")
      .insert({ log_id: logId, user_id: userId });

    if (error) {
      console.error("Failed to like:", error);
      throw new Error("Failed to like");
    }

    // Create activity event for the like
    try {
      // Get log details for the activity event
      const { data: logData } = await supabase
        .from("media_logs")
        .select("user_id, media_type, tmdb_id, title, poster_url")
        .eq("id", logId)
        .single();

      if (logData && logData.user_id !== userId) {
        const activityEvent = {
          user_id: userId,
          type: "like",
          media_type: logData.media_type,
          media_id: logData.tmdb_id.toString(),
          media_title: logData.title || "Untitled",
          poster_url: logData.poster_url,
          target_user_id: logData.user_id,
        };

        await supabase.from("activity_events").insert(activityEvent);
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", userId)
          .single();
        const name = profile?.display_name || profile?.username || "Someone";
        sendNotification(logData.user_id, "New Like", `${name} liked your log`);
      }
    } catch (activityError) {
      console.error("Failed to create like activity event:", activityError);
      // Don't throw - like was successful, activity event is optional
    }

    return true;
  }
}

export async function getComments(logId: number): Promise<Comment[]> {
  // First get comments
  const { data: commentsData, error: commentsError } = await supabase
    .from("comments")
    .select("*")
    .eq("log_id", logId)
    .order("created_at", { ascending: false });

  if (commentsError) {
    console.error("Failed to get comments:", commentsError);
    return [];
  }

  if (!commentsData || commentsData.length === 0) {
    return [];
  }

  // Get unique user IDs
  const userIds = [...new Set(commentsData.map(c => c.user_id))];

  // Get profiles for these users
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    console.error("Failed to get profiles:", profilesError);
  }

  // Create a map of profiles
  const profileMap: Record<string, any> = {};
  (profilesData || []).forEach(profile => {
    profileMap[profile.id] = profile;
  });

  return commentsData.map((comment: any) => {
    const profile = profileMap[comment.user_id];
    return {
      id: comment.id,
      log_id: comment.log_id,
      user_id: comment.user_id,
      text: comment.text,
      created_at: comment.created_at,
      username: profile?.username || null,
      display_name: profile?.display_name || null,
      avatar_url: profile?.avatar_url || null,
    };
  });
}

export async function addComment(logId: number, userId: string, text: string): Promise<Comment> {
  if (!text.trim()) {
    throw new Error("Comment cannot be empty");
  }

  if (text.length > 300) {
    throw new Error("Comment must be 300 characters or less");
  }

  console.log("Inserting comment:", { log_id: logId, user_id: userId, text: text.trim() });

  const { data, error } = await supabase
    .from("comments")
    .insert({
      log_id: logId,
      user_id: userId,
      text: text.trim(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to add comment:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    throw new Error(`Failed to add comment: ${error.message}`);
  }

  console.log("Comment inserted successfully:", data);

    // Create activity event for the comment
    try {
      // Get log details for the activity event
      const { data: logData } = await supabase
        .from("media_logs")
        .select("user_id, media_type, tmdb_id, title, poster_url")
        .eq("id", logId)
        .single();

      if (logData && logData.user_id !== userId) {
        const activityEvent = {
          user_id: userId,
          type: "comment",
          media_type: logData.media_type,
          media_id: logData.tmdb_id.toString(),
          media_title: logData.title || "Untitled",
          poster_url: logData.poster_url,
          target_user_id: logData.user_id,
        };

        await supabase.from("activity_events").insert(activityEvent);
        const { data: commenterProfile } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", userId)
          .single();
        const commenterName = commenterProfile?.display_name || commenterProfile?.username || "Someone";
        sendNotification(logData.user_id, "New Comment", `${commenterName} commented on your log`);
      }
  } catch (activityError) {
    console.error("Failed to create comment activity event:", activityError);
    // Don't throw - comment was successful, activity event is optional
  }

  // Get the profile for this user
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to get profile:", profileError);
  }

  return {
    id: data.id,
    log_id: data.log_id,
    user_id: data.user_id,
    text: data.text,
    created_at: data.created_at,
    username: profile?.username || null,
    display_name: profile?.display_name || null,
    avatar_url: profile?.avatar_url || null,
  };
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to delete comment:", error);
    throw new Error("Failed to delete comment");
  }
}