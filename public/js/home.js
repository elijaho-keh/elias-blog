// The home page: loads all posts and renders the story list.
import { getPosts } from './api.js';
import { el, excerpt, formatDate, postUrl } from './lib.js';

const list = document.querySelector('#story-list');
const status = document.querySelector('#list-status');
const count = document.querySelector('#story-count');

function renderStory(post, index) {
  const isLead = index === 0;
  const number = String(index + 1).padStart(2, '0');

  const image = el('img', {
    src: post.cover_url,
    alt: post.cover_alt || '',
    loading: isLead ? 'eager' : 'lazy',
  });

  const meta = el('p', { class: 'meta' }, [
    el('span', { class: 'entry__no', text: number }),
    el('span', { class: 'tag', text: post.category }),
    el('time', { datetime: post.published_at, text: formatDate(post.published_at) }),
  ]);

  const title = el('h2', { class: 'entry__title' }, [
    el('a', { href: postUrl(post.slug), text: post.title }),
  ]);

  const summary = el('p', {
    class: 'entry__summary',
    text: post.summary || excerpt(post.body),
  });

  return el('li', {}, [
    el('article', { class: isLead ? 'entry entry--lead' : 'entry' }, [
      el('div', { class: 'entry__media' }, [image]),
      el('div', { class: 'entry__text' }, [meta, title, summary]),
    ]),
  ]);
}

function renderList(posts) {
  list.replaceChildren(...posts.map(renderStory));
  count.textContent = posts.length === 1 ? '1 story' : `${posts.length} stories`;
  status.textContent = posts.length === 0 ? 'No stories yet.' : '';
}

async function init() {
  try {
    const posts = await getPosts();
    renderList(posts);
  } catch (error) {
    console.error(error);
    status.textContent = 'The stories could not be loaded. Please try again in a moment.';
    status.classList.add('status--error');
  }
}

init();
