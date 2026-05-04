const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export type ParsedWatchlistPrompt = {
  type: 'movie' | 'tv' | 'game';
  genres: string[];
  year_from: number | null;
  year_to: number | null;
  rating_min: number | null;
  count: number;
  suggested_name: string;
  keyword: string | null;
};

export async function parseWatchlistPrompt(prompt: string): Promise<ParsedWatchlistPrompt> {
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
                text: `You are a media filter parser. Extract EXACT values from the user's request. Return ONLY a raw JSON object — no markdown, no backticks, no explanation.

Required JSON format:
{"type":"movie","genres":["science fiction"],"year_from":2018,"year_to":null,"rating_min":8,"count":5,"suggested_name":"Top Sci-Fi Since 2018","keyword":null}

Rules:
- "type": must be "movie", "tv", or "game". Default "movie" if unclear.
- "genres": array of genre strings. Use full names like "science fiction" not "sci-fi". Empty array if no genre specified.
- "year_from": extract the start year. "from 2018 onwards" means year_from=2018. "most recent", "latest", "newest" means year_from=2020. Null if not specified.
- "year_to": extract the end year. "up to 2020" means year_to=2020. If they say "onwards" or no end year, set null.
- "rating_min": minimum rating on a 1-10 scale. "above 8" means 8. "highly rated" means 7. Null if not specified.
- "count": the EXACT number they asked for. "5 movies" means count=5. Default 10 if not specified.
- "suggested_name": a short catchy name for this list.
- "keyword": ONLY for a specific named franchise, title, person, or studio. Examples: "Batman", "Marvel", "Tom Hanks", "Christopher Nolan", "Star Wars". Null if the request is just about genre/year/rating.

Examples: "top batman movies" → keyword="Batman". "best sci-fi from 2018" → keyword=null.

Be precise. If they say "5", count must be 5, not 8 or 10.

User request: ${prompt}`,
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

  // Safe parse — Gemini can return malformed JSON despite prompting
  let parsed: ParsedWatchlistPrompt;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      'AI returned an invalid response. Please try rephrasing your request.'
    );
  }

  // Validate and apply defaults for any missing fields
  if (!['movie', 'tv', 'game'].includes(parsed.type)) {
    parsed.type = 'movie';
  }
  if (!Array.isArray(parsed.genres)) {
    parsed.genres = [];
  }
  if (!parsed.count || parsed.count <= 0) {
    parsed.count = 10;
  }
  if (!parsed.suggested_name) {
    parsed.suggested_name = 'My Watchlist';
  }

  return parsed;
}
