import { sendNotification } from "./sendNotification";
import { supabase } from "./supabase";

function getErrorMessage(err: any) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  return err.message || "Something went wrong";
}

export async function followUser(myId: string, otherUserId: string) {
  if (!myId || !otherUserId) throw new Error("Missing user id");
  if (myId === otherUserId) throw new Error("You cannot follow yourself");

  const { error } = await supabase.from("follows").insert({
    follower_id: myId,
    following_id: otherUserId,
  });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  const { data: followerProfile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", myId)
    .single();
  const followerName = followerProfile?.display_name || followerProfile?.username || "Someone";
  sendNotification(otherUserId, "New Follower", `${followerName} followed you`);

  return true;
}

export async function unfollowUser(myId: string, otherUserId: string) {
  if (!myId || !otherUserId) throw new Error("Missing user id");

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", myId)
    .eq("following_id", otherUserId);

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return true;
}

export async function isFollowing(myId: string, otherUserId: string) {
  if (!myId || !otherUserId) return false;

  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", myId)
    .eq("following_id", otherUserId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return !!data;
}

export async function getFollowCounts(userId: string) {
  if (!userId) throw new Error("Missing user id");

  const followersRes = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);

  if (followersRes.error) {
    throw new Error(getErrorMessage(followersRes.error));
  }

  const followingRes = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  if (followingRes.error) {
    throw new Error(getErrorMessage(followingRes.error));
  }

  return {
    followers: followersRes.count || 0,
    following: followingRes.count || 0,
  };
}

export async function getFollowerIds(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(getErrorMessage(error));

  return (data || []).map((row: any) => row.follower_id as string);
}

export async function getFollowingIds(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(getErrorMessage(error));

  return (data || []).map((row: any) => row.following_id as string);
}

export type BasicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function getProfilesByIds(userIds: string[]) {
  if (!userIds || userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  if (error) throw new Error(getErrorMessage(error));

  return (data || []) as BasicProfile[];
}


export type ActivityEvent = {
  id: string;
  user_id: string;
  type: string;
  media_type: string;
  media_id: string;
  media_title: string;
  rating: number | null;
  review: string | null;
  poster_url: string | null;
  created_at: string;
  target_user_id?: string | null;
};

export async function getForYouFeed(myId: string, limit = 50) {
  if (!myId) throw new Error("Missing user id");

  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("user_id", myId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(getErrorMessage(error));

  return (data || []) as ActivityEvent[];
}

export async function getFollowingFeed(myId: string, limit = 50) {
  if (!myId) throw new Error("Missing user id");
  const followingIds = await getFollowingIds(myId);
  const idsToUse = [myId, ...followingIds];

  if (idsToUse.length === 0) return [];

  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .or(`user_id.in.(${idsToUse.join(',')}),target_user_id.eq.${myId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(getErrorMessage(error));

  return (data || []) as ActivityEvent[];
}

export async function getFeedWithProfiles(
  mode: "for_you" | "following",
  myId: string,
  limit = 50
) {
  const events =
    mode === "for_you"
      ? await getForYouFeed(myId, limit)
      : await getFollowingFeed(myId, limit);

  const uniqueUserIds = Array.from(new Set(events.map((e) => e.user_id)));
  const profiles = await getProfilesByIds(uniqueUserIds);
  const profileMap: Record<string, BasicProfile> = {};
  for (let i = 0; i < profiles.length; i++) {
    profileMap[profiles[i].id] = profiles[i];
  }

  return { events, profileMap };
}
