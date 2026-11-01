// Finds a "kindred work" for a keyword in the Art Institute of Chicago's
// public API (api.artic.edu, no key needed). Used by api/kindred.js.

const API_URL = 'https://api.artic.edu/api/v1/artworks/search';
const FIELDS = 'id,title,artist_title,artist_display,date_display,image_id,thumbnail';

// The museum asks developers to identify their app with this header.
// Plain ASCII only: a letter like "ü" makes the header invalid, and the
// museum's firewall answers 403.
const USER_AGENT = 'Dailies blog by Elias Grunewald Dykert (https://elias-blog-xi.vercel.app)';

// The API returns the whole collection even for nonsense words, just with a
// relevance score close to 0. Real matches score far above 1.
const MIN_SCORE = 1;
const TIMEOUT_MS = 8000;

// The first relevant result that has an image, or null
export function pickArtwork(results) {
  return results.find((artwork) => artwork._score >= MIN_SCORE && artwork.image_id) || null;
}

// "Martin Parr" from artist_title, or the first line of artist_display
function artistName(artwork) {
  if (artwork.artist_title) return artwork.artist_title;
  if (artwork.artist_display) return artwork.artist_display.split('\n')[0];
  return 'Unknown artist';
}

// Only what the page needs, with ready-made links
function toCard(artwork) {
  return {
    id: artwork.id,
    title: artwork.title,
    artist: artistName(artwork),
    date: artwork.date_display || 'Date unknown',
    image_url: `https://www.artic.edu/iiif/2/${artwork.image_id}/full/843,/0/default.jpg`,
    image_alt: artwork.thumbnail?.alt_text || '',
    url: `https://www.artic.edu/artworks/${artwork.id}`,
  };
}

// Returns a card for the best match, or null if nothing relevant was found.
// Throws if the museum can't be reached or doesn't answer within 8 seconds.
export async function findKindredWork(keyword) {
  const params = new URLSearchParams({ q: keyword, limit: '10', fields: FIELDS });
  const response = await fetch(`${API_URL}?${params}`, {
    headers: { 'AIC-User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Art Institute API answered ${response.status}`);

  const data = await response.json();
  const artwork = pickArtwork(data.data || []);
  return artwork ? toCard(artwork) : null;
}
