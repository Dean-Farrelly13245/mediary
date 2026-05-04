import { supabase } from "./supabase";
import { fetchAndCacheMetadata, refreshTasteProfile, triggerRecommendationRefresh } from "./recommendations";
import { recEvents } from "./recEvents";

// what an entry looks like in the db
export type MediaLog = {
  id: number;
  user_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv" | "game";
  status: string;
  rating: number | null;
  note: string | null;
  logged_at: string;
  created_at: string;
  updated_at: string;
  title: string | null;      
  poster_url: string | null; 
};

// what input is expected when logging
export type MediaLogInput = {
  tmdb_id: number;
  media_type: "movie" | "tv" | "game";
  status: string;
  rating?: number | null;
  note?: string | null;
  logged_at?: string;
  title?: string | null;      
  poster_url?: string | null; 
};

// puts a log into media_logs
export async function createMediaLog(
  uid: string,
  logInfo: MediaLogInput
): Promise<MediaLog> {
  const timestamp = logInfo.logged_at || new Date().toISOString();

  const newLog = {
    user_id: uid,
    tmdb_id: logInfo.tmdb_id,
    media_type: logInfo.media_type,
    status: logInfo.status,
    rating: logInfo.rating ?? null,
    note: logInfo.note ?? null,
    logged_at: timestamp,
    title: logInfo.title ?? null,
    poster_url: logInfo.poster_url ?? null,
  };

  const { data, error } = await supabase
    .from("media_logs")
    .insert(newLog)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Error creating media log:", error);
    throw new Error(error?.message || "Could not create media log");
  }

  const log = data as MediaLog;

  // Also create an activity event
  const activityEvent = {
    user_id: uid,
    type: "log",
    media_type: logInfo.media_type,
    media_id: logInfo.tmdb_id.toString(),
    media_title: logInfo.title || "Untitled",
    rating: logInfo.rating,
    review: logInfo.note,
    poster_url: logInfo.poster_url,
  };

  await supabase.from("activity_events").insert(activityEvent);

  const externalId = (logInfo.tmdb_id ?? '').toString();
  const profileType = logInfo.media_type === 'game' ? 'gaming' : 'screen';
  ;(async () => {
    await fetchAndCacheMetadata(externalId, logInfo.media_type);
    await refreshTasteProfile(uid, profileType);
    await Promise.all([
      triggerRecommendationRefresh(uid, 'screen', 'movie'),
      triggerRecommendationRefresh(uid, 'screen', 'tv'),
      triggerRecommendationRefresh(uid, 'gaming', 'game'),
    ]);
    recEvents.emit();
  })().catch(console.error);

  return log;
}

// get latest logs for a user
export async function getRecentMediaLogs(
  uid: string,
  limit = 10
): Promise<MediaLog[]> {
  const { data, error } = await supabase
    .from("media_logs")
    .select("*")
    .eq("user_id", uid)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Failed to fetch recent logs:", error);
    throw new Error(error?.message || "Could not find recent logs");
  }

  return data as MediaLog[];
}

export async function deleteMediaLog(uid: string, log: Pick<MediaLog, "id" | "tmdb_id" | "media_type">): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from("media_logs")
    .select("id")
    .eq("id", log.id)
    .eq("user_id", uid)
    .single();

  if (lookupError || !existing) {
    console.error("Failed to find owned media log:", lookupError);
    throw new Error(lookupError?.message || "Could not find your log");
  }

  await Promise.all([
    supabase.from("likes").delete().eq("log_id", log.id),
    supabase.from("comments").delete().eq("log_id", log.id),
    supabase
      .from("activity_events")
      .delete()
      .eq("type", "log")
      .eq("user_id", uid)
      .eq("media_type", log.media_type)
      .eq("media_id", log.tmdb_id.toString()),
    supabase
      .from("activity_events")
      .delete()
      .in("type", ["like", "comment"])
      .eq("target_user_id", uid)
      .eq("media_type", log.media_type)
      .eq("media_id", log.tmdb_id.toString()),
  ]);

  const { error } = await supabase
    .from("media_logs")
    .delete()
    .eq("id", log.id)
    .eq("user_id", uid);

  if (error) {
    console.error("Failed to delete media log:", error);
    throw new Error(error?.message || "Could not delete log");
  }

  const profileType = log.media_type === "game" ? "gaming" : "screen";
  ;(async () => {
    await refreshTasteProfile(uid, profileType);
    await Promise.all([
      triggerRecommendationRefresh(uid, "screen", "movie"),
      triggerRecommendationRefresh(uid, "screen", "tv"),
      triggerRecommendationRefresh(uid, "gaming", "game"),
    ]);
    recEvents.emit();
  })().catch(console.error);
}

