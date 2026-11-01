// The home page: loads all posts once, then filters them in the browser
// with a live search and category buttons.
import { getPosts } from './api.js';
import { el, excerpt, formatDate, postUrl } from './lib.js';
import { initSession } from './session.js';

const CATEGORIES = ['All', 'Film', 'AI', 'Art'];

const list = document.querySelector('#story-list');
const status = document.querySelector('#list-status');
const count = document.querySelector('#story-count');
const filters = document.querySelector('#filters');
const searchInput = document.querySelector('#search');
const emptyState = document.querySelector('#empty-state');
const emptyText = document.querySelector('#empty-text');
const clearButton = document.querySelector('#clear-filters');

// Everything the page needs to know to draw itself
const state = {
  posts: [], // every post, newest first
  query: '', // what's typed in the search box
  category: 'All', // the pressed category button
};

// --- Searching and filtering ----------------------------------------------

// Lowercase, without accents, so "roktanke" finds "Röktanke"
function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function matchesCategory(post, category) {
  return category === 'All' || post.category === category;
}

// Every word in the search must appear in the title, text or summary,
// so "piano stage" only finds posts that mention both.
function matchesQuery(post, query) {
  const words = normalize(query).split(/\s+/).filter((word) => word !== '');
  if (words.length === 0) return true;
  return words.every((word) => post.searchText.includes(word));
}

function filterPosts() {
  return state.posts.filter(
    (post) => matchesCategory(post, state.category) && matchesQuery(post, state.query),
  );
}

// How many posts match the search in each category, e.g. { All: 3, Film: 2, AI: 1, Art: 0 }
function countByCategory() {
  const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  for (const post of state.posts) {
    if (!matchesQuery(post, state.query)) continue;
    counts.All += 1;
    counts[post.category] += 1;
  }
  return counts;
}

// --- Drawing the page -----------------------------------------------------

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

  const title = el('h3', { class: 'entry__title' }, [
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

function renderFilters() {
  const counts = countByCategory();
  const buttons = CATEGORIES.map((category) => {
    const button = el('button', {
      type: 'button',
      class: 'filter',
      'aria-pressed': String(category === state.category),
    }, [
      category,
      el('span', { class: 'filter__count', text: String(counts[category]) }),
    ]);
    button.addEventListener('click', () => update({ category }));
    return button;
  });
  filters.replaceChildren(...buttons);
}

function renderEmptyState(visibleCount) {
  emptyState.hidden = visibleCount > 0 || state.posts.length === 0;
  if (!emptyState.hidden) {
    const inCategory = state.category === 'All' ? '' : ` in ${state.category}`;
    emptyText.textContent = state.query.trim()
      ? `No stories match “${state.query.trim()}”${inCategory}.`
      : `No stories${inCategory} yet.`;
  }
}

function render() {
  const visible = filterPosts();
  list.replaceChildren(...visible.map(renderStory));
  renderFilters();
  renderEmptyState(visible.length);

  const total = state.posts.length;
  count.textContent = visible.length === total
    ? `${total} ${total === 1 ? 'story' : 'stories'}`
    : `${visible.length} of ${total} stories`;
}

// Keeps the search and category in the address bar, so a filtered view
// survives a reload and can be shared as a link
function saveToUrl() {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set('q', state.query.trim());
  if (state.category !== 'All') params.set('category', state.category);
  const search = params.toString();
  history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
}

function readFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  state.query = params.get('q') || '';
  state.category = CATEGORIES.includes(category) ? category : 'All';
  searchInput.value = state.query;
}

// Changes the state, then redraws. Example: update({ category: 'Film' })
function update(changes) {
  Object.assign(state, changes);
  saveToUrl();
  render();
}

// --- Start ------------------------------------------------------------------

searchInput.addEventListener('input', () => update({ query: searchInput.value }));
clearButton.addEventListener('click', () => {
  searchInput.value = '';
  update({ query: '', category: 'All' });
  searchInput.focus();
});

async function init() {
  readFromUrl();
  try {
    const posts = await getPosts();
    // Prepare the searchable text once, instead of on every keystroke
    state.posts = posts.map((post) => ({
      ...post,
      searchText: normalize(`${post.title} ${post.body} ${post.summary || ''}`),
    }));
    status.textContent = state.posts.length === 0 ? 'No stories yet.' : '';
    render();
  } catch (error) {
    console.error(error);
    status.textContent = 'The stories could not be loaded. Please try again in a moment.';
    status.classList.add('status--error');
  }
}

initSession();
init();
