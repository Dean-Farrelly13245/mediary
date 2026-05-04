export const RAWG_CONFIG = {
  BASE_URL: "https://api.rawg.io/api",
  API_KEY: process.env.EXPO_PUBLIC_RAWG_KEY,
};

export const fetchTrendingGames = async () => {
  const endpoint = `${RAWG_CONFIG.BASE_URL}/games?ordering=-added&page_size=20&key=${RAWG_CONFIG.API_KEY}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("Failed to fetch trending games");

  const data = await res.json();
  return data.results;
};

export const searchGames = async ({ query }: { query: string }) => {
  const endpoint = `${RAWG_CONFIG.BASE_URL}/games?search=${encodeURIComponent(
    query
  )}&page_size=20&key=${RAWG_CONFIG.API_KEY}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("Failed to search games");

  const data = await res.json();
  return data.results;
};

export const fetchGameDetails = async (gameId: string) => {
  const endpoint = `${RAWG_CONFIG.BASE_URL}/games/${gameId}?key=${RAWG_CONFIG.API_KEY}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("Failed to fetch game details");

  return res.json();
};
