// The "Kindred work" box on a post page: an artwork from the Art Institute
// of Chicago that matches the post's keyword. The search itself happens on
// our server (api/kindred.js); this file only draws the result.
import { getKindredWork } from './api.js';
import { el } from './lib.js';

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
    el('img', { src: artwork.image_url, alt: artwork.image_alt, loading: 'lazy' }),
  ]);
  // If the image can't load, show the text on its own
  media.querySelector('img').addEventListener('error', () => media.remove());

  body.replaceChildren(
    el('div', { class: 'kindred__card' }, [
      media,
      el('div', { class: 'kindred__text' }, [
        el('p', { class: 'meta', text: `Matched on “${keyword}”` }),
        el('h3', { class: 'kindred__title', text: artwork.title }),
        el('p', { class: 'kindred__artist', text: artwork.artist }),
        el('p', { class: 'kindred__date', text: artwork.date }),
        el('a', {
          class: 'kindred__link',
          href: artwork.url,
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
    const artwork = await getKindredWork(keyword);
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
