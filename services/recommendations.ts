import { supabase } from './supabase';

export interface RecommendationItem {
  external_id: string;
  media_type: 'movie' | 'tv' | 'game';
  title: string;
  poster_url: string;
  genres: string[];
  match_score: number;
  match_label: string;
  match_color: string;
  because_of?: string;
}

interface MediaMetadata {
  id: string;
  external_id: string;
  media_type: string;
  title: string | null;
  genres: string[];
  keywords: string[];
  cast_members: string[];
  director: string | null;
  description: string | null;
  poster_url: string | null;
  fetched_at: string;
}

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.EXPO_PUBLIC_MOVIE_API_KEY;
const RAWG_BASE = 'https://api.rawg.io/api';
const RAWG_KEY = process.env.EXPO_PUBLIC_RAWG_KEY;

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch('https://api.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } })
    })
    const data = await res.json()
    if (Array.isArray(data) && Array.isArray(data[0])) return data[0]
    if (Array.isArray(data)) return data
    return null
  } catch (err) {
    console.log('embedding error', err)
    return null
  }
}

export async function fetchAndCacheMetadata(
  externalId: string,
  mediaType: 'movie' | 'tv' | 'game'
): Promise<MediaMetadata | null> {
  try {
    const { data: existing } = await supabase
      .from('media_metadata')
      .select('*')
      .eq('external_id', externalId)
      .eq('media_type', mediaType)
      .single();

    if (existing) {
      const fetched = new Date(existing.fetched_at);
      const now = new Date();
      const daysDiff = (now.getTime() - fetched.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 30) {
        return existing as MediaMetadata;
      }
    }

    let genres: string[] = [];
    let keywords: string[] = [];
    let cast_members: string[] = [];
    let director: string | null = null;
    let description: string | null = null;
    let poster_url: string | null = null;
    let title: string | null = null;

    const headers = {
      accept: 'application/json',
      Authorization: `Bearer ${TMDB_KEY}`,
    };

    if (mediaType === 'movie') {
      const res = await fetch(
        `${TMDB_BASE}/movie/${externalId}?append_to_response=credits&api_key=${TMDB_KEY}`,
        { headers }
      );
      const data = await res.json();

      genres = (data.genres || []).map((g: any) => g.name);
      description = data.overview || null;
      poster_url = data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : null;
      title = data.title || null;

      const crew = data.credits?.crew || [];
      director = crew.find((c: any) => c.job === 'Director')?.name || null;
      cast_members = (data.credits?.cast || []).slice(0, 5).map((c: any) => c.name);

      const kwRes = await fetch(
        `${TMDB_BASE}/movie/${externalId}/keywords?api_key=${TMDB_KEY}`,
        { headers }
      );
      const kwData = await kwRes.json();
      keywords = (kwData.keywords || []).map((k: any) => k.name);
    } else if (mediaType === 'tv') {
      const res = await fetch(
        `${TMDB_BASE}/tv/${externalId}?append_to_response=credits&api_key=${TMDB_KEY}`,
        { headers }
      );
      const data = await res.json();

      genres = (data.genres || []).map((g: any) => g.name);
      description = data.overview || null;
      poster_url = data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : null;
      title = data.name || null;

      const crew = data.credits?.crew || [];
      director = crew.find((c: any) => c.job === 'Director')?.name || null;
      cast_members = (data.credits?.cast || []).slice(0, 5).map((c: any) => c.name);

      const kwRes = await fetch(
        `${TMDB_BASE}/tv/${externalId}/keywords?api_key=${TMDB_KEY}`,
        { headers }
      );
      const kwData = await kwRes.json();
      keywords = (kwData.results || []).map((k: any) => k.name);
    } else {
      const res = await fetch(`${RAWG_BASE}/games/${externalId}?key=${RAWG_KEY}`);
      const data = await res.json();

      genres = (data.genres || []).map((g: any) => g.name);
      keywords = (data.tags || []).slice(0, 20).map((t: any) => t.name);
      description = data.description_raw || null;
      poster_url = data.background_image || null;
      title = data.name || null;
    }

    const row: Record<string, any> = {
      external_id: externalId,
      media_type: mediaType,
      title,
      genres,
      keywords,
      cast_members,
      director,
      description,
      poster_url,
      fetched_at: new Date().toISOString(),
    };

    const embeddingText = [title, description, ...genres, ...keywords].filter(Boolean).join(' ')
    const embedding = await generateEmbedding(embeddingText)
    if (embedding) row.embedding = embedding

    const { data: upserted, error } = await supabase
      .from('media_metadata')
      .upsert(row, { onConflict: 'external_id,media_type' })
      .select('*')
      .single();

    if (error) {
      console.log('metadata upsert error', error);
      return null;
    }

    return upserted as MediaMetadata;
  } catch (err) {
    console.log('fetchAndCacheMetadata error', err);
    return null;
  }
}

