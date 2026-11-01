// "Kindred work": an artwork from the Art Institute of Chicago that matches
// the post's keyword. Their API is public, needs no key and allows requests
// straight from the browser.
import { el } from './lib.js';

const API_URL = 'https://api.artic.edu/api/v1/artworks/search';
const FIELDS = 'id,title,artist_title,artist_display,date_display,image_id,thumbnail';

// The API returns the whole collection even for nonsense words, just with a
// relevance score close to 0. Real matches score far above 1.
const MIN_SCORE = 1;
const TIMEOUT_MS = 8000;

function imageUrl(imageId) {
  return `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
}

function artworkUrl(id) {
  return `https://www.artic.edu/artworks/${id}`;
}

// The first relevant result that has an image, or null
export function pickArtwork(results) {
  return results.find((artwork) => artwork._score >= MIN_SCORE && artwork.image_id) || null;
}

// Asks the Art Institute for artworks matching the keyword.
// Gives up after 8 seconds so the page never waits forever.
export async function findKindredWork(keyword) {
  const params = new URLSearchParams({ q: keyword, limit: '10', fields: FIELDS });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Art Institute API answered ${response.status}`);
    const data = await response.json();
    return pickArtwork(data.data || []);
  } finally {
    clearTimeout(timer);
  }
}

// "Martin Parr" from artist_title, or the first line of artist_display
function artistName(artwork) {
  if (artwork.artist_title) return artwork.artist_title;
  if (artwork.artist_display) return artwork.artist_display.split('\n')[0];
  return 'Unknown artist';
}

// --- Drawing the box --------------------------------------------------------

function renderLoading(body, keyword) {
  body.replaceChildren(
    el('div', { class: 'kindred__card' }, [
      el('div', { class: 'kindred__placeholder', 'aria-hidden': 'true' }),
      el('p', {
        class: 'kindred__status',
        text: `Looking for a work that matches “${keyword}” at the Art Institute of Chicago…`,
      }),
    ]),
  );
}

function renderArtwork(body, artwork, keyword) {
  const media = el('div', { class: 'kindred__media' }, [
    el('img', {
      src: imageUrl(artwork.image_id),
      alt: artwork.thumbnail?.alt_text || '',
      loading: 'lazy',
    }),
  ]);
  // If the image can't load, show the text on its own
  media.querySelector('img').addEventListener('error', () => media.remove());

  body.replaceChildren(
    el('div', { class: 'kindred__card' }, [
      media,
      el('div', { class: 'kindred__text' }, [
        el('p', { class: 'meta', text: `Matched on “${keyword}”` }),
        el('h3', { class: 'kindred__title', text: artwork.title }),
        el('p', { class: 'kindred__artist', text: artistName(artwork) }),
        el('p', { class: 'kindred__date', text: artwork.date_display || 'Date unknown' }),
        el('a', {
          class: 'kindred__link',
          href: artworkUrl(artwork.id),
          target: '_blank',
          rel: 'noopener',
          text: 'See it at the Art Institute of Chicago ↗',
        }),
      ]),
    ]),
  );
}

function renderMessage(body, message, onRetry) {
  const children = [el('p', { class: 'kindred__status', text: message })];
  if (onRetry) {
    const button = el('button', { type: 'button', class: 'link-button', text: 'Try again' });
    button.addEventListener('click', onRetry);
    children.push(button);
  }
  body.replaceChildren(el('div', { class: 'kindred__message' }, children));
}

export async function initKindred(keyword) {
  const section = document.querySelector('#kindred');
  const body = document.querySelector('#kindred-body');
  if (!keyword) return;

  section.hidden = false;
  body.setAttribute('aria-busy', 'true');
  renderLoading(body, keyword);

  try {
    const artwork = await findKindredWork(keyword);
    if (artwork) {
      renderArtwork(body, artwork, keyword);
    } else {
      renderMessage(body, `No artwork at the Art Institute of Chicago matched “${keyword}” this time.`);
    }
  } catch (error) {
    console.warn('Kindred work:', error.message);
    renderMessage(
      body,
      'The Art Institute of Chicago couldn’t be reached right now.',
      () => initKindred(keyword),
    );
  } finally {
    body.setAttribute('aria-busy', 'false');
  }
}
