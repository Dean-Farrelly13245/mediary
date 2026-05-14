import { fetchWatchlistItems } from '@/lib/watchlistQuery';
import type { ParsedWatchlistPrompt } from '@/lib/watchlistQuery';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const baseFilters: ParsedWatchlistPrompt = {
  type: 'movie',
  genres: [],
  year_from: null,
  year_to: null,
  rating_min: null,
  count: 5,
  suggested_name: 'My List',
  keyword: null,
};

function tmdbPage(results: object[]) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ results }),
  });
}

function makeTmdbMovie(overrides: object = {}) {
  return {
    id: 1,
    title: 'Test Movie',
    poster_path: '/test.jpg',
    release_date: '2021-06-01',
    vote_average: 7.0,
    vote_count: 100,
    ...overrides,
  };
}

function tmdbKeywordPage(results: object[]) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ results }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchWatchlistItems — movies', () => {
  it('calls TMDB discover and maps results correctly', async () => {
    mockFetch.mockResolvedValueOnce(tmdbPage([makeTmdbMovie({ id: 10, title: 'Dune' })]));

    const results = await fetchWatchlistItems(baseFilters);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('discover/movie'),
      expect.anything()
    );
    expect(results[0].id).toBe(10);
    expect(results[0].title).toBe('Dune');
    expect(results[0].media_type).toBe('movie');
    expect(results[0].poster).toBe('https://image.tmdb.org/t/p/w500/test.jpg');
    expect(results[0].year).toBe(2021);
  });

  it('includes genre id in discover URL for known genre', async () => {
    mockFetch.mockResolvedValueOnce(tmdbPage([]));

    await fetchWatchlistItems({ ...baseFilters, genres: ['action'] });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('with_genres=28'),
      expect.anything()
    );
  });

  it('applies year_from and year_to date filters', async () => {
    mockFetch.mockResolvedValueOnce(tmdbPage([]));

    await fetchWatchlistItems({ ...baseFilters, year_from: 2000, year_to: 2010 });

    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain('primary_release_date.gte=2000-01-01');
    expect(url).toContain('primary_release_date.lte=2010-12-31');
  });

  it('applies rating_min filter with vote_count guard', async () => {
    mockFetch.mockResolvedValueOnce(tmdbPage([]));

    await fetchWatchlistItems({ ...baseFilters, rating_min: 7 });

    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain('vote_average.gte=7');
    expect(url).toContain('vote_count.gte=50');
  });

  it('falls back to text search when discover is empty and keyword is set', async () => {
    mockFetch
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbPage([]))
      .mockResolvedValueOnce(tmdbPage([makeTmdbMovie({ id: 99, title: 'Batman Begins', vote_count: 200 })]));

    const results = await fetchWatchlistItems({ ...baseFilters, keyword: 'Batman' });

    const calls: string[] = mockFetch.mock.calls.map((c) => c[0]);
    expect(calls.some((u) => u.includes('search/movie'))).toBe(true);
    expect(results.some((r) => r.id === 99)).toBe(true);
  });

  it('does not fall back when discover returns results', async () => {
    mockFetch
      .mockResolvedValueOnce(tmdbKeywordPage([{ id: 180547, name: 'marvel cinematic universe' }]))
      .mockResolvedValueOnce(tmdbPage([makeTmdbMovie()]));

    await fetchWatchlistItems({ ...baseFilters, keyword: 'Marvel' });

    const calls: string[] = mockFetch.mock.calls.map((c) => c[0]);
    expect(calls.some((u) => u.includes('search/movie'))).toBe(false);
    expect(calls.some((u) => u.includes('with_keywords=180547'))).toBe(true);
  });

  it('text search filters by rating_min', async () => {
    mockFetch
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbPage([]))
      .mockResolvedValueOnce(tmdbPage([
        makeTmdbMovie({ id: 1, title: 'Good', vote_average: 8.0, vote_count: 200 }),
        makeTmdbMovie({ id: 2, title: 'Poor', vote_average: 5.0, vote_count: 200 }),
      ]));

    const results = await fetchWatchlistItems({ ...baseFilters, keyword: 'Batman', rating_min: 7 });

    expect(results.find((r) => r.title === 'Poor')).toBeUndefined();
    expect(results.find((r) => r.title === 'Good')).toBeDefined();
  });

  it('text search filters by year_from', async () => {
    mockFetch
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbPage([]))
      .mockResolvedValueOnce(tmdbPage([
        makeTmdbMovie({ id: 1, title: 'Old', release_date: '1999-01-01' }),
        makeTmdbMovie({ id: 2, title: 'New', release_date: '2015-01-01' }),
      ]));

    const results = await fetchWatchlistItems({ ...baseFilters, keyword: 'Batman', year_from: 2010 });

    expect(results.find((r) => r.title === 'Old')).toBeUndefined();
    expect(results.find((r) => r.title === 'New')).toBeDefined();
  });

  it('respects count limit', async () => {
    const movies = Array.from({ length: 20 }, (_, i) => makeTmdbMovie({ id: i }));
    mockFetch.mockResolvedValueOnce(tmdbPage(movies));

    const results = await fetchWatchlistItems({ ...baseFilters, count: 3 });
    expect(results).toHaveLength(3);
  });
});

describe('fetchWatchlistItems — games', () => {
  it('calls RAWG and maps results correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        results: [{ id: 5, name: 'Elden Ring', background_image: '/er.jpg', released: '2022-02-25' }],
      }),
    });

    const results = await fetchWatchlistItems({ ...baseFilters, type: 'game' });

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('rawg.io');
    expect(results[0].id).toBe(5);
    expect(results[0].title).toBe('Elden Ring');
    expect(results[0].media_type).toBe('game');
    expect(results[0].year).toBe(2022);
  });

  it('applies date range for games when both year_from and year_to set', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [] }),
    });

    await fetchWatchlistItems({ ...baseFilters, type: 'game', year_from: 2018, year_to: 2022 });

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('dates=2018-01-01%2C2022-12-31');
  });

  it('falls back to RAWG text search when no results and keyword set', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [{ id: 77, name: 'Batman: Arkham City', background_image: null, released: '2011-10-18' }] }) });

    const results = await fetchWatchlistItems({ ...baseFilters, type: 'game', keyword: 'Batman' });

    const calls: string[] = mockFetch.mock.calls.map((c) => c[0]);
    expect(calls.filter((u) => u.includes('rawg.io'))).toHaveLength(2);
    expect(results[0].title).toBe('Batman: Arkham City');
  });
});