export async function updateMediaLog(
  uid: string,
  log: Pick<MediaLog, "id" | "tmdb_id" | "media_type">,
  updates: Pick<MediaLogInput, "rating" | "note" | "logged_at">
): Promise<MediaLog> {
  const { data, error } = await supabase
    .from("media_logs")
    .update({
      rating: updates.rating ?? null,
      note: updates.note ?? null,
      logged_at: updates.logged_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", log.id)
    .eq("user_id", uid)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to update media log:", error);
    throw new Error(error?.message || "Could not update log");
  }

  await supabase
    .from("activity_events")
    .update({
      rating: updates.rating ?? null,
      review: updates.note ?? null,
    })
    .eq("type", "log")
    .eq("user_id", uid)
    .eq("media_type", log.media_type)
    .eq("media_id", log.tmdb_id.toString());

  const profileType = log.media_type === "game" ? "gaming" : "screen";
  ;(async () => {
    await refreshTasteProfile(uid, profileType);
    await Promise.all([
      triggerRecommendationRefresh(uid, "screen", "movie"),
      triggerRecommendationRefresh(uid, "screen", "tv"),
      triggerRecommendationRefresh(uid, "gaming", "game"),
    ]);
    recEvents.emit();
  })().catch(console.error);

  return data as MediaLog;
}

export async function getPostersForActivityEvents(
  events: { user_id: string; media_id: string; media_type: string }[]
) {
  if (events.length === 0) return {} as Record<string, string | null>;
  const userIds = [...new Set(events.map((e) => e.user_id))];
  const { data } = await supabase
    .from("media_logs")
    .select("user_id, tmdb_id, media_type, poster_url")
    .in("user_id", userIds);
  const map: Record<string, string | null> = {};
  const key = (uid: string, mid: string, mt: string) => `${uid}-${mid}-${mt}`;
  for (const row of data || []) {
    map[key(row.user_id, String(row.tmdb_id), row.media_type)] = row.poster_url;
  }
  return map;
}

export async function getPostersForInteractions(
  events: { user_id: string; media_id: string; media_type: string }[]
) {
  if (events.length === 0) return {} as Record<string, string | null>;

  // For likes/comments, find ANY log with the matching media_id and media_type
  // We don't care which user logged it, we just want a poster for that media
  const mediaQueries = events.map(event => ({
    tmdb_id: parseInt(event.media_id),
    media_type: event.media_type
  }));

  const map: Record<string, string | null> = {};
  const key = (uid: string, mid: string, mt: string) => `${uid}-${mid}-${mt}`;

  // Query for each media item to find a poster
  for (const query of mediaQueries) {
    const { data } = await supabase
      .from("media_logs")
      .select("poster_url")
      .eq("tmdb_id", query.tmdb_id)
      .eq("media_type", query.media_type)
      .not("poster_url", "is", null)
      .limit(1);

    const posterUrl = data && data.length > 0 ? data[0].poster_url : null;

    // Apply this poster to all events with this media
    events
      .filter(e => e.media_id === query.tmdb_id.toString() && e.media_type === query.media_type)
      .forEach(event => {
        map[key(event.user_id, event.media_id, event.media_type)] = posterUrl;
      });
  }

  return map;
}

// get logs by media type for a user
export async function getMediaLogsByType(
  uid: string,
  mediaType: "movie" | "tv" | "game",
  limit?: number
): Promise<MediaLog[]> {
  let query = supabase
    .from("media_logs")
    .select("*")
    .eq("user_id", uid)
    .eq("media_type", mediaType)
    .order("logged_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("Failed to fetch logs by type:", error);
    throw new Error(error?.message || "Could not find logs");
  }

  return data as MediaLog[];
}
