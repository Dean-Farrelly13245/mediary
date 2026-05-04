import { TMDB_CONFIG } from '@/services/api';
import { RAWG_CONFIG } from '@/services/rawg';
import { TMDB_MOVIE_GENRES, TMDB_TV_GENRES, RAWG_GENRE_SLUGS } from './genreMaps';
import type { ParsedWatchlistPrompt } from './gemini';

const RAWG_EXTRA_SLUGS: Record<string, string> = {
  'board games': 'board-games', educational: 'educational',
  card: 'card', family: 'family',
};

export type WatchlistItem = {
  id: number;
  title: string;
  poster: string;
  media_type: 'movie' | 'tv' | 'game';
  year: number | null;
};

export async function fetchWatchlistItems(
  filters: ParsedWatchlistPrompt
): Promise<WatchlistItem[]> {
  if (filters.type === 'game') {
    const items = await fetchGameItems(filters);
    if (items.length === 0 && filters.keyword) {
      return fetchRawgTextSearch(filters);
    }
    return items;
  }

  const items = await fetchTmdbItems(filters);
  if (items.length === 0 && filters.keyword) {
    return fetchTmdbTextSearch(filters);
  }
  return items;
}

async function fetchTmdbTextSearch(filters: ParsedWatchlistPrompt): Promise<WatchlistItem[]> {
  const base = filters.type === 'movie' ? 'search/movie' : 'search/tv';
  const res = await fetch(
    `${TMDB_CONFIG.BASE_URL}/${base}?query=${encodeURIComponent(filters.keyword || '')}&page=1`,
    { headers: TMDB_CONFIG.headers }
  );
  if (!res.ok) return [];

  const data = await res.json();
  let items: any[] = data.results || [];

  if (filters.year_from) {
    items = items.filter((i) => {
      const d = filters.type === 'movie' ? i.release_date : i.first_air_date;
      return d && parseInt(d.substring(0, 4), 10) >= filters.year_from!;
    });
  }
  if (filters.year_to) {
    items = items.filter((i) => {
      const d = filters.type === 'movie' ? i.release_date : i.first_air_date;
      return d && parseInt(d.substring(0, 4), 10) <= filters.year_to!;
    });
  }
  if (filters.rating_min) {
    items = items.filter((i) => (i.vote_count || 0) >= 50 && (i.vote_average || 0) >= filters.rating_min!);
  }

  items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

  return items.slice(0, filters.count).map((item: any) => {
    const dateStr = filters.type === 'movie' ? item.release_date : item.first_air_date;
    return {
      id: item.id,
      title: filters.type === 'movie' ? item.title : item.name,
      poster: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : '',
      media_type: filters.type,
      year: dateStr ? parseInt(dateStr.substring(0, 4), 10) : null,
    };
  });
}

