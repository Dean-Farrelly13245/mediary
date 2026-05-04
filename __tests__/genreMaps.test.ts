import { TMDB_MOVIE_GENRES, TMDB_TV_GENRES, RAWG_GENRE_SLUGS } from '@/lib/genreMaps';

describe('TMDB_MOVIE_GENRES', () => {
  it('returns the correct id for known genres', () => {
    expect(TMDB_MOVIE_GENRES['action']).toBe(28);
    expect(TMDB_MOVIE_GENRES['horror']).toBe(27);
    expect(TMDB_MOVIE_GENRES['science fiction']).toBe(878);
    expect(TMDB_MOVIE_GENRES['sci-fi']).toBe(878);
    expect(TMDB_MOVIE_GENRES['comedy']).toBe(35);
  });

  it('returns undefined for unknown genres', () => {
    expect(TMDB_MOVIE_GENRES['superhero']).toBeUndefined();
  });
});

describe('TMDB_TV_GENRES', () => {
  it('returns the correct id for known genres', () => {
    expect(TMDB_TV_GENRES['drama']).toBe(18);
    expect(TMDB_TV_GENRES['reality']).toBe(10764);
    expect(TMDB_TV_GENRES['sci-fi & fantasy']).toBe(10765);
  });

  it('maps both "sci-fi" and "science fiction" to the same id', () => {
    expect(TMDB_TV_GENRES['sci-fi']).toBe(TMDB_TV_GENRES['science fiction']);
  });
});

describe('RAWG_GENRE_SLUGS', () => {
  it('returns the correct slug for known genres', () => {
    expect(RAWG_GENRE_SLUGS['action']).toBe('action');
    expect(RAWG_GENRE_SLUGS['rpg']).toBe('role-playing-games-rpg');
    expect(RAWG_GENRE_SLUGS['role-playing']).toBe('role-playing-games-rpg');
  });

  it('returns undefined for unmapped genres', () => {
    expect(RAWG_GENRE_SLUGS['batman']).toBeUndefined();
  });
});
