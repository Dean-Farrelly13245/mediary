import { supabase } from './supabase';

export type SearchUserRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function searchUsers(query: string): Promise<SearchUserRow[]> {
  const q = query.trim();
  if (!q) return [];

  const safe = q.replace(/"/g, '\\"');
  const pattern = `%${safe}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike."${pattern}",display_name.ilike."${pattern}"`);

  if (error) throw error;
  return (data || []) as SearchUserRow[];
}
