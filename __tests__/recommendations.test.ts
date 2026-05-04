jest.mock('../services/supabase', () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  }));
  return { supabase: { from: mockFrom } };
});

import { getCachedRecommendations } from '@/services/recommendations';
import { supabase } from '@/services/supabase';

beforeEach(() => {
  jest.clearAllMocks();
});

function makeCacheRow(hoursAgo: number, recommendations: object[] = [{ title: 'Test' }]) {
  const generated = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  return { recommendations, generated_at: generated };
}

function mockMaybeSingle(returnValue: { data: any; error: any }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(returnValue),
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

describe('getCachedRecommendations', () => {
  it('returns null when no cache entry exists', async () => {
    mockMaybeSingle({ data: null, error: null });

    const result = await getCachedRecommendations('user-1', 'screen', 'movie');
    expect(result).toBeNull();
  });

  it('returns recommendations when cache is fresh (under 24 hours)', async () => {
    const recs = [{ title: 'Inception', match_score: 90 }];
    mockMaybeSingle({ data: makeCacheRow(1, recs), error: null });

    const result = await getCachedRecommendations('user-1', 'screen', 'movie');
    expect(result).toEqual(recs);
  });

  it('returns null when cache is expired (over 24 hours)', async () => {
    mockMaybeSingle({ data: makeCacheRow(25), error: null });

    const result = await getCachedRecommendations('user-1', 'screen', 'movie');
    expect(result).toBeNull();
  });

  it('returns recommendations exactly at 24 hours (boundary is exclusive)', async () => {
    const recs = [{ title: 'Test' }];
    mockMaybeSingle({ data: makeCacheRow(24, recs), error: null });

    const result = await getCachedRecommendations('user-1', 'screen', 'movie');
    expect(result).toEqual(recs);
  });

  it('returns recommendations when cache is just under 24 hours', async () => {
    const recs = [{ title: 'The Dark Knight' }];
    mockMaybeSingle({ data: makeCacheRow(23, recs), error: null });

    const result = await getCachedRecommendations('user-1', 'screen', 'movie');
    expect(result).toEqual(recs);
  });

  it('queries with the correct user_id, profile_type, and media_type', async () => {
    const chain = mockMaybeSingle({ data: null, error: null });

    await getCachedRecommendations('user-abc', 'gaming', 'game');

    expect(supabase.from).toHaveBeenCalledWith('recommendation_cache');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-abc');
    expect(chain.eq).toHaveBeenCalledWith('profile_type', 'gaming');
    expect(chain.eq).toHaveBeenCalledWith('media_type', 'game');
  });

  it('returns null and does not throw on supabase error', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockRejectedValue(new Error('network error')),
    };
    (supabase.from as jest.Mock).mockReturnValue(chain);

    const result = await getCachedRecommendations('user-1', 'screen', 'movie');
    expect(result).toBeNull();
  });
});