async function fetchRawgTextSearch(filters: ParsedWatchlistPrompt): Promise<WatchlistItem[]> {
  const params = new URLSearchParams({
    search: filters.keyword || '',
    page_size: String(filters.count),
    key: RAWG_CONFIG.API_KEY || '',
  });
  const res = await fetch(`${RAWG_CONFIG.BASE_URL}/games?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results || []).slice(0, filters.count).map((g: any) => ({
    id: g.id,
    title: g.name,
    poster: g.background_image || '',
    media_type: 'game' as const,
    year: g.released ? parseInt(g.released.substring(0, 4), 10) : null,
  }));
}

function resolveTmdbGenres(genres: string[], type: 'movie' | 'tv'): number[] {
  const genreMap = type === 'movie' ? TMDB_MOVIE_GENRES : TMDB_TV_GENRES;
  const ids: number[] = [];
  for (const g of genres) {
    const id = genreMap[g.toLowerCase()];
    if (id) {
      ids.push(id);
    }
    // Unknown genres are silently skipped — TMDB has no fuzzy match
  }
  return ids;
}

async function lookupTmdbKeywordId(keyword: string): Promise<number | null> {
  const res = await fetch(
    `${TMDB_CONFIG.BASE_URL}/search/keyword?query=${encodeURIComponent(keyword)}&page=1`,
    { headers: TMDB_CONFIG.headers }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const results = data.results || [];
  if (results.length === 0) return null;

  const lower = keyword.toLowerCase();
  const exact = results.find((r: any) => r.name?.toLowerCase() === lower);
  if (exact) return exact.id;

  const partial = results.find((r: any) => r.name?.toLowerCase().includes(lower));
  return partial?.id || null;
}

async function lookupTmdbPersonId(name: string): Promise<number | null> {
  const res = await fetch(
    `${TMDB_CONFIG.BASE_URL}/search/person?query=${encodeURIComponent(name)}&page=1`,
    { headers: TMDB_CONFIG.headers }
  );
  if (!res.ok) return null;

  const data = await res.json();
  return data.results?.[0]?.id || null;
}

function resolveRawgGenres(genres: string[]): string[] {
  const slugs: string[] = [];
  for (const g of genres) {
    const slug = RAWG_GENRE_SLUGS[g.toLowerCase()] || RAWG_EXTRA_SLUGS[g.toLowerCase()];
    if (slug) {
      slugs.push(slug);
    }
  }
  return slugs;
}

async function fetchTmdbItems(filters: ParsedWatchlistPrompt): Promise<WatchlistItem[]> {
  const genreIds = resolveTmdbGenres(filters.genres, filters.type);

  // Auth via Bearer header (consistent with rest of api.ts)
  const params = new URLSearchParams({
    sort_by: 'popularity.desc',
    page: '1',
  });

  if (genreIds.length > 0) {
    params.set('with_genres', genreIds.join(','));
  }

  if (filters.keyword) {
    const keywordId = await lookupTmdbKeywordId(filters.keyword);
    if (keywordId) {
      params.set('with_keywords', String(keywordId));
    } else {
      const personId = await lookupTmdbPersonId(filters.keyword);
      if (personId) {
        params.set('with_people', String(personId));
      }
    }
  }

  const dateField = filters.type === 'movie' ? 'primary_release_date' : 'first_air_date';
  if (filters.year_from) {
    params.set(`${dateField}.gte`, `${filters.year_from}-01-01`);
  }
  if (filters.year_to) {
    params.set(`${dateField}.lte`, `${filters.year_to}-12-31`);
  }

  if (filters.rating_min) {
    params.set('vote_average.gte', String(filters.rating_min));
    params.set('vote_count.gte', '50');
  }

  const endpoint = filters.type === 'movie'
    ? `${TMDB_CONFIG.BASE_URL}/discover/movie?${params}`
    : `${TMDB_CONFIG.BASE_URL}/discover/tv?${params}`;

  const res = await fetch(endpoint, {
    headers: TMDB_CONFIG.headers,
  });

  if (!res.ok) throw new Error('Failed to fetch from TMDB discover');

  const data = await res.json();

  return (data.results || []).slice(0, filters.count).map((item: any) => {
    const dateStr = filters.type === 'movie' ? item.release_date : item.first_air_date;
    return {
      id: item.id,
      title: filters.type === 'movie' ? item.title : item.name,
      poster: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : '',
      media_type: filters.type,
      year: dateStr ? parseInt(dateStr.substring(0, 4), 10) : null,
    };
  });
}

async function fetchGameItems(filters: ParsedWatchlistPrompt): Promise<WatchlistItem[]> {
  const params = new URLSearchParams({
    ordering: '-added',
    page_size: String(filters.count),
    key: RAWG_CONFIG.API_KEY || '',
  });

  const slugs = resolveRawgGenres(filters.genres);
  if (slugs.length > 0) {
    params.set('genres', slugs.join(','));
  }

  if (filters.year_from && filters.year_to) {
    params.set('dates', `${filters.year_from}-01-01,${filters.year_to}-12-31`);
  } else if (filters.year_from) {
    params.set('dates', `${filters.year_from}-01-01,2099-12-31`);
  } else if (filters.year_to) {
    params.set('dates', `1970-01-01,${filters.year_to}-12-31`);
  }

  if (filters.rating_min) {
    params.set('metacritic', `${filters.rating_min * 10},100`);
  }

  const res = await fetch(`${RAWG_CONFIG.BASE_URL}/games?${params}`);
  if (!res.ok) throw new Error('Failed to fetch from RAWG');

  const data = await res.json();

  return (data.results || []).slice(0, filters.count).map((g: any) => {
    const released = g.released;
    return {
      id: g.id,
      title: g.name,
      poster: g.background_image || '',
      media_type: 'game' as const,
      year: released ? parseInt(released.substring(0, 4), 10) : null,
    };
  });
}
