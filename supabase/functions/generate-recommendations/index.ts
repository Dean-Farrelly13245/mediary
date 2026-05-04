import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TMDB_BASE = "https://api.themoviedb.org/3";
const RAWG_BASE = "https://api.rawg.io/api";

const TMDB_GENRE_IDS: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 878,
  "TV Movie": 10770,
  Thriller: 53,
  War: 10752,
  Western: 37,
  "Action & Adventure": 10759,
  Kids: 10762,
  News: 10763,
  Reality: 10764,
  "Sci-Fi & Fantasy": 10765,
  Soap: 10766,
  Talk: 10767,
  "War & Politics": 10768,
};

const TMDB_GENRE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(TMDB_GENRE_IDS).map(([name, id]) => [id, name]),
);

const TMDB_TV_GENRE_IDS: Record<string, number> = {
  "Action & Adventure": 10759,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Kids: 10762,
  Mystery: 9648,
  News: 10763,
  Reality: 10764,
  "Sci-Fi & Fantasy": 10765,
  Soap: 10766,
  Talk: 10767,
  "War & Politics": 10768,
  Western: 37,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { userId, profileType, mediaType } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tmdbKey = Deno.env.get("TMDB_API_KEY");
    const rawgKey = Deno.env.get("RAWG_API_KEY");

    const { data: profile } = await supabase
      .from("user_taste_profiles")
      .select("*")
      .eq("user_id", userId)
      .eq("profile_type", profileType)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "no profile found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const genreWeights: Record<string, number> = profile.genre_weights || {};
    const keywordWeights: Record<string, number> =
      profile.keyword_weights || {};
    const castWeights: Record<string, number> = profile.cast_weights || {};
    const dislikedGenres: string[] = profile.disliked_genres || [];

    const topGenres = Object.entries(genreWeights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([g]) => g);

    let vectorCandidates: any[] = [];

    if (profile.taste_vector) {
      const { data: similar } = await supabase.rpc("match_media_by_vector", {
        query_vector: profile.taste_vector,
        match_media_type:
          mediaType || (profileType === "gaming" ? "game" : null),
        match_count: 40,
      });
      vectorCandidates = similar || [];
    }

    const { data: userLogs } = await supabase
      .from("media_logs")
      .select("tmdb_id, media_type, title, rating, logged_at")
      .eq("user_id", userId);

    const loggedIds = new Set(
      (userLogs || [])
        .map((l: any) => {
          const id = l.tmdb_id?.toString();
          return id ? `${id}_${l.media_type}` : null;
        })
        .filter(Boolean),
    );

    const highRatedLog = (userLogs || [])
      .filter((l: any) => l.rating >= 8)
      .sort((a: any, b: any) => {
        return 0;
      })[0];

    const highRatedTitle = highRatedLog?.title || null;

    let candidates: any[] = [];

    if (profileType === "screen" && mediaType === "movie") {
      const top5Logs = (userLogs || [])
        .filter((l: any) => l.media_type === "movie" && l.rating >= 8)
        .sort((a: any, b: any) => b.rating - a.rating)
        .slice(0, 5);

      const similarResults = await Promise.all(
        top5Logs.map(async (log: any) => {
          const [simRes, recRes] = await Promise.all([
            fetch(
              `${TMDB_BASE}/movie/${log.tmdb_id}/similar?api_key=${tmdbKey}&language=en-US&page=1`,
            ),
            fetch(
              `${TMDB_BASE}/movie/${log.tmdb_id}/recommendations?api_key=${tmdbKey}&language=en-US&page=1`,
            ),
          ]);
          const simData = simRes.ok ? await simRes.json() : { results: [] };
          const recData = recRes.ok ? await recRes.json() : { results: [] };
          if (!simRes.ok)
            console.log("movie similar error", log.tmdb_id, simRes.status);
          if (!recRes.ok)
            console.log("movie rec error", log.tmdb_id, recRes.status);
          return [...(simData.results || []), ...(recData.results || [])].map(
            (m: any) => ({
              external_id: m.id.toString(),
              media_type: "movie",
              title: m.title,
              popularity: m.popularity || 0,
              vote_average: m.vote_average || 0,
              vote_count: m.vote_count || 0,
              poster_url: m.poster_path
                ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
                : null,
              genres: (m.genre_ids || [])
                .map((id: number) => TMDB_GENRE_NAMES[id])
                .filter(Boolean),
              year: m.release_date?.split("-")[0] || "0",
            }),
          );
        }),
      );

      const candidateMap = new Map<string, any>();
      for (const results of similarResults) {
        for (const item of results) {
          const key = item.external_id;
          if (candidateMap.has(key)) {
            candidateMap.get(key).seedCount += 1;
          } else {
            candidateMap.set(key, { ...item, seedCount: 1 });
          }
        }
      }
      candidates = Array.from(candidateMap.values());
    } else if (profileType === "screen" && mediaType === "tv") {
      const top5Logs = (userLogs || [])
        .filter((l: any) => l.media_type === "tv" && l.rating >= 8)
        .sort((a: any, b: any) => b.rating - a.rating)
        .slice(0, 5);

      const similarResults = await Promise.all(
        top5Logs.map(async (log: any) => {
          const [simRes, recRes] = await Promise.all([
            fetch(
              `${TMDB_BASE}/tv/${log.tmdb_id}/similar?api_key=${tmdbKey}&language=en-US&page=1`,
            ),
            fetch(
              `${TMDB_BASE}/tv/${log.tmdb_id}/recommendations?api_key=${tmdbKey}&language=en-US&page=1`,
            ),
          ]);
          const simData = simRes.ok ? await simRes.json() : { results: [] };
          const recData = recRes.ok ? await recRes.json() : { results: [] };
          if (!simRes.ok)
            console.log("tv similar error", log.tmdb_id, simRes.status);
          if (!recRes.ok)
            console.log("tv rec error", log.tmdb_id, recRes.status);
          return [...(simData.results || []), ...(recData.results || [])].map(
            (t: any) => ({
              external_id: t.id.toString(),
              media_type: "tv",
              title: t.name,
              popularity: t.popularity || 0,
              vote_average: t.vote_average || 0,
              vote_count: t.vote_count || 0,
              poster_url: t.poster_path
                ? `https://image.tmdb.org/t/p/w500${t.poster_path}`
                : null,
              genres: (t.genre_ids || [])
                .map((id: number) => TMDB_GENRE_NAMES[id])
                .filter(Boolean),
              year: t.first_air_date?.split("-")[0] || "0",
            }),
          );
        }),
      );

      const candidateMap = new Map<string, any>();
      for (const results of similarResults) {
        for (const item of results) {
          const key = item.external_id;
          if (candidateMap.has(key)) {
            candidateMap.get(key).seedCount += 1;
          } else {
            candidateMap.set(key, { ...item, seedCount: 1 });
          }
        }
      }
      candidates = Array.from(candidateMap.values());
    } else {
      const top5Games = (userLogs || [])
        .filter((l: any) => l.media_type === "game" && l.rating >= 7)
        .sort((a: any, b: any) => b.rating - a.rating)
        .slice(0, 5);

      const gameMap = new Map<string, any>();

      for (const log of top5Games) {
        const detailRes = await fetch(
          `${RAWG_BASE}/games/${log.tmdb_id}?key=${rawgKey}`,
        );
        if (!detailRes.ok) continue;
        const detail = await detailRes.json();

        const genreSlugs = (detail.genres || [])
          .slice(0, 2)
          .map((g: any) => g.slug)
          .join(",");

        const tagSlugs = (detail.tags || [])
          .filter((t: any) => t.language === "eng")
          .slice(0, 3)
          .map((t: any) => t.slug)
          .join(",");

        const searchRes = await fetch(
          `${RAWG_BASE}/games?key=${rawgKey}&genres=${genreSlugs}&tags=${tagSlugs}&ordering=-rating&page_size=15&exclude_collection=${log.tmdb_id}`,
        );
        if (!searchRes.ok) continue;
        const searchData = await searchRes.json();

        for (const g of searchData.results || []) {
          const key = g.id.toString();
          if (gameMap.has(key)) {
            gameMap.get(key).seedCount += 1;
          } else {
            gameMap.set(key, {
              external_id: key,
              media_type: "game",
              title: g.name,
              rawg_rating: g.rating || 0,
              ratings_count: g.ratings_count || 0,
              poster_url: g.background_image || null,
              genres: (g.genres || []).map((genre: any) => genre.name),
              year: g.released?.split("-")[0] || "0",
              seedCount: 1,
            });
          }
        }

        await new Promise((r) => setTimeout(r, 300));
      }

      candidates = Array.from(gameMap.values()).filter(
        (c: any) => c.ratings_count > 20 && c.rawg_rating >= 3.0,
      );
    }

    candidates = candidates.filter((c: any) => {
      const year = parseInt(c.year || "0");
      return year >= 1980 || year === 0;
    });

    candidates = candidates.filter(
      (c) => !loggedIds.has(`${c.external_id}_${c.media_type}`),
    );

    candidates = candidates.filter(
      (c: any) =>
        c.media_type === "game" || (c.vote_count > 50 && c.vote_average >= 5.0),
    );

    candidates = candidates.filter(
      (c: any) =>
        c.media_type !== "game" ||
        (c.ratings_count > 20 && c.rawg_rating >= 3.0),
    );

    const candidateIds = new Set(candidates.map((c) => c.external_id));
    for (const vc of vectorCandidates) {
      if (
        !loggedIds.has(`${vc.external_id}_${vc.media_type}`) &&
        !candidateIds.has(vc.external_id)
      ) {
        candidates.push(vc);
        candidateIds.add(vc.external_id);
      }
    }

    const externalIds = candidates.map((c) => c.external_id);
    const { data: metaRows } = await supabase
      .from("media_metadata")
      .select("*")
      .in("external_id", externalIds);

    const metaMap: Record<string, any> = {};
    for (const m of metaRows || []) {
      metaMap[`${m.external_id}_${m.media_type}`] = m;
    }

    if (
      profileType === "screen" &&
      (mediaType === "movie" || mediaType === "tv")
    ) {
      const uncached = candidates.filter(
        (c) => !metaMap[`${c.external_id}_${c.media_type}`],
      );

      for (let i = 0; i < Math.min(uncached.length, 20); i++) {
        const c = uncached[i];
        const enrichUrl =
          c.media_type === "movie"
            ? `${TMDB_BASE}/movie/${c.external_id}?append_to_response=credits,keywords&api_key=${tmdbKey}`
            : `${TMDB_BASE}/tv/${c.external_id}?append_to_response=credits,keywords&api_key=${tmdbKey}`;

        const res = await fetch(enrichUrl);
        const detail = await res.json();

        const keywords =
          c.media_type === "movie"
            ? (detail.keywords?.keywords || [])
                .slice(0, 15)
                .map((k: any) => k.name)
            : (detail.keywords?.results || [])
                .slice(0, 15)
                .map((k: any) => k.name);

        const cast = (detail.credits?.cast || [])
          .slice(0, 5)
          .map((p: any) => p.name);

        metaMap[`${c.external_id}_${c.media_type}`] = {
          genres: c.genres,
          keywords,
          cast_members: cast,
        };

        await new Promise((r) => setTimeout(r, 200));
      }
    }

    const scored = candidates
      .map((c) => {
        const meta = metaMap[`${c.external_id}_${c.media_type}`];
        const itemGenres: string[] =
          (meta?.genres?.length ? meta.genres : c.genres) || [];
        const itemKeywords: string[] = meta?.keywords || [];
        const itemCast: string[] = meta?.cast_members || [];

        let genreScore = 0;
        let keywordScore = 0;
        let castScore = 0;

        for (const g of itemGenres) genreScore += genreWeights[g] ?? 0;
        for (const k of itemKeywords) keywordScore += keywordWeights[k] ?? 0;
        for (const cm of itemCast) castScore += castWeights[cm] ?? 0;

        const genreNorm =
          itemGenres.length > 0 ? genreScore / itemGenres.length : 0;
        const keywordNorm =
          itemKeywords.length > 0 ? keywordScore / itemKeywords.length : 0;
        const castNorm = itemCast.length > 0 ? castScore / itemCast.length : 0;

        let score = genreNorm * 0.5 + keywordNorm * 0.35 + castNorm * 0.15;

        const vectorMatch = vectorCandidates.find(
          (v: any) => v.external_id === c.external_id,
        );
        if (vectorMatch) score = score * (1 + vectorMatch.similarity * 0.15);

        const seedBoost = 1 + ((c.seedCount || 1) - 1) * 0.4;
        score = score * seedBoost;

        if (c.media_type === "game") {
          if (c.rawg_rating >= 4.5) score *= 1.5;
          else if (c.rawg_rating >= 4.0) score *= 1.3;
        }

        for (const dg of dislikedGenres) {
          if (itemGenres.includes(dg)) score -= 4;
        }

        return {
          ...c,
          genres: itemGenres,
          score,
          poster_url: meta?.poster_url || c.poster_url,
        };
      })
      .sort((a, b) => b.score - a.score);

    const top40 = scored.slice(0, 40);

    const genreCounts: Record<string, number> = {};
    const diversified: typeof top40 = [];
    const remaining: typeof top40 = [];

    for (const item of top40) {
      const primaryGenre = item.genres[0] || "Unknown";
      const count = genreCounts[primaryGenre] || 0;
      if (count < 8) {
        diversified.push(item);
        genreCounts[primaryGenre] = count + 1;
      } else {
        remaining.push(item);
      }
    }

    for (const item of remaining) {
      if (diversified.length >= 20) break;
      diversified.push(item);
    }

    const decadeCounts: Record<string, number> = {};
    const decadeFiltered: typeof diversified = [];
    const decadeLeftover: typeof diversified = [];

    for (const item of diversified) {
      const decade = item.year
        ? Math.floor(parseInt(item.year) / 10) * 10 + "s"
        : "unknown";
      const count = decadeCounts[decade] || 0;
      if (count < 4) {
        decadeFiltered.push(item);
        decadeCounts[decade] = count + 1;
      } else {
        decadeLeftover.push(item);
      }
    }

    for (const item of decadeLeftover) {
      if (decadeFiltered.length >= 20) break;
      decadeFiltered.push(item);
    }

    const top20 = decadeFiltered.slice(0, 20);

    if (top20.length === 0) {
      return new Response(JSON.stringify({ ok: true, count: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxPossibleScore = Math.max(...top20.map((i) => i.score));

    const results = top20.map((item) => {
      let normalized;
      normalized = Math.min(
        100,
        Math.round((item.score / maxPossibleScore) * 100),
      );
      normalized = Math.max(50, normalized);
      const match_label = `${normalized}% Match`;
      const match_color =
        normalized >= 85 ? "green" : normalized >= 70 ? "amber" : "red";

      let because_of: string | undefined = undefined;

      const highRatedByGenre = (userLogs || [])
        .filter((l: any) => l.rating >= 8 && l.media_type === item.media_type)
        .sort((a: any, b: any) => b.rating - a.rating);

      for (const log of highRatedByGenre) {
        const logMeta = metaMap[`${log.tmdb_id?.toString()}_${log.media_type}`];
        const logGenres: string[] = logMeta?.genres || [];
        const sharedGenres = item.genres.filter((g: string) =>
          logGenres.includes(g),
        );
        if (sharedGenres.length >= 2) {
          because_of = log.title;
          break;
        }
      }

      return {
        external_id: item.external_id,
        media_type: item.media_type,
        title: item.title,
        poster_url: item.poster_url || "",
        genres: item.genres,
        match_score: normalized,
        match_label,
        match_color,
        because_of,
      };
    });

    await supabase.from("recommendation_cache").upsert(
      {
        user_id: userId,
        profile_type: profileType,
        media_type: mediaType,
        recommendations: results,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,profile_type,media_type" },
    );

    return new Response(JSON.stringify({ ok: true, count: results.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.log("generate-recommendations error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
