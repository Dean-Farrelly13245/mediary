import { TMDB_CONFIG } from '@/services/api';
import { RAWG_CONFIG } from '@/services/rawg';
import { TMDB_MOVIE_GENRES, TMDB_TV_GENRES, RAWG_GENRE_SLUGS } from './genreMaps';
import type { SmartSearchFilters } from './smartSearch';

export type SmartSearchResult = {
  id: number;
  title: string;
  poster: string;
  media_type: 'movie' | 'tv' | 'game';
  year: number | null;
  rating: number | null;
};

const TMDB_SORT_MAP: Record<string, string> = {
  rating: 'vote_average.desc',
  popularity: 'popularity.desc',
  release_date: 'release_date.desc',
};

const TMDB_TV_SORT_MAP: Record<string, string> = {
  rating: 'vote_average.desc',
  popularity: 'popularity.desc',
  release_date: 'first_air_date.desc',
};

const RAWG_SORT_MAP: Record<string, string> = {
  rating: '-rating',
  popularity: '-added',
  release_date: '-released',
};

async function lookupTmdbKeywordId(theme: string): Promise<number | null> {
  const res = await fetch(
    `${TMDB_CONFIG.BASE_URL}/search/keyword?query=${encodeURIComponent(theme)}&page=1`,
    { headers: TMDB_CONFIG.headers }
  );
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;

  const lower = theme.toLowerCase();
  const exact = data.results.find((r: any) => r.name.toLowerCase() === lower);
  if (exact) return exact.id;

  const partial = data.results.find((r: any) => r.name.toLowerCase().includes(lower));
  if (partial) return partial.id;

  return null;
}

async function lookupPersonKeywordId(name: string): Promise<number | null> {
  const res = await fetch(
    `${TMDB_CONFIG.BASE_URL}/search/person?query=${encodeURIComponent(name)}&page=1`,
    { headers: TMDB_CONFIG.headers }
  );
  if (!res.ok) return null;

  const data = await res.json();
  if (data.results && data.results.length > 0) {
    return data.results[0].id;
  }
  return null;
}

export async function fetchSmartResults(filters: SmartSearchFilters): Promise<SmartSearchResult[]> {
  if (filters.type === 'game') {
    return fetchGameResults(filters);
  }
  const results = await fetchTmdbDiscoverResults(filters);
  if (results.length === 0 && filters.keyword) {
    return fetchTmdbTextSearch(filters);
  }
  return results;
}

async function fetchTmdbTextSearch(filters: SmartSearchFilters): Promise<SmartSearchResult[]> {
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

  if (filters.sort_by === 'rating') {
    items = items.filter((i) => (i.vote_count || 0) >= 50);
    items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  } else if (filters.sort_by === 'release_date') {
    items.sort((a, b) => {
      const da = filters.type === 'movie' ? a.release_date : a.first_air_date;
      const db = filters.type === 'movie' ? b.release_date : b.first_air_date;
      return (db || '').localeCompare(da || '');
    });
  }

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
      rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
    };
  });
}

async function fetchTmdbDiscoverResults(filters: SmartSearchFilters): Promise<SmartSearchResult[]> {
  const genreMap = filters.type === 'movie' ? TMDB_MOVIE_GENRES : TMDB_TV_GENRES;
  const sortMap = filters.type === 'movie' ? TMDB_SORT_MAP : TMDB_TV_SORT_MAP;

  const genreIds = (filters.genres || [])
    .map((g) => genreMap[g.toLowerCase()])
    .filter(Boolean);

  const params = new URLSearchParams({
    sort_by: sortMap[filters.sort_by] || 'popularity.desc',
    page: '1',
  });

  if (genreIds.length > 0) {
    params.set('with_genres', genreIds.join(','));
  }

  const keywordIds: number[] = [];

  if (filters.theme) {
    const themeId = await lookupTmdbKeywordId(filters.theme);
    if (themeId) keywordIds.push(themeId);
  }

  if (filters.keyword) {
    const kwId = await lookupTmdbKeywordId(filters.keyword);
    if (kwId) {
      keywordIds.push(kwId);
    } else {
      const personId = await lookupPersonKeywordId(filters.keyword);
      if (personId) {
        params.set('with_people', String(personId));
      }
    }
  }

  if (keywordIds.length > 0) {
    params.set('with_keywords', keywordIds.join(','));
  }

  if (filters.sort_by === 'rating') {
    params.set('vote_count.gte', '50');
  }

  const dateField = filters.type === 'movie' ? 'primary_release_date' : 'first_air_date';
  if (filters.year_from) {
    params.set(`${dateField}.gte`, `${filters.year_from}-01-01`);
  }
  if (filters.year_to) {
    params.set(`${dateField}.lte`, `${filters.year_to}-12-31`);
  }

  const base = filters.type === 'movie' ? 'discover/movie' : 'discover/tv';
  const res = await fetch(`${TMDB_CONFIG.BASE_URL}/${base}?${params}`, {
    headers: TMDB_CONFIG.headers,
  });
  if (!res.ok) throw new Error('Failed to fetch from TMDB');

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
      rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
    };
  });
}

async function fetchGameResults(filters: SmartSearchFilters): Promise<SmartSearchResult[]> {
  const params = new URLSearchParams({
    ordering: RAWG_SORT_MAP[filters.sort_by] || '-added',
    page_size: String(filters.count),
    key: RAWG_CONFIG.API_KEY || '',
  });

  if (filters.keyword) {
    params.set('search', filters.keyword);
  }

  const slugs = (filters.genres || [])
    .map((g) => RAWG_GENRE_SLUGS[g.toLowerCase()])
    .filter(Boolean);

  if (slugs.length > 0) {
    params.set('genres', slugs.join(','));
  }

  if (filters.theme) {
    params.set('tags', filters.theme.toLowerCase());
  }

  if (filters.year_from && filters.year_to) {
    params.set('dates', `${filters.year_from}-01-01,${filters.year_to}-12-31`);
  } else if (filters.year_from) {
    params.set('dates', `${filters.year_from}-01-01,2099-12-31`);
  } else if (filters.year_to) {
    params.set('dates', `1970-01-01,${filters.year_to}-12-31`);
  }

  const res = await fetch(`${RAWG_CONFIG.BASE_URL}/games?${params}`);
  if (!res.ok) throw new Error('Failed to fetch from RAWG');

  const data = await res.json();
  return (data.results || []).slice(0, filters.count).map((g: any) => ({
    id: g.id,
    title: g.name,
    poster: g.background_image || '',
    media_type: 'game' as const,
    year: g.released ? parseInt(g.released.substring(0, 4), 10) : null,
    rating: g.rating ? Math.round(g.rating * 2 * 10) / 10 : null,
  }));
}
