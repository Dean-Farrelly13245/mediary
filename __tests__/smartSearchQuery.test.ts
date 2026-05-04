import { fetchSmartResults } from '@/lib/smartSearchQuery';
import type { SmartSearchFilters } from '@/lib/smartSearch';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const baseFilters: SmartSearchFilters = {
  type: 'movie',
  genres: [],
  theme: null,
  year_from: null,
  year_to: null,
  sort_by: 'popularity',
  keyword: null,
  count: 5,
};

function tmdbPage(results: object[]) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ results }),
  });
}

function tmdbKeywordPage(results: object[]) {
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
    release_date: '2022-01-01',
    vote_average: 7.5,
    vote_count: 200,
    ...overrides,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchSmartResults — movies', () => {
  it('calls TMDB discover and maps results correctly', async () => {
    mockFetch.mockResolvedValueOnce(tmdbPage([makeTmdbMovie({ id: 42, title: 'Inception' })]));

    const results = await fetchSmartResults(baseFilters);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('discover/movie'),
      expect.anything()
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(42);
    expect(results[0].title).toBe('Inception');
    expect(results[0].media_type).toBe('movie');
    expect(results[0].poster).toBe('https://image.tmdb.org/t/p/w500/test.jpg');
    expect(results[0].year).toBe(2022);
    expect(results[0].rating).toBe(7.5);
  });

  it('includes correct genre id in discover URL for known genre', async () => {
    mockFetch.mockResolvedValueOnce(tmdbPage([]));

    await fetchSmartResults({ ...baseFilters, genres: ['horror'] });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('with_genres=27'),
      expect.anything()
    );
  });

  it('uses vote_average.desc sort when sort_by is rating', async () => {
    mockFetch.mockResolvedValueOnce(tmdbPage([]));

    await fetchSmartResults({ ...baseFilters, sort_by: 'rating' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('sort_by=vote_average.desc'),
      expect.anything()
    );
  });

  it('applies year_from and year_to as date filters', async () => {
    mockFetch.mockResolvedValueOnce(tmdbPage([]));

    await fetchSmartResults({ ...baseFilters, year_from: 2010, year_to: 2020 });

    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain('primary_release_date.gte=2010-01-01');
    expect(url).toContain('primary_release_date.lte=2020-12-31');
  });

  it('falls back to text search when discover returns empty and keyword is set', async () => {
    mockFetch
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbPage([]))
      .mockResolvedValueOnce(tmdbPage([makeTmdbMovie({ id: 99, title: 'Batman Begins' })]));

    const results = await fetchSmartResults({ ...baseFilters, keyword: 'Batman', sort_by: 'rating' });

    const calls: string[] = mockFetch.mock.calls.map((c) => c[0]);
    expect(calls.some((u) => u.includes('search/movie'))).toBe(true);
    expect(results.some((r) => r.id === 99)).toBe(true);
  });

  it('does not fall back to text search when discover returns results', async () => {
    mockFetch
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbPage([makeTmdbMovie()]));

    await fetchSmartResults({ ...baseFilters, keyword: 'Batman' });

    const calls: string[] = mockFetch.mock.calls.map((c) => c[0]);
    expect(calls.some((u) => u.includes('search/movie'))).toBe(false);
  });

  it('does not fall back when keyword is null and discover is empty', async () => {
    mockFetch.mockResolvedValueOnce(tmdbPage([]));

    const results = await fetchSmartResults({ ...baseFilters, keyword: null });

    expect(results).toHaveLength(0);
    const calls: string[] = mockFetch.mock.calls.map((c) => c[0]);
    expect(calls.some((u) => u.includes('search/movie'))).toBe(false);
  });

  it('respects count and returns at most that many results', async () => {
    const movies = Array.from({ length: 20 }, (_, i) => makeTmdbMovie({ id: i }));
    mockFetch.mockResolvedValueOnce(tmdbPage(movies));

    const results = await fetchSmartResults({ ...baseFilters, count: 3 });
    expect(results).toHaveLength(3);
  });
});

describe('fetchSmartResults — text search sorting', () => {
  it('sorts by rating descending and filters low vote counts', async () => {
    mockFetch
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbPage([]))
      .mockResolvedValueOnce(tmdbPage([
        makeTmdbMovie({ id: 1, title: 'Low votes', vote_average: 9.0, vote_count: 10 }),
        makeTmdbMovie({ id: 2, title: 'High rated', vote_average: 8.5, vote_count: 500 }),
        makeTmdbMovie({ id: 3, title: 'Medium', vote_average: 7.0, vote_count: 200 }),
      ]));

    const results = await fetchSmartResults({
      ...baseFilters,
      keyword: 'Batman',
      sort_by: 'rating',
      count: 10,
    });

    expect(results.find((r) => r.title === 'Low votes')).toBeUndefined();
    expect(results[0].title).toBe('High rated');
    expect(results[1].title).toBe('Medium');
  });

  it('filters by year_from in text search results', async () => {
    mockFetch
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbKeywordPage([]))
      .mockResolvedValueOnce(tmdbPage([]))
      .mockResolvedValueOnce(tmdbPage([
        makeTmdbMovie({ id: 1, title: 'Old', release_date: '2005-01-01', vote_count: 100 }),
        makeTmdbMovie({ id: 2, title: 'New', release_date: '2015-01-01', vote_count: 100 }),
      ]));

    const results = await fetchSmartResults({
      ...baseFilters,
      keyword: 'Batman',
      sort_by: 'rating',
      year_from: 2010,
      count: 10,
    });

    expect(results.find((r) => r.title === 'Old')).toBeUndefined();
    expect(results.find((r) => r.title === 'New')).toBeDefined();
  });
});

describe('fetchSmartResults — games', () => {
  it('calls RAWG and maps results correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        results: [{ id: 7, name: 'Hades', background_image: '/hades.jpg', released: '2020-09-17', rating: 4.5 }],
      }),
    });

    const results = await fetchSmartResults({ ...baseFilters, type: 'game' });

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('rawg.io');
    expect(results[0].id).toBe(7);
    expect(results[0].title).toBe('Hades');
    expect(results[0].media_type).toBe('game');
    expect(results[0].year).toBe(2020);
  });
});
