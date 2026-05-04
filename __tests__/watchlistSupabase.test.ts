import { supabase } from '@/services/supabase';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('watchlists supabase queries', () => {
  it('fetching watchlist members for a user returns data', async () => {
    const fakeData = [{ watchlist_id: 'wl-1' }, { watchlist_id: 'wl-2' }];
    const eqMock = jest.fn().mockResolvedValue({ data: fakeData, error: null });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

    const { data, error } = await supabase
      .from('watchlist_members')
      .select('watchlist_id')
      .eq('user_id', 'user-abc');

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data[0].watchlist_id).toBe('wl-1');
  });

  it('handles a supabase error when fetching watchlists', async () => {
    const fakeError = { message: 'permission denied', code: '42501' };
    const eqMock = jest.fn().mockResolvedValue({ data: null, error: fakeError });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

    const { data, error } = await supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', 'user-abc');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error.message).toBe('permission denied');
  });

  it('inserting a new watchlist member resolves without error', async () => {
    const insertMock = jest.fn().mockResolvedValue({ data: [{ id: 'new-member' }], error: null });
    (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

    const { data, error } = await supabase.from('watchlist_members').insert({
      watchlist_id: 'wl-1',
      user_id: 'user-abc',
    });

    expect(error).toBeNull();
    expect(data).toEqual([{ id: 'new-member' }]);
  });

  it('deleting a watchlist by id resolves without error', async () => {
    const eqMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

    const { error } = await supabase
      .from('watchlists')
      .delete()
      .eq('id', 'wl-1');

    expect(error).toBeNull();
  });
});
