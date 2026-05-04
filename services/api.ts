export const TMDB_CONFIG = {
  BASE_URL: 'https://api.themoviedb.org/3',
  API_KEY: process.env.EXPO_PUBLIC_MOVIE_API_KEY,
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`
  }
}
// Search Movies + TV Shows 
export const searchAllMedia = async ({ query }: { query: string }) => {
  if (!query.trim()) return [];

  const endpoint = `${TMDB_CONFIG.BASE_URL}/search/multi?query=${encodeURIComponent(
    query
  )}&include_adult=false`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: TMDB_CONFIG.headers,
  });

  if (!response.ok) {
    throw new Error('Failed to search media');
  }

  const data = await response.json();

  return data.results.filter(
    (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
  );
};

//fetch Movies
export const fetchMovies = async ({ query }: { query: string}) =>{
    const endpoint = query
    ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
    : `${TMDB_CONFIG.BASE_URL}/trending/movie/week`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: TMDB_CONFIG.headers
    })

    if(!response.ok){
      throw new Error('Failed to fetch Movies')
    }

    const data = await response.json();

    return data.results
}

//fetch Movie Details
export const fetchMovieDetails = async (movieId: string): Promise<MovieDetails> => {
  try {
    const response = await fetch(
      `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?append_to_response=credits&api_key=${TMDB_CONFIG.API_KEY}`,
      {
        method: 'GET',
        headers: TMDB_CONFIG.headers,
      }
    );

    if (!response.ok) throw new Error('Failed to fetch Movie Details');

    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//Fetch TV Shows
export const fetchTVShows = async ({ query }: { query: string}) =>{
    const endpoint = query
    ? `${TMDB_CONFIG.BASE_URL}/search/tv?query=${encodeURIComponent(query)}`
    : `${TMDB_CONFIG.BASE_URL}/trending/tv/week`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: TMDB_CONFIG.headers
    })

    if(!response.ok){
      throw new Error('Failed to fetch TV Shows')
    }

    const data = await response.json();

    return data.results
}
//fetch TV SHOWS
// Fetch person (actor) details
export const fetchPersonDetails = async (personId: number) => {
  try {
    const response = await fetch(
      `${TMDB_CONFIG.BASE_URL}/person/${personId}?append_to_response=combined_credits&api_key=${TMDB_CONFIG.API_KEY}`,
      {
        method: 'GET',
        headers: TMDB_CONFIG.headers,
      }
    );

    if (!response.ok) throw new Error('Failed to fetch person details');

    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//fetch TV SHOWS
export const fetchTVDetails = async (tvId: string): Promise<TVDetails> => {
  try {
    const response = await fetch(
      `${TMDB_CONFIG.BASE_URL}/tv/${tvId}?append_to_response=credits&api_key=${TMDB_CONFIG.API_KEY}`,
      {
        method: 'GET',
        headers: TMDB_CONFIG.headers,
      }
    );

    if (!response.ok) throw new Error('Failed to fetch TV Show Details');

    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

