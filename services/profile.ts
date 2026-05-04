import { supabase } from './supabase';
import { getRecentMediaLogs } from './mediaLogs';
import { getFollowCounts } from './social';




export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  location: string | null;
  website: string | null;
  settings: any;
  stats: any;
};


export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

 
  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return (data as Profile) || null;
}


export async function upsertProfile(profile: {
  id: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  location?: string;
  website?: string;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  data: {
    display_name?: string;
    bio?: string;
    avatar_url?: string | null;
  }
) {
  return upsertProfile({
    id: userId,
    ...data,
  });
}

export async function uploadAvatar(userId: string, uri: string, base64: string, mimeType: string) {
  try {
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `${userId}-${Date.now()}.${ext}`;

    // Decode base64 to Uint8Array — works in React Native (Hermes) without FileReader or blob()
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, bytes, { upsert: true, contentType: mimeType });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.log('Failed to upload avatar:', err);
    throw err;
  }
}

// Count logs by type
export async function getProfileCounts(userId: string) {
  const [movies, shows, games] = await Promise.all([
    supabase
      .from('media_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('media_type', 'movie'),

    supabase
      .from('media_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('media_type', 'tv'),

    supabase
      .from('media_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('media_type', 'game'),
  ]);

  return {
    moviesLogged: movies.count ?? 0,
    showsLogged: shows.count ?? 0,
    gamesLogged: games.count ?? 0,
  };
}

export async function getRecentActivity(userId: string, limit = 10) {
  const logs = await getRecentMediaLogs(userId, limit);

  return logs.map((item) => {
    return {
      id: String(item.id),
      title: item.title || `#${item.tmdb_id}`,
      posterUrl: item.poster_url,
      rating: item.rating,
      loggedAt: item.logged_at,
      media_type: item.media_type,
    };
  });
}
export async function getFollowStats(userId: string) {
  return getFollowCounts(userId);
}