export async function refreshTasteProfile(
  userId: string,
  profileType: 'screen' | 'gaming'
): Promise<void> {
  try {
    let query = supabase.from('media_logs').select('*').eq('user_id', userId);

    if (profileType === 'screen') {
      query = query.in('media_type', ['movie', 'tv']);
    } else {
      query = query.eq('media_type', 'game');
    }

    const { data: logs } = await query;
    if (!logs || logs.length === 0) return;

    const externalIds = logs.map((l: any) => l.tmdb_id?.toString()).filter(Boolean);
    const { data: allMeta } = await supabase
      .from('media_metadata')
      .select('*')
      .in('external_id', externalIds);

    const metaMap: Record<string, MediaMetadata> = {};
    for (const m of allMeta || []) {
      metaMap[`${m.external_id}_${m.media_type}`] = m;
    }

    const genreWeights: Record<string, number> = {};
    const keywordWeights: Record<string, number> = {};
    const castWeights: Record<string, number> = {};

    const now = new Date();

    for (const log of logs) {
      const rating = log.rating ?? 3;
      const logDate = new Date(log.logged_at);
      const daysSince = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);
      const decay = Math.exp(-daysSince / 365);
      let weight = (rating - 5) * decay;

      if (log.note && log.note.trim().length > 0) {
        weight *= 1.3;
      }

      const meta = metaMap[`${log.tmdb_id?.toString()}_${log.media_type}`];
      if (!meta) continue;

      for (const g of meta.genres || []) {
        genreWeights[g] = (genreWeights[g] || 0) + weight;
      }
      for (const k of meta.keywords || []) {
        keywordWeights[k] = (keywordWeights[k] || 0) + weight;
      }
      for (const c of meta.cast_members || []) {
        castWeights[c] = (castWeights[c] || 0) + weight;
      }
    }

    if (Object.keys(genreWeights).length === 0) {
      console.warn('refreshTasteProfile: no genre weights computed, skipping upsert');
      return;
    }

    const dislikedGenres = Object.entries(genreWeights)
      .filter(([, w]) => w < -2)
      .map(([g]) => g);

    const highRatedLogs = logs.filter((l: any) => l.rating >= 8)
    const embeddingRows = await supabase
      .from('media_metadata')
      .select('embedding, external_id, media_type')
      .in('external_id', highRatedLogs.map((l: any) => l.tmdb_id?.toString()).filter(Boolean))
      .not('embedding', 'is', null)

    const vectors = embeddingRows.data || []

    const upsertData: Record<string, any> = {
      user_id: userId,
      profile_type: profileType,
      genre_weights: genreWeights,
      keyword_weights: keywordWeights,
      cast_weights: castWeights,
      disliked_genres: dislikedGenres,
      last_computed_at: new Date().toISOString(),
    }

    if (vectors.length > 0) {
      const dim = 384
      const tasteVector = new Array(dim).fill(0)

      for (const row of vectors) {
        const log = highRatedLogs.find((l: any) => l.tmdb_id?.toString() === row.external_id)
        const weight = log ? (log.rating - 5) / 5 : 0.5
        for (let i = 0; i < dim; i++) {
          tasteVector[i] += (row.embedding[i] || 0) * weight
        }
      }

      const magnitude = Math.sqrt(tasteVector.reduce((sum, v) => sum + v * v, 0))
      const normalised = magnitude > 0 ? tasteVector.map(v => v / magnitude) : tasteVector

      Object.assign(upsertData, { taste_vector: normalised })
    }

    await supabase
      .from('user_taste_profiles')
      .upsert(upsertData, { onConflict: 'user_id,profile_type' });
  } catch (err) {
    console.log('refreshTasteProfile error', err);
  }
}

export async function backfillUserMetadata(
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const { data: logs } = await supabase
    .from('media_logs')
    .select('*')
    .eq('user_id', userId);

  if (!logs || logs.length === 0) return;

  const total = logs.length;
  console.log(`[backfill] starting ${total} logs`);

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const externalId = log.tmdb_id?.toString();
    if (!externalId) continue;
    console.log(`[backfill] ${i + 1}/${total} — ${log.media_type} ${externalId}`);
    await fetchAndCacheMetadata(externalId, log.media_type);
    onProgress?.(i + 1, total);
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('[backfill] refreshing taste profiles');
  await refreshTasteProfile(userId, 'screen');
  await refreshTasteProfile(userId, 'gaming');
  console.log('[backfill] done');
}

export async function getCachedRecommendations(
  userId: string,
  profileType: 'screen' | 'gaming',
  mediaType: string
): Promise<RecommendationItem[] | null> {
  try {
    const { data } = await supabase
      .from('recommendation_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('profile_type', profileType)
      .eq('media_type', mediaType)
      .maybeSingle();

    if (!data) return null;

    const generated = new Date(data.generated_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - generated.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24 && now.getTime() - generated.getTime() > (24 * 60 * 60 * 1000) + 1000) {
      return null;
    }

    return data.recommendations as RecommendationItem[];
  } catch (err) {
    console.log('getCachedRecommendations error', err);
    return null;
  }
}

export async function triggerRecommendationRefresh(
  userId: string,
  profileType: 'screen' | 'gaming',
  mediaType: string
): Promise<void> {
  supabase.functions
    .invoke('generate-recommendations', {
      body: { userId, profileType, mediaType },
    })
    .catch(console.error);
}
