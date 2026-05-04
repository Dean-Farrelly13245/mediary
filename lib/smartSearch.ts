const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export type SmartSearchFilters = {
  type: 'movie' | 'tv' | 'game';
  genres: string[] | null;
  theme: string | null;
  year_from: number | null;
  year_to: number | null;
  sort_by: 'rating' | 'popularity' | 'release_date';
  keyword: string | null;
  count: number;
};

export async function parseSmartSearch(query: string): Promise<SmartSearchFilters> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a media search parser. Extract EXACT values from the user's search query. Return ONLY a raw JSON object — no markdown, no backticks, no explanation.

Required JSON format:
{"type":"movie","genres":["horror"],"theme":"vampire","year_from":2015,"year_to":2020,"sort_by":"rating","keyword":null,"count":10}

Rules:
- "type": must be "movie", "tv", or "game". Default "movie" if unclear. "shows" or "series" means "tv".
- "genres": array of actual genre names like "horror", "science fiction", "comedy", "action", "drama", "thriller", "adventure", "animation", "documentary", "fantasy", "mystery", "romance", "western", "war", "crime". Null if no genre applies.
- "theme": a descriptive topic, creature, concept, or setting that is NOT a genre. Examples: "vampire", "zombie", "heist", "space exploration", "time travel", "dystopian", "medieval", "underwater", "robots", "survival". Null if not applicable.
- "year_from": the start year of a range, or a single year. "from 2015" or "since 2015" or "2015 onwards" means year_from=2015. "in 2020" means year_from=2020, year_to=2020. Null if not specified.
- "year_to": the end year of a range. "to 2020" or "until 2020" means year_to=2020. "onwards" or no end means null. Null if not specified.
- "sort_by": one of "rating", "popularity", or "release_date". "highest rated" or "best" means "rating". "newest" or "latest" means "release_date". "popular" or "trending" means "popularity". Default "popularity".
- "keyword": ONLY for specific named titles or named people. Examples: "Inception", "Leonardo DiCaprio", "Christopher Nolan", "Marvel". If the user describes a concept or creature like "vampire" or "zombie", that goes in theme, NOT keyword. Null if no specific name is mentioned.
- "count": the EXACT number they asked for. Default 10 if not specified.

IMPORTANT: "vampire movies" → theme="vampire", keyword=null. "movies with Tom Hanks" → keyword="Tom Hanks", theme=null. "zombie horror" → genre=["horror"], theme="zombie", keyword=null. "horror movies from 2015 to 2020" → year_from=2015, year_to=2020.

User query: ${query}`,
              },
            ],
          },
        ],
      }),
    }
  );

  if (response.status === 429) {
    throw new Error('Rate limited — please wait a moment and try again');
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Gemini API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let parsed: SmartSearchFilters;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Couldn\'t understand that query. Try rephrasing.');
  }

  if (!['movie', 'tv', 'game'].includes(parsed.type)) {
    parsed.type = 'movie';
  }
  if (!['rating', 'popularity', 'release_date'].includes(parsed.sort_by)) {
    parsed.sort_by = 'popularity';
  }
  if (!parsed.count || parsed.count <= 0) {
    parsed.count = 10;
  }

  return parsed;
}
