// Finds a "kindred work" for a keyword in the Cleveland Museum of Art's
// Open Access API (no key needed). Used by api/kindred.js.
//
// Only CC0 works with an image are requested: the museum has released those
// images for anyone to use, so showing them on the blog is allowed.

const API_URL = 'https://openaccess-api.clevelandart.org/api/artworks/';
const FIELDS = 'id,title,creation_date,creators,culture,images,url';
const TIMEOUT_MS = 8000;

// "Maurice Denis (French, 1870–1943)" → "Maurice Denis".
// Works without a known artist fall back to their culture, e.g. "Japan".
function artistName(artwork) {
  const creator = artwork.creators?.[0]?.description;
  if (creator) return creator.split(' (')[0];
  if (artwork.culture?.[0]) return artwork.culture[0];
  return 'Unknown artist';
}

// Only what the page needs, with ready-made links
function toCard(artwork) {
  return {
    id: artwork.id,
    title: artwork.title,
    artist: artistName(artwork),
    date: artwork.creation_date || 'Date unknown',
    image_url: artwork.images.web.url,
    image_alt: `Artwork: ${artwork.title}`,
    url: artwork.url,
  };
}

// Returns a card for the best match, or null if nothing matched.
// Throws if the museum can't be reached or doesn't answer within 8 seconds.
export async function findKindredWork(keyword) {
  const params = new URLSearchParams({
    q: keyword,
    has_image: '1',
    cc0: '1',
    limit: '5',
    fields: FIELDS,
  });
  const response = await fetch(`${API_URL}?${params}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Cleveland Museum of Art API answered ${response.status}`);

  const data = await response.json();
  const artwork = (data.data || []).find((result) => result.images?.web?.url);
  return artwork ? toCard(artwork) : null;
}
