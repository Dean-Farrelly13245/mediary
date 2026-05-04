import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const RAWG_BASE = 'https://api.rawg.io/api';

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const tmdbKey = Deno.env.get('TMDB_API_KEY');
    const rawgKey = Deno.env.get('RAWG_API_KEY');

    const tmdbHeaders = {
      accept: 'application/json',
      Authorization: `Bearer ${tmdbKey}`,
    };

    const [movRes, tvRes, gamesRes] = await Promise.all([
      fetch(`${TMDB_BASE}/trending/movie/week`, { headers: tmdbHeaders }),
      fetch(`${TMDB_BASE}/trending/tv/week`, { headers: tmdbHeaders }),
      fetch(`${RAWG_BASE}/games?ordering=-added&page_size=20&key=${rawgKey}`),
    ]);

    const [movData, tvData, gamesData] = await Promise.all([
      movRes.json(),
      tvRes.json(),
      gamesRes.json(),
    ]);

    const now = new Date().toISOString();

    await Promise.all([
      supabase
        .from('trending_cache')
        .upsert({ media_type: 'movie', items: movData.results || [], fetched_at: now }, { onConflict: 'media_type' }),
      supabase
        .from('trending_cache')
        .upsert({ media_type: 'tv', items: tvData.results || [], fetched_at: now }, { onConflict: 'media_type' }),
      supabase
        .from('trending_cache')
        .upsert({ media_type: 'game', items: gamesData.results || [], fetched_at: now }, { onConflict: 'media_type' }),
    ]);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.log('refresh-trending-cache error', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
