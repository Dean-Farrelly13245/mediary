export const TMDB_MOVIE_GENRES: Record<string, number> = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749,
  'science fiction': 878, 'sci-fi': 878, thriller: 53,
  'tv movie': 10770, war: 10752, western: 37,
};

export const TMDB_TV_GENRES: Record<string, number> = {
  action: 10759, 'action & adventure': 10759, adventure: 10759,
  animation: 16, comedy: 35, crime: 80, documentary: 99, drama: 18,
  family: 10751, horror: 27, kids: 10762, mystery: 9648, news: 10763,
  reality: 10764, 'sci-fi': 10765, 'science fiction': 10765,
  'sci-fi & fantasy': 10765, soap: 10766, talk: 10767,
  'war & politics': 10768, western: 37,
};

export const RAWG_GENRE_SLUGS: Record<string, string> = {
  action: 'action', adventure: 'adventure', rpg: 'role-playing-games-rpg',
  'role-playing': 'role-playing-games-rpg', strategy: 'strategy',
  shooter: 'shooter', puzzle: 'puzzle', platformer: 'platformer',
  racing: 'racing', sports: 'sports', simulation: 'simulation',
  indie: 'indie', casual: 'casual', fighting: 'fighting',
  arcade: 'arcade', horror: 'horror',
};
