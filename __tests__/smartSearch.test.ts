import { parseSmartSearch } from '@/lib/smartSearch';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function gemmaResponse(json: object) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }],
    }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('parseSmartSearch', () => {
  it('extracts type, genre, and sort_by from a natural language query', async () => {
    mockFetch.mockResolvedValueOnce(gemmaResponse({
      type: 'movie',
      genres: ['horror'],
      theme: null,
      year_from: null,
      year_to: null,
      sort_by: 'rating',
      keyword: null,
      count: 10,
    }));

    const result = await parseSmartSearch('highest rated horror movies');
    expect(result.type).toBe('movie');
    expect(result.genres).toContain('horror');
    expect(result.sort_by).toBe('rating');
  });

  it('extracts keyword for a named franchise', async () => {
    mockFetch.mockResolvedValueOnce(gemmaResponse({
      type: 'movie',
      genres: [],
      theme: null,
      year_from: null,
      year_to: null,
      sort_by: 'rating',
      keyword: 'Batman',
      count: 10,
    }));

    const result = await parseSmartSearch('highest rated batman movie');
    expect(result.keyword).toBe('Batman');
    expect(result.sort_by).toBe('rating');
  });

  it('extracts year range correctly', async () => {
    mockFetch.mockResolvedValueOnce(gemmaResponse({
      type: 'movie',
      genres: ['action'],
      theme: null,
      year_from: 2010,
      year_to: 2020,
      sort_by: 'popularity',
      keyword: null,
      count: 10,
    }));

    const result = await parseSmartSearch('action movies from 2010 to 2020');
    expect(result.year_from).toBe(2010);
    expect(result.year_to).toBe(2020);
  });

  it('extracts theme separately from genre', async () => {
    mockFetch.mockResolvedValueOnce(gemmaResponse({
      type: 'movie',
      genres: ['horror'],
      theme: 'vampire',
      year_from: null,
      year_to: null,
      sort_by: 'popularity',
      keyword: null,
      count: 10,
    }));

    const result = await parseSmartSearch('vampire horror movies');
    expect(result.theme).toBe('vampire');
    expect(result.genres).toContain('horror');
  });

  it('defaults type to movie when invalid value returned', async () => {
    mockFetch.mockResolvedValueOnce(gemmaResponse({
      type: 'unknown',
      genres: [],
      theme: null,
      year_from: null,
      year_to: null,
      sort_by: 'popularity',
      keyword: null,
      count: 10,
    }));

    const result = await parseSmartSearch('something');
    expect(result.type).toBe('movie');
  });

  it('defaults sort_by to popularity when invalid value returned', async () => {
    mockFetch.mockResolvedValueOnce(gemmaResponse({
      type: 'movie',
      genres: [],
      theme: null,
      year_from: null,
      year_to: null,
      sort_by: 'invalid',
      keyword: null,
      count: 10,
    }));

    const result = await parseSmartSearch('something');
    expect(result.sort_by).toBe('popularity');
  });

  it('defaults count to 10 when missing', async () => {
    mockFetch.mockResolvedValueOnce(gemmaResponse({
      type: 'movie',
      genres: [],
      theme: null,
      year_from: null,
      year_to: null,
      sort_by: 'popularity',
      keyword: null,
      count: 0,
    }));

    const result = await parseSmartSearch('something');
    expect(result.count).toBe(10);
  });

  it('throws a rate limit error on 429', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('') });

    await expect(parseSmartSearch('anything')).rejects.toThrow('Rate limited');
  });

  it('throws on malformed JSON response from the model', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: 'not valid json at all' }] } }],
      }),
    });

    await expect(parseSmartSearch('anything')).rejects.toThrow();
  });

  it('strips markdown code fences before parsing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '```json\n{"type":"tv","genres":[],"theme":null,"year_from":null,"year_to":null,"sort_by":"popularity","keyword":null,"count":10}\n```' }] } }],
      }),
    });

    const result = await parseSmartSearch('tv shows');
    expect(result.type).toBe('tv');
  });
});